namespace RatchetCompanion.Host.Configuration;

public sealed record RatchetCompanionConfigSnapshot(
    string ConfigPath,
    RatchetCompanionOptions Effective,
    RatchetCompanionOptions Defaults,
    IReadOnlyList<string> Warnings);
