namespace RatchetCompanion.PCSX2.Pine;

internal enum PineEndpointKind
{
    UnixSocket,
    Tcp,
}

internal sealed record PineEndpoint(PineEndpointKind Kind, string Label, string? SocketPath = null);

internal static class PineEndpointResolver
{
    private const int DefaultPineSlot = 28011;

    public static IReadOnlyList<PineEndpoint> GetCandidates(Pcsx2Options options)
    {
        var candidates = new List<PineEndpoint>();

        if (OperatingSystem.IsLinux())
        {
            AddUnixSocketCandidates(candidates, options.PineSocketPath, options.PinePort);
        }

        candidates.Add(new PineEndpoint(PineEndpointKind.Tcp, $"{options.PineHost}:{options.PinePort}"));

        return candidates
            .DistinctBy(endpoint => endpoint.Label)
            .ToArray();
    }

    private static void AddUnixSocketCandidates(List<PineEndpoint> candidates, string? configuredSocketPath, int pinePort)
    {
        if (string.IsNullOrWhiteSpace(configuredSocketPath))
        {
            return;
        }

        candidates.Add(new PineEndpoint(
            PineEndpointKind.UnixSocket,
            configuredSocketPath,
            SocketPath: configuredSocketPath));

        AddDiscoveredUnixSocketCandidates(candidates, configuredSocketPath);

        if (pinePort != DefaultPineSlot)
        {
            var portSocketPath = $"{configuredSocketPath}.{pinePort}";
            candidates.Add(new PineEndpoint(
                PineEndpointKind.UnixSocket,
                portSocketPath,
                SocketPath: portSocketPath));
        }
    }

    private static void AddDiscoveredUnixSocketCandidates(List<PineEndpoint> candidates, string configuredSocketPath)
    {
        var directory = Path.GetDirectoryName(configuredSocketPath);
        var fileName = Path.GetFileName(configuredSocketPath);
        if (string.IsNullOrWhiteSpace(directory) || string.IsNullOrWhiteSpace(fileName))
        {
            return;
        }

        try
        {
            var discoveredSocketPaths = Directory
                .GetFiles(directory, $"{fileName}.*")
                .OrderByDescending(File.GetLastWriteTimeUtc);

            foreach (var socketPath in discoveredSocketPaths)
            {
                candidates.Add(new PineEndpoint(
                    PineEndpointKind.UnixSocket,
                    socketPath,
                    SocketPath: socketPath));
            }
        }
        catch
        {
            // Socket discovery is best-effort; configured endpoints still apply.
        }
    }
}
