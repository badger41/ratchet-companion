using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Core.Games;

public interface IGameDataSnapshotProvider
{
    Task<GameDataSnapshot?> CreateSnapshotAsync(CancellationToken cancellationToken = default);
}