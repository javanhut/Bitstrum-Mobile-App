# Architecture

A technical deep dive into how Bitstrum Mobile is built, how it relates
to the Bitstrum web app, and the design decisions behind the port.

---

## System overview

Bitstrum Mobile is a **thin client** that connects to an existing
Bitstrum server deployment. It does not talk to KaidaDB directly —
all requests go through the Bun server's `/api/*` proxy, identical
to how the web frontend works.

```
┌─────────────────────────────────────────────────────┐
│                    Android Device                    │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │  TrackPlayer │    │     React Native App      │   │
│  │  (native     │◄──│                            │   │
│  │   service)   │    │  Expo Router               │   │
│  │              │    │  React Context providers    │   │
│  │  Background  │    │  MMKV local cache           │   │
│  │  playback    │    │                            │   │
│  └─────────────┘    └────────────┬───────────────┘   │
│                                   │                   │
└───────────────────────────────────┼───────────────────┘
                                    │ HTTP (fetch + TrackPlayer)
                                    ▼
                      ┌──────────────────────────┐
                      │     Bitstrum Server       │
                      │     (Bun.serve)           │
                      │                          │
                      │  GET /api/media/*  ─────►│──► KaidaDB /v1/media/*
                      │  GET /api/meta/*   ─────►│──► KaidaDB /v1/meta/*
                      │  PUT /api/media/*  ─────►│──► KaidaDB /v1/media/*
                      │                          │
                      │  X-Server-Pass header    │
                      │  injected by Bun proxy   │
                      └──────────────────────────┘
```

### Why talk through the Bun server (not directly to KaidaDB)?

The web app's Bun server already handles:
- Injecting the `X-Server-Pass` authentication header.
- Proxying with proper hop-by-hop header stripping.
- The `POST /api/rewrite-meta` endpoint for metadata edits.

