using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.GC;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddGCModule(this IServiceCollection services)
    {
        services.AddSingleton<IGameModule, GcGameModule>();
        return services;
    }
}