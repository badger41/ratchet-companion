using RatchetCompanion.Core;
using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.Games.DL;
using RatchetCompanion.Games.GC;
using RatchetCompanion.Games.RAC1;
using RatchetCompanion.Games.UYA;
using RatchetCompanion.Host;
using RatchetCompanion.Host.Configuration;
using RatchetCompanion.PCSX2;
using Microsoft.AspNetCore.Http.Json;
using System.Net.WebSockets;
using System.Text.Json;

var startupLogPath = CreateStartupLogPath();
WriteStartupLog(startupLogPath, $"Starting Ratchet Companion backend. BaseDirectory={AppContext.BaseDirectory}");

try
{
    var configStore = new RatchetCompanionConfigStore(
        CreateUserSettingsPath(),
        warning => WriteStartupLog(startupLogPath, $"Configuration warning: {warning}"));
    var appOptions = configStore.Current.Effective;
    var backendUrl = $"http://{appOptions.Backend.Host}:{appOptions.Backend.Port}";

    var builder = WebApplication.CreateBuilder(args);

    builder.WebHost.UseUrls(backendUrl);

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy
                .WithOrigins("http://127.0.0.1:5173", "http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });

    builder.Services.Configure<JsonOptions>(options =>
    {
        options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

    builder.Services.AddGameModuleRegistry();
    builder.Services.AddSingleton(configStore);
    builder.Services.AddPcsx2Runtime(ToPcsx2Options(appOptions));
    builder.Services.AddRAC1Module();
    builder.Services.AddGCModule();
    builder.Services.AddUYAModule();
    builder.Services.AddDLModule();
    builder.Services.AddSingleton<StatusSnapshotFactory>();

    var app = builder.Build();
    var websocketJsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
    var websocketStatusInterval = TimeSpan.FromMilliseconds(appOptions.Polling.WebsocketStatusMilliseconds);
    var websocketMemoryInterval = TimeSpan.FromMilliseconds(appOptions.Polling.WebsocketMemoryMilliseconds);
    const int MaxWebsocketMemoryBytes = 4096;

    app.UseCors();
    app.UseWebSockets();

    app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

    app.MapGet("/api/config", (RatchetCompanionConfigStore store) =>
        Results.Ok(store.Current));

    app.MapPut("/api/config", ([Microsoft.AspNetCore.Mvc.FromBody] RatchetCompanionOptions options, RatchetCompanionConfigStore store) =>
        Results.Ok(store.Save(options)));

    app.MapPost("/api/config/reset", (RatchetCompanionConfigStore store) =>
        Results.Ok(store.Reset()));

    app.MapGet("/api/modules", (IGameModuleRegistry registry) =>
        Results.Ok(registry.GetAll().Select(module => new
        {
            gameId = module.GameId.ToString(),
            module.DisplayName,
            module.Capabilities,
        })));

    app.MapGet("/api/status", async (StatusSnapshotFactory snapshotFactory, CancellationToken cancellationToken) =>
    {
        var snapshot = await snapshotFactory.CreateAsync(cancellationToken);
        return Results.Ok(snapshot);
    });

    app.MapPost("/api/session/connect", async (IPcsx2Runtime pcsx2Runtime, CancellationToken cancellationToken) =>
    {
        var connected = await pcsx2Runtime.ConnectAsync(cancellationToken);
        return Results.Ok(new { connected });
    });

    app.MapPost("/api/session/disconnect", async (IPcsx2Runtime pcsx2Runtime, CancellationToken cancellationToken) =>
    {
        await pcsx2Runtime.DisconnectAsync(cancellationToken);
        return Results.Ok(new { connected = false });
    });

    app.Map("/ws/status", async (HttpContext context, StatusSnapshotFactory snapshotFactory) =>
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var cancellationToken = context.RequestAborted;
        var watchedMemoryTracker = context.RequestServices.GetRequiredService<IWatchedMemoryTracker>();
        var lastObservedVersion = watchedMemoryTracker.CurrentVersion;
        string? lastSentJson = null;

        while (!cancellationToken.IsCancellationRequested && webSocket.State == WebSocketState.Open)
        {
            var snapshot = await snapshotFactory.CreateAsync(cancellationToken);
            var json = JsonSerializer.Serialize(snapshot, websocketJsonOptions);

            if (!string.Equals(lastSentJson, json, StringComparison.Ordinal))
            {
                var payload = System.Text.Encoding.UTF8.GetBytes(json);
                await webSocket.SendAsync(payload, WebSocketMessageType.Text, true, cancellationToken);
                lastSentJson = json;
            }

            try
            {
                lastObservedVersion = await watchedMemoryTracker.WaitForChangeAsync(lastObservedVersion, cancellationToken)
                    .WaitAsync(websocketStatusInterval, cancellationToken);
            }
            catch (TimeoutException)
            {
            }
        }
    });

    app.Map("/ws/memory", async (HttpContext context, IPcsx2Runtime pcsx2Runtime) =>
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        if (!uint.TryParse(context.Request.Query["address"], out var address) ||
            !int.TryParse(context.Request.Query["byteCount"], out var byteCount) ||
            byteCount <= 0 ||
            byteCount > MaxWebsocketMemoryBytes)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync($"address and byteCount are required. byteCount must be between 1 and {MaxWebsocketMemoryBytes}.");
            return;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var cancellationToken = context.RequestAborted;
        string? lastSentBytes = null;

        while (!cancellationToken.IsCancellationRequested && webSocket.State == WebSocketState.Open)
        {
            var currentValue = await pcsx2Runtime.ReadMemoryAsync(address, byteCount, cancellationToken);
            var currentBytes = currentValue is null ? null : Convert.ToBase64String(currentValue);

            if (!string.Equals(lastSentBytes, currentBytes, StringComparison.Ordinal))
            {
                var json = JsonSerializer.Serialize(
                    new
                    {
                        address,
                        byteCount,
                        bytes = currentBytes,
                    },
                    websocketJsonOptions);

                var payload = System.Text.Encoding.UTF8.GetBytes(json);
                await webSocket.SendAsync(payload, WebSocketMessageType.Text, true, cancellationToken);
                lastSentBytes = currentBytes;
            }

            await Task.Delay(websocketMemoryInterval, cancellationToken);
        }
    });

    WriteStartupLog(startupLogPath, $"Backend configured. ConfigPath={configStore.ConfigPath}. Starting web host on {backendUrl}.");
    app.Run();
}
catch (Exception exception)
{
    WriteStartupLog(startupLogPath, $"Fatal backend startup error:{Environment.NewLine}{exception}");
    throw;
}

static string CreateStartupLogPath()
{
    var configuredLogDirectory = Environment.GetEnvironmentVariable("RATCHET_COMPANION_LOG_DIR");
    var logDirectories = new[]
    {
        configuredLogDirectory,
        Path.Combine(GetDefaultUserDataDirectory(), "logs"),
        Path.Combine(Path.GetTempPath(), "Ratchet Companion", "logs"),
        AppContext.BaseDirectory,
    };

    foreach (var logDirectory in logDirectories)
    {
        if (string.IsNullOrWhiteSpace(logDirectory))
        {
            continue;
        }

        try
        {
            Directory.CreateDirectory(logDirectory);
            return Path.Combine(logDirectory, "backend-startup.log");
        }
        catch
        {
        }
    }

    return "backend-startup.log";
}

static string CreateUserSettingsPath()
    => Path.Combine(GetDefaultUserDataDirectory(), "settings.json");

static string GetDefaultUserDataDirectory()
{
    if (OperatingSystem.IsWindows())
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);

        if (!string.IsNullOrWhiteSpace(appData))
        {
            return Path.Combine(appData, "Ratchet Companion");
        }
    }

    if (OperatingSystem.IsMacOS())
    {
        var macHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

        if (!string.IsNullOrWhiteSpace(macHome))
        {
            return Path.Combine(macHome, "Library", "Application Support", "Ratchet Companion");
        }
    }

    var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);

    if (!string.IsNullOrWhiteSpace(home))
    {
        return Path.Combine(home, ".config", "Ratchet Companion");
    }

    return AppContext.BaseDirectory;
}

static Pcsx2Options ToPcsx2Options(RatchetCompanionOptions options)
    => new()
    {
        PineHost = options.Pine.Host,
        PinePort = options.Pine.Port,
        PineSocketPath = options.Pine.SocketPath,
        PineTimeoutMilliseconds = options.Pine.TimeoutMilliseconds,
        MemoryPollingMilliseconds = options.Polling.MemoryMilliseconds,
    };

static void WriteStartupLog(string startupLogPath, string message)
{
    var entry = $"[{DateTimeOffset.UtcNow:O}] {message}{Environment.NewLine}";

    try
    {
        Console.Error.Write(entry);
    }
    catch
    {
    }

    try
    {
        File.AppendAllText(startupLogPath, entry);
    }
    catch
    {
    }
}
