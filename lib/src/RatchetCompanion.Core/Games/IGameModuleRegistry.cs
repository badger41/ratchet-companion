namespace RatchetCompanion.Core.Games;

public interface IGameModuleRegistry
{
    IReadOnlyCollection<IGameModule> GetAll();
    IGameModule? Get(GameId gameId);
}