Reusing this proxy means the mobile app doesn't need to reimplement
any of that logic. It also means there's a single point of
authentication configuration (the server's `KAIDADB_PASS` env var).

The mobile app does send `X-Server-Pass` in its own requests as well
(configured in Settings), because the Bun server passes it through.
This is a belt-and-suspenders approach — the server injects it
regardless, but the mobile app includes it so a future direct-to-KaidaDB
mode would work without code changes.

---

## Porting strategy

### What was copied directly

These pieces contain no browser APIs and ported with zero changes to
the logic:

- **Type definitions**: `Track`, `Album`, `Playlist`, `Profile`,
  `ResumeMap` and all supporting types.
- **Pure functions**: `fuzzyScore()`, `ulid()`, `groupAlbums()`,
  `metaToTrack()`, `alphaCompare()`, constants (`BUILTIN_GENRES`,
  `BUILTIN_MOODS`).
- **Player reducer**: The entire `State`, `Action`, `advance()`, and
  `reducer()` in `player.tsx`. Queue management, shuffle, repeat,
  seek requests — all pure logic.
- **Theme definitions**: The 5 theme objects with their color values.
  Only the `applyTheme()` function (which sets CSS vars) was replaced.

### What was adapted

| Web concept | Mobile replacement | Why |
|---|---|---|
| `HTMLAudioElement` ref | `react-native-track-player` service | Native background audio with notification controls |
| `localStorage` | `react-native-mmkv` | Synchronous read/write, survives app restarts |
| `window.addEventListener("beforeunload")` | `AppState` change listener | Flush resume positions when app backgrounds |
| `document.documentElement.style.setProperty` | `ThemeContext` state update | No DOM in React Native |
| CSS custom properties | Typed `ThemeColors` object via context | StyleSheet doesn't support CSS vars |
| Hash-based router (`router.ts`) | Expo Router (file-based) | Native navigation stack with gestures |
| `<audio>` + `ontimeupdate` | `TrackPlayer.play()` + `useProgress()` | Native audio service |
| Relative `/api/*` fetch URLs | Absolute `${serverUrl}/api/*` with auth headers | No same-origin proxy on mobile |
| `new Blob([json])` + `putMedia()` | Direct `fetch()` PUT with JSON body | No Blob constructor needed |
| Canvas 2D visualizer | Skia placeholder (v2) | Web Audio API not available in RN |
| CSS grid layout | Flexbox + FlatList | RN doesn't support CSS grid |
| Drag-and-drop (`draggable` attr) | `react-native-draggable-flatlist` | Native gesture-based reordering |

### What was removed

- **Manage Music** screen (uploads, metadata editing, bulk operations).
  The mobile app is playback-only.
- **Web Audio graph** (`audio/graph.ts`). No
  `MediaElementAudioSourceNode` equivalent in React Native.
- **Visualizer** with live FFT data. Replaced with a Skia idle
  animation placeholder. The Skia infrastructure is in place for a
  future native FFT bridge via `android.media.audiofx.Visualizer`.
- **`readAudioDuration()`** — browser-only, not needed for playback.
- **`putMedia()`, `deleteMedia()`, `rewriteMeta()`** — management
  functions not used by the mobile client.
- **`EditTrackModal`, `EditAlbumModal`, `GenreInput`** — management
  components.

---

## Audio architecture

### react-native-track-player

The audio system has three layers:

1. **PlayerProvider** (`src/state/player.tsx`) — A pure React reducer
   managing queue, index, isPlaying, volume, shuffle, repeat, and seek
   requests. Contains no audio logic. Identical to the web version minus
   the `audioRef`.

2. **useTrackPlayerSync** (`src/hooks/useTrackPlayer.ts`) — A hook
   mounted once in the tab layout that bridges the reducer and
   TrackPlayer:
   - When `current` changes → `TrackPlayer.reset()` + `TrackPlayer.add()`
   - When `isPlaying` changes → `TrackPlayer.play()` / `.pause()`
   - When `seekRequest` changes → `TrackPlayer.seekTo()`
   - When `volume` changes → `TrackPlayer.setVolume()`
   - On `PlaybackQueueEnded` event → dispatch `ended` action
   - On `PlaybackState` event → sync `isPlaying` for notification controls

3. **PlaybackService** (`src/services/trackPlayerService.ts`) — A
   background service that handles remote events (notification play,
   pause, next, prev, seek). Registered once at app startup via
   `TrackPlayer.registerPlaybackService()`.

### Track URL construction

Each track's audio URL is:
```
${serverUrl}/api/media/${encodeURI(track.key)}
```

TrackPlayer sends `X-Server-Pass` as a custom header per track object.
Cover art URLs follow the same pattern for artwork display in
notifications.

### Resume positions

The `ResumeProvider` stores per-track playback positions:
- Written to MMKV on every `updatePosition()` call (throttled).
- Debounce-saved to the server every 1.5 seconds while dirty.
- Flushed to both MMKV and server when the app enters background
  (`AppState` listener).
- Merged from server on mount (server wins for conflicts).

---

## Navigation

### Expo Router

Navigation uses Expo Router v55+ with file-based routing. The route
tree:

```
app/
├── _layout.tsx           → Root Stack (providers wrap everything)
├── (tabs)/
│   ├── _layout.tsx       → Bottom Tabs (5 tabs)
│   ├── index.tsx         → /              (Home)
│   ├── library.tsx       → /library       (Library)
│   ├── search.tsx        → /search        (Search)
│   ├── playlists.tsx     → /playlists     (Playlists)
│   └── settings.tsx      → /settings      (Settings)
├── album/[id].tsx        → /album/:id     (Album detail)
├── playlist/[id].tsx     → /playlist/:id  (Playlist detail)
├── collection/[kind]/[value].tsx → /collection/:kind/:value
├── now-playing.tsx       → /now-playing   (Modal)
├── liked-songs.tsx       → /liked-songs
└── explore.tsx           → /explore
```

The root stack uses `slide_from_right` animation for detail screens
and `slide_from_bottom` for the now-playing modal.

### Tab bar

The tab bar lives in `(tabs)/_layout.tsx` and renders 5 tabs: Home,
Library, Search, Playlists, Settings. The `MiniPlayer` component is
rendered above the tab bar when a track is active. The
`useTrackPlayerSync()` hook is also mounted here, making it the single
point of audio-to-state synchronization.

---

## Theming

### How it works

1. `THEMES` array in `src/theme/colors.ts` defines 5 themes, each
   with a `ThemeColors` object (bg, fg, accent, etc.).
2. `ThemeProvider` wraps the app and exposes the current theme via
   `useTheme()`.
3. `ProfileProvider` stores the selected `themeId` in MMKV (for
   instant startup) and debounce-saves to the server.
4. Every component reads colors from `useTheme().colors` and applies
   them via `StyleSheet` or inline styles.

### Adding a new theme

Add an entry to the `THEMES` array in `src/theme/colors.ts`:

```typescript
{
  id: "your-theme",
  name: "Your Theme",
  description: "One-line description.",
  colors: {
    bg: "#...",
    bgElev: "rgba(...)",
    bgElev2: "rgba(...)",
    fg: "#...",
    fgDim: "#...",
    accent: "#...",
    accentFg: "#...",
    danger: "#...",
    border: "rgba(...)",
    gradientStart: "#...",
    gradientEnd: "#...",
  },
}
```

It automatically appears in the Settings theme picker.

---

## Data flow

### Library loading

On app launch, `LibraryProvider` calls `loadLibrary()` which:

1. `listTrackKeys()` — paginated list of all `music/tracks/*` keys.
2. `getMeta(key)` for each key — fetches metadata headers.
3. Maps each `MetaResponse` to a `Track` object.
4. `groupAlbums(tracks)` derives `Album[]` by grouping on `album-id`.

This is the same data loading strategy as the web app. The full library
is loaded eagerly into memory. For large libraries (10,000+ tracks),
this may need pagination or a search-first approach in a future version.

### State persistence

All persistent state is stored as JSON blobs in KaidaDB:

| State | KaidaDB key | Behavior |
|---|---|---|
| Liked songs | `music/config/liked.json` | Debounce save 400ms |
| Profile | `music/config/profile.json` | Debounce save 500ms + MMKV cache |
| Resume positions | `music/config/resume.json` | Debounce save 1500ms + MMKV cache + AppState flush |
| Playlists | `music/config/playlists.json` | Debounce save 500ms |
| Saved albums | `music/config/saved-albums.json` | Debounce save 400ms |

The web app and mobile app read and write the same keys, so state stays
in sync across both clients.

---

## Future work

### Visualizer (v2)

The Skia infrastructure is already in the project
(`@shopify/react-native-skia`). A future version can add a native FFT
bridge using Android's `android.media.audiofx.Visualizer` class to feed
frequency data to a Skia canvas — replicating the web app's spectrum
analyzer.

### Drag-to-reorder

`react-native-draggable-flatlist` is installed. The Liked Songs and
Playlist detail screens can be upgraded to use it for native
gesture-based reordering (currently using standard FlatList).

### Offline playback

A future version could cache tracks locally using
`react-native-track-player`'s download capabilities or Expo's file
system, with a sync mechanism to mark tracks as available offline.

### Android Auto

`react-native-track-player` supports Android Auto via its media session
integration. Adding Android Auto browsing would require implementing
the media browse tree.
