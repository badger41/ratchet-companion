using System.Net.Sockets;
using System.Text;

namespace RatchetCompanion.PCSX2.Pine;

public sealed class PineGameInfoClient(Pcsx2Options options)
{
    private const byte MsgRead32 = 0x02;
    private const byte MsgTitle = 0x0B;
    private const byte MsgId = 0x0C;
    private const byte MsgStatus = 0x0F;
    private const int MinimumQueryTimeoutMilliseconds = 1000;

    private readonly SemaphoreSlim _gate = new(1, 1);
    private TcpClient? _tcpClient;
    private Socket? _unixSocket;
    private NetworkStream? _stream;
    private string? _connectedEndpointLabel;
    private string? _lastAttemptedEndpointLabel;

    public Task<PineStringQueryResult> QueryTitleAsync(CancellationToken cancellationToken = default)
        => QueryStringAsync(MsgTitle, cancellationToken);

    public Task<PineStringQueryResult> QuerySerialAsync(CancellationToken cancellationToken = default)
        => QueryStringAsync(MsgId, cancellationToken);

    public Task<PineUInt32QueryResult> QueryUInt32Async(uint address, CancellationToken cancellationToken = default)
        => QueryUInt32CoreAsync(address, cancellationToken);

    public Task<PineUInt32QueryResult> QueryStatusAsync(CancellationToken cancellationToken = default)
        => QueryStatusCoreAsync(cancellationToken);

    public async Task<PineProbeResult> GetConnectionStatusAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            if (_stream is not null && IsConnectionAlive())
            {
                var currentStatus = await QueryStatusWithoutLockAsync(cancellationToken);
                if (currentStatus.IsSuccessful)
                {
                    return new PineProbeResult(true, GetEndpointLabel(), null);
                }

                await DisconnectCoreAsync();
            }

            PineProbeResult? lastFailure = null;

            foreach (var endpoint in PineEndpointResolver.GetCandidates(options))
            {
                _lastAttemptedEndpointLabel = endpoint.Label;

                try
                {
                    using var connectTimeoutCts = CreateConnectTimeout(cancellationToken);
                    await ConnectToEndpointAsync(endpoint, connectTimeoutCts.Token);

                    var status = await SendStatusQueryOnCurrentConnectionAsync(cancellationToken);
                    if (status.IsSuccessful)
                    {
                        return new PineProbeResult(true, GetEndpointLabel(), null);
                    }

                    lastFailure = new PineProbeResult(
                        false,
                        endpoint.Label,
                        status.FailureReason ?? "PINE did not respond to status query.");
                }
                catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
                {
                    lastFailure = new PineProbeResult(false, endpoint.Label, exception.Message);
                }

                await DisconnectCoreAsync();
            }

