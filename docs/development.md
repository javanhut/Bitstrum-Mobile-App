# Development Workflow

This document covers the day-to-day development workflow for Bitstrum
Mobile: how to set up your environment, run the app, debug, and build
release artifacts.

---

## Environment setup

### Required tools

| Tool             | Version | Purpose |
|------------------|---------|---------|
| **Node.js**      | 18+     | Expo CLI and Metro bundler |
| **Bun** or **npm** | Bun 1.1+ / npm 9+ | Package manager |
| **Android SDK**  | API 34+ | Android build toolchain |
| **Java JDK**     | 17      | Gradle builds (bundled with Android Studio) |

You can install the Android SDK either through
[Android Studio](https://developer.android.com/studio) or as a
standalone command-line tools package.

### Optional tools

| Tool                | Purpose |
|---------------------|---------|
| **Android Studio**  | Emulator management, Logcat, layout inspector |
| **adb**             | Direct device debugging (`adb logcat`, `adb install`) |
| **EAS CLI**         | Cloud builds via `eas build` |
| **Flipper**         | Network inspector, React DevTools, native logs |

### First-time setup

```bash
# Clone the repo
git clone https://github.com/javanhut/Bitstrum-Mobile-App.git
cd Bitstrum-Mobile-App

# Install dependencies
bun install

# Generate the native Android project
bunx expo prebuild --platform android
```

The `prebuild` step creates the `android/` directory with all native
code, Gradle config, and plugin-generated files. You only need to
re-run it after changing `app.json` plugins or adding a new native
module.

---

## Running the app

### On a physical device

1. Enable **USB debugging** on your Android device (Settings → Developer
   Options → USB Debugging).
2. Connect via USB and verify with `adb devices`.
3. Run:

```bash
bunx expo run:android
```

This builds the native project, installs the APK, and starts Metro. The
app hot-reloads on file changes.

### On an emulator

1. Create an emulator in Android Studio (AVD Manager) or via CLI:

```bash
avdmanager create avd -n Pixel_7 -k "system-images;android-34;google_apis;x86_64"
emulator -avd Pixel_7
```

2. Run:

```bash
bunx expo run:android
```

### Dev server only

If you already have a development build installed on the device:

```bash
bunx expo start
```

This starts Metro without rebuilding native code. Faster for pure
TypeScript / React changes.

### Connecting to your Bitstrum server

The mobile app needs network access to your Bitstrum server. Common
scenarios:

| Setup | Server URL to use |
|-------|-------------------|
| Phone + desktop on same WiFi | `http://<desktop-ip>:3000` |
| Emulator on same machine | `http://10.0.2.2:3000` (Android emulator maps this to host localhost) |
| Docker on the network | `http://<docker-host-ip>:3000` |

Enter the URL in **Settings → Server Connection → Server URL** and tap
**Save & Connect**.

---

## Project conventions

### File naming

- Screen files in `app/` use kebab-case: `now-playing.tsx`,
  `liked-songs.tsx`.
- Source files in `src/` use camelCase for modules (`kaida.ts`,
  `useTrackPlayer.ts`) and PascalCase for components (`TrackRow.tsx`,
  `MiniPlayer.tsx`).
- Context providers follow the pattern `{Name}Provider` exporting a
  `use{Name}()` hook.

### State management

All app state flows through React context providers defined in
`src/state/`. Each provider follows the same pattern:

1. Load from server on mount.
2. Debounce-save to server on state change (400–500ms delay).
3. Optional MMKV seed for instant startup (profile, resume).

Do not introduce additional state management libraries. If you need new
persistent state, follow the existing provider pattern.

### Theming

All colors come from `useTheme().colors`. Never hardcode color values
in components — always reference the theme context. The theme type is:

```typescript
type ThemeColors = {
  bg: string;        // App background
  bgElev: string;    // Elevated surface (cards, tabs)
  bgElev2: string;   // Higher elevation
  fg: string;        // Primary text
  fgDim: string;     // Secondary / muted text
  accent: string;    // Interactive elements, highlights
  accentFg: string;  // Text on accent backgrounds
  danger: string;    // Destructive actions
  border: string;    // Borders, dividers
  gradientStart: string;  // Screen header gradient start
  gradientEnd: string;    // Screen header gradient end
};
```

### Navigation

Expo Router uses file-based routing. The navigation hierarchy:

```
/ (root stack)
├── (tabs)/          ← bottom tab navigator
│   ├── index        ← Home
│   ├── library      ← Library
│   ├── search       ← Search
│   ├── playlists    ← Playlists
│   └── settings     ← Settings
├── album/[id]       ← pushed from Library, Search, etc.
├── playlist/[id]    ← pushed from Playlists, Home
├── collection/[kind]/[value]  ← pushed from Explore
├── explore          ← pushed from Home
├── liked-songs      ← pushed from Home
└── now-playing      ← modal presentation
```

To navigate: `router.push("/album/abc123")`. To go back:
`router.back()`. Parameters use `useLocalSearchParams()`.

### API client

All server communication goes through `src/api/kaida.ts`. Functions
use `fetch()` with the configured server URL and auth headers. The
mobile app hits the same `/api/*` endpoints as the web frontend — the
Bun server proxies them to KaidaDB.

Key rule: **never bypass `kaida.ts` to make direct fetch calls**. The
auth headers and base URL handling live in one place.

---

## Debugging

### Metro logs

Metro prints all `console.log` / `console.warn` output in the terminal
where `expo start` is running.

### Android Logcat

For native-level logs (TrackPlayer errors, crash stacks):

```bash
adb logcat -s ReactNativeJS:V ReactNative:V TrackPlayer:V
```

### React DevTools

```bash
bunx react-devtools
```

Then shake the device or press `m` in Metro to open the dev menu and
tap "Debug with React DevTools".

### Network debugging

The app uses plain `fetch()` so requests are visible in:
- **Flipper** network inspector
- **Charles Proxy** or **mitmproxy** (configure device WiFi proxy)
- `adb logcat | grep -i fetch` for basic visibility

### Common issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Server not configured" on Home | No URL in Settings | Enter server URL in Settings tab |
| Library loads but no audio plays | Track URLs failing auth | Check KaidaDB password in Settings |
| Audio plays but no notification controls | TrackPlayer service not registered | Ensure `TrackPlayer.registerPlaybackService()` is in `_layout.tsx` |
| `expo prebuild` fails | Missing Android SDK | Install Android SDK and set `ANDROID_HOME` |
| Emulator can't reach server | Wrong IP | Use `10.0.2.2` for emulator → host localhost |

---

## Building release artifacts

### APK via EAS (recommended)

```bash
# Install EAS CLI
bun add -g eas-cli

# Configure (first time only)
bunx eas build:configure

# Build a preview APK (not signed for Play Store)
bunx eas build --platform android --profile preview

# Build a production AAB (signed, Play Store ready)
bunx eas build --platform android --profile production
```

### APK via local Gradle

```bash
# Generate native project if not already done
bunx expo prebuild --platform android

# Build release APK
cd android && ./gradlew assembleRelease

# Output
ls app/build/outputs/apk/release/
```

### Signing

For Play Store distribution, configure signing in `eas.json` or
`android/app/build.gradle`. EAS manages signing keys automatically
when you use `eas build`.

---

## Type checking

```bash
bunx tsc --noEmit
```

Run this before committing. There are no runtime type checks — the
TypeScript compiler is the only gate.

---

## Adding a new screen

1. Create a file in `app/`. The filename becomes the route:
   - `app/foo.tsx` → `/foo`
   - `app/bar/[id].tsx` → `/bar/123`
2. If it should appear in the tab bar, put it in `app/(tabs)/` and add
   a `<Tabs.Screen>` entry in `app/(tabs)/_layout.tsx`.
3. If it needs library data, use `useLibrary()`. If it needs player
   state, use `usePlayer()`. If it needs theme colors, use `useTheme()`.
4. Navigate to it: `router.push("/foo")`.

## Adding a new state provider

1. Create `src/state/yourThing.tsx` following the existing pattern
   (context + provider + hook).
2. Add the corresponding `loadYourThing()` / `saveYourThing()` functions
   in `src/api/kaida.ts`.
3. Wrap it in the provider stack in `app/_layout.tsx`.
