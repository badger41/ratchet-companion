using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Host;

public sealed class MobyListSnapshotFactory(
    IPcsx2Runtime pcsx2Runtime,
    IGameModuleRegistry gameModuleRegistry)
{
    public async Task<GameDataSnapshot?> CreateAsync(CancellationToken cancellationToken = default)
    {
        var detection = await pcsx2Runtime.DetectGameAsync(cancellationToken);
        var module = gameModuleRegistry.Get(detection.GameId);

        return module is IMobyListSnapshotProvider mobyListSnapshotProvider
            ? await mobyListSnapshotProvider.CreateMobyListSnapshotAsync(cancellationToken)
            : null;
    }
}
