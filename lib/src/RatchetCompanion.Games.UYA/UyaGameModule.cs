using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.UYA;

public sealed class UyaGameModule : IGameModule
{
    public GameId GameId => GameId.UYA;
    public string DisplayName => "Ratchet & Clank: Up Your Arsenal";
    public IReadOnlyCollection<string> Capabilities =>
        ["Game detection", "Offsets catalog", "Memory readers (planned)"];
}