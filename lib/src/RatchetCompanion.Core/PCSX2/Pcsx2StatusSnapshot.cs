using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Core.PCSX2;

public sealed record Pcsx2StatusSnapshot(
    string Backend,
    Pcsx2ConnectionState Connection,
    GameDetectionResult Detection,
    GameModuleSummary? Module,
    GameDataSnapshot? GameData = null);

public sealed record GameDataSnapshot(
    string GameId,
    string Schema,
    object Payload);

public sealed record GameModuleSummary(
    string GameId,
    string DisplayName,
    IReadOnlyCollection<string> Capabilities);