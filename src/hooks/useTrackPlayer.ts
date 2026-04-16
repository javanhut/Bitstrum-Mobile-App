import { useEffect, useRef, useState } from "react";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { mediaUrl, mediaHeaders } from "../api/kaida";
import { usePlayer } from "../state/player";
import { useResume } from "../state/resume";

let audioConfigured = false;

// Shared progress state so useProgress() can read from any component.
let progressListeners: Set<() => void> = new Set();
let sharedPosition = 0;
let sharedDuration = 0;

function notifyProgress() {
  for (const fn of progressListeners) fn();
}

async function configureAudio() {
  if (audioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
    audioConfigured = true;
  } catch (e) {
    console.warn("Audio mode config failed:", e);
  }
}

export function useTrackPlayerSync() {
  const { state, current, setPlaying, ended } = usePlayer();
  const { updatePosition, clearPosition } = useResume();

  // Use refs for values accessed inside the status callback to avoid
  // stale closures. The callback is attached once per sound instance.
  const currentRef = useRef(current);
  const endedRef = useRef(ended);
  const clearPositionRef = useRef(clearPosition);
  const updatePositionRef = useRef(updatePosition);
  currentRef.current = current;
  endedRef.current = ended;
  clearPositionRef.current = clearPosition;
  updatePositionRef.current = updatePosition;

  const soundRef = useRef<Audio.Sound | null>(null);
  const lastKey = useRef<string | null>(null);
  const lastSeekNonce = useRef<number>(0);
  const lastSaveTick = useRef<number>(0);
  const loadingKey = useRef<string | null>(null);

  // Configure audio on mount.
  useEffect(() => {
    configureAudio();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  // Status callback — uses refs so it never goes stale.
  function onStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;

    sharedPosition = (status.positionMillis ?? 0) / 1000;
    sharedDuration = (status.durationMillis ?? 0) / 1000;
    notifyProgress();

    // Persist resume position every 2s.
    const cur = currentRef.current;
    if (cur && status.positionMillis != null) {
      const now = Date.now();
      if (now - lastSaveTick.current > 2000) {
        lastSaveTick.current = now;
        updatePositionRef.current(cur.key, status.positionMillis / 1000);
      }
    }

    // Song finished — advance queue.
    if (status.didJustFinish) {
      if (cur) clearPositionRef.current(cur.key);
      endedRef.current();
    }
  }

  // Load new track when current changes.
  useEffect(() => {
    if (!current) {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      lastKey.current = null;
      loadingKey.current = null;
      sharedPosition = 0;
      sharedDuration = 0;
      notifyProgress();
      return;
    }

    if (current.key === lastKey.current) return;
    const key = current.key;
    lastKey.current = key;
    loadingKey.current = key;

    (async () => {
      // Unload previous sound.
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      sharedPosition = 0;
      sharedDuration = current.duration || 0;
      notifyProgress();

      try {
        const headers = mediaHeaders();
        const { sound } = await Audio.Sound.createAsync(
          { uri: mediaUrl(key), headers },
          {
            shouldPlay: true,
            volume: state.volume,
            progressUpdateIntervalMillis: 250,
          },
          onStatus,
        );

        // Check we haven't moved to a different track while loading.
        if (loadingKey.current !== key) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
      } catch (e) {
        console.warn("Failed to load audio:", e);
      }
    })();
  }, [current?.key]);

  // Sync play/pause.
  useEffect(() => {
    if (!soundRef.current || !current) return;
    if (state.isPlaying) {
      soundRef.current.playAsync().catch(() => setPlaying(false));
    } else {
      soundRef.current.pauseAsync().catch(() => {});
    }
  }, [state.isPlaying]);

  // Sync volume.
  useEffect(() => {
    if (!soundRef.current) return;
    soundRef.current.setVolumeAsync(state.volume).catch(() => {});
  }, [state.volume]);

  // Sync seek requests.
  useEffect(() => {
    if (!soundRef.current || !state.seekRequest) return;
    if (state.seekRequest.nonce === lastSeekNonce.current) return;
    lastSeekNonce.current = state.seekRequest.nonce;
    soundRef.current.setPositionAsync(state.seekRequest.t * 1000).catch(() => {});
    if (current) updatePosition(current.key, state.seekRequest.t);
  }, [state.seekRequest]);
}

export function useProgress(_intervalMs = 200) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    progressListeners.add(listener);
    return () => {
      progressListeners.delete(listener);
    };
  }, []);

  return { position: sharedPosition, duration: sharedDuration };
}
