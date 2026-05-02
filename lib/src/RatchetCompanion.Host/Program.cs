using RatchetCompanion.Core;
using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.Games.DL;
using RatchetCompanion.Games.GC;
using RatchetCompanion.Games.RAC1;
using RatchetCompanion.Games.UYA;
using RatchetCompanion.Host;
using RatchetCompanion.PCSX2;
using Microsoft.AspNetCore.Http.Json;
using System.Net.WebSockets;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://127.0.0.1:48123");

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
builder.Services.AddPcsx2Runtime(builder.Configuration);
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
var websocketStatusInterval = TimeSpan.FromMilliseconds(250);

app.UseCors();
app.UseWebSockets();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

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

app.Run();
