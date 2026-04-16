import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { Track } from "../api/kaida";
import { mediaUrl } from "../api/kaida";
import { useTheme } from "../theme/ThemeContext";
import { useLikes } from "../state/likes";
import { usePlayer } from "../state/player";

type Props = {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  showTrackNumber?: boolean;
  onPlay: (index: number) => void;
};

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TrackRow({ track, index, isCurrent, isPlaying, showTrackNumber, onPlay }: Props) {
  const { colors } = useTheme();
  const { appendToQueue } = usePlayer();
  const { isLiked, toggle } = useLikes();
  const liked = isLiked(track.key);

  return (
    <Pressable
      style={[styles.row, isCurrent && { backgroundColor: colors.bgElev2 }]}
      onPress={() => onPlay(index)}
    >
      {showTrackNumber && (
        <Text style={[styles.num, { color: isCurrent && isPlaying ? colors.accent : colors.fgDim }]}>
          {isCurrent && isPlaying ? "▶" : (track.trackNumber || index + 1).toString()}
        </Text>
      )}
      <View style={styles.meta}>
        <Text style={[styles.title, { color: isCurrent ? colors.accent : colors.fg }]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={[styles.artist, { color: colors.fgDim }]} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
      <Pressable onPress={() => toggle(track.key)} hitSlop={8}>
        <Text style={{ color: liked ? colors.accent : colors.fgDim, fontSize: 18 }}>
          {liked ? "♥" : "♡"}
        </Text>
      </Pressable>
      <Pressable onPress={() => appendToQueue([track])} hitSlop={8} style={styles.queueBtn}>
        <Text style={{ color: colors.fgDim, fontSize: 14 }}>+Q</Text>
      </Pressable>
      <Text style={[styles.duration, { color: colors.fgDim }]}>{fmt(track.duration)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  num: {
    width: 28,
    textAlign: "center",
    fontSize: 13,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
  },
  artist: {
    fontSize: 13,
  },
  duration: {
    fontSize: 13,
    width: 42,
    textAlign: "right",
  },
  queueBtn: {
    paddingHorizontal: 4,
  },
});
