using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.PCSX2.Pine;
using RatchetCompanion.PCSX2.Process;

namespace RatchetCompanion.PCSX2;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPcsx2Runtime(this IServiceCollection services, Pcsx2Options options)
    {
        services.AddSingleton(options);
        services.AddSingleton<Pcsx2ProcessLocator>();
        services.AddSingleton<LinuxPcsx2ProcessMemoryReader>();
        services.AddSingleton<WindowsPcsx2ProcessMemoryReader>();
        services.AddSingleton<PineProbeClient>();
        services.AddSingleton<PineGameInfoClient>();
        services.AddSingleton<Pcsx2MemoryWatchService>();
        services.AddSingleton<IWatchedMemoryTracker>(sp => sp.GetRequiredService<Pcsx2MemoryWatchService>());
        services.AddHostedService(sp => sp.GetRequiredService<Pcsx2MemoryWatchService>());
        services.AddSingleton<IPcsx2Runtime, Pcsx2Runtime>();
        return services;
    }
}
