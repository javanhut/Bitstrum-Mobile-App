import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl } from "../src/api/kaida";
import { useTheme } from "../src/theme/ThemeContext";
import { usePlayer } from "../src/state/player";
import { useProgress } from "../src/hooks/useTrackPlayer";

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NowPlayingScreen() {
  const { colors } = useTheme();
  const { state, current, toggle, next, prev, seek, toggleShuffle, cycleRepeat } = usePlayer();
  const router = useRouter();
  const { position, duration } = useProgress(250);

  if (!current) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.fgDim }}>Nothing playing.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progress = duration > 0 ? position / duration : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={{ color: colors.accent, fontSize: 16 }}>▾ Now Playing</Text>
        </Pressable>

        <View style={[styles.cover, { backgroundColor: colors.bgElev }]}>
          {current.coverKey ? (
            <Image
              source={{ uri: mediaUrl(current.coverKey) }}
              style={styles.coverImg}
              contentFit="cover"
            />
          ) : (
            <Text style={{ color: colors.fgDim, fontSize: 64 }}>♪</Text>
          )}
        </View>

        <View style={styles.meta}>
          <Text style={[styles.album, { color: colors.fgDim }]}>
            {current.album}{current.year ? ` · ${current.year}` : ""}
          </Text>
          <Text style={[styles.title, { color: colors.fg }]} numberOfLines={1}>{current.title}</Text>
          <Text style={[styles.artist, { color: colors.fgDim }]}>{current.artist}</Text>
        </View>

        <View style={styles.scrub}>
          <Text style={{ color: colors.fgDim, fontSize: 12, width: 42 }}>{fmt(position)}</Text>
          <View style={[styles.scrubTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.scrubFill, { width: `${progress * 100}%`, backgroundColor: colors.accent }]} />
            <Pressable
              style={[styles.scrubThumb, { left: `${progress * 100}%`, backgroundColor: colors.accent }]}
              onPress={() => {}}
            />
          </View>
          <Text style={{ color: colors.fgDim, fontSize: 12, width: 42, textAlign: "right" }}>{fmt(duration)}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={toggleShuffle} style={styles.ctrlBtn}>
            <Text style={{ color: state.shuffle ? colors.accent : colors.fgDim, fontSize: 20 }}>⤮</Text>
          </Pressable>
          <Pressable onPress={prev} style={styles.ctrlBtn}>
            <Text style={{ color: colors.fg, fontSize: 28 }}>⏮</Text>
          </Pressable>
          <Pressable onPress={toggle} style={[styles.playBtn, { backgroundColor: colors.accent }]}>
            <Text style={{ color: colors.accentFg, fontSize: 28 }}>{state.isPlaying ? "⏸" : "▶"}</Text>
          </Pressable>
          <Pressable onPress={next} style={styles.ctrlBtn}>
            <Text style={{ color: colors.fg, fontSize: 28 }}>⏭</Text>
          </Pressable>
          <Pressable onPress={cycleRepeat} style={styles.ctrlBtn}>
            <Text style={{ color: state.repeat !== "off" ? colors.accent : colors.fgDim, fontSize: 18 }}>
              {state.repeat === "one" ? "🔂" : "🔁"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.facts}>
          {current.genre ? (
            <View style={styles.factRow}>
              <Text style={{ color: colors.fgDim, fontSize: 12 }}>Genre</Text>
              <Text style={{ color: colors.fg, fontSize: 13 }}>{current.genre}</Text>
            </View>
          ) : null}
          <View style={styles.factRow}>
            <Text style={{ color: colors.fgDim, fontSize: 12 }}>Format</Text>
            <Text style={{ color: colors.fg, fontSize: 13 }}>{current.contentType || "audio"}</Text>
          </View>
          <View style={styles.factRow}>
            <Text style={{ color: colors.fgDim, fontSize: 12 }}>Size</Text>
            <Text style={{ color: colors.fg, fontSize: 13 }}>{(current.totalSize / (1024 * 1024)).toFixed(1)} MB</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: "center" },
  closeBtn: { alignSelf: "center", marginBottom: 20, padding: 8 },
  cover: { width: 280, height: 280, borderRadius: 16, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 24 },
  coverImg: { width: 280, height: 280, borderRadius: 16 },
  meta: { alignItems: "center", gap: 4, marginBottom: 24, width: "100%" },
  album: { fontSize: 13 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  artist: { fontSize: 16 },
  scrub: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%", marginBottom: 24 },
  scrubTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "visible" },
  scrubFill: { height: 4, borderRadius: 2 },
  scrubThumb: { position: "absolute", top: -6, width: 16, height: 16, borderRadius: 8, marginLeft: -8 },
  controls: { flexDirection: "row", alignItems: "center", gap: 20, marginBottom: 28 },
  ctrlBtn: { padding: 8 },
  playBtn: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  facts: { gap: 8, width: "100%" },
  factRow: { flexDirection: "row", justifyContent: "space-between" },
});
