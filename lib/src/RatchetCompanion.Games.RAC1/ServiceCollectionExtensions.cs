using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.RAC1;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRAC1Module(this IServiceCollection services)
    {
        services.AddSingleton<IGameModule, Rac1GameModule>();
        return services;
    }
}