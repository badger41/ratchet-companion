using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Games.UYA.MP;

public sealed record UyaMpMobyPvarSummary(uint Pointer, int ByteCount, string Name);

public sealed record UyaMpMobySummary(uint Pointer, ushort OClass, bool IsDynamic, UyaMpMobyPvarSummary? Pvar);

public sealed record UyaMpMobyListData(
    IReadOnlyList<UyaMpMobySummary> Mobys,
    int StaticCount,
    int DynamicCount,
    int DynamicCapacity);

public sealed class UyaMpMobyMemory
{
    private const int MobySize = 0x100;
    private const int PointerSize = sizeof(uint);
    private const int MobyListPointerBytes = PointerSize * 3;
    private const int PClassOffset = 0x24;
    private const int PVarOffset = 0x68;
    private const int OClassOffset = 0xAA;
    private const int MaxMobyCapacity = 4096;

    private static readonly IReadOnlyDictionary<int, uint> NtscBeginMobyPointerAddresses = new Dictionary<int, uint>
    {
        [40] = 0x002485DC,
        [41] = 0x002487DC,
        [42] = 0x002486DC,
        [43] = 0x0024855C,
        [44] = 0x002485DC,
        [45] = 0x0024855C,
        [46] = 0x0024815C,
        [47] = 0x0024825C,
        [48] = 0x0024825C,
        [49] = 0x0024825C,
    };

    private readonly UyaMemoryExample _uyaMemoryExample;
    private readonly IPcsx2Runtime _pcsx2Runtime;
    private readonly IWatchedMemoryTracker _watchedMemoryTracker;
    private readonly UyaMpPvarOverlay _pvarOverlay;

    public UyaMpMobyMemory(
        UyaMemoryExample uyaMemoryExample,
        IPcsx2Runtime pcsx2Runtime,
        IWatchedMemoryTracker watchedMemoryTracker,
        UyaMpPvarOverlay pvarOverlay)
    {
        _uyaMemoryExample = uyaMemoryExample;
        _pcsx2Runtime = pcsx2Runtime;
        _watchedMemoryTracker = watchedMemoryTracker;
        _pvarOverlay = pvarOverlay;

        foreach (var entry in NtscBeginMobyPointerAddresses)
        {
            _watchedMemoryTracker.WatchMemory($"uya.mp.moby-pointers.{entry.Key}", entry.Value, MobyListPointerBytes);
        }
    }

    public async Task<UyaMpMobyListData?> ReadMobysAsync(CancellationToken cancellationToken = default)
    {
        var mapId = await _uyaMemoryExample.ReadCurrentMapIdAsync(cancellationToken);

        if (!mapId.HasValue || !NtscBeginMobyPointerAddresses.TryGetValue((int)mapId.Value, out var beginMobyPointerAddress))
        {
            return null;
        }

        var mobyListPointers = await _pcsx2Runtime.ReadMemoryAsync(beginMobyPointerAddress, MobyListPointerBytes, cancellationToken);

        if (mobyListPointers is null || mobyListPointers.Length < MobyListPointerBytes)
        {
            return null;
        }

        var staticStart = BitConverter.ToUInt32(mobyListPointers, 0x0);
        var staticEnd = BitConverter.ToUInt32(mobyListPointers, 0x4);
        var dynamicAllocatedEnd = BitConverter.ToUInt32(mobyListPointers, 0x8);

        if (!TryGetAlignedCount(staticStart, staticEnd, out var staticCount) ||
            !TryGetAlignedCount(staticEnd, dynamicAllocatedEnd, out var dynamicCapacity) ||
            staticCount + dynamicCapacity > MaxMobyCapacity)
        {
            return null;
        }

        var mobys = new List<UyaMpMobySummary>(staticCount + dynamicCapacity);

        if (staticCount > 0)
        {
            _watchedMemoryTracker.WatchMemory($"uya.mp.mobys.static.{mapId.Value}.{staticStart:X8}", staticStart, staticCount * MobySize);

            var staticBytes = await _pcsx2Runtime.ReadMemoryAsync(staticStart, staticCount * MobySize, cancellationToken);
            if (staticBytes is null || staticBytes.Length < staticCount * MobySize)
            {
                return null;
            }

            for (var i = 0; i < staticCount; i++)
            {
                var offset = i * MobySize;
                var oClass = BitConverter.ToUInt16(staticBytes, offset + OClassOffset);

                mobys.Add(new UyaMpMobySummary(
                    Pointer: staticStart + (uint)offset,
                    OClass: oClass,
                    IsDynamic: false,
                    Pvar: CreatePvarSummary(staticBytes, offset, oClass)));
            }
        }

        var dynamicCount = 0;

        if (dynamicCapacity > 0)
        {
            _watchedMemoryTracker.WatchMemory($"uya.mp.mobys.dynamic.{mapId.Value}.{staticEnd:X8}", staticEnd, dynamicCapacity * MobySize);

            var dynamicBytes = await _pcsx2Runtime.ReadMemoryAsync(staticEnd, dynamicCapacity * MobySize, cancellationToken);
            if (dynamicBytes is null || dynamicBytes.Length < dynamicCapacity * MobySize)
            {
                return null;
            }

            for (var i = 0; i < dynamicCapacity; i++)
            {
                var offset = i * MobySize;
                var pClass = BitConverter.ToUInt32(dynamicBytes, offset + PClassOffset);

                if (pClass == 0)
                {
                    continue;
                }

                dynamicCount++;
                var oClass = BitConverter.ToUInt16(dynamicBytes, offset + OClassOffset);

                mobys.Add(new UyaMpMobySummary(
                    Pointer: staticEnd + (uint)offset,
                    OClass: oClass,
                    IsDynamic: true,
                    Pvar: CreatePvarSummary(dynamicBytes, offset, oClass)));
            }
        }

        return new UyaMpMobyListData(mobys, staticCount, dynamicCount, dynamicCapacity);
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

    private UyaMpMobyPvarSummary? CreatePvarSummary(byte[] mobyBytes, int mobyOffset, ushort oClass)
    {
        var metadata = _pvarOverlay.Find(oClass);
        if (metadata is null)
        {
            return null;
        }

        var pvarPointer = BitConverter.ToUInt32(mobyBytes, mobyOffset + PVarOffset);
        if (pvarPointer == 0)
        {
            return null;
        }

        _watchedMemoryTracker.WatchMemory($"uya.mp.moby-pvar.{oClass:X4}.{pvarPointer:X8}", pvarPointer, metadata.ByteCount);

        return new UyaMpMobyPvarSummary(
            Pointer: pvarPointer,
            ByteCount: metadata.ByteCount,
            Name: metadata.Name);
    }
}
