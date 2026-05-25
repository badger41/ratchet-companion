namespace RatchetCompanion.Host.Configuration;

public sealed class RatchetCompanionOptions
{
    public BackendOptions Backend { get; init; } = new();
    public PineOptions Pine { get; init; } = new();
    public PollingOptions Polling { get; init; } = new();
    public AppearanceOptions Appearance { get; init; } = new();

    public static RatchetCompanionOptions CreateDefault()
        => new();
}

public sealed class BackendOptions
{
    public string Host { get; init; } = "127.0.0.1";
    public int Port { get; init; } = 48123;
}

public sealed class PineOptions
{
    public string Host { get; init; } = "127.0.0.1";
    public int Port { get; init; } = 28011;
    public string? SocketPath { get; init; } = "/run/user/1000/pcsx2.sock";
    public int TimeoutMilliseconds { get; init; } = 250;
}

public sealed class PollingOptions
{
    public int MemoryMilliseconds { get; init; } = 250;
    public int WebsocketStatusMilliseconds { get; init; } = 250;
    public int WebsocketMemoryMilliseconds { get; init; } = 250;
}

public sealed class AppearanceOptions
{
    public bool PreserveHexViewColors { get; init; }
}
