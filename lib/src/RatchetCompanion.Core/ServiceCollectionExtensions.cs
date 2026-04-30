using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Core;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddGameModuleRegistry(this IServiceCollection services)
    {
        services.AddSingleton<IGameModuleRegistry, GameModuleRegistry>();
        return services;
    }
}