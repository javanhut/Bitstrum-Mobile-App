# Bitstrum Mobile

The Android companion app for [Bitstrum](https://github.com/javanhut/Bitstrum),
a self-hosted music streaming server built on
[KaidaDB](https://github.com/javanhut/KaidaDB).

Bitstrum Mobile is a playback-only React Native client. It connects to
an already-running Bitstrum server over your local network, streams your
full library, and gives you background playback with Android notification
controls. All music management (uploads, metadata editing, deleting)
stays on the web app — the mobile app is purely for listening.

Built with Expo, React Native, and TypeScript. The only native modules
are `react-native-track-player` for audio and `react-native-mmkv` for
fast local storage.

---

## Features

### Playback
- Stream any track from your Bitstrum server over HTTP.
- Background playback with Android lock-screen controls and notification
  media controls (play, pause, next, previous, seek).
- Queue management with shuffle, repeat (off / all / one), and skip.
- Full-screen **Now Playing** screen with cover art, scrubber, transport
  controls, and track metadata.
- Persistent **mini player** bar above the tab navigator while a track
  is active.

### Library
- **Home** tab: greeting, library stats, quick picks from liked songs
  and saved albums, playlist cards, and saved album shelf.
- **Library** tab: alphabetized album grid or track list with a filter
  input and sort toggle.
- **Search** tab: fuzzy search across tracks, albums, and artists with
  top hits, album results, and grouped song results.
- **Playlists** tab: view, create, rename, delete playlists. Each
  playlist shows its tracks with play and queue controls.
- **Explore** screen: browse by genre, mood, and artist. Each group
  links to a collection detail screen.

### Organization
- Like / unlike any track with the heart icon on every track row.
- Liked Songs screen shows your full ordered liked list.
- Save / unsave albums from the album detail screen.
- Create playlists, add tracks, rename, reorder, and delete from the
  playlist detail screen.
- All state (likes, playlists, saved albums, profile, resume positions)
  syncs to the server so your web and mobile apps stay in sync.

### Theming
- Five themes ported from the web app: **Ocean**, **Sunset**, **Forest**,
  **Aurora**, **Midnight**.
- Theme picker in Settings applies immediately across every screen.
- Gradient backgrounds and accent colors follow the selected theme.

### Offline-first local cache
- Profile and resume positions are cached in MMKV on-device for instant
  startup. Server state merges on load so nothing is lost if the app
  was closed before a save completed.

---

## Architecture

Bitstrum Mobile is a standalone React Native app that talks to a running
Bitstrum server. The server handles all KaidaDB communication — the
mobile app never touches KaidaDB directly.

```
┌──────────────────┐        HTTP         ┌──────────────────┐        HTTP         ┌──────────┐
│  Bitstrum Mobile  │  ───────────────►  │   Bitstrum Web    │  ───────────────►  │  KaidaDB  │
│  (this app)       │   /api/* routes    │   (Bun server)    │   /v1/* proxy      │          │
└──────────────────┘                     └──────────────────┘                     └──────────┘
```

The mobile app makes the same `/api/*` requests as the web frontend.
Audio streams via `react-native-track-player` with the `X-Server-Pass`
header for authentication.

### Project structure

```
.
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root: providers, TrackPlayer registration
│   ├── (tabs)/                   # Bottom tab navigator
│   │   ├── _layout.tsx           # Tab bar config + MiniPlayer + TrackPlayer sync
│   │   ├── index.tsx             # Home (My Music)
│   │   ├── library.tsx           # Library (album grid / track list)
│   │   ├── search.tsx            # Fuzzy search
│   │   ├── playlists.tsx         # Playlist index
│   │   └── settings.tsx          # Server config + profile + theme picker
│   ├── album/[id].tsx            # Album detail
│   ├── playlist/[id].tsx         # Playlist detail
│   ├── collection/[kind]/[value].tsx  # Genre / mood / artist collection
│   ├── now-playing.tsx           # Full-screen now playing (modal)
│   ├── liked-songs.tsx           # Liked songs list
│   └── explore.tsx               # Browse by genre, mood, artist
├── src/
│   ├── api/
│   │   ├── kaida.ts              # API client, types, fuzzy search, CRUD helpers
│   │   └── config.ts             # MMKV-backed server URL + password storage
│   ├── state/
│   │   ├── player.tsx            # Queue, playback, shuffle, repeat (reducer)
│   │   ├── profile.tsx           # Display name + theme (MMKV-cached)
│   │   ├── likes.tsx             # Liked song keys
│   │   ├── playlists.tsx         # Custom playlists
│   │   ├── savedAlbums.tsx       # Saved album IDs
│   │   ├── resume.tsx            # Per-track playback positions (MMKV-cached)
│   │   └── library.tsx           # Centralized track/album data
│   ├── components/
│   │   ├── TrackRow.tsx          # Reusable track list item
│   │   ├── AlbumCard.tsx         # Album grid card
│   │   └── MiniPlayer.tsx        # Persistent bottom mini player
│   ├── theme/
│   │   ├── colors.ts             # Theme definitions (5 themes)
│   │   └── ThemeContext.tsx       # React context for theming
│   ├── hooks/
│   │   └── useTrackPlayer.ts     # TrackPlayer setup + state sync
│   └── services/
│       └── trackPlayerService.ts # Background playback service
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
└── docs/
    ├── development.md            # Development workflow
    └── architecture.md           # Technical deep dive
```

### State management

Same pattern as the web app: a stack of React context providers, each
loading on mount and debounce-saving on change. The provider order
matters for dependency resolution:

```
ProfileProvider          ← seeds theme from MMKV, loads from server
  └─ ThemeProvider       ← reads profile.themeId
       └─ LikesProvider
            └─ PlaylistsProvider
                 └─ SavedAlbumsProvider
                      └─ ResumeProvider      ← MMKV-cached + AppState flush
                           └─ PlayerProvider ← pure reducer, no audio ref
                                └─ LibraryProvider ← loadLibrary() on mount
```

`PlayerProvider` is a pure reducer with no audio coupling. The actual
`react-native-track-player` integration lives in `useTrackPlayerSync()`,
a hook mounted in the tab layout that syncs reducer state to the native
audio service.

### Audio playback

`react-native-track-player` handles all native audio:

| Web (HTMLAudioElement)      | Mobile (TrackPlayer)                     |
|-----------------------------|------------------------------------------|
| `audio.src = url`           | `TrackPlayer.reset(); TrackPlayer.add()` |
| `audio.play()`              | `TrackPlayer.play()`                     |
| `audio.pause()`             | `TrackPlayer.pause()`                    |
| `audio.currentTime = t`     | `TrackPlayer.seekTo(t)`                  |
| `audio.volume = v`          | `TrackPlayer.setVolume(v)`               |
| `audio.onended`             | `Event.PlaybackQueueEnded` listener      |
| `audio.ontimeupdate`        | `useProgress()` hook                     |
| `window.beforeunload`       | `AppState` change → flush resume         |

Track URLs include the `X-Server-Pass` header via TrackPlayer's
per-track `headers` option.

---

## Getting started

### Prerequisites

- [**Bun**](https://bun.sh) 1.1+ or **npm** 9+
- A running **Bitstrum** server on your local network. Set it up from
  <https://github.com/javanhut/Bitstrum>.
- **Android SDK** and either an Android device (USB debugging enabled)
  or Android emulator, unless you build via EAS.

### Install

```bash
bun install
# or: npm install
```

### Run on Android

```bash
# Generate the native Android project
bunx expo prebuild --platform android

# Build and run on a connected device or emulator
bunx expo run:android
```

Or start the dev server and scan the QR code with a development build:

```bash
bunx expo start
```

### First launch

1. Open the app — it starts on the Home tab.
2. Go to the **Settings** tab.
3. Enter your Bitstrum server URL (e.g. `http://192.168.1.100:3000`).
4. Enter your KaidaDB password (leave blank if running on localhost
   without auth).
5. Tap **Save & Connect**. The app loads your library.

### Build an APK

Using EAS Build (Expo's cloud build service):

```bash
bunx eas build --platform android --profile preview
```

Or build locally after prebuild:

```bash
cd android && ./gradlew assembleRelease
```

The APK lands in `android/app/build/outputs/apk/release/`.

---

## Scripts

| Script                              | Purpose |
|-------------------------------------|---------|
| `bunx expo start`                   | Start the Expo dev server. |
| `bunx expo run:android`             | Build and run on Android device/emulator. |
| `bunx expo prebuild --platform android` | Generate the native Android project. |
| `bunx tsc --noEmit`                 | Type-check without emitting. |
| `bunx eas build --platform android` | Cloud build via EAS. |

---

## Dependencies

### Runtime

| Package                        | Purpose |
|--------------------------------|---------|
| `expo`                         | Framework, build tooling, config plugins |
| `expo-router`                  | File-based navigation (built on React Navigation) |
| `react-native-track-player`   | Background audio playback, notification controls |
| `react-native-mmkv`           | Synchronous key-value storage (replaces localStorage) |
| `expo-image`                   | Fast cached image loading for album covers |
| `expo-blur`                    | Blur effects for glass-morphism UI |
| `expo-linear-gradient`         | Gradient backgrounds per theme |
| `react-native-gesture-handler` | Gesture primitives |
| `react-native-reanimated`      | Animation engine |
| `react-native-draggable-flatlist` | Drag-to-reorder for playlists and liked songs |
| `@shopify/react-native-skia`  | Canvas rendering for future visualizer |

### Dev

| Package        | Purpose |
|----------------|---------|
| `typescript`   | Type checking |
| `@types/react` | React type definitions |

---

## Differences from the web app

| Concern          | Web                                  | Mobile                                |
|------------------|--------------------------------------|---------------------------------------|
| Audio            | HTML5 `<audio>` + Web Audio API      | react-native-track-player             |
| Routing          | Custom hash router (~50 lines)       | Expo Router (file-based)              |
| Styling          | CSS custom properties + raw CSS      | React Native StyleSheet + context     |
| Theming          | CSS vars on `document.documentElement` | ThemeContext with typed color objects |
| Local storage    | `localStorage`                       | MMKV                                  |
| Visualizer       | Canvas 2D + Web Audio AnalyserNode   | Placeholder (Skia idle animation, v2) |
| Music management | Full (upload, edit, delete)           | None (playback-only client)           |
| Background audio | Not possible (browser limitation)    | Native notification + lock-screen     |
| Server proxy     | Bun server injects `X-Server-Pass`   | App sends header directly per request |

---

## Non-goals

- No music management. Uploads, metadata editing, and deleting stay on
  the web app.
- No multi-user support. Bitstrum is a single-user, self-hosted system.
- No offline playback or download-for-later (yet).
- No Chromecast, Android Auto, or Wear OS support (yet).
- No live FFT visualizer in v1. The Skia infrastructure is in place for
  a future native visualizer using `android.media.audiofx.Visualizer`.

---

## License

MIT.
