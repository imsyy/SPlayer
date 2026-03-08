# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SPlayer is a desktop music player built with **Electron + Vue 3 + TypeScript**. It uses Naive UI for components, Pinia for state management, and integrates with NetEase Cloud Music API, Last.fm, and Subsonic/Navidrome streaming services. Native Rust modules provide OS-level features (taskbar lyrics on Windows, MPRIS on Linux, SMTC on Windows, Discord RPC).

## Commands

```bash
pnpm dev                # Start dev environment (builds native modules + launches Electron)
pnpm build              # Full production build (typecheck + electron-vite build)
pnpm build:win          # Package for Windows
pnpm build:mac          # Package for macOS
pnpm build:linux        # Package for Linux
pnpm lint               # ESLint (--max-warnings=0, zero tolerance)
pnpm format             # Prettier
pnpm typecheck          # Full TypeScript check (node + web)
pnpm typecheck:node     # Main process + preload TypeScript check
pnpm typecheck:web      # Renderer process TypeScript check
```

Set `SKIP_NATIVE_BUILD=true` to skip Rust native module compilation during dev.

## Architecture

### Process Model (Electron)

- **Main process** (`electron/main/`): Window management, IPC handlers, SQLite database, system tray, global shortcuts, Fastify API server, native module integration
- **Preload** (`electron/preload/`): Context bridge exposing `window.api.store` and `window.logger` to renderer
- **Renderer** (`src/`): Vue 3 SPA — the UI

### IPC Layer

18 IPC modules in `electron/main/ipc/` handle all main↔renderer communication: `ipc-cache`, `ipc-file`, `ipc-lyric`, `ipc-media`, `ipc-mpv`, `ipc-socket`, `ipc-store`, `ipc-taskbar`, `ipc-tray`, `ipc-window`, `ipc-system`, `ipc-shortcut`, `ipc-update`, `ipc-protocol`, `ipc-mac-statusbar`, `ipc-thumbar`, `ipc-renderer-log`.

### Renderer Architecture (`src/`)

- **Stores** (`stores/`): Pinia with persistedstate — `data` (songs/user), `status` (playback), `setting` (config), `local` (local music), `music`, `streaming`, `shortcut`
- **Core** (`core/`): `audio-player/` (playback engine), `automix/`, `player/` (state), `resource/` (caching)
- **API** (`api/`): Axios-based, organized by domain (song, playlist, login, streaming, lastfm)
- **Composables** (`composables/`): `useInit`, `useSongMenu`, `useQualityControl`, etc.
- **Components** (`components/`): AMLL (lyrics), Card, Common, Global, Layout, List, Menu, Modal, Player, Search, Setting, UI

### Native Modules (`native/`)

Rust-based, built via `scripts/build-native.ts`:
- `taskbar-lyric` — Windows taskbar lyrics display
- `external-media-integration` — OS media integration
- `smtc-for-splayer` — Windows System Media Transport Controls
- `mpris-for-splayer` — Linux MPRIS support
- `discord-rpc-for-splayer` — Discord Rich Presence
- `ferrous-opencc-wasm` — Chinese character conversion (WASM)

### Embedded Server

`electron/server/` runs a Fastify instance (port 25884 default) wrapping NetEase Cloud Music API, proxied via `/api` in dev.

## Path Aliases

```
@/       → src/
@emi/    → native/external-media-integration
@shared/ → src/types/shared
@opencc/ → native/ferrous-opencc-wasm/pkg
@native/ → native/
```

## Code Conventions

- **Language**: Comments and commit messages in Chinese
- **Vue**: Composition API with `<script setup>`, TypeScript throughout
- **Auto-imports**: Vue, vue-router, @vueuse/core, and naive-ui composables are auto-imported (no explicit imports needed)
- **Naive UI components**: Auto-resolved via `unplugin-vue-components`
- **Unused variables**: Prefix with `_` to suppress lint warnings
- **Prettier**: Double quotes, trailing commas, 2-space indent, 100 char width
- **Workers**: Heavy computation (audio analysis) runs in worker threads (`electron/main/workers/`)
- **TypeScript**: Composite project — `tsconfig.node.json` (main/preload/scripts) and `tsconfig.web.json` (renderer)
