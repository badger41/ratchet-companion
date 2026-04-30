namespace RatchetCompanion.Core.Games;

public sealed record GameDetectionResult(
    GameId GameId,
    string DisplayName,
    GameVersion? Version,
    bool IsSupported);