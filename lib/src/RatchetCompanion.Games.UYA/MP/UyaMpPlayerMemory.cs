using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Games.UYA.MP;

public sealed record UyaMpPlayerPosition(float X, float Y, float Z);

public sealed class UyaMpPlayerMemory
{
    private const int MaxPlayers = 8;
    private const int PointerSize = sizeof(uint);
    private const int PlayerPositionOffset = 0x00A0;
    private const int PlayerIsLocalOffset = 0x1A14;
    private const int PlayerStructBytesToRead = PlayerIsLocalOffset + 1;

    private static readonly IReadOnlyDictionary<int, uint> NtscPlayerStructArrayAddresses = new Dictionary<int, uint>
    {
        [40] = 0x002494B0,
        [41] = 0x002496B0,
        [42] = 0x002495A0,
        [43] = 0x00249420,
        [44] = 0x002494A0,
        [45] = 0x00249420,
        [46] = 0x00249020,
        [47] = 0x00249120,
        [48] = 0x00249120,
        [49] = 0x00249120,
    };

    private readonly UyaMemoryExample _uyaMemoryExample;
    private readonly IPcsx2Runtime _pcsx2Runtime;

    public UyaMpPlayerMemory(UyaMemoryExample uyaMemoryExample, IPcsx2Runtime pcsx2Runtime)
    {
        _uyaMemoryExample = uyaMemoryExample;
        _pcsx2Runtime = pcsx2Runtime;
    }

    public async Task<UyaMpPlayerPosition?> ReadLocalPlayerPositionAsync(CancellationToken cancellationToken = default)
    {
        var mapId = await _uyaMemoryExample.ReadCurrentMapIdAsync(cancellationToken);

        if (!mapId.HasValue || !NtscPlayerStructArrayAddresses.TryGetValue((int)mapId.Value, out var playerStructArrayAddress))
        {
            return null;
        }

        var playerPointerBytes = await _pcsx2Runtime.ReadMemoryAsync(
            playerStructArrayAddress,
            MaxPlayers * PointerSize,
            cancellationToken);

        if (playerPointerBytes is null)
        {
            return null;
        }

        for (var i = 0; i < MaxPlayers; i++)
        {
            var playerPointer = BitConverter.ToUInt32(playerPointerBytes, i * PointerSize);

            if (playerPointer == 0)
            {
                continue;
            }

            var playerBytes = await _pcsx2Runtime.ReadMemoryAsync(playerPointer, PlayerStructBytesToRead, cancellationToken);

            if (playerBytes is null || playerBytes.Length <= PlayerIsLocalOffset || playerBytes[PlayerIsLocalOffset] == 0)
            {
                continue;
            }

            return new UyaMpPlayerPosition(
                X: BitConverter.ToSingle(playerBytes, PlayerPositionOffset + 0x0),
                Y: BitConverter.ToSingle(playerBytes, PlayerPositionOffset + 0x4),
                Z: BitConverter.ToSingle(playerBytes, PlayerPositionOffset + 0x8));
        }

        return null;
    }
}
