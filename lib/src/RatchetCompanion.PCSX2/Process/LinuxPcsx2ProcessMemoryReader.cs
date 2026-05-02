namespace RatchetCompanion.PCSX2.Process;

public sealed class LinuxPcsx2ProcessMemoryReader(Pcsx2ProcessLocator processLocator)
{
    private const string Pcsx2SharedMemoryMarker = "/dev/shm/pcsx2_";

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

        foreach (var process in processLocator.FindRunningProcesses())
        {
            var buffer = TryReadFromSharedMemory(process.Id, eeAddress, byteCount);
            if (buffer is not null)
            {
                return Task.FromResult<byte[]?>(buffer);
            }
        }

        return Task.FromResult<byte[]?>(null);
    }

    private static byte[]? TryReadFromSharedMemory(int processId, uint eeAddress, int byteCount)
    {
        var shmPath = TryGetSharedMemoryFileDescriptorPath(processId);
        if (shmPath is null)
        {
            return null;
        }

        using var stream = new FileStream(shmPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
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

    private static string? TryGetSharedMemoryFileDescriptorPath(int processId)
    {
        var fdDirectory = $"/proc/{processId}/fd";
        if (!Directory.Exists(fdDirectory))
        {
            return null;
        }

        foreach (var fdPath in Directory.EnumerateFiles(fdDirectory))
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