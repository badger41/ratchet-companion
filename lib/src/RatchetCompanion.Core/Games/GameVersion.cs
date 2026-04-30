namespace RatchetCompanion.Core.Games;

public sealed record GameVersion(string Region, string Build)
{
    public override string ToString() => $"{Region} / {Build}";
}