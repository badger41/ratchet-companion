using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.UYA;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddUYAModule(this IServiceCollection services)
    {
        services.AddSingleton<IGameModule, UyaGameModule>();
        return services;
    }
}