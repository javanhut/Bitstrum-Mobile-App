import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fuzzyScore, mediaUrl, type Album, type Track } from "../../src/api/kaida";
import { useTheme } from "../../src/theme/ThemeContext";
import { useLibrary } from "../../src/state/library";
import { usePlayer } from "../../src/state/player";
import { AlbumCard } from "../../src/components/AlbumCard";
import { TrackRow } from "../../src/components/TrackRow";

type Suggestion =
  | { kind: "track"; track: Track; score: number }
  | { kind: "album"; album: Album; score: number }
  | { kind: "artist"; name: string; coverKey: string; count: number; score: number };

export default function SearchScreen() {
  const { colors } = useTheme();
  const { tracks, albums } = useLibrary();
  const { playQueue, current, state } = usePlayer();
  const router = useRouter();
  const [q, setQ] = useState("");

  const artists = useMemo(() => {
    const map = new Map<string, { cover: string; count: number }>();
    for (const t of tracks) {
      const a = t.artist.trim();
      if (!a) continue;
      const prev = map.get(a);
      if (prev) { prev.count++; if (!prev.cover && t.coverKey) prev.cover = t.coverKey; }
      else map.set(a, { cover: t.coverKey, count: 1 });
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, coverKey: v.cover, count: v.count }));
  }, [tracks]);

  const topHits = useMemo<Suggestion[]>(() => {
    const query = q.trim();
    if (!query) return [];
    const bucket: Suggestion[] = [];
    for (const t of tracks) {
      const s = Math.max(fuzzyScore(query, t.title) * 1.1, fuzzyScore(query, t.artist) * 0.6);
      if (s > 0) bucket.push({ kind: "track", track: t, score: s });
    }
    for (const a of albums) {
      const s = Math.max(fuzzyScore(query, a.title), fuzzyScore(query, a.artist) * 0.7);
      if (s > 0) bucket.push({ kind: "album", album: a, score: s });
    }
    for (const a of artists) {
      const s = fuzzyScore(query, a.name) * 1.05;
      if (s > 0) bucket.push({ kind: "artist", ...a, score: s });
    }
    bucket.sort((x, y) => y.score - x.score);
    return bucket.slice(0, 3);
  }, [q, tracks, albums, artists]);

  const trackResults = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    return tracks
      .map((t) => ({ t, s: Math.max(fuzzyScore(query, t.title), fuzzyScore(query, t.artist) * 0.7, fuzzyScore(query, t.album) * 0.6) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map((x) => x.t);
  }, [q, tracks]);

  const albumResults = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    return albums
      .map((a) => ({ a, s: Math.max(fuzzyScore(query, a.title), fuzzyScore(query, a.artist) * 0.7) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.a);
  }, [q, albums]);

  function selectSuggestion(s: Suggestion) {
    if (s.kind === "track") {
      const album = albums.find((a) => a.id === s.track.albumId);
      if (album) {
        const idx = album.tracks.findIndex((t) => t.key === s.track.key);
        playQueue(album.tracks, Math.max(0, idx));
      } else playQueue([s.track], 0);
      router.push("/now-playing");
    } else if (s.kind === "album") {
      router.push(`/album/${encodeURIComponent(s.album.id)}`);
    } else if (s.kind === "artist") {
      router.push(`/collection/artist/${encodeURIComponent(s.name)}`);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.accent }]}>Search</Text>
        <Text style={[styles.title, { color: colors.fg }]}>Find anything in your library.</Text>
        <TextInput
          style={[styles.search, { backgroundColor: colors.bgElev, color: colors.fg, borderColor: colors.border }]}
          placeholder="Title, artist, album..."
          placeholderTextColor={colors.fgDim}
          value={q}
          onChangeText={setQ}
          autoFocus
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {q.trim() === "" && (
          <View style={styles.empty}>
            <Text style={{ color: colors.fgDim, fontSize: 32 }}>⌕</Text>
            <Text style={{ color: colors.fgDim }}>Start typing to search.</Text>
          </View>
        )}

        {topHits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.kicker, { color: colors.accent }]}>Top Hits</Text>
            {topHits.map((item) => {
              const key = item.kind === "track" ? `t:${item.track.key}` : item.kind === "album" ? `a:${item.album.id}` : `ar:${item.name}`;
              const title = item.kind === "track" ? item.track.title : item.kind === "album" ? item.album.title : item.name;
              const sub = item.kind === "track" ? `${item.track.artist} · ${item.track.album}` : item.kind === "album" ? item.album.artist : `${item.count} songs`;
              const tag = item.kind === "track" ? "Song" : item.kind === "album" ? "Album" : "Artist";
              return (
                <Pressable key={key} style={[styles.hitRow, { backgroundColor: colors.bgElev }]} onPress={() => selectSuggestion(item)}>
                  <View style={styles.hitMeta}>
                    <Text style={[styles.hitTag, { color: colors.accent }]}>{tag}</Text>
                    <Text style={{ color: colors.fg, fontWeight: "600" }} numberOfLines={1}>{title}</Text>
                    <Text style={{ color: colors.fgDim, fontSize: 13 }} numberOfLines={1}>{sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {albumResults.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.kicker, { color: colors.accent }]}>Albums</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
              {albumResults.map((a) => (
                <AlbumCard key={a.id} album={a} onOpen={(al) => router.push(`/album/${encodeURIComponent(al.id)}`)} size={120} />
              ))}
            </ScrollView>
          </View>
        )}

        {trackResults.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.kicker, { color: colors.accent, paddingHorizontal: 20 }]}>Songs</Text>
            {trackResults.map((t, i) => (
              <TrackRow
                key={t.key}
                track={t}
                index={i}
                isCurrent={current?.key === t.key}
                isPlaying={state.isPlaying}
                onPlay={(idx) => playQueue(trackResults, idx)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  search: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1 },
  empty: { alignItems: "center", gap: 8, paddingTop: 60 },
  section: { marginBottom: 24, gap: 8 },
  hitRow: { marginHorizontal: 20, padding: 14, borderRadius: 10, marginBottom: 8 },
  hitMeta: { gap: 2 },
  hitTag: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
});
