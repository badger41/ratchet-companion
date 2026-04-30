namespace RatchetCompanion.PCSX2.Pine;

public sealed record PineProbeResult(
    bool IsReachable,
    string Endpoint,
    string? FailureReason);