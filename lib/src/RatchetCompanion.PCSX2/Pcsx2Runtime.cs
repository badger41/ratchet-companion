using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.PCSX2.Pine;
using RatchetCompanion.PCSX2.Process;

namespace RatchetCompanion.PCSX2;

public sealed class Pcsx2Runtime(
    Pcsx2ProcessLocator processLocator,
    PineGameInfoClient pineGameInfoClient,
    LinuxPcsx2ProcessMemoryReader linuxProcessMemoryReader,
    WindowsPcsx2ProcessMemoryReader windowsProcessMemoryReader) : IPcsx2Runtime
{
    private volatile bool _isSessionActive;
    private volatile bool _isManuallyDisconnected;

    public async Task<bool> ConnectAsync(CancellationToken cancellationToken = default)
    {
        _isManuallyDisconnected = false;
        var state = await GetConnectionStateAsync(cancellationToken);
        _isSessionActive = state.IsProcessRunning && state.IsConnectedToPine;
        return _isSessionActive;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
        => DisconnectCoreAsync(cancellationToken);

    public async Task<Pcsx2ConnectionState> GetConnectionStateAsync(CancellationToken cancellationToken = default)
    {
        var process = processLocator.FindRunningProcess();
        var isPineAvailable = false;

        if (!_isManuallyDisconnected)
        {
            var pineResult = await pineGameInfoClient.GetConnectionStatusAsync(cancellationToken);
            isPineAvailable = pineResult.IsReachable;
        }

        if (_isManuallyDisconnected)
        {
            _isSessionActive = false;
        }
        else if (process is not null && isPineAvailable)
        {
            _isSessionActive = true;
        }
        else if (_isSessionActive && (process is null || !isPineAvailable))
        {
            _isSessionActive = false;
        }

        var state = new Pcsx2ConnectionState(
            IsSessionActive: _isSessionActive,
            IsProcessRunning: process is not null,
            IsConnectedToPine: _isManuallyDisconnected ? false : isPineAvailable,
            ProcessName: process?.ProcessName,
            ProcessId: process?.Id);

        return state;
    }

    public Task<GameDetectionResult> DetectGameAsync(CancellationToken cancellationToken = default)
        => DetectGameCoreAsync(cancellationToken);

    public async Task<uint?> ReadUInt32Async(uint address, CancellationToken cancellationToken = default)
    {
        if (_isManuallyDisconnected)
        {
            return null;
        }

        var result = await pineGameInfoClient.QueryUInt32Async(address, cancellationToken);
        return result.IsSuccessful ? result.Value : null;
    }

    private async Task DisconnectCoreAsync(CancellationToken cancellationToken)
    {
        _isManuallyDisconnected = true;
        _isSessionActive = false;
        await pineGameInfoClient.DisconnectAsync(cancellationToken);
    }

    public async Task<byte[]?> ReadMemoryAsync(uint address, int byteCount, CancellationToken cancellationToken = default)
    {
        if (_isManuallyDisconnected)
        {
            return null;
        }

        if (byteCount <= 0)
        {
            return [];
        }

        if (OperatingSystem.IsLinux())
        {
            return await linuxProcessMemoryReader.ReadEeMemoryAsync(address, byteCount, cancellationToken);
        }

        if (OperatingSystem.IsWindows())
        {
            return await windowsProcessMemoryReader.ReadEeMemoryAsync(address, byteCount, cancellationToken);
        }

        var buffer = new byte[byteCount];
        var bytesRead = 0;

        while (bytesRead < byteCount)
        {
            var chunkAddress = address + (uint)bytesRead;
            var chunkValue = await ReadUInt32Async(chunkAddress, cancellationToken);

            if (!chunkValue.HasValue)
            {
                return null;
            }

            var chunkBytes = BitConverter.GetBytes(chunkValue.Value);
            var bytesToCopy = Math.Min(sizeof(uint), byteCount - bytesRead);
            Array.Copy(chunkBytes, 0, buffer, bytesRead, bytesToCopy);
            bytesRead += bytesToCopy;
        }

        return buffer;
    }

    private async Task<GameDetectionResult> DetectGameCoreAsync(CancellationToken cancellationToken)
    {
        if (_isManuallyDisconnected)
        {
            return new GameDetectionResult(
                GameId.Unknown,
                "Disconnected",
                Version: null,
                IsSupported: false);
        }

        var titleResult = await pineGameInfoClient.QueryTitleAsync(cancellationToken);
        var serialResult = await pineGameInfoClient.QuerySerialAsync(cancellationToken);

        if (!titleResult.IsSuccessful && !serialResult.IsSuccessful)
        {
            return new GameDetectionResult(
                GameId.Unknown,
                "No supported Ratchet & Clank title detected",
                Version: null,
                IsSupported: false);
        }

        var title = titleResult.Value;
        var serial = serialResult.Value;
        var gameId = MapGameId(title, serial);
        var displayName = string.IsNullOrWhiteSpace(title)
            ? (serial ?? "Unknown loaded title")
            : title!;

        return new GameDetectionResult(
            gameId,
            displayName,
            Version: serial is null ? null : new GameVersion("Unknown", serial),
            IsSupported: gameId is not GameId.Unknown);
    }

    private static GameId MapGameId(string? title, string? serial)
    {
        var normalizedSerial = serial?.Trim().ToUpperInvariant();

        if (normalizedSerial is "SCUS-97199")
            return GameId.RAC1;

        if (normalizedSerial is "SCUS-97268")
            return GameId.GC;

        if (normalizedSerial is "SCUS-97353")
            return GameId.UYA;

        if (normalizedSerial is "SCUS-97465")
            return GameId.DL;

        return GameId.Unknown;
    }
}