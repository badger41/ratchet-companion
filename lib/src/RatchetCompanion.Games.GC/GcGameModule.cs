using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.GC;

public sealed class GcGameModule : IGameModule
{
    public GameId GameId => GameId.GC;
    public string DisplayName => "Ratchet & Clank: Going Commando";
    public IReadOnlyCollection<string> Capabilities =>
        ["Game detection", "Offsets catalog", "Memory readers (planned)"];
}