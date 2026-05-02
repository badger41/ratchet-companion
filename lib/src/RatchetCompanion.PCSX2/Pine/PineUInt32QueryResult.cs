namespace RatchetCompanion.PCSX2.Pine;

public sealed record PineUInt32QueryResult(bool IsSuccessful, uint? Value, string? FailureReason);