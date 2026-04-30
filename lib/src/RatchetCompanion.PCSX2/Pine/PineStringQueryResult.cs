namespace RatchetCompanion.PCSX2.Pine;

public sealed record PineStringQueryResult(
    bool IsSuccessful,
    string? Value,
    string? FailureReason);