            return lastFailure ?? new PineProbeResult(false, GetEndpointLabel(), "No PINE endpoints were configured.");
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            await DisconnectCoreAsync();
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<PineStringQueryResult> QueryStringAsync(byte opcode, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            if (!await EnsureConnectedAsync(cancellationToken))
            {
                return new PineStringQueryResult(false, null, "Unable to connect to PINE.");
            }

            using var timeoutCts = CreateQueryTimeout(cancellationToken);
            var request = BuildRequest(opcode);
            await _stream!.WriteAsync(request, timeoutCts.Token);

            var responseLengthBytes = await ReadExactlyAsync(_stream, 4, timeoutCts.Token);
            var responseLength = BitConverter.ToUInt32(responseLengthBytes, 0);

            if (responseLength < 5)
            {
                return new PineStringQueryResult(false, null, "PINE response was shorter than expected.");
            }

            var payload = await ReadExactlyAsync(_stream, (int)responseLength - 4, timeoutCts.Token);
            return ParseStringPayload(payload);
        }
        catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
        {
            await DisconnectCoreAsync();
            return await RetryStringQueryOnceAsync(opcode, exception.Message, cancellationToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<PineUInt32QueryResult> QueryUInt32CoreAsync(uint address, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            if (!await EnsureConnectedAsync(cancellationToken))
            {
                return new PineUInt32QueryResult(false, null, "Unable to connect to PINE.");
            }

            using var timeoutCts = CreateQueryTimeout(cancellationToken);
            var request = BuildReadUInt32Request(address);
            await _stream!.WriteAsync(request, timeoutCts.Token);

            var responseLengthBytes = await ReadExactlyAsync(_stream, 4, timeoutCts.Token);
            var responseLength = BitConverter.ToUInt32(responseLengthBytes, 0);

            if (responseLength < 9)
            {
                return new PineUInt32QueryResult(false, null, "PINE response was shorter than expected.");
            }

            var payload = await ReadExactlyAsync(_stream, (int)responseLength - 4, timeoutCts.Token);
            return ParseUInt32Payload(payload);
        }
        catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
        {
            await DisconnectCoreAsync();
            return new PineUInt32QueryResult(false, null, exception.Message);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<PineUInt32QueryResult> QueryStatusCoreAsync(CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);

        try
        {
            return await QueryStatusWithoutLockAsync(cancellationToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    private async Task<PineUInt32QueryResult> QueryStatusWithoutLockAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (!await EnsureConnectedAsync(cancellationToken))
            {
                return new PineUInt32QueryResult(false, null, "Unable to connect to PINE.");
            }

            return await SendStatusQueryOnCurrentConnectionAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
        {
            await DisconnectCoreAsync();
            return new PineUInt32QueryResult(false, null, exception.Message);
        }
    }

    private async Task<bool> EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        if (_stream is not null && IsConnectionAlive())
        {
            return true;
        }

        await DisconnectCoreAsync();

        Exception? lastException = null;

        foreach (var endpoint in PineEndpointResolver.GetCandidates(options))
        {
            _lastAttemptedEndpointLabel = endpoint.Label;

            try
            {
                using var timeoutCts = CreateConnectTimeout(cancellationToken);
                await ConnectToEndpointAsync(endpoint, timeoutCts.Token);
                return true;
            }
            catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
            {
                lastException = exception;
                await DisconnectCoreAsync();
            }
        }

        if (lastException is not null)
        {
            throw lastException;
        }

        return false;
    }

    private async Task ConnectToEndpointAsync(PineEndpoint endpoint, CancellationToken cancellationToken)
    {
        if (endpoint.Kind is PineEndpointKind.UnixSocket)
        {
            var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
            await socket.ConnectAsync(new UnixDomainSocketEndPoint(endpoint.SocketPath!), cancellationToken);

            _unixSocket = socket;
            _stream = new NetworkStream(socket, ownsSocket: false);
            _connectedEndpointLabel = endpoint.Label;
            return;
        }

        var tcpClient = new TcpClient();
        await tcpClient.ConnectAsync(options.PineHost, options.PinePort, cancellationToken);

        _tcpClient = tcpClient;
        _stream = tcpClient.GetStream();
        _connectedEndpointLabel = endpoint.Label;
    }

    private async Task<PineUInt32QueryResult> SendStatusQueryOnCurrentConnectionAsync(CancellationToken cancellationToken)
    {
        using var timeoutCts = CreateQueryTimeout(cancellationToken);
        var request = BuildRequest(MsgStatus);
        await _stream!.WriteAsync(request, timeoutCts.Token);

        var responseLengthBytes = await ReadExactlyAsync(_stream, 4, timeoutCts.Token);
        var responseLength = BitConverter.ToUInt32(responseLengthBytes, 0);

        if (responseLength < 9)
        {
            return new PineUInt32QueryResult(false, null, "PINE status response was shorter than expected.");
        }

        var payload = await ReadExactlyAsync(_stream, (int)responseLength - 4, timeoutCts.Token);
        return ParseUInt32Payload(payload);
    }

    private bool IsConnectionAlive()
    {
        if (_tcpClient is not null)
        {
            return _tcpClient.Connected;
        }

        if (_unixSocket is not null)
        {
            return _unixSocket.Connected;
        }

        return false;
    }

    private async Task DisconnectCoreAsync()
    {
        if (_stream is not null)
        {
            await _stream.DisposeAsync();
            _stream = null;
        }

        _tcpClient?.Dispose();
        _tcpClient = null;

        _unixSocket?.Dispose();
        _unixSocket = null;

        _connectedEndpointLabel = null;
    }

    private string GetEndpointLabel()
        => _connectedEndpointLabel ?? _lastAttemptedEndpointLabel ?? PineEndpointResolver.GetCandidates(options).FirstOrDefault()?.Label ?? "PINE";

    private static byte[] BuildRequest(byte opcode)
    {
        var request = new byte[5];
        BitConverter.GetBytes((uint)5).CopyTo(request, 0);
        request[4] = opcode;
        return request;
    }

    private async Task<PineStringQueryResult> RetryStringQueryOnceAsync(
        byte opcode,
        string firstFailureReason,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!await EnsureConnectedAsync(cancellationToken))
            {
                return new PineStringQueryResult(false, null, firstFailureReason);
            }

            using var timeoutCts = CreateQueryTimeout(cancellationToken);
            var request = BuildRequest(opcode);
            await _stream!.WriteAsync(request, timeoutCts.Token);

            var responseLengthBytes = await ReadExactlyAsync(_stream, 4, timeoutCts.Token);
            var responseLength = BitConverter.ToUInt32(responseLengthBytes, 0);

            if (responseLength < 5)
            {
                return new PineStringQueryResult(false, null, "PINE response was shorter than expected.");
            }

            var payload = await ReadExactlyAsync(_stream, (int)responseLength - 4, timeoutCts.Token);
            return ParseStringPayload(payload);
        }
        catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
        {
            await DisconnectCoreAsync();
            return new PineStringQueryResult(false, null, $"{firstFailureReason}; retry failed: {exception.Message}");
        }
    }

    private CancellationTokenSource CreateQueryTimeout(CancellationToken cancellationToken)
    {
        var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(Math.Max(options.PineTimeoutMilliseconds, MinimumQueryTimeoutMilliseconds));
        return timeoutCts;
    }

    private CancellationTokenSource CreateConnectTimeout(CancellationToken cancellationToken)
    {
        var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);
        return timeoutCts;
    }

