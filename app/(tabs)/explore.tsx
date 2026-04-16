import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fuzzyScore, mediaUrl, type Track } from "../../src/api/kaida";
import { useTheme } from "../../src/theme/ThemeContext";
import { useLibrary } from "../../src/state/library";
import { usePlayer } from "../../src/state/player";

type Group = { id: string; label: string; tracks: Track[]; coverKey: string };

function groupBy(tracks: Track[], key: (t: Track) => string): Group[] {
  const map = new Map<string, Track[]>();
  for (const t of tracks) {
    const v = key(t).trim();
    if (!v) continue;
    const bucket = map.get(v);
    if (bucket) bucket.push(t);
    else map.set(v, [t]);
  }
  return Array.from(map.entries())
    .map(([label, tr]) => ({
      id: label,
      label,
      tracks: tr,
      coverKey: tr.find((t) => t.coverKey)?.coverKey ?? "",
    }))
    .sort((a, b) => b.tracks.length - a.tracks.length);
}

function filterGroups(groups: Group[], q: string): Group[] {
  if (!q) return groups;
  return groups
    .map((g) => ({ g, s: fuzzyScore(q, g.label) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.g);
}

export default function ExploreScreen() {
  const { colors } = useTheme();
  const { tracks } = useLibrary();
  const { playQueue } = usePlayer();
  const router = useRouter();
  const [filter, setFilter] = useState("");

  const byGenre = useMemo(() => groupBy(tracks, (t) => t.genre), [tracks]);
  const byMood = useMemo(() => groupBy(tracks, (t) => t.mood), [tracks]);
  const byArtist = useMemo(() => groupBy(tracks, (t) => t.artist), [tracks]);

  const q = filter.trim();
  const filteredGenre = useMemo(() => filterGroups(byGenre, q), [byGenre, q]);
  const filteredMood = useMemo(() => filterGroups(byMood, q), [byMood, q]);
  const filteredArtist = useMemo(() => filterGroups(byArtist, q), [byArtist, q]);

  function Shelf({ title, groups, kind }: { title: string; groups: Group[]; kind: string }) {
    if (groups.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.fg }]}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {groups.map((g) => (
            <Pressable
              key={g.id}
              style={[styles.card, { backgroundColor: colors.bgElev }]}
              onPress={() => router.push(`/collection/${kind}/${encodeURIComponent(g.label)}`)}
            >
              <View style={[styles.cardCover, { backgroundColor: colors.bgElev2 }]}>
                {g.coverKey ? (
                  <Image source={{ uri: mediaUrl(g.coverKey) }} style={styles.cardCoverImg} contentFit="cover" />
                ) : (
                  <Text style={{ color: colors.fgDim, fontSize: 20 }}>♪</Text>
                )}
              </View>
              <Text style={{ color: colors.fg, fontWeight: "500", fontSize: 14 }} numberOfLines={1}>{g.label}</Text>
              <Text style={{ color: colors.fgDim, fontSize: 12 }}>
                {g.tracks.length} song{g.tracks.length === 1 ? "" : "s"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.accent }}>← Back</Text>
        </Pressable>
        <Text style={[styles.kicker, { color: colors.accent }]}>Explore</Text>
        <Text style={[styles.title, { color: colors.fg }]}>Browse by mood, genre, and artist.</Text>

        <TextInput
          style={[styles.search, { backgroundColor: colors.bgElev, color: colors.fg, borderColor: colors.border }]}
          placeholder="Filter..."
          placeholderTextColor={colors.fgDim}
          value={filter}
          onChangeText={setFilter}
        />

        <Shelf title="Genres" groups={filteredGenre} kind="genre" />
        <Shelf title="Moods" groups={filteredMood} kind="mood" />
        <Shelf title="Artists" groups={filteredArtist} kind="artist" />

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  backBtn: { marginBottom: 12 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  search: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  hScroll: { gap: 12 },
  card: { width: 130, borderRadius: 10, padding: 10, gap: 6 },
  cardCover: { width: 110, height: 110, borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  cardCoverImg: { width: 110, height: 110, borderRadius: 8 },
});
