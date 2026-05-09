using System.Diagnostics;

namespace RatchetCompanion.PCSX2.Process;

public sealed class Pcsx2ProcessLocator(Pcsx2Options options)
{
    private const string Pcsx2SharedMemoryMarker = "/dev/shm/pcsx2_";

    public System.Diagnostics.Process? FindRunningProcess()
        => FindRunningProcesses().FirstOrDefault();

    public IReadOnlyList<System.Diagnostics.Process> FindRunningProcesses()
    {
        var allProcesses = System.Diagnostics.Process.GetProcesses();
        var directCandidates = allProcesses
            .Where(IsPcsx2Process)
            .OrderByDescending(GetProcessStartTimeOrMinValue)
            .ToArray();

        if (directCandidates.Length > 0)
        {
            return directCandidates;
        }

        var launcherChildCandidates = FindLauncherDescendantProcesses(allProcesses)
            .Where(IsPcsx2ProcessOrHasPcsx2Memory);

        var candidates = launcherChildCandidates
            .GroupBy(process => process.Id)
            .Select(group => group.First())
            .OrderByDescending(GetProcessStartTimeOrMinValue)
            .ToArray();

        return candidates;
    }

    public bool IsDescendantOfConfiguredLauncher(System.Diagnostics.Process process)
    {
        if (options.LauncherProcessNames.Length == 0 || !OperatingSystem.IsLinux())
        {
            return false;
        }

        var processesById = System.Diagnostics.Process.GetProcesses()
            .GroupBy(candidate => candidate.Id)
            .ToDictionary(group => group.Key, group => group.First());
        var visited = new HashSet<int>();
        var currentProcessId = process.Id;

        while (visited.Add(currentProcessId) &&
            processesById.TryGetValue(currentProcessId, out var currentProcess))
        {
            var parentProcessId = TryGetParentProcessId(currentProcess);
            if (!parentProcessId.HasValue ||
                parentProcessId.Value <= 0 ||
                !processesById.TryGetValue(parentProcessId.Value, out var parentProcess))
            {
                return false;
            }

            if (IsLauncherProcess(parentProcess))
            {
                return true;
            }

            currentProcessId = parentProcessId.Value;
        }

        return false;
    }

    public bool IsManagedByConfiguredLauncher(System.Diagnostics.Process process)
    {
        if (IsDescendantOfConfiguredLauncher(process))
        {
            return true;
        }

        if (options.LauncherManagedProcessCommandLineMarkers.Length == 0)
        {
            return false;
        }

        var commandLine = GetCommandLine(process);
        return !string.IsNullOrWhiteSpace(commandLine) &&
            options.LauncherManagedProcessCommandLineMarkers.Any(marker =>
                commandLine.Contains(marker, StringComparison.OrdinalIgnoreCase));
    }

    private IEnumerable<System.Diagnostics.Process> FindLauncherDescendantProcesses(
        IReadOnlyCollection<System.Diagnostics.Process> processes)
    {
        if (options.LauncherProcessNames.Length == 0)
        {
            return [];
        }

        var launcherProcessIds = processes
            .Where(IsLauncherProcess)
            .Select(process => process.Id)
            .ToHashSet();

        if (launcherProcessIds.Count == 0)
        {
            return [];
        }

        var childrenByParentId = processes
            .Select(process => new
            {
                Process = process,
                ParentProcessId = TryGetParentProcessId(process),
            })
            .Where(entry => entry.ParentProcessId.HasValue)
            .GroupBy(entry => entry.ParentProcessId!.Value)
            .ToDictionary(
                group => group.Key,
                group => group.Select(entry => entry.Process).ToArray());

        var descendants = new List<System.Diagnostics.Process>();
        var queue = new Queue<int>(launcherProcessIds);
        var visited = new HashSet<int>(launcherProcessIds);

        while (queue.Count > 0)
        {
            var parentProcessId = queue.Dequeue();
            if (!childrenByParentId.TryGetValue(parentProcessId, out var children))
            {
                continue;
            }

            foreach (var child in children)
            {
                if (!visited.Add(child.Id))
                {
                    continue;
                }

                descendants.Add(child);
                queue.Enqueue(child.Id);
            }
        }

        return descendants;
    }