    private static byte[] BuildReadUInt32Request(uint address)
    {
        var request = new byte[9];
        BitConverter.GetBytes((uint)9).CopyTo(request, 0);
        request[4] = MsgRead32;
        BitConverter.GetBytes(address).CopyTo(request, 5);
        return request;
    }

    private static PineStringQueryResult ParseStringPayload(byte[] payload)
    {
        var status = payload[0];

        if (status != 0)
        {
            return new PineStringQueryResult(false, null, $"PINE returned failure status 0x{status:X2}.");
        }

        if (payload.Length < 5)
        {
            return new PineStringQueryResult(false, null, "PINE payload did not contain a string length.");
        }

        var stringLength = BitConverter.ToUInt32(payload, 1);
        var availableStringBytes = payload.Length - 5;
        var bytesToDecode = (int)Math.Min(stringLength, (uint)availableStringBytes);
        var value = Encoding.UTF8.GetString(payload, 5, bytesToDecode).TrimEnd('\0');

        return new PineStringQueryResult(true, value, null);
    }

    private static PineUInt32QueryResult ParseUInt32Payload(byte[] payload)
    {
        var status = payload[0];

        if (status != 0)
        {
            return new PineUInt32QueryResult(false, null, $"PINE returned failure status 0x{status:X2}.");
        }

        if (payload.Length < 5)
        {
            return new PineUInt32QueryResult(false, null, "PINE payload did not contain a 32-bit value.");
        }

        var value = BitConverter.ToUInt32(payload, 1);
        return new PineUInt32QueryResult(true, value, null);
    }

    private static async Task<byte[]> ReadExactlyAsync(NetworkStream stream, int byteCount, CancellationToken cancellationToken)
    {
        var buffer = new byte[byteCount];
        var offset = 0;

        while (offset < byteCount)
        {
            var bytesRead = await stream.ReadAsync(buffer.AsMemory(offset, byteCount - offset), cancellationToken);

            if (bytesRead == 0)
            {
                throw new IOException("PINE closed the connection before the full response was received.");
            }

            offset += bytesRead;
        }

        return buffer;
    }
}
