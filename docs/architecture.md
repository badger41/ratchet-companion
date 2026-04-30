# Ratchet Companion Architecture

## Goals

- Use C#/.NET for all PCSX2 integration concerns.
- Use Electron + React for the desktop UI.
- Keep emulator access generic while isolating game-specific logic per title.
- Communicate between UI and backend over a loopback-only localhost API.

## Layers

### `ui/`

- Electron main process boots the desktop shell.
- Electron preload exposes a minimal trusted surface to the renderer.
- React renderer owns interface layout, status views, and future tooling panels.

### `lib/src/RatchetCompanion.Host`

- ASP.NET Core host bound to `127.0.0.1:48123`
- Provides local API endpoints for UI consumption
- Composes shared runtime services and all game modules

### `lib/src/RatchetCompanion.PCSX2`

- Process discovery
- Memory read/write abstractions
- PINE client integration
- Emulator state monitoring

### `lib/src/RatchetCompanion.Core`

- Shared contracts such as `IGameModule`
- Game ID and version models
- Registry and app-level abstractions

### `lib/src/RatchetCompanion.Games.*`

One project per title:

- `RAC1`
- `GC`
- `UYA`
- `DL`

Each project should eventually contain:

- `Detection/`
- `Offsets/`
- `Structures/`
- `Readers/`
- `Features/`

## Why localhost?

Electron talking to a local .NET backend over localhost is a practical desktop architecture because it:

- keeps C# emulator logic isolated from UI concerns,
- makes backend debugging and testing straightforward,
- creates a clean contract between frontend and backend,
- and leaves room for future tooling reuse.

The backend should remain loopback-only and not expose external network access.