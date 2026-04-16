import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Album } from "../../src/api/kaida";
import { useTheme } from "../../src/theme/ThemeContext";
import { useLibrary } from "../../src/state/library";
import { usePlayer } from "../../src/state/player";
import { AlbumCard } from "../../src/components/AlbumCard";
import { TrackRow } from "../../src/components/TrackRow";

const alpha = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

type Mode = "albums" | "tracks";

export default function LibraryScreen() {
  const { colors } = useTheme();
  const { albums, tracks, loading, error, refresh } = useLibrary();
  const { playQueue, current, state } = usePlayer();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("albums");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filteredAlbums = useMemo(() => {
    return albums
      .filter((a) => !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q))
      .sort((a, b) => alpha.compare(a.title, b.title));
  }, [albums, q]);

  const filteredTracks = useMemo(() => {
    return tracks
      .filter((t) => !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q))
      .sort((a, b) => alpha.compare(a.title, b.title));
  }, [tracks, q]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.accent }]}>Library</Text>
        <Text style={[styles.title, { color: colors.fg }]}>Browse the collection.</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeBtn, mode === "albums" && { backgroundColor: colors.accent }]}
            onPress={() => setMode("albums")}
          >
            <Text style={{ color: mode === "albums" ? colors.accentFg : colors.fgDim, fontWeight: "600", fontSize: 13 }}>Albums</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, mode === "tracks" && { backgroundColor: colors.accent }]}
            onPress={() => setMode("tracks")}
          >
            <Text style={{ color: mode === "tracks" ? colors.accentFg : colors.fgDim, fontWeight: "600", fontSize: 13 }}>Tracks</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.search, { backgroundColor: colors.bgElev, color: colors.fg, borderColor: colors.border }]}
          placeholder="Filter..."
          placeholderTextColor={colors.fgDim}
          value={query}
          onChangeText={setQuery}
        />
        <Text style={{ color: colors.fgDim, fontSize: 12, marginTop: 4 }}>
          {mode === "albums" ? `${filteredAlbums.length} albums` : `${filteredTracks.length} tracks`}
        </Text>
      </View>

      {loading && <Text style={{ color: colors.fgDim, padding: 20 }}>Loading...</Text>}
      {error && <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text>}

      {!loading && !error && mode === "albums" && (
        <FlatList
          data={filteredAlbums}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <AlbumCard
              album={item}
              onOpen={(a) => router.push(`/album/${encodeURIComponent(a.id)}`)}
            />
          )}
        />
      )}

      {!loading && !error && mode === "tracks" && (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.key}
          renderItem={({ item, index }) => (
            <TrackRow
              track={item}
              index={index}
              isCurrent={current?.key === item.key}
              isPlaying={state.isPlaying}
              onPlay={(i) => playQueue(filteredTracks, i)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  search: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  grid: { padding: 16, paddingBottom: 120 },
  gridRow: { gap: 16, marginBottom: 16 },
});
