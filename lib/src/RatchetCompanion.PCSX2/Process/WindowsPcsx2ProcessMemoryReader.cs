using System.Runtime.InteropServices;

namespace RatchetCompanion.PCSX2.Process;

public sealed class WindowsPcsx2ProcessMemoryReader(Pcsx2ProcessLocator processLocator) : IDisposable
{
    private const uint FileMapRead = 0x0004;

    private readonly object _gate = new();
    private int? _mappedProcessId;
    private IntPtr _mappingHandle;
    private IntPtr _view;
    private bool _disposed;

    public Task<byte[]?> ReadEeMemoryAsync(uint eeAddress, int byteCount, CancellationToken cancellationToken = default)
    {
        if (!OperatingSystem.IsWindows() || byteCount < 0)
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
                var cachedBuffer = TryReadFromCachedMapping(_mappedProcessId.Value, eeAddress, byteCount);
                if (cachedBuffer is not null)
                {
                    return Task.FromResult<byte[]?>(cachedBuffer);
                }
            }

            foreach (var process in processLocator.FindRunningProcesses())
            {
                var buffer = TryReadFromCachedMapping(process.Id, eeAddress, byteCount);
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

            CloseCachedMapping();
            _disposed = true;
        }
    }

    private byte[]? TryReadFromCachedMapping(int processId, uint eeAddress, int byteCount)
    {
        if (!EnsureCachedMapping(processId))
        {
            return null;
        }

        try
        {
            var buffer = new byte[byteCount];
            Marshal.Copy(IntPtr.Add(_view, checked((int)eeAddress)), buffer, 0, byteCount);
            return buffer;
        }
        catch
        {
            if (_mappedProcessId == processId)
            {
                CloseCachedMapping();
            }

            return null;
        }
    }

    private bool EnsureCachedMapping(int processId)
    {
        if (_mappedProcessId == processId && _mappingHandle != IntPtr.Zero && _view != IntPtr.Zero)
        {
            return true;
        }

        CloseCachedMapping();

        var mappingHandle = OpenFileMapping(FileMapRead, false, $"pcsx2_{processId}");
        if (mappingHandle == IntPtr.Zero)
        {
            return false;
        }

        var view = MapViewOfFile(mappingHandle, FileMapRead, 0, 0, UIntPtr.Zero);
        if (view == IntPtr.Zero)
        {
            CloseHandle(mappingHandle);
            return false;
        }

        _mappedProcessId = processId;
        _mappingHandle = mappingHandle;
        _view = view;
        return true;
    }

    private void CloseCachedMapping()
    {
        if (_view != IntPtr.Zero)
        {
            UnmapViewOfFile(_view);
            _view = IntPtr.Zero;
        }

        if (_mappingHandle != IntPtr.Zero)
        {
            CloseHandle(_mappingHandle);
            _mappingHandle = IntPtr.Zero;
        }

        _mappedProcessId = null;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr OpenFileMapping(uint dwDesiredAccess, [MarshalAs(UnmanagedType.Bool)] bool bInheritHandle, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr MapViewOfFile(IntPtr hFileMappingObject, uint dwDesiredAccess, uint dwFileOffsetHigh, uint dwFileOffsetLow, UIntPtr dwNumberOfBytesToMap);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnmapViewOfFile(IntPtr lpBaseAddress);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool CloseHandle(IntPtr hObject);
}
