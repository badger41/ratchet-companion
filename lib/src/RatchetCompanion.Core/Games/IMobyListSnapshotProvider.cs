using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Core.Games;

public interface IMobyListSnapshotProvider
{
    Task<GameDataSnapshot?> CreateMobyListSnapshotAsync(CancellationToken cancellationToken = default);
}
