using System.Runtime.InteropServices;

namespace RatchetCompanion.PCSX2.Process;

public sealed class WindowsPcsx2ProcessMemoryReader(Pcsx2ProcessLocator processLocator)
{
    private const uint FileMapRead = 0x0004;

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

        foreach (var process in processLocator.FindRunningProcesses())
        {
            var buffer = TryReadFromMapping(process.Id, eeAddress, byteCount);
            if (buffer is not null)
            {
                return Task.FromResult<byte[]?>(buffer);
            }
        }

        return Task.FromResult<byte[]?>(null);
    }

    private static byte[]? TryReadFromMapping(int processId, uint eeAddress, int byteCount)
    {
        var mappingName = $"pcsx2_{processId}";
        var mappingHandle = OpenFileMapping(FileMapRead, false, mappingName);
        if (mappingHandle == IntPtr.Zero)
        {
            return null;
        }

        try
        {
            var view = MapViewOfFile(mappingHandle, FileMapRead, 0, 0, UIntPtr.Zero);
            if (view == IntPtr.Zero)
            {
                return null;
            }

            try
            {
                var buffer = new byte[byteCount];
                Marshal.Copy(IntPtr.Add(view, checked((int)eeAddress)), buffer, 0, byteCount);
                return buffer;
            }
            finally
            {
                UnmapViewOfFile(view);
            }
        }
        finally
        {
            CloseHandle(mappingHandle);
        }
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