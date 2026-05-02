using System.Collections.Concurrent;
using Microsoft.Extensions.Hosting;
using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.PCSX2;

public sealed class Pcsx2MemoryWatchService(IPcsx2Runtime pcsx2Runtime) : BackgroundService, IWatchedMemoryTracker
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromMilliseconds(250);

    private readonly ConcurrentDictionary<string, UInt32WatchState> _uint32Watches = new(StringComparer.Ordinal);
    private readonly object _notificationGate = new();
    private long _changeVersion;
    private TaskCompletionSource<long> _nextChangeTcs = CreateSignal();

    public long CurrentVersion
    {
        get
        {
            lock (_notificationGate)
            {
                return _changeVersion;
            }
        }
    }

    public void WatchUInt32(string key, uint address)
    {
        _uint32Watches.AddOrUpdate(
            key,
            _ => new UInt32WatchState(address),
            (_, existing) => existing.Address == address ? existing : new UInt32WatchState(address));
    }

    public uint? GetUInt32(string key)
        => _uint32Watches.TryGetValue(key, out var watch) ? watch.GetValue() : null;

    public Task<long> WaitForChangeAsync(long lastSeenVersion, CancellationToken cancellationToken = default)
    {
        lock (_notificationGate)
        {
            if (_changeVersion != lastSeenVersion)
            {
                return Task.FromResult(_changeVersion);
            }

            return _nextChangeTcs.Task.WaitAsync(cancellationToken);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            foreach (var watch in _uint32Watches.Values)
            {
                var currentValue = await pcsx2Runtime.ReadUInt32Async(watch.Address, stoppingToken);

                if (watch.TryUpdate(currentValue))
                {
                    PublishChange();
                }
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private void PublishChange()
    {
        TaskCompletionSource<long> signalToComplete;
        long nextVersion;

        lock (_notificationGate)
        {
            _changeVersion++;
            nextVersion = _changeVersion;
            signalToComplete = _nextChangeTcs;
            _nextChangeTcs = CreateSignal();
        }

        signalToComplete.TrySetResult(nextVersion);
    }

    private static TaskCompletionSource<long> CreateSignal()
        => new(TaskCreationOptions.RunContinuationsAsynchronously);

    private sealed class UInt32WatchState(uint address)
    {
        private readonly object _gate = new();
        private uint? _currentValue;

        public uint Address { get; } = address;

        public uint? GetValue()
        {
            lock (_gate)
            {
                return _currentValue;
            }
        }

        public bool TryUpdate(uint? value)
        {
            lock (_gate)
            {
                if (_currentValue == value)
                {
                    return false;
                }

                _currentValue = value;
                return true;
            }
        }
    }
}