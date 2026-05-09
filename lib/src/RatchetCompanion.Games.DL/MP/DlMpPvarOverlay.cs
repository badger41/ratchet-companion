using System.Reflection;
using System.Text.Json;

namespace RatchetCompanion.Games.DL.MP;

public sealed record DlMpPvarMetadata(string Name, int ByteCount);

public sealed class DlMpPvarOverlay
{
    private const int DlRcVersion = 4;
    private const string ResourceName = "RatchetCompanion.Games.DL.Data.pvar_overlay.json";

    private readonly Lazy<IReadOnlyDictionary<ushort, DlMpPvarMetadata>> _entries = new(LoadEntries);

    public DlMpPvarMetadata? Find(ushort oClass)
        => _entries.Value.TryGetValue(oClass, out var entry) ? entry : null;

    private static IReadOnlyDictionary<ushort, DlMpPvarMetadata> LoadEntries()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded pvar overlay resource '{ResourceName}' was not found.");

        var entries = JsonSerializer.Deserialize<List<PvarOverlayEntry>>(stream) ?? [];
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
