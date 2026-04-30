namespace RatchetCompanion.Core.Games;

public interface IGameModule
{
    GameId GameId { get; }
    string DisplayName { get; }
    IReadOnlyCollection<string> Capabilities { get; }
}