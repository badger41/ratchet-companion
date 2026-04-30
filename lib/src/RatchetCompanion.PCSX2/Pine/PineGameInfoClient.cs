using System.Net.Sockets;
using System.Text;

namespace RatchetCompanion.PCSX2.Pine;

public sealed class PineGameInfoClient(Pcsx2Options options)
{
    private const byte MsgTitle = 0x0B;
    private const byte MsgId = 0x0C;

    public Task<PineStringQueryResult> QueryTitleAsync(CancellationToken cancellationToken = default)
        => QueryStringAsync(MsgTitle, cancellationToken);

    public Task<PineStringQueryResult> QuerySerialAsync(CancellationToken cancellationToken = default)
        => QueryStringAsync(MsgId, cancellationToken);

    private async Task<PineStringQueryResult> QueryStringAsync(byte opcode, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(options.PineSocketPath) && OperatingSystem.IsLinux())
        {
            return await QueryUnixSocketAsync(options.PineSocketPath, opcode, cancellationToken);
        }

        using var tcpClient = new TcpClient();
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);

        try
        {
            await tcpClient.ConnectAsync(options.PineHost, options.PinePort, timeoutCts.Token);
            await using var stream = tcpClient.GetStream();

            var request = BuildRequest(opcode);
            await stream.WriteAsync(request, timeoutCts.Token);

            var responseLengthBytes = await ReadExactlyAsync(stream, 4, timeoutCts.Token);
            var responseLength = BitConverter.ToUInt32(responseLengthBytes, 0);

            if (responseLength < 5)
            {
                return new PineStringQueryResult(false, null, "PINE response was shorter than expected.");
            }

            var payload = await ReadExactlyAsync(stream, (int)responseLength - 4, timeoutCts.Token);
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
        catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
        {
            return new PineStringQueryResult(false, null, exception.Message);
        }
    }

    private async Task<PineStringQueryResult> QueryUnixSocketAsync(string socketPath, byte opcode, CancellationToken cancellationToken)
    {
        using var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);

        try
        {
            await socket.ConnectAsync(new UnixDomainSocketEndPoint(socketPath), timeoutCts.Token);
            using var stream = new NetworkStream(socket, ownsSocket: false);

            var request = BuildRequest(opcode);
            await stream.WriteAsync(request, timeoutCts.Token);

            var responseLengthBytes = await ReadExactlyAsync(stream, 4, timeoutCts.Token);
            var responseLength = BitConverter.ToUInt32(responseLengthBytes, 0);

            if (responseLength < 5)
            {
                return new PineStringQueryResult(false, null, "PINE response was shorter than expected.");
            }

            var payload = await ReadExactlyAsync(stream, (int)responseLength - 4, timeoutCts.Token);
            return ParseStringPayload(payload);
        }
        catch (Exception exception) when (exception is SocketException or IOException or OperationCanceledException)
        {
            return new PineStringQueryResult(false, null, exception.Message);
        }
    }

    private static byte[] BuildRequest(byte opcode)
    {
        var request = new byte[5];
        BitConverter.GetBytes((uint)5).CopyTo(request, 0);
        request[4] = opcode;
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