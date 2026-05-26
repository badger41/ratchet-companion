# Ratchet Companion Steering Notes

This document is a handoff/steering guide for future contributors and agents working on `ratchet-companion`.

## High-Level Product Shape

- Backend: .NET 9 / ASP.NET Core minimal API under `lib/`
- Desktop shell + UI: Electron + React + Vite under `ui/`
- Backend is loopback-only and serves the UI over `http://127.0.0.1:48123`
- UI consumes backend state primarily through websocket push at `/ws/status`
- UI uses Cloudscape Design System components with dark mode enabled by default.

## Repo Structure Conventions

- `lib/src/RatchetCompanion.Core`
  - shared contracts and abstractions
- `lib/src/RatchetCompanion.PCSX2`
  - emulator/runtime integration
  - process discovery
  - PINE integration
  - direct memory readers
- `lib/src/RatchetCompanion.Host`
  - ASP.NET Core composition root
  - websocket/status endpoints
- `lib/src/RatchetCompanion.Games.*`
  - one project per game

## Important Architectural Decisions Already Made

### 1. Generic game snapshot envelope

Do **not** keep adding game-specific fields to the top-level PCSX2 status model.

Current pattern:
- `Pcsx2StatusSnapshot`
- `GameDataSnapshot`
- module-owned payloads

That means each game module is responsible for shaping its own payload and schema.

The UI should mirror those schemas in:
- `ui/src/models/gameDataSnapshot.ts`

Add new backend `GameDataSnapshot.Schema` values to the `GameDataPayloadBySchema`
map so TypeScript can narrow payloads by schema. Avoid UI-side JSON normalizers
for trusted backend contracts; prefer direct typed access after `schema` narrowing.

### 2. Module-owned snapshot creation

`StatusSnapshotFactory` should stay thin.

Game-specific snapshot construction belongs in modules implementing:
- `IGameDataSnapshotProvider`

Avoid reintroducing game-specific branching into `StatusSnapshotFactory`.

### 3. Backend-owned watch/push semantics

The UI should **not** poll memory addresses directly.

Current intent/pattern:
- backend watches memory
- backend caches state
- websocket pushes updated snapshots to UI

Key types:
- `IWatchedMemoryTracker`
- `Pcsx2MemoryWatchService`

### 4. Persistent PINE connection

The app previously opened and closed a new PINE socket per query, which caused excessive connection churn in PCSX2 logs.

Current direction:
- `PineGameInfoClient` keeps a persistent connection/session
- runtime should reconnect when needed
- UI manual disconnect should suppress reconnects until reconnected explicitly

Future work should preserve this low-overhead model.

## UYA-Specific Guidance

### 1. UYA should be split by domain: MP vs SP

This is an intentional direction now.

Current state:
- multiplayer-specific player reader has been moved under:
  - `lib/src/RatchetCompanion.Games.UYA/MP/UyaMpPlayerMemory.cs`

Guideline:
- keep shared UYA-wide helpers at root only if truly shared
- place multiplayer-only code under `UYA/MP/`
- place future singleplayer-only code under `UYA/SP/`

Do **not** mix SP and MP structures/readers in one flat UYA namespace if the underlying memory layouts differ.

### 2. Current UYA implementation is multiplayer-first

Things already implemented are MP-specific unless explicitly stated otherwise.

Examples:
- local player struct lookup
- local player position read
- current UYA player payload used by UI

Be cautious when generalizing UYA features without verifying SP layout/offsets separately.

## Memory Reading Strategy

### Linux

Linux reader was refactored away from `/proc/<pid>/mem` mapping-walk logic toward a shared-memory-backed approach.

Important PCSX2 behavior learned from source:
- PCSX2 creates shared data memory with `HostSys::CreateSharedMemory(HostSys::GetFileMappingName("pcsx2"), ...)`
- On Linux, that ends up as a shm-backed file object which may appear deleted from `/dev/shm`, but is still reachable via process FDs

Current implementation direction:
- Linux reader inspects `/proc/<pid>/fd/`
- finds the FD pointing to `/dev/shm/pcsx2_<pid> (deleted)`
- reads from that shared-memory-backed fd directly at EE offsets
- caches the open shared-memory fd per process so repeated reads do not rescan `/proc/<pid>/fd/`

### Windows

Windows reader should not rely on game-specific calibration values.

Important PCSX2 source findings:
- `HostSys::GetFileMappingName("pcsx2")` on Windows yields `pcsx2_<pid>`
- `CreateSharedMemory()` uses a named file mapping object
- `HostMemoryMap::EEmemOffset == 0x00000000`
- `HostMemoryMap::EEmem = s_data_memory + HostMemoryMap::EEmemOffset`

This means the preferred Windows strategy is:
- open the existing named mapping `pcsx2_<pid>`
- map a read-only view
- read EE RAM directly from offset `eeAddress`
- cache the mapping handle/view per process so hot reads avoid reopening the named mapping

That is much better than the earlier heuristic region scan and much better than UYA-specific calibration.

### Do not modify upstream PCSX2/PINE

The local cloned PCSX2 source is for understanding behavior only.

