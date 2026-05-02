using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Games.UYA;

public sealed class UyaMemoryExample
{
    private const uint NtscGameMapIdAddress = 0x001F8528;
    private const string CurrentMapIdWatchKey = "uya.current-map-id";

    private readonly IWatchedMemoryTracker _watchedMemoryTracker;

    public UyaMemoryExample(IWatchedMemoryTracker watchedMemoryTracker)
    {
        _watchedMemoryTracker = watchedMemoryTracker;
        _watchedMemoryTracker.WatchUInt32(CurrentMapIdWatchKey, NtscGameMapIdAddress);
    }

    public Task<uint?> ReadCurrentMapIdAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(_watchedMemoryTracker.GetUInt32(CurrentMapIdWatchKey));
}