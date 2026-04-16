import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { mediaUrl } from "../api/kaida";
import { usePlayer } from "../state/player";
import { useTheme } from "../theme/ThemeContext";
import { useProgress } from "../hooks/useTrackPlayer";
import { useRouter } from "expo-router";

export function MiniPlayer() {
  const { state, current, toggle, openNowPlaying } = usePlayer();
  const { colors } = useTheme();
  const router = useRouter();
  const { position, duration } = useProgress();

  if (!current) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgElev, borderTopColor: colors.border }]}>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
      </View>
      <Pressable
        style={styles.content}
        onPress={() => router.push("/now-playing")}
      >
        <View style={[styles.cover, { backgroundColor: colors.bgElev2 }]}>
          {current.coverKey ? (
            <Image
              source={{ uri: mediaUrl(current.coverKey) }}
              style={styles.coverImage}
              contentFit="cover"
            />
          ) : (
            <Text style={{ color: colors.fgDim, fontSize: 18 }}>♪</Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text style={[styles.title, { color: colors.fg }]} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={[styles.artist, { color: colors.fgDim }]} numberOfLines={1}>
            {current.artist}
          </Text>
        </View>
        <Pressable
          onPress={toggle}
          style={{ backgroundColor: colors.accent, borderRadius: 18, width: 36, height: 36, justifyContent: "center", alignItems: "center", overflow: "hidden" }}
          android_ripple={{ color: "rgba(255,255,255,0.3)", borderless: false, radius: 18 }}
          hitSlop={12}
        >
          <Text style={{ color: colors.accentFg, fontSize: 14, fontWeight: "700" }}>
            {state.isPlaying ? "| |" : " \u25B6"}
          </Text>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  progressBar: {
    height: 2,
    width: "100%",
  },
  progressFill: {
    height: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  coverImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  artist: {
    fontSize: 12,
  },
  playBtn: {
    padding: 8,
  },
});
