using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Games.DL.MP;

public sealed record DlMpMobyPvarSummary(uint Pointer, int ByteCount, string Name);

public sealed record DlMpMobySummary(
    uint Pointer,
    ushort OClass,
    string? Name,
    bool IsDynamic,
    uint NetObjectPointer,
    DlMpMobyPvarSummary? Pvar,
    DlMpNetObjectSummary? NetObject);

public sealed record DlMpMobyListData(
    IReadOnlyList<DlMpMobySummary> Mobys,
    int StaticCount,
    int DynamicCount,
    int DynamicCapacity);

public sealed class DlMpMobyMemory
{
    private const int MobySize = 0x100;
    private const int PointerSize = sizeof(uint);
    private const uint NumSpawnableMobysAddress = 0x00222790;
    private const uint BeginMobyPointerAddress = 0x00222794;
    private const uint EndMobyPointerAddress = 0x002227B0;
    private const int NetObjectOffset = 0x90;
    private const int PVarOffset = 0xAC;
    private const int OClassOffset = 0xBC;
    private const int MaxMobyCapacity = 4096;

    private readonly IPcsx2Runtime _pcsx2Runtime;
    private readonly IWatchedMemoryTracker _watchedMemoryTracker;
    private readonly DlMpPvarOverlay _pvarOverlay;
    private readonly DlMpNetObjectCatalog _netObjectCatalog;

    public DlMpMobyMemory(
        IPcsx2Runtime pcsx2Runtime,
        IWatchedMemoryTracker watchedMemoryTracker,
        DlMpPvarOverlay pvarOverlay,
        DlMpNetObjectCatalog netObjectCatalog)
    {
        _pcsx2Runtime = pcsx2Runtime;
        _watchedMemoryTracker = watchedMemoryTracker;
        _pvarOverlay = pvarOverlay;
        _netObjectCatalog = netObjectCatalog;

        _watchedMemoryTracker.WatchMemory("dl.mp.moby-count", NumSpawnableMobysAddress, sizeof(int));
        _watchedMemoryTracker.WatchMemory("dl.mp.moby-pointers.start", BeginMobyPointerAddress, PointerSize);
        _watchedMemoryTracker.WatchMemory("dl.mp.moby-pointers.end", EndMobyPointerAddress, PointerSize);
    }

    public async Task<DlMpMobyListData?> ReadMobysAsync(CancellationToken cancellationToken = default)
    {
        var countBytes = await _pcsx2Runtime.ReadMemoryAsync(NumSpawnableMobysAddress, sizeof(int), cancellationToken);
        var startPointerBytes = await _pcsx2Runtime.ReadMemoryAsync(BeginMobyPointerAddress, PointerSize, cancellationToken);
        var endPointerBytes = await _pcsx2Runtime.ReadMemoryAsync(EndMobyPointerAddress, PointerSize, cancellationToken);

        if (countBytes is null ||
            countBytes.Length < sizeof(int) ||
            startPointerBytes is null ||
            startPointerBytes.Length < PointerSize ||
            endPointerBytes is null ||
            endPointerBytes.Length < PointerSize)
        {
            return null;
        }

        var spawnableCount = BitConverter.ToInt32(countBytes, 0);
        var start = BitConverter.ToUInt32(startPointerBytes, 0);
        var end = BitConverter.ToUInt32(endPointerBytes, 0);

        if (!TryGetAlignedCount(start, end, out var listCapacity) ||
            listCapacity > MaxMobyCapacity ||
            spawnableCount < 0 ||
            spawnableCount > listCapacity)
        {
            return null;
        }

        if (spawnableCount == 0)
        {
            return new DlMpMobyListData([], 0, 0, 0);
        }

        _watchedMemoryTracker.WatchMemory($"dl.mp.mobys.{start:X8}", start, spawnableCount * MobySize);

        var mobyBytes = await _pcsx2Runtime.ReadMemoryAsync(start, spawnableCount * MobySize, cancellationToken);
        if (mobyBytes is null || mobyBytes.Length < spawnableCount * MobySize)
        {
            return null;
        }

        var mobys = new List<DlMpMobySummary>(spawnableCount);

        for (var i = 0; i < spawnableCount; i++)
        {
            var offset = i * MobySize;
            var oClass = BitConverter.ToUInt16(mobyBytes, offset + OClassOffset);
            if (oClass == 0)
            {
                continue;
            }

            var netObjectPointer = BitConverter.ToUInt32(mobyBytes, offset + NetObjectOffset);
            var metadata = _pvarOverlay.Find(oClass);
            mobys.Add(new DlMpMobySummary(
                Pointer: start + (uint)offset,
                OClass: oClass,
                Name: metadata?.Name,
                IsDynamic: false,
                NetObjectPointer: netObjectPointer,
                Pvar: CreatePvarSummary(mobyBytes, offset, metadata),
                NetObject: _netObjectCatalog.CreateSummary(netObjectPointer, metadata?.NetObjectDataType)));
        }

        return new DlMpMobyListData(mobys, mobys.Count, 0, listCapacity);
    }

    private static bool TryGetAlignedCount(uint start, uint end, out int count)
    {
        count = 0;

        if (start == 0 || end == 0 || end < start)
        {
            return false;
        }

        var byteCount = end - start;
        if (byteCount % MobySize != 0)
        {
            return false;
        }

        count = (int)(byteCount / MobySize);
        return true;
    }

    private static DlMpMobyPvarSummary? CreatePvarSummary(byte[] mobyBytes, int mobyOffset, DlMpPvarMetadata? metadata)
    {
        if (metadata is null)
        {
            return null;
        }

        var pvarPointer = BitConverter.ToUInt32(mobyBytes, mobyOffset + PVarOffset);
        if (pvarPointer == 0)
        {
            return null;
        }

        return new DlMpMobyPvarSummary(
            Pointer: pvarPointer,
            ByteCount: metadata.ByteCount,
            Name: metadata.Name);
    }
}
