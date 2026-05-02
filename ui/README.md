# Ratchet Companion UI

Electron + React + Vite + TypeScript renderer for Ratchet Companion.

## Stack

- Electron main/preload under `electron/`
- React renderer under `src/`
- Cloudscape Design System components and global styles
- Vite for development and renderer builds
- Prettier + ESLint for formatting and linting

## Development

From `ui/`:

```bash
npm run dev
npm run lint
npm run format:check
npm run format
npm run build
```

The root workspace usually owns full product commands. Prefer running from the
repo root for normal app development:

```bash
npm run dev
npm run build
```

## Contracts

The renderer consumes backend status through `/ws/status`. The backend emits
camelCase JSON, and the UI treats that contract as trusted.

Game-specific snapshot payloads are typed in `src/models/gameDataSnapshot.ts`.
When a backend module adds a new `GameDataSnapshot.Schema`, add the matching
payload type to `GameDataPayloadBySchema` so UI components can narrow by schema.

## Style

Semicolons are required. Use `npm run format` to apply the project Prettier
rules, and `npm run format:check` in CI-style checks.
