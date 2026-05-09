using System.Net.Sockets;

namespace RatchetCompanion.PCSX2.Pine;

public sealed class PineProbeClient(Pcsx2Options options)
{
    public async Task<PineProbeResult> ProbeAsync(CancellationToken cancellationToken = default)
    {
        PineProbeResult? lastFailure = null;

        foreach (var endpoint in PineEndpointResolver.GetCandidates(options))
        {
            var result = endpoint.Kind switch
            {
                PineEndpointKind.UnixSocket => await ProbeUnixSocketAsync(endpoint, cancellationToken),
                PineEndpointKind.Tcp => await ProbeTcpAsync(endpoint, cancellationToken),
                _ => throw new InvalidOperationException($"Unknown PINE endpoint kind '{endpoint.Kind}'."),
            };

            if (result.IsReachable)
            {
                return result;
            }

            lastFailure = result;
        }

        return lastFailure ?? new PineProbeResult(false, "PINE", "No PINE endpoints were configured.");
    }

    private async Task<PineProbeResult> ProbeTcpAsync(PineEndpoint endpoint, CancellationToken cancellationToken)
    {
        using var tcpClient = new TcpClient();
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);

        try
        {
            await tcpClient.ConnectAsync(options.PineHost, options.PinePort, timeoutCts.Token);

            return new PineProbeResult(
                IsReachable: true,
                Endpoint: endpoint.Label,
                FailureReason: null);
        }
        catch (Exception exception) when (exception is SocketException or OperationCanceledException)
        {
            return new PineProbeResult(
                IsReachable: false,
                Endpoint: endpoint.Label,
                FailureReason: exception.Message);
        }
    }

    private async Task<PineProbeResult> ProbeUnixSocketAsync(PineEndpoint endpoint, CancellationToken cancellationToken)
    {
        using var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(options.PineTimeoutMilliseconds);

        try
        {
            await socket.ConnectAsync(new UnixDomainSocketEndPoint(endpoint.SocketPath!), timeoutCts.Token);

            return new PineProbeResult(
                IsReachable: true,
                Endpoint: endpoint.Label,
                FailureReason: null);
        }
        catch (Exception exception) when (exception is SocketException or OperationCanceledException)
        {
            return new PineProbeResult(
                IsReachable: false,
                Endpoint: endpoint.Label,
                FailureReason: exception.Message);
        }
    }
}
