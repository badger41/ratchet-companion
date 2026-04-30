using System.Net.Sockets;

namespace RatchetCompanion.PCSX2.Pine;

public sealed class PineProbeClient(Pcsx2Options options)
{
    public async Task<PineProbeResult> ProbeAsync(CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(options.PineSocketPath) && OperatingSystem.IsLinux())
        {
            return await ProbeUnixSocketAsync(options.PineSocketPath, cancellationToken);
        }

        using var tcpClient = new TcpClient();
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);

        try
        {
            await tcpClient.ConnectAsync(options.PineHost, options.PinePort, timeoutCts.Token);

            return new PineProbeResult(
                IsReachable: true,
                Endpoint: $"{options.PineHost}:{options.PinePort}",
                FailureReason: null);
        }
        catch (Exception exception) when (exception is SocketException or OperationCanceledException)
        {
            return new PineProbeResult(
                IsReachable: false,
                Endpoint: $"{options.PineHost}:{options.PinePort}",
                FailureReason: exception.Message);
        }
    }

    private async Task<PineProbeResult> ProbeUnixSocketAsync(string socketPath, CancellationToken cancellationToken)
    {
        using var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);

        try
        {
            await socket.ConnectAsync(new UnixDomainSocketEndPoint(socketPath), timeoutCts.Token);

            return new PineProbeResult(
                IsReachable: true,
                Endpoint: socketPath,
                FailureReason: null);
        }
        catch (Exception exception) when (exception is SocketException or OperationCanceledException)
        {
            return new PineProbeResult(
                IsReachable: false,
                Endpoint: socketPath,
                FailureReason: exception.Message);
        }
    }
}