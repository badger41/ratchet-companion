using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.RAC1;

public sealed class Rac1GameModule : IGameModule
{
    public GameId GameId => GameId.RAC1;
    public string DisplayName => "Ratchet & Clank";
    public IReadOnlyCollection<string> Capabilities =>
        ["Game detection", "Offsets catalog", "Memory readers (planned)"];
}