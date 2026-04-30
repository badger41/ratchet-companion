using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Core.PCSX2;

public interface IPcsx2Runtime
{
    Task<bool> ConnectAsync(CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task<Pcsx2ConnectionState> GetConnectionStateAsync(CancellationToken cancellationToken = default);
    Task<GameDetectionResult> DetectGameAsync(CancellationToken cancellationToken = default);
}