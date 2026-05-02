using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;
using RatchetCompanion.Games.UYA.MP;

namespace RatchetCompanion.Games.UYA;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddUYAModule(this IServiceCollection services)
    {
        services.AddSingleton<UyaMemoryExample>();
        services.AddSingleton<UyaMpPlayerMemory>();
        services.AddSingleton<UyaMpMobyMemory>();
        services.AddSingleton<IGameModule, UyaGameModule>();
        return services;
    }
}