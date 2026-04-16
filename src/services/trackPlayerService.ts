import TrackPlayer, { Event } from "react-native-track-player";
import { remoteEvents } from "./remoteEvents";

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => remoteEvents.emit("play", undefined));
  TrackPlayer.addEventListener(Event.RemotePause, () => remoteEvents.emit("pause", undefined));
  TrackPlayer.addEventListener(Event.RemoteNext, () => remoteEvents.emit("next", undefined));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => remoteEvents.emit("prev", undefined));
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    remoteEvents.emit("seek", position),
  );
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    remoteEvents.emit("stop", undefined);
    await TrackPlayer.reset();
  });
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      await TrackPlayer.pause();
      return;
    }
    if (paused) await TrackPlayer.pause();
    else await TrackPlayer.play();
  });
}
