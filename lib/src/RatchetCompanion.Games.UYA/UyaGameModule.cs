using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.Games.UYA.MP;

namespace RatchetCompanion.Games.UYA;

public sealed record UyaMpGameData(
    uint? CurrentMapId,
    bool IsAvailable,
    UyaMpPlayerPosition? PlayerPosition);

public sealed record UyaMpMobyListPayload(
    bool IsAvailable,
    UyaMpMobyListData? MobyList);

public sealed class UyaGameModule(
    UyaMemoryExample uyaMemoryExample,
    UyaMpPlayerMemory uyaMpPlayerMemory,
    UyaMpMobyMemory uyaMpMobyMemory) : IGameModule, IGameDataSnapshotProvider, IMobyListSnapshotProvider
{
    public GameId GameId => GameId.UYA;
    public string DisplayName => "Ratchet & Clank: Up Your Arsenal";
    public IReadOnlyCollection<string> Capabilities =>
        ["Game detection", "Offsets catalog", "Memory readers (planned)"];

    public async Task<GameDataSnapshot?> CreateSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var currentMapId = await uyaMemoryExample.ReadCurrentMapIdAsync(cancellationToken);
        var playerPosition = await uyaMpPlayerMemory.ReadLocalPlayerPositionAsync(cancellationToken);

        return new GameDataSnapshot(
            GameId: GameId.ToString(),
            Schema: "uya.map-id.v1",
            Payload: new UyaMpGameData(
                CurrentMapId: currentMapId,
                IsAvailable: currentMapId.HasValue,
                PlayerPosition: playerPosition));
    }

    public async Task<GameDataSnapshot?> CreateMobyListSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var mobyList = await uyaMpMobyMemory.ReadMobysAsync(cancellationToken);

        return new GameDataSnapshot(
            GameId: GameId.ToString(),
            Schema: "uya.mp.mobys.v1",
            Payload: new UyaMpMobyListPayload(
                IsAvailable: mobyList is not null,
                MobyList: mobyList));
    }
}
