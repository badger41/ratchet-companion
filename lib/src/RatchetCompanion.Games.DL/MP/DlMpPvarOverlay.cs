using RatchetCompanion.Core.Data;
using System.Text.Json;

namespace RatchetCompanion.Games.DL.MP;

public sealed record DlMpPvarMetadata(string Name, int ByteCount, string? NetObjectDataType);

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
                entry.Length is > 0)
            .SelectMany(entry => GetMobyOClasses(entry).Select(oClass => (oClass, entry)))
            .GroupBy(item => item.oClass)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var entry = group.First().entry;
                    return new DlMpPvarMetadata(entry.Name!, entry.Length!.Value, entry.NetObjectDataType);
                });
    }

    private static IEnumerable<ushort> GetMobyOClasses(PvarOverlayEntry entry)
    {
        if (entry.MobyOClass is >= ushort.MinValue and <= ushort.MaxValue)
        {
            yield return (ushort)entry.MobyOClass.Value;
        }

        foreach (var oClass in entry.MobyOClasses ?? [])
        {
            if (oClass is >= ushort.MinValue and <= ushort.MaxValue)
            {
                yield return (ushort)oClass;
            }
        }
    }

    private sealed class PvarOverlayEntry
    {
        public string? Name { get; init; }
        public int? RCVersion { get; init; }
        public int? MobyOClass { get; init; }
        public IReadOnlyList<int>? MobyOClasses { get; init; }
        public string? NetObjectDataType { get; init; }
        public int? Length { get; init; }
    }
}
