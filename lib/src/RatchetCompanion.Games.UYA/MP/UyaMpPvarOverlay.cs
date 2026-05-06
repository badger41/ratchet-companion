using System.Reflection;
using System.Text.Json;

namespace RatchetCompanion.Games.UYA.MP;

public sealed record UyaMpPvarMetadata(string Name, int ByteCount);

public sealed class UyaMpPvarOverlay
{
    private const int UyaRcVersion = 3;
    private const string ResourceName = "RatchetCompanion.Games.UYA.Data.pvar_overlay.json";

    private readonly Lazy<IReadOnlyDictionary<ushort, UyaMpPvarMetadata>> _entries = new(LoadEntries);

    public UyaMpPvarMetadata? Find(ushort oClass)
        => _entries.Value.TryGetValue(oClass, out var entry) ? entry : null;

    private static IReadOnlyDictionary<ushort, UyaMpPvarMetadata> LoadEntries()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded pvar overlay resource '{ResourceName}' was not found.");

        var entries = JsonSerializer.Deserialize<List<PvarOverlayEntry>>(stream) ?? [];
        return entries
            .Where(entry =>
                entry.RCVersion == UyaRcVersion &&
                !string.IsNullOrWhiteSpace(entry.Name) &&
                entry.MobyOClass is >= ushort.MinValue and <= ushort.MaxValue &&
                entry.Length is > 0)
            .GroupBy(entry => (ushort)entry.MobyOClass!.Value)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var entry = group.First();
                    return new UyaMpPvarMetadata(entry.Name!, entry.Length!.Value);
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
