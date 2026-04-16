import { useMemo } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl, type Album, type Track } from "../../../src/api/kaida";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useLibrary } from "../../../src/state/library";
import { usePlayer } from "../../../src/state/player";
import { AlbumCard } from "../../../src/components/AlbumCard";
import { TrackRow } from "../../../src/components/TrackRow";

const ALPHA_OPTS: Intl.CollatorOptions = { sensitivity: "base", numeric: true };

const KIND_LABELS: Record<string, string> = {
  genre: "Genre",
  artist: "Artist",
  mood: "Mood",
};

function fmtDuration(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function CollectionScreen() {
  const { kind, value } = useLocalSearchParams<{ kind: string; value: string }>();
  const { colors } = useTheme();
  const { tracks, albums } = useLibrary();
  const { playQueue, current, state } = usePlayer();
  const router = useRouter();

  const matched = useMemo(() => {
    const v = (value ?? "").toLowerCase();
    return tracks.filter((t) => {
      if (kind === "genre") return t.genre.toLowerCase() === v;
      if (kind === "mood") return t.mood.toLowerCase() === v;
      return t.artist.toLowerCase() === v;
    });
  }, [tracks, kind, value]);

  const artistAlbums = useMemo<Album[]>(() => {
    if (kind !== "artist") return [];
    const ids = new Set(matched.map((t) => t.albumId));
    return albums
      .filter((a) => ids.has(a.id))
      .sort((a, b) => {
        const ya = Number(a.year || 0);
        const yb = Number(b.year || 0);
        if (ya !== yb) return ya - yb;
        return a.title.localeCompare(b.title, undefined, ALPHA_OPTS);
      });
  }, [matched, albums, kind]);

  const playable = kind === "artist" ? artistAlbums.flatMap((a) => a.tracks) : matched;
  const totalSec = useMemo(() => playable.reduce((a, t) => a + (t.duration || 0), 0), [playable]);
  const headerCoverKey = useMemo(() => {
    if (kind === "artist") {
      for (const a of artistAlbums) if (a.coverKey) return a.coverKey;
    }
    return matched.find((t) => t.coverKey)?.coverKey ?? "";
  }, [artistAlbums, matched, kind]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.3 }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: colors.accent }}>← Back</Text>
          </Pressable>
          <View style={[styles.cover, { backgroundColor: colors.bgElev }]}>
            {headerCoverKey ? (
              <Image source={{ uri: mediaUrl(headerCoverKey) }} style={styles.coverImg} contentFit="cover" />
            ) : (
              <Text style={{ color: colors.fgDim, fontSize: 36 }}>{kind === "artist" ? "◉" : "♪"}</Text>
            )}
          </View>
          <Text style={[styles.kicker, { color: colors.accent }]}>{KIND_LABELS[kind ?? ""] ?? "Collection"}</Text>
          <Text style={[styles.title, { color: colors.fg }]}>{value}</Text>
          <Text style={{ color: colors.fgDim, fontSize: 14 }}>
            {matched.length} song{matched.length === 1 ? "" : "s"}{playable.length > 0 ? ` · ${fmtDuration(totalSec)}` : ""}
          </Text>
          {playable.length > 0 && (
            <Pressable
              style={[styles.playBtn, { backgroundColor: colors.accent }]}
              onPress={() => { playQueue(playable, 0); router.push("/now-playing"); }}
            >
              <Text style={{ color: colors.accentFg, fontWeight: "600" }}>▶ Play all</Text>
            </Pressable>
          )}
        </View>

        {kind === "artist" && artistAlbums.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 20, marginBottom: 20 }}>
            {artistAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onOpen={(a) => router.push(`/album/${encodeURIComponent(a.id)}`)}
                size={130}
              />
            ))}
          </ScrollView>
        )}

        {kind !== "artist" && matched.map((t, i) => (
          <TrackRow
            key={t.key}
            track={t}
            index={i}
            isCurrent={current?.key === t.key}
            isPlaying={state.isPlaying}
            onPlay={(idx) => playQueue(playable, idx)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", padding: 20, gap: 6 },
  backBtn: { alignSelf: "flex-start", marginBottom: 12 },
  cover: { width: 160, height: 160, borderRadius: 10, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 12 },
  coverImg: { width: 160, height: 160, borderRadius: 10 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  playBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginTop: 12 },
});
