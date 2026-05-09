namespace RatchetCompanion.PCSX2;

public sealed class Pcsx2Options
{
    public string[] ProcessNames { get; init; } = ["pcsx2-qt", "pcsx2", "PCSX2"];
    public string[] LauncherProcessNames { get; init; } = ["dreadzone online", "dreadzoneonline"];
    public string[] LauncherManagedProcessCommandLineMarkers { get; init; } = ["dreadzone-online", "DreadZone Online_Data"];
    public string PineHost { get; init; } = "127.0.0.1";
    public int PinePort { get; init; } = 28011;
    public string? PineSocketPath { get; init; }
    public int PineTimeoutMilliseconds { get; init; } = 250;
    public int MemoryPollingMilliseconds { get; init; } = 250;
}
