import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl, type Track } from "../src/api/kaida";
import { useTheme } from "../src/theme/ThemeContext";
import { useLibrary } from "../src/state/library";
import { useLikes } from "../src/state/likes";
import { usePlayer } from "../src/state/player";
import { TrackRow } from "../src/components/TrackRow";

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function LikedSongsScreen() {
  const { colors } = useTheme();
  const { tracks } = useLibrary();
  const { order, loaded } = useLikes();
  const { playQueue, current, state } = usePlayer();
  const router = useRouter();

  const byKey = useMemo(() => new Map(tracks.map((t) => [t.key, t] as const)), [tracks]);
  const items = useMemo(
    () => order.map((k) => byKey.get(k)).filter((t): t is Track => t !== undefined),
    [order, byKey],
  );
  const totalSec = useMemo(() => items.reduce((sum, t) => sum + (t.duration || 0), 0), [items]);
  const previewCover = items.find((t) => t.coverKey)?.coverKey ?? "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={{ color: colors.accent }}>← Back</Text>
            </Pressable>
            <View style={[styles.cover, { backgroundColor: colors.bgElev }]}>
              {previewCover ? (
                <Image source={{ uri: mediaUrl(previewCover) }} style={styles.coverImg} contentFit="cover" />
              ) : (
                <Text style={{ color: colors.fgDim, fontSize: 36 }}>♥</Text>
              )}
            </View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Liked Songs</Text>
            <Text style={[styles.title, { color: colors.fg }]}>Your favorites.</Text>
            <Text style={{ color: colors.fgDim, fontSize: 14 }}>
              {items.length} song{items.length === 1 ? "" : "s"}{items.length > 0 ? ` · ${fmt(totalSec)}` : ""}
            </Text>
            {items.length > 0 && (
              <Pressable
                style={[styles.playBtn, { backgroundColor: colors.accent }]}
                onPress={() => { playQueue(items, 0); router.push("/now-playing"); }}
              >
                <Text style={{ color: colors.accentFg, fontWeight: "600" }}>▶ Play all</Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={{ color: colors.fgDim, fontSize: 32 }}>♥</Text>
              <Text style={{ color: colors.fgDim }}>No liked songs yet. Use the heart icon on any track.</Text>
            </View>
          ) : (
            <Text style={{ color: colors.fgDim, padding: 20 }}>Loading...</Text>
          )
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            isCurrent={current?.key === item.key}
            isPlaying={state.isPlaying}
            onPlay={(i) => playQueue(items, i)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", padding: 20, gap: 6 },
  backBtn: { alignSelf: "flex-start", marginBottom: 12 },
  cover: { width: 140, height: 140, borderRadius: 10, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 12 },
  coverImg: { width: 140, height: 140, borderRadius: 10 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "700" },
  playBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 12 },
  empty: { alignItems: "center", gap: 8, paddingTop: 40, paddingHorizontal: 40 },
});
