namespace RatchetCompanion.PCSX2.Process;

public sealed class LinuxPcsx2ProcessMemoryReader(Pcsx2ProcessLocator processLocator) : IDisposable
{
    private const string Pcsx2SharedMemoryMarker = "/dev/shm/pcsx2_";
    private const int FileStreamBufferSize = 1;

    private readonly object _gate = new();
    private int? _mappedProcessId;
    private FileStream? _stream;
    private bool _disposed;

    public Task<byte[]?> ReadEeMemoryAsync(uint eeAddress, int byteCount, CancellationToken cancellationToken = default)
    {
        if (!OperatingSystem.IsLinux() || byteCount < 0)
        {
            return Task.FromResult<byte[]?>(null);
        }

        if (byteCount == 0)
        {
            return Task.FromResult<byte[]?>([]);
        }

        lock (_gate)
        {
            if (_disposed)
            {
                return Task.FromResult<byte[]?>(null);
            }

            if (_mappedProcessId.HasValue)
            {
                var cachedBuffer = TryReadFromCachedStream(_mappedProcessId.Value, eeAddress, byteCount);
                if (cachedBuffer is not null)
                {
                    return Task.FromResult<byte[]?>(cachedBuffer);
                }
            }

            foreach (var process in processLocator.FindRunningProcesses())
            {
                var buffer = TryReadFromCachedStream(process.Id, eeAddress, byteCount);
                if (buffer is not null)
                {
                    return Task.FromResult<byte[]?>(buffer);
                }
            }
        }

        return Task.FromResult<byte[]?>(null);
    }

    public void Dispose()
    {
        lock (_gate)
        {
            if (_disposed)
            {
                return;
            }

            CloseCachedStream();
            _disposed = true;
        }
    }

    private byte[]? TryReadFromCachedStream(int processId, uint eeAddress, int byteCount)
    {
        if (!EnsureCachedStream(processId))
        {
            return null;
        }

        try
        {
            var stream = _stream;
            if (stream is null)
            {
                return null;
            }

            stream.Seek(eeAddress, SeekOrigin.Begin);

            var buffer = new byte[byteCount];
            var totalRead = 0;
            while (totalRead < byteCount)
            {
                var bytesRead = stream.Read(buffer, totalRead, byteCount - totalRead);
                if (bytesRead == 0)
                {
                    return null;
                }

                totalRead += bytesRead;
            }

            return buffer;
        }
        catch
        {
            if (_mappedProcessId == processId)
            {
                CloseCachedStream();
            }

            return null;
        }
    }

    private bool EnsureCachedStream(int processId)
    {
        if (_mappedProcessId == processId && _stream is { CanRead: true })
        {
            if (IsProcessRunning(processId))
            {
                return true;
            }

            CloseCachedStream();
        }

        CloseCachedStream();

        var shmPath = TryGetSharedMemoryFileDescriptorPath(processId);
        if (shmPath is null)
        {
            return false;
        }

        try
        {
            _stream = new FileStream(
                shmPath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.ReadWrite,
                FileStreamBufferSize,
                FileOptions.RandomAccess);
            _mappedProcessId = processId;
            return true;
        }
        catch
        {
            CloseCachedStream();
            return false;
        }
    }

    private void CloseCachedStream()
    {
        _stream?.Dispose();
        _stream = null;
        _mappedProcessId = null;
    }

    private static bool IsProcessRunning(int processId)
    {
        try
        {
            using var process = System.Diagnostics.Process.GetProcessById(processId);
            return !process.HasExited;
        }
        catch
        {
            return false;
        }
    }

    private static string? TryGetSharedMemoryFileDescriptorPath(int processId)
    {
        var fdDirectory = $"/proc/{processId}/fd";
        string[] fdPaths;

        try
        {
            if (!Directory.Exists(fdDirectory))
            {
                return null;
            }

            fdPaths = Directory.GetFiles(fdDirectory);
        }
        catch
        {
            return null;
        }

        foreach (var fdPath in fdPaths)
        {
            try
            {
                var target = File.ResolveLinkTarget(fdPath, returnFinalTarget: true)?.FullName;
                if (!string.IsNullOrWhiteSpace(target) && target.Contains(Pcsx2SharedMemoryMarker, StringComparison.Ordinal))
                {
                    return fdPath;
                }
            }
            catch
            {
                // Ignore inaccessible or transient fd entries.
            }
        }

        return null;
    }
}
