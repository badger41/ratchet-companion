using RatchetCompanion.Core.Games;
using RatchetCompanion.Core.PCSX2;

namespace RatchetCompanion.Host;

public sealed class StatusSnapshotFactory(IPcsx2Runtime pcsx2Runtime, IGameModuleRegistry gameModuleRegistry)
{
    public async Task<Pcsx2StatusSnapshot> CreateAsync(CancellationToken cancellationToken = default)
    {
        var connection = await pcsx2Runtime.GetConnectionStateAsync(cancellationToken);
        var detection = await pcsx2Runtime.DetectGameAsync(cancellationToken);
        var hasLivePineData = detection.DisplayName is not "Disconnected" and not "No supported Ratchet & Clank title detected";

        if (hasLivePineData && (!connection.IsSessionActive || !connection.IsConnectedToPine || !connection.IsProcessRunning))
        {
            connection = connection with
            {
                IsSessionActive = true,
                IsConnectedToPine = true,
                IsProcessRunning = true,
            };
        }

        var module = gameModuleRegistry.Get(detection.GameId);

        return new Pcsx2StatusSnapshot(
            Backend: "RatchetCompanion.Host",
            Connection: connection,
            Detection: detection,
            Module: module is null
                ? null
                : new GameModuleSummary(
                    GameId: module.GameId.ToString(),
                    DisplayName: module.DisplayName,
                    Capabilities: module.Capabilities));
    }
}