Constraint from user:
- we do **not** own upstream PCSX2 repo
- we should work with what PCSX2 already exposes
- do not plan work that depends on upstream changes unless explicitly requested for research only

## PINE Protocol Notes Already Learned

Relevant opcodes already used in this project:
- `MsgRead8 = 0`
- `MsgRead16 = 1`
- `MsgRead32 = 2`
- `MsgRead64 = 3`
- `MsgTitle = 0x0B`
- `MsgID = 0x0C`

Important limitation:
- upstream PINE provides some bulk-read commands for scratchpad/VU/etc.
- it does **not** provide generic EE main RAM range reads in the current upstream implementation we inspected

Therefore, generic large EE block reads are handled through direct PCSX2 memory access in `ratchet-companion`, not through an upstream PINE EE block opcode.

## Websocket / Update Cadence Notes

- watched memory polling was configured around 250 ms
- websocket fallback interval was also brought down to 250 ms to better match observed responsiveness
- `/ws/memory` sends byte payloads as binary websocket frames; JSON is only used for null/error-style payloads

However, apparent update rate may still feel slower because total cycle time includes:
- watcher loop wake-up
- memory reads
- snapshot construction
- JSON serialization
- websocket send

Future performance work should prefer caching expensive game-specific reads in backend services rather than rebuilding them repeatedly during snapshot creation.

The status websocket should stay lightweight: connection state, detected game,
module metadata, and small game status values. Feature data such as moby lists
belongs behind feature-specific subscriptions, currently `/ws/mobys`, so status
refreshes do not reset feature UI state or force expensive module reads.

DL moby-list snapshots should not publish a single shrunk read immediately after
publishing a larger populated list. While the game updates state, the spawnable
moby count can briefly read as zero or individual entries can briefly look
invalid, so smaller lists are confirmed across consecutive reads before
replacing a larger snapshot.

## UI / Electron Packaging Notes

### UI structure

- Cloudscape `TopNavigation` owns app/game identity and high-level backend status.
- `/ws/status` state is centralized in `useBackendStatus`.
- Game-detail components should receive typed models derived from the status snapshot.
- Keep status envelope parsing simple: the backend contract is trusted and camelCase.

### Build organization

- root `npm run build` = compile/build only
- root `npm run build:all` = packaged outputs
- Linux and Windows packaging are orchestrated from repo root

### Windows packaging

- current Windows packaging target is ZIP
- generated cross-platform from Linux safely
- installer-style targets were intentionally avoided unless needed later

### Electron startup logging

A better logging mechanism was added so packaged startup failures can be diagnosed.

Current Electron main-process behavior:
- writes logs under Electron `userData/logs`
- captures:
  - Electron main process startup/runtime errors
  - bundled backend stdout/stderr
  - backend spawn/exit errors
  - unhandled rejections/exceptions
  - render/child process gone events

Important files:
- `electron-main.log`
- `backend.log`

On Linux/Bazzite, expected path is typically somewhere under:
- `~/.config/<app-name>/logs/`

## Cleanup / Codebase Hygiene Rules

- Placeholder `Class1.cs` files from template generation were removed where unused
- Do not reintroduce template placeholder files
- Keep empty/generated clutter out of game/runtime projects unless actually needed
- UI TypeScript/TSX/CSS formatting is owned by Prettier; semicolons are required.
- Run `npm run lint` and `npm run format:check` in `ui/` for UI hygiene checks.

## Practical Contributor Rules

1. Prefer thin orchestration layers and module-owned game logic.
2. Keep game payloads schema-based and generic at the top level.
3. Treat UYA MP and UYA SP as separate subdomains.
4. Avoid UI-side polling for emulator memory.
5. Prefer persistent connections and cached reads over repeated reconnects/requeries.
6. For Windows/Linux direct memory access, follow PCSX2’s real shared-memory model, not heuristics if avoidable.
7. Use the local cloned PCSX2 source for implementation guidance, but do not assume upstream can be changed.
8. When touching Electron startup behavior, preserve file logging so remote testers can send useful logs.
9. When adding game-data UI, update the TypeScript schema map instead of hand-parsing payload JSON.

## Good Next Places To Look

If you are continuing emulator/runtime work, start here:

- `lib/src/RatchetCompanion.PCSX2/Pcsx2Runtime.cs`
- `lib/src/RatchetCompanion.PCSX2/Pine/PineGameInfoClient.cs`
- `lib/src/RatchetCompanion.PCSX2/Process/LinuxPcsx2ProcessMemoryReader.cs`
- `lib/src/RatchetCompanion.PCSX2/Process/WindowsPcsx2ProcessMemoryReader.cs`

If you are continuing UYA feature work, start here:

- `lib/src/RatchetCompanion.Games.UYA/UyaGameModule.cs`
- `lib/src/RatchetCompanion.Games.UYA/UyaMemoryExample.cs`
- `lib/src/RatchetCompanion.Games.UYA/MP/UyaMpPlayerMemory.cs`

If you are continuing packaging/startup/debug work, start here:

- `ui/electron/main.cts`
- `scripts/build-linux.mjs`
- `scripts/build-windows.mjs`
- root `package.json`
