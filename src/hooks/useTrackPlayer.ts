import { useEffect, useRef } from "react";
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
  useProgress as useRntpProgress,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { mediaUrl, mediaHeaders } from "../api/kaida";
import { usePlayer } from "../state/player";
import { useResume } from "../state/resume";
import { remoteEvents } from "../services/remoteEvents";

let setupPromise: Promise<void> | null = null;

function configurePlayer(): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    try {
      await TrackPlayer.setupPlayer();
    } catch (e) {
      // setupPlayer throws if already initialized — treat as success.
      const msg = String((e as { message?: string })?.message ?? e);
      if (!msg.includes("already")) {
        console.warn("TrackPlayer setup failed:", e);
      }
    }
    try {
      // Cast: `compactCapabilities` still works at runtime but was dropped
      // from UpdateOptions types in 5.0.0-alpha0.
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        progressUpdateEventInterval: 2,
      } as Parameters<typeof TrackPlayer.updateOptions>[0]);
    } catch (e) {
      console.warn("TrackPlayer updateOptions failed:", e);
    }
  })();
  return setupPromise;
}

export function useTrackPlayerSync() {
  const { state, current, setPlaying, next, prev, seek, ended } = usePlayer();
  const { getPosition, updatePosition, clearPosition } = useResume();

  const currentRef = useRef(current);
  const endedRef = useRef(ended);
  const clearPositionRef = useRef(clearPosition);
  const updatePositionRef = useRef(updatePosition);
  currentRef.current = current;
  endedRef.current = ended;
  clearPositionRef.current = clearPosition;
  updatePositionRef.current = updatePosition;

  const lastKey = useRef<string | null>(null);
  const lastSeekNonce = useRef<number>(0);
  const loadingKey = useRef<string | null>(null);

  useEffect(() => {
    configurePlayer();
    return () => {
      TrackPlayer.reset().catch(() => {});
    };
  }, []);

  // All effects below await `configurePlayer()` to avoid racing setup.

  // Remote control events from the lock-screen / notification.
  useEffect(() => {
    const unsubs = [
      remoteEvents.on("play", () => {
        if (currentRef.current) setPlaying(true);
      }),
      remoteEvents.on("pause", () => setPlaying(false)),
      remoteEvents.on("next", () => next()),
      remoteEvents.on("prev", () => prev()),
      remoteEvents.on("seek", (pos) => seek(pos)),
      remoteEvents.on("stop", () => setPlaying(false)),
    ];
    return () => unsubs.forEach((u) => u());
  }, [setPlaying, next, prev, seek]);

  // Queue end (natural finish) + periodic progress persistence.
  useTrackPlayerEvents(
    [Event.PlaybackQueueEnded, Event.PlaybackProgressUpdated, Event.PlaybackError],
    async (event) => {
      if (event.type === Event.PlaybackQueueEnded) {
        const cur = currentRef.current;
        if (cur) clearPositionRef.current(cur.key);
        endedRef.current();
      } else if (event.type === Event.PlaybackProgressUpdated) {
        const cur = currentRef.current;
        if (cur) updatePositionRef.current(cur.key, event.position);
      } else if (event.type === Event.PlaybackError) {
        console.warn("TrackPlayer error:", event);
      }
    },
  );

  // Load new track when `current` changes.
  useEffect(() => {
    if (!current) {
      TrackPlayer.reset().catch(() => {});
      lastKey.current = null;
      loadingKey.current = null;
      return;
    }

    if (current.key === lastKey.current) return;
    const key = current.key;
    lastKey.current = key;
    loadingKey.current = key;

    (async () => {
      try {
        await configurePlayer();
        if (loadingKey.current !== key) return;
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: key,
          url: mediaUrl(key),
          headers: mediaHeaders(),
          title: current.title,
          artist: current.artist,
          album: current.album,
          duration: current.duration,
          artwork: current.coverKey ? mediaUrl(current.coverKey) : undefined,
        });

        if (loadingKey.current !== key) return;

        const resumePos = getPosition(key);
        if (resumePos > 0) {
          await TrackPlayer.seekTo(resumePos);
        }

        await TrackPlayer.setVolume(state.volume);

        if (state.isPlaying) {
          await TrackPlayer.play();
        }
      } catch (e) {
        console.warn("Failed to load track:", e);
      }
    })();
  }, [current?.key]);

  // Sync play/pause.
  useEffect(() => {
    if (!current) return;
    configurePlayer().then(() => {
      if (state.isPlaying) {
        TrackPlayer.play().catch(() => setPlaying(false));
      } else {
        TrackPlayer.pause().catch(() => {});
      }
    });
  }, [state.isPlaying]);

  // Sync volume.
  useEffect(() => {
    configurePlayer().then(() =>
      TrackPlayer.setVolume(state.volume).catch(() => {}),
    );
  }, [state.volume]);

  // In-app scrubber → RNTP seek.
  useEffect(() => {
    if (!state.seekRequest) return;
    if (state.seekRequest.nonce === lastSeekNonce.current) return;
    lastSeekNonce.current = state.seekRequest.nonce;
    const t = state.seekRequest.t;
    configurePlayer().then(() => TrackPlayer.seekTo(t).catch(() => {}));
    if (current) updatePosition(current.key, t);
  }, [state.seekRequest]);

  // Mirror repeat mode so repeat-one loops natively and lock-screen agrees.
  useEffect(() => {
    const mode =
      state.repeat === "one"
        ? RepeatMode.Track
        : state.repeat === "all"
          ? RepeatMode.Queue
          : RepeatMode.Off;
    configurePlayer().then(() => TrackPlayer.setRepeatMode(mode).catch(() => {}));
  }, [state.repeat]);
}

export function useProgress() {
  return useRntpProgress(250);
}
