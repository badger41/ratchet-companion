# ratchet-companion
Companion app for the ratchet and clank ps2 series, for use with PCSX2.

## Workspace layout

- `lib/` — .NET 9 backend solution and emulator integration libraries
- `ui/` — Electron + React + Vite + TypeScript desktop UI
- `docs/` — architecture notes and per-game research

## Backend projects

- `RatchetCompanion.Host` — loopback-only ASP.NET Core host for the desktop app
- `RatchetCompanion.PCSX2` — shared PCSX2 runtime abstractions and future memory/PINE access
- `RatchetCompanion.Core` — shared contracts, game IDs, detection models, and registries
- `RatchetCompanion.Games.RAC1`
- `RatchetCompanion.Games.GC`
- `RatchetCompanion.Games.UYA`
- `RatchetCompanion.Games.DL`

Each game gets its own isolated module so offsets, structures, readers, and feature logic can diverge cleanly.

## Development

Run everything from the repo root:

```bash
npm run dev
```

That root script delegates to the Electron UI workspace and starts:

- Vite renderer
- Electron shell
- local .NET backend host

If `npm run dev` fails because port `5173` or `48123` is already in use, it usually means you still have an earlier dev session running. Stop the previous session first, then rerun the command.

The root `npm run dev` command now performs a preflight port check and will fail early with a clearer message before trying to boot Electron, Vite, and .NET.

Other useful scripts from the repo root:

```bash
npm run dev:backend
npm run build
npm run build:all
npm run build:backend
npm run build:ui
npm run build:linux
npm run build:linux:framework
npm run build:windows
npm run build:windows:framework
```

Script intent at the repo root:

- `npm run build` — compile/build all layers without packaging
- `npm run build:all` — produce packaged platform artifacts (currently Linux + Windows)

Backend only:

```bash
dotnet run --project lib/src/RatchetCompanion.Host/RatchetCompanion.Host.csproj
```

UI workspace directly:

```bash
cd ui
npm run dev
```

## Linux production build

To generate a production Linux AppImage from the repo root:

```bash
npm run build:linux
```

That flow now:

- publishes the .NET backend as a self-contained `linux-x64` single-file executable
- builds the React renderer and Electron main/preload bundles
- packages everything with `electron-builder`
- emits a standalone AppImage in `build/release-linux/`

Expected output:

- `build/release-linux/Ratchet Companion-0.0.0-x86_64.AppImage`

The packaged Electron app starts the bundled backend automatically from its `resources/backend/` folder in production.

The Linux production build is now orchestrated from the repo root. Root-level scripts own the cross-project product build, while `ui/` is limited to UI-local build steps like renderer and Electron compilation.

### Framework-dependent Linux build

If you want a smaller Linux artifact and are okay requiring a machine with the .NET 9 runtime already installed:

```bash
npm run build:linux:framework
```

That variant outputs to:

- `build/release-linux-framework/Ratchet Companion-0.0.0-x86_64.AppImage`

This is smaller than the self-contained AppImage, but it depends on the target system already having the right .NET runtime available.

Shared packaging artifacts are also now written under the repo-level `build/` directory instead of under `ui/`, so final outputs and intermediate release assets live at the product layer rather than inside the UI workspace.

## Windows production build

To generate a production Windows package from the repo root:

```bash
npm run build:windows
```

Framework-dependent variant:

```bash
npm run build:windows:framework
```

These flows publish the backend for `win-x64`, build the UI/Electron assets, and package a Windows ZIP under:

- `build/release-win/`
- `build/release-win-framework/`

Notes:

- the Windows packaging config lives in `ui/electron-builder.windows.json`
- the current Windows target is `zip`, which is a safe cross-platform artifact to generate from Linux
- installer-style targets like NSIS usually require additional Windows-oriented tooling such as `wine` and `makensis`
