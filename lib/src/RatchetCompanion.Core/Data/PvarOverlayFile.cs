namespace RatchetCompanion.Core.Data;

public static class PvarOverlayFile
{
    public const string FileName = "pvar_overlay.json";
    public const string EnvironmentVariableName = "RATCHET_COMPANION_PVAR_OVERLAY_PATH";

    public static string ResolvePath()
    {
        var configuredPath = Environment.GetEnvironmentVariable(EnvironmentVariableName);

        if (!string.IsNullOrWhiteSpace(configuredPath))
        {
            return configuredPath;
        }

        var appDirectoryPath = Path.Combine(AppContext.BaseDirectory, FileName);

        if (File.Exists(appDirectoryPath))
        {
            return appDirectoryPath;
        }

        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            var repositoryPath = Path.Combine(directory.FullName, "ui", "src", "data", FileName);

            if (File.Exists(repositoryPath))
            {
                return repositoryPath;
            }

            directory = directory.Parent;
        }

        return appDirectoryPath;
    }

    public static FileStream OpenRead()
    {
        var path = ResolvePath();

        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"PVAR overlay file '{FileName}' was not found at '{path}'.", path);
        }

        return File.OpenRead(path);
    }
}
