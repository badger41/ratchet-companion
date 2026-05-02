namespace RatchetCompanion.Core.PCSX2;

public interface IWatchedMemoryTracker
{
    long CurrentVersion { get; }

    void WatchUInt32(string key, uint address);
    uint? GetUInt32(string key);
    Task<long> WaitForChangeAsync(long lastSeenVersion, CancellationToken cancellationToken = default);
}