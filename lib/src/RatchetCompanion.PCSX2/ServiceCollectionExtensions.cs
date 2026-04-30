using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using RatchetCompanion.Core.PCSX2;
using RatchetCompanion.PCSX2.Pine;
using RatchetCompanion.PCSX2.Process;

namespace RatchetCompanion.PCSX2;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddPcsx2Runtime(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<Pcsx2Options>(configuration.GetSection("PCSX2"));
        services.AddSingleton(sp => sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<Pcsx2Options>>().Value);
        services.AddSingleton<Pcsx2ProcessLocator>();
        services.AddSingleton<PineProbeClient>();
        services.AddSingleton<PineGameInfoClient>();
        services.AddSingleton<IPcsx2Runtime, Pcsx2Runtime>();
        return services;
    }
}