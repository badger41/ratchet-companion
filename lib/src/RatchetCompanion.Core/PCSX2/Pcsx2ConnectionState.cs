namespace RatchetCompanion.Core.PCSX2;

public sealed record Pcsx2ConnectionState(
    bool IsSessionActive,
    bool IsProcessRunning,
    bool IsConnectedToPine,
    string? ProcessName,
    int? ProcessId,
    string? PineEndpoint = null,
    string? PineFailureReason = null);
