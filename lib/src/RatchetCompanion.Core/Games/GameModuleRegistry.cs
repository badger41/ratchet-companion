namespace RatchetCompanion.Core.Games;

public sealed class GameModuleRegistry(IEnumerable<IGameModule> modules) : IGameModuleRegistry
{
    private readonly IReadOnlyDictionary<GameId, IGameModule> _modules = modules.ToDictionary(m => m.GameId);

    public IReadOnlyCollection<IGameModule> GetAll() => _modules.Values.OrderBy(m => m.GameId).ToArray();

    public IGameModule? Get(GameId gameId) => _modules.GetValueOrDefault(gameId);
}