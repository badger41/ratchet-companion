using System.Diagnostics;

namespace RatchetCompanion.PCSX2.Process;

public sealed class Pcsx2ProcessLocator(Pcsx2Options options)
{
    public System.Diagnostics.Process? FindRunningProcess()
    {
        var candidates = System.Diagnostics.Process.GetProcesses()
            .Where(IsPcsx2Process)
            .OrderByDescending(GetProcessStartTimeOrMinValue)
            .ToArray();

        return candidates.FirstOrDefault();
    }

    private bool IsPcsx2Process(System.Diagnostics.Process process)
    {
        if (OperatingSystem.IsWindows())
            return IsWindowsPcsx2Process(process);

        if (OperatingSystem.IsLinux())
            return IsLinuxPcsx2Process(process);

        return IsGenericPcsx2Process(process);
    }

    private bool IsWindowsPcsx2Process(System.Diagnostics.Process process)
    {
        var processName = NormalizeExecutableName(process.ProcessName);

        if (MatchesConfiguredCandidates(processName))
        {
            return true;
        }

        try
        {
            var mainModuleName = NormalizeExecutableName(process.MainModule?.ModuleName);
            if (!string.IsNullOrWhiteSpace(mainModuleName) && MatchesConfiguredCandidates(mainModuleName))
            {
                return true;
            }
        }
        catch
        {
            // Some processes deny module inspection; ignore and continue.
        }

        return false;
    }

    private bool IsLinuxPcsx2Process(System.Diagnostics.Process process)
    {
        var processName = NormalizeExecutableName(process.ProcessName);

        if (MatchesConfiguredCandidates(processName))
        {
            return true;
        }

        try
        {
            var mainModuleName = NormalizeExecutableName(process.MainModule?.ModuleName);
            if (!string.IsNullOrWhiteSpace(mainModuleName) && MatchesConfiguredCandidates(mainModuleName))
            {
                return true;
            }
        }
        catch
        {
            // Some processes deny module inspection; ignore and continue.
        }

        return false;
    }

    private bool IsGenericPcsx2Process(System.Diagnostics.Process process)
    {
        var processName = NormalizeExecutableName(process.ProcessName);

        if (MatchesConfiguredCandidates(processName))
        {
            return true;
        }

        try
        {
            var mainModuleName = NormalizeExecutableName(process.MainModule?.ModuleName);
            if (!string.IsNullOrWhiteSpace(mainModuleName) && MatchesConfiguredCandidates(mainModuleName))
            {
                return true;
            }
        }
        catch
        {
            // Some processes deny module inspection; ignore and continue.
        }

        return false;
    }

    private bool MatchesConfiguredCandidates(string value)
    {
        return options.ProcessNames.Any(candidate =>
        {
            var normalizedCandidate = NormalizeExecutableName(candidate);

            return value.Equals(normalizedCandidate, StringComparison.OrdinalIgnoreCase) ||
                   value.Contains(normalizedCandidate, StringComparison.OrdinalIgnoreCase);
        });
    }

    private static string NormalizeExecutableName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        try
        {
            return Path.GetFileNameWithoutExtension(value.Trim());
        }
        catch
        {
            return value.Trim();
        }
    }

    private static DateTime GetProcessStartTimeOrMinValue(System.Diagnostics.Process process)
    {
        try
        {
            return process.StartTime;
        }
        catch
        {
            return DateTime.MinValue;
        }
    }
}