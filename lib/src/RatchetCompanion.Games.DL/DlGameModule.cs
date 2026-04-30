using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.DL;

public sealed class DlGameModule : IGameModule
{
    public GameId GameId => GameId.DL;
    public string DisplayName => "Ratchet: Deadlocked";
    public IReadOnlyCollection<string> Capabilities =>
        ["Game detection", "Offsets catalog", "Memory readers (planned)"];
}