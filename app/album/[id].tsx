import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl } from "../../src/api/kaida";
import { useTheme } from "../../src/theme/ThemeContext";
import { useLibrary } from "../../src/state/library";
import { usePlayer } from "../../src/state/player";
import { useSavedAlbums } from "../../src/state/savedAlbums";
import { TrackRow } from "../../src/components/TrackRow";

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { albums } = useLibrary();
  const { playQueue, current, state, openNowPlaying } = usePlayer();
  const { isSaved, toggle: toggleSaved } = useSavedAlbums();
  const router = useRouter();

  const album = useMemo(() => albums.find((a) => a.id === id) ?? null, [albums, id]);

  if (!album) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.fgDim }}>Album not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const saved = isSaved(album.id);
  const totalDuration = album.tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const minutes = Math.max(1, Math.round(totalDuration / 60));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.35 }}
      />
      <FlatList
        data={album.tracks}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={{ color: colors.accent }}>← Back</Text>
            </Pressable>
            <View style={[styles.cover, { backgroundColor: colors.bgElev }]}>
              {album.coverKey ? (
                <Image source={{ uri: mediaUrl(album.coverKey) }} style={styles.coverImg} contentFit="cover" />
              ) : (
                <Text style={{ color: colors.fgDim, fontSize: 48 }}>♪</Text>
              )}
            </View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Album</Text>
            <Text style={[styles.albumTitle, { color: colors.fg }]}>{album.title}</Text>
            <Text style={{ color: colors.fgDim, fontSize: 14 }}>
              {album.artist} · {album.tracks.length} tracks{album.year ? ` · ${album.year}` : ""} · {minutes} min
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.playBtn, { backgroundColor: colors.accent }]}
                onPress={() => { playQueue(album.tracks, 0); router.push("/now-playing"); }}
              >
                <Text style={{ color: colors.accentFg, fontWeight: "600" }}>▶ Play</Text>
              </Pressable>
              <Pressable
                style={[styles.ghostBtn, { borderColor: colors.border }]}
                onPress={() => toggleSaved(album.id)}
              >
                <Text style={{ color: saved ? colors.accent : colors.fgDim }}>
                  {saved ? "♥ Saved" : "♡ Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            isCurrent={current?.key === item.key}
            isPlaying={state.isPlaying}
            showTrackNumber
            onPlay={(i) => playQueue(album.tracks, i)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", padding: 20, gap: 6 },
  backBtn: { alignSelf: "flex-start", marginBottom: 12 },
  cover: { width: 200, height: 200, borderRadius: 12, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 12 },
  coverImg: { width: 200, height: 200, borderRadius: 12 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  albumTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  playBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  ghostBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
});
