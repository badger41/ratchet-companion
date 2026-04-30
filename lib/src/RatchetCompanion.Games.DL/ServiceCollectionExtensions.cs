using Microsoft.Extensions.DependencyInjection;
using RatchetCompanion.Core.Games;

namespace RatchetCompanion.Games.DL;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDLModule(this IServiceCollection services)
    {
        services.AddSingleton<IGameModule, DlGameModule>();
        return services;
    }
}