using RatchetCompanion.Core.Data;
using System.Text.Json;

namespace RatchetCompanion.Games.UYA.MP;

public sealed record UyaMpPvarMetadata(string Name, int ByteCount);

public sealed class UyaMpPvarOverlay
{
    private const int UyaRcVersion = 3;

    private readonly object _entriesLock = new();
    private IReadOnlyDictionary<ushort, UyaMpPvarMetadata> _entries = new Dictionary<ushort, UyaMpPvarMetadata>();
    private string? _entriesPath;
    private DateTime _entriesLastWriteTimeUtc = DateTime.MinValue;

    public UyaMpPvarMetadata? Find(ushort oClass)
        => GetEntries().TryGetValue(oClass, out var entry) ? entry : null;

    private IReadOnlyDictionary<ushort, UyaMpPvarMetadata> GetEntries()
    {
        var path = PvarOverlayFile.ResolvePath();
        var lastWriteTimeUtc = File.GetLastWriteTimeUtc(path);

        lock (_entriesLock)
        {
            if (!File.Exists(path))
            {
                _entries = new Dictionary<ushort, UyaMpPvarMetadata>();
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

    private static IReadOnlyDictionary<ushort, UyaMpPvarMetadata> LoadEntries()
    {
        List<PvarOverlayEntry> entries;

        try
        {
            using var stream = PvarOverlayFile.OpenRead();
            entries = JsonSerializer.Deserialize<List<PvarOverlayEntry>>(stream) ?? [];
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or JsonException)
        {
            return new Dictionary<ushort, UyaMpPvarMetadata>();
        }

        return entries
            .Where(entry =>
                entry.RCVersion == UyaRcVersion &&
                !string.IsNullOrWhiteSpace(entry.Name) &&
                entry.Length is > 0)
            .SelectMany(entry => GetMobyOClasses(entry).Select(oClass => (oClass, entry)))
            .GroupBy(item => item.oClass)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var entry = group.First().entry;
                    return new UyaMpPvarMetadata(entry.Name!, entry.Length!.Value);
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
        public int? Length { get; init; }
    }
}
