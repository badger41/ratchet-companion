using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;
using RatchetCompanion.Games.DL.MP;

namespace RatchetCompanion.Games.DL;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDLModule(this IServiceCollection services)
    {
        services.AddSingleton<DlMpPvarOverlay>();
        services.AddSingleton<DlMpNetObjectCatalog>();
        services.AddSingleton<DlMpMobyMemory>();
        services.AddSingleton<IGameModule, DlGameModule>();
        return services;
    }
}