    private bool IsLauncherProcess(System.Diagnostics.Process process)
    {
        var processName = NormalizeExecutableName(process.ProcessName);
        if (MatchesConfiguredLauncherCandidates(processName))
        {
            return true;
        }

        var commandLine = GetCommandLine(process);
        return !string.IsNullOrWhiteSpace(commandLine) && MatchesConfiguredLauncherCandidates(commandLine);
    }

    private bool IsPcsx2ProcessOrHasPcsx2Memory(System.Diagnostics.Process process)
    {
        if (IsPcsx2Process(process))
        {
            return true;
        }

        return OperatingSystem.IsLinux() && HasPcsx2SharedMemoryFileDescriptor(process.Id);
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

        var commandLine = GetCommandLine(process);
        if (!string.IsNullOrWhiteSpace(commandLine) && MatchesConfiguredCandidates(commandLine))
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

        var commandLine = GetCommandLine(process);
        if (!string.IsNullOrWhiteSpace(commandLine) && MatchesConfiguredCandidates(commandLine))
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

        var commandLine = GetCommandLine(process);
        if (!string.IsNullOrWhiteSpace(commandLine) && MatchesConfiguredCandidates(commandLine))
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
                   value.Contains(normalizedCandidate, StringComparison.OrdinalIgnoreCase) ||
                   value.Contains(candidate, StringComparison.OrdinalIgnoreCase);
        });
    }

    private bool MatchesConfiguredLauncherCandidates(string value)
    {
        var normalizedValue = NormalizeExecutableName(value);

        return options.LauncherProcessNames.Any(candidate =>
        {
            var normalizedCandidate = NormalizeExecutableName(candidate);

            return normalizedValue.Equals(normalizedCandidate, StringComparison.OrdinalIgnoreCase) ||
                   normalizedValue.Contains(normalizedCandidate, StringComparison.OrdinalIgnoreCase) ||
                   value.Contains(candidate, StringComparison.OrdinalIgnoreCase);
        });
    }

    private static int? TryGetParentProcessId(System.Diagnostics.Process process)
    {
        if (!OperatingSystem.IsLinux())
        {
            return null;
        }

        try
        {
            var statusPath = $"/proc/{process.Id}/status";
            foreach (var line in File.ReadLines(statusPath))
            {
                if (!line.StartsWith("PPid:", StringComparison.Ordinal))
                {
                    continue;
                }

                var value = line["PPid:".Length..].Trim();
                return int.TryParse(value, out var parentProcessId) ? parentProcessId : null;
            }
        }
        catch
        {
            // Ignore inaccessible or transient proc entries.
        }

        return null;
    }

    private static string? GetCommandLine(System.Diagnostics.Process process)
    {
        if (!OperatingSystem.IsLinux())
        {
            return null;
        }

        try
        {
            var bytes = File.ReadAllBytes($"/proc/{process.Id}/cmdline");
            if (bytes.Length == 0)
            {
                return null;
            }

            return System.Text.Encoding.UTF8.GetString(bytes).Replace('\0', ' ');
        }
        catch
        {
            // Ignore inaccessible or transient proc entries.
            return null;
        }
    }

    private static bool HasPcsx2SharedMemoryFileDescriptor(int processId)
    {
        var fdDirectory = $"/proc/{processId}/fd";
        string[] fdPaths;

        try
        {
            if (!Directory.Exists(fdDirectory))
            {
                return false;
            }

            fdPaths = Directory.GetFiles(fdDirectory);
        }
        catch
        {
            return false;
        }

        foreach (var fdPath in fdPaths)
        {
            try
            {
                var target = File.ResolveLinkTarget(fdPath, returnFinalTarget: true)?.FullName;
                if (!string.IsNullOrWhiteSpace(target) &&
                    target.Contains(Pcsx2SharedMemoryMarker, StringComparison.Ordinal))
                {
                    return true;
                }
            }
            catch
            {
                // Ignore inaccessible or transient fd entries.
            }
        }

        return false;
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
