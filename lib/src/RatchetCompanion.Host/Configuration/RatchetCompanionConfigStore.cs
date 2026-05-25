using System.Text.Json;

namespace RatchetCompanion.Host.Configuration;

public sealed class RatchetCompanionConfigStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
    };

    private readonly object _gate = new();
    private RatchetCompanionConfigSnapshot _snapshot;

    public RatchetCompanionConfigStore(string configPath, Action<string>? log = null)
    {
        ConfigPath = configPath;
        _snapshot = LoadOrCreate(log);
    }

    public string ConfigPath { get; }

    public RatchetCompanionConfigSnapshot Current
    {
        get
        {
            lock (_gate)
            {
                return _snapshot;
            }
        }
    }

    public RatchetCompanionConfigSnapshot Save(RatchetCompanionOptions options)
    {
        lock (_gate)
        {
            var defaults = RatchetCompanionOptions.CreateDefault();
            var warnings = new List<string>();
            var effective = Normalize(options, defaults, warnings);
            WriteOptions(effective);
            _snapshot = new RatchetCompanionConfigSnapshot(ConfigPath, effective, defaults, warnings);
            return _snapshot;
        }
    }

    public RatchetCompanionConfigSnapshot Reset()
    {
        lock (_gate)
        {
            var defaults = RatchetCompanionOptions.CreateDefault();
            WriteOptions(defaults);
            _snapshot = new RatchetCompanionConfigSnapshot(ConfigPath, defaults, defaults, []);
            return _snapshot;
        }
    }

    private RatchetCompanionConfigSnapshot LoadOrCreate(Action<string>? log)
    {
        var defaults = RatchetCompanionOptions.CreateDefault();
        var warnings = new List<string>();
        var shouldWrite = !File.Exists(ConfigPath);
        RatchetCompanionOptions? configured = null;

        if (!shouldWrite)
        {
            try
            {
                configured = JsonSerializer.Deserialize<RatchetCompanionOptions>(
                    File.ReadAllText(ConfigPath),
                    JsonOptions);
            }
            catch (Exception exception)
            {
                warnings.Add($"Unable to read settings.json. Defaults were restored. {exception.Message}");
                shouldWrite = true;
            }
        }

        configured ??= defaults;
        var effective = Normalize(configured, defaults, warnings);

        if (shouldWrite || warnings.Count > 0 || !OptionsEqual(configured, effective))
        {
            WriteOptions(effective);
        }

        foreach (var warning in warnings)
        {
            log?.Invoke(warning);
        }

        return new RatchetCompanionConfigSnapshot(ConfigPath, effective, defaults, warnings);
    }

    private void WriteOptions(RatchetCompanionOptions options)
    {
        var directory = Path.GetDirectoryName(ConfigPath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllText(ConfigPath, JsonSerializer.Serialize(options, JsonOptions));
    }

    private static RatchetCompanionOptions Normalize(
        RatchetCompanionOptions options,
        RatchetCompanionOptions defaults,
        List<string> warnings)
    {
        var backend = options.Backend ?? defaults.Backend;
        var pine = options.Pine ?? defaults.Pine;
        var polling = options.Polling ?? defaults.Polling;
        var appearance = options.Appearance ?? defaults.Appearance;
        var backendHost = NormalizeHost(backend.Host, defaults.Backend.Host, "Backend.Host", warnings);
        var backendPort = NormalizePort(backend.Port, defaults.Backend.Port, "Backend.Port", warnings);
        var pineHost = NormalizeHost(pine.Host, defaults.Pine.Host, "Pine.Host", warnings);
        var pinePort = NormalizePort(pine.Port, defaults.Pine.Port, "Pine.Port", warnings);
        var pineTimeout = NormalizePositiveMilliseconds(
            pine.TimeoutMilliseconds,
            defaults.Pine.TimeoutMilliseconds,
            "Pine.TimeoutMilliseconds",
            warnings);
        var memoryPolling = NormalizePositiveMilliseconds(
            polling.MemoryMilliseconds,
            defaults.Polling.MemoryMilliseconds,
            "Polling.MemoryMilliseconds",
            warnings);
        var websocketStatusPolling = NormalizePositiveMilliseconds(
            polling.WebsocketStatusMilliseconds,
            defaults.Polling.WebsocketStatusMilliseconds,
            "Polling.WebsocketStatusMilliseconds",
            warnings);
        var websocketMemoryPolling = NormalizePositiveMilliseconds(
            polling.WebsocketMemoryMilliseconds,
            defaults.Polling.WebsocketMemoryMilliseconds,
            "Polling.WebsocketMemoryMilliseconds",
            warnings);

        return new RatchetCompanionOptions
        {
            Backend = new BackendOptions
            {
                Host = backendHost,
                Port = backendPort,
            },
            Pine = new PineOptions
            {
                Host = pineHost,
                Port = pinePort,
                SocketPath = string.IsNullOrWhiteSpace(pine.SocketPath)
                    ? null
                    : pine.SocketPath,
                TimeoutMilliseconds = pineTimeout,
            },
            Polling = new PollingOptions
            {
                MemoryMilliseconds = memoryPolling,
                WebsocketStatusMilliseconds = websocketStatusPolling,
                WebsocketMemoryMilliseconds = websocketMemoryPolling,
            },
            Appearance = new AppearanceOptions
            {
                PreserveHexViewColors = appearance.PreserveHexViewColors,
            },
        };
    }

    private static string NormalizeHost(string? configured, string fallback, string name, List<string> warnings)
    {
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured.Trim();
        }

        warnings.Add($"{name} was blank. Defaulted to {fallback}.");
        return fallback;
    }

    private static int NormalizePort(int configured, int fallback, string name, List<string> warnings)
    {
        if (configured is >= 1 and <= 65535)
        {
            return configured;
        }

        warnings.Add($"{name} must be between 1 and 65535. Defaulted to {fallback}.");
        return fallback;
    }

    private static int NormalizePositiveMilliseconds(
        int configured,
        int fallback,
        string name,
        List<string> warnings)
    {
        if (configured > 0)
        {
            return configured;
        }

        warnings.Add($"{name} must be greater than 0. Defaulted to {fallback}.");
        return fallback;
    }

    private static bool OptionsEqual(RatchetCompanionOptions left, RatchetCompanionOptions right)
        => JsonSerializer.Serialize(left, JsonOptions) == JsonSerializer.Serialize(right, JsonOptions);
}
