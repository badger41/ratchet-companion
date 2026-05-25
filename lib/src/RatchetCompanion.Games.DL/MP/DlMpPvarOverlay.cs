using RatchetCompanion.Core.Data;
using System.Text.Json;

namespace RatchetCompanion.Games.DL.MP;

public sealed record DlMpPvarMetadata(string Name, int ByteCount);

public sealed class DlMpPvarOverlay
{
    private const int DlRcVersion = 4;

    private readonly object _entriesLock = new();
    private IReadOnlyDictionary<ushort, DlMpPvarMetadata> _entries = new Dictionary<ushort, DlMpPvarMetadata>();
    private string? _entriesPath;
    private DateTime _entriesLastWriteTimeUtc = DateTime.MinValue;

    public DlMpPvarMetadata? Find(ushort oClass)
        => GetEntries().TryGetValue(oClass, out var entry) ? entry : null;

    private IReadOnlyDictionary<ushort, DlMpPvarMetadata> GetEntries()
    {
        var path = PvarOverlayFile.ResolvePath();
        var lastWriteTimeUtc = File.GetLastWriteTimeUtc(path);

        lock (_entriesLock)
        {
            if (!File.Exists(path))
            {
                _entries = new Dictionary<ushort, DlMpPvarMetadata>();
                _entriesPath = path;
                _entriesLastWriteTimeUtc = lastWriteTimeUtc;
                return _entries;
            }

            if (
                string.Equals(_entriesPath, path, StringComparison.Ordinal) &&
                _entriesLastWriteTimeUtc == lastWriteTimeUtc)
            {
                return _entries;
            }

            _entries = LoadEntries();
            _entriesPath = path;
            _entriesLastWriteTimeUtc = lastWriteTimeUtc;
            return _entries;
        }
    }

    private static IReadOnlyDictionary<ushort, DlMpPvarMetadata> LoadEntries()
    {
        List<PvarOverlayEntry> entries;

        try
        {
            using var stream = PvarOverlayFile.OpenRead();
            entries = JsonSerializer.Deserialize<List<PvarOverlayEntry>>(stream) ?? [];
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException)
        {
            return new Dictionary<ushort, DlMpPvarMetadata>();
        }

        return entries
            .Where(entry =>
                entry.RCVersion == DlRcVersion &&
                !string.IsNullOrWhiteSpace(entry.Name) &&
                entry.MobyOClass is >= ushort.MinValue and <= ushort.MaxValue &&
                entry.Length is > 0)
            .GroupBy(entry => (ushort)entry.MobyOClass!.Value)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var entry = group.First();
                    return new DlMpPvarMetadata(entry.Name!, entry.Length!.Value);
                });
    }

    private sealed class PvarOverlayEntry
    {
        public string? Name { get; init; }
        public int? RCVersion { get; init; }
        public int? MobyOClass { get; init; }
        public int? Length { get; init; }
    }
}
