using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.Games.DL.MP;

namespace RatchetCompanion.Games.DL;

public sealed record DlMpMobyListPayload(
    bool IsAvailable,
    DlMpMobyListData? MobyList);

public sealed class DlGameModule(DlMpMobyMemory dlMpMobyMemory) : IGameModule, IMobyListSnapshotProvider
{
    public GameId GameId => GameId.DL;
    public string DisplayName => "Ratchet: Deadlocked";
    public IReadOnlyCollection<string> Capabilities =>
        ["Game detection", "Offsets catalog", "Moby memory reader"];

    public async Task<GameDataSnapshot?> CreateMobyListSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var mobyList = await dlMpMobyMemory.ReadMobysAsync(cancellationToken);

        return new GameDataSnapshot(
            GameId: GameId.ToString(),
            Schema: "dl.mp.mobys.v1",
            Payload: new DlMpMobyListPayload(
                IsAvailable: mobyList is not null,
                MobyList: mobyList));
    }
}
