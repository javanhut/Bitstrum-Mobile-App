import { useEffect, useRef } from "react";
import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  State,
  useProgress,
  usePlaybackState,
} from "react-native-track-player";
import type { Track } from "../api/kaida";
import { mediaUrl, mediaHeaders } from "../api/kaida";
import { usePlayer } from "../state/player";
import { useResume } from "../state/resume";

let isSetup = false;

async function setupPlayer() {
  if (isSetup) return;
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
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
    });
    isSetup = true;
  } catch (e) {
    console.warn("TrackPlayer setup failed:", e);
  }
}

function trackToPlayerTrack(track: Track) {
  const headers = mediaHeaders();
  return {
    id: track.key,
    url: mediaUrl(track.key),
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: track.coverKey ? mediaUrl(track.coverKey) : undefined,
    duration: track.duration || undefined,
    headers,
  };
}

export function useTrackPlayerSync() {
  const { state, current, setPlaying, ended } = usePlayer();
  const { updatePosition, clearPosition } = useResume();
  const lastKey = useRef<string | null>(null);
  const lastSeekNonce = useRef<number>(0);
  const lastSaveTick = useRef<number>(0);

  // Initialize player on mount.
  useEffect(() => {
    setupPlayer();
  }, []);

  // Load track when current changes.
  useEffect(() => {
    if (!isSetup) return;
    if (!current) {
      TrackPlayer.reset();
      lastKey.current = null;
      return;
    }
    if (current.key === lastKey.current) return;
    lastKey.current = current.key;

    (async () => {
      await TrackPlayer.reset();
      await TrackPlayer.add(trackToPlayerTrack(current));
      if (state.isPlaying) {
        await TrackPlayer.play();
      }
    })();
  }, [current?.key]);

  // Sync play/pause.
  useEffect(() => {
    if (!isSetup || !current) return;
    if (state.isPlaying) {
      TrackPlayer.play();
    } else {
      TrackPlayer.pause();
    }
  }, [state.isPlaying, current?.key]);

  // Sync volume.
  useEffect(() => {
    if (!isSetup) return;
    TrackPlayer.setVolume(state.volume);
  }, [state.volume]);

  // Sync seek requests.
  useEffect(() => {
    if (!isSetup || !state.seekRequest) return;
    if (state.seekRequest.nonce === lastSeekNonce.current) return;
    lastSeekNonce.current = state.seekRequest.nonce;
    TrackPlayer.seekTo(state.seekRequest.t);
    if (current) updatePosition(current.key, state.seekRequest.t);
  }, [state.seekRequest]);

  // Listen for track end.
  useEffect(() => {
    if (!isSetup) return;
    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      if (current) clearPosition(current.key);
      ended();
    });
    return () => sub.remove();
  }, [current, ended, clearPosition]);

  // Listen for external play/pause (notification controls).
  useEffect(() => {
    if (!isSetup) return;
    const sub = TrackPlayer.addEventListener(Event.PlaybackState, (e) => {
      if (e.state === State.Playing) setPlaying(true);
      else if (e.state === State.Paused) setPlaying(false);
    });
    return () => sub.remove();
  }, [setPlaying]);
}

export { useProgress, usePlaybackState };
