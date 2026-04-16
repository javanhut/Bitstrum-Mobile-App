import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl, type Track } from "../../src/api/kaida";
import { useTheme } from "../../src/theme/ThemeContext";
import { useLibrary } from "../../src/state/library";
import { useProfile } from "../../src/state/profile";
import { useLikes } from "../../src/state/likes";
import { useSavedAlbums } from "../../src/state/savedAlbums";
import { usePlaylists } from "../../src/state/playlists";
import { usePlayer } from "../../src/state/player";
import { AlbumCard } from "../../src/components/AlbumCard";

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const { tracks, albums, loading, refresh } = useLibrary();
  const { profile } = useProfile();
  const { playlists } = usePlaylists();
  const { order: savedAlbumIds } = useSavedAlbums();
  const { order: likedOrder } = useLikes();
  const { playQueue, openNowPlaying, current, state } = usePlayer();
  const router = useRouter();

  const trimmedName = profile.displayName.trim();
  const firstName = trimmedName.split(/\s+/)[0] || "there";
  const greeting = greetingFor();

  const byKey = useMemo(
    () => new Map(tracks.map((t) => [t.key, t] as const)),
    [tracks],
  );
  const byAlbumId = useMemo(
    () => new Map(albums.map((a) => [a.id, a] as const)),
    [albums],
  );

  const likedTracks = useMemo(
    () => likedOrder.map((k) => byKey.get(k)).filter((t): t is Track => t !== undefined),
    [likedOrder, byKey],
  );

  const savedAlbums = useMemo(
    () => savedAlbumIds.map((id) => byAlbumId.get(id)).filter(Boolean),
    [savedAlbumIds, byAlbumId],
  );

  const quickPicks = useMemo(() => {
    const pool = [...likedTracks];
    for (const album of savedAlbums) {
      if (!album) continue;
      for (const track of album.tracks) {
        if (!pool.some((e) => e.key === track.key)) pool.push(track);
      }
    }
    if (current && !pool.some((t) => t.key === current.key)) pool.unshift(current);
    return pool.slice(0, 6);
  }, [likedTracks, savedAlbums, current]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.bgElev}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: colors.accent }]}>Home</Text>
          <Text style={[styles.greeting, { color: colors.fg }]}>
            {greeting}{trimmedName ? `, ${firstName}` : ""}.
          </Text>
          <View style={styles.statRow}>
            <Stat label="Songs" value={tracks.length} colors={colors} />
            <Stat label="Albums" value={albums.length} colors={colors} />
            <Stat label="Playlists" value={playlists.length} colors={colors} />
            <Stat label="Liked" value={likedTracks.length} colors={colors} />
          </View>
        </View>

        {/* Liked Songs shortcut */}
        {likedTracks.length > 0 && (
          <Pressable
            style={[styles.likedShortcut, { backgroundColor: colors.bgElev }]}
            onPress={() => router.push("/liked-songs")}
            android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false }}
          >
            <Text style={{ color: colors.accent, fontSize: 20 }}>{"\u2661"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 15 }}>Liked Songs</Text>
              <Text style={{ color: colors.fgDim, fontSize: 13 }}>{likedTracks.length} song{likedTracks.length === 1 ? "" : "s"}</Text>
            </View>
            <Pressable
              style={[styles.playShortcut, { backgroundColor: colors.accent }]}
              onPress={() => { playQueue(likedTracks, 0); router.push("/now-playing"); }}
              android_ripple={{ color: "rgba(255,255,255,0.3)", borderless: false, radius: 16 }}
            >
              <Text style={{ color: colors.accentFg, fontWeight: "700", fontSize: 12 }}>{"\u25B6"}</Text>
            </Pressable>
          </Pressable>
        )}

        {quickPicks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.kicker, { color: colors.accent }]}>Quick Picks</Text>
            <Text style={[styles.sectionTitle, { color: colors.fg }]}>Jump straight back in.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {quickPicks.map((track, index) => (
                <Pressable
                  key={track.key}
                  style={[styles.quickCard, { backgroundColor: colors.bgElev }]}
                  onPress={() => {
                    playQueue(quickPicks, index);
                    router.push("/now-playing");
                  }}
                >
                  <View style={[styles.quickCover, { backgroundColor: colors.bgElev2 }]}>
                    {track.coverKey ? (
                      <Image source={{ uri: mediaUrl(track.coverKey) }} style={styles.quickCoverImg} contentFit="cover" />
                    ) : (
                      <Text style={{ color: colors.fgDim, fontSize: 20 }}>♪</Text>
                    )}
                  </View>
                  <Text style={[styles.quickTitle, { color: colors.fg }]} numberOfLines={1}>{track.title}</Text>
                  <Text style={[styles.quickArtist, { color: colors.fgDim }]} numberOfLines={1}>{track.artist}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {playlists.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.kicker, { color: colors.accent }]}>Playlists</Text>
            <Text style={[styles.sectionTitle, { color: colors.fg }]}>Queues worth keeping around.</Text>
            {playlists.slice(0, 4).map((pl) => {
              const items = pl.trackKeys.map((k) => byKey.get(k)).filter(Boolean) as Track[];
              const coverKey = pl.coverKey || items.find((t) => t.coverKey)?.coverKey || "";
              return (
                <Pressable
                  key={pl.id}
                  style={[styles.playlistRow, { backgroundColor: colors.bgElev }]}
                  onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
                >
                  <View style={[styles.playlistCover, { backgroundColor: colors.bgElev2 }]}>
                    {coverKey ? (
                      <Image source={{ uri: mediaUrl(coverKey) }} style={styles.playlistCoverImg} contentFit="cover" />
                    ) : (
                      <Text style={{ color: colors.fgDim, fontSize: 18 }}>♪</Text>
                    )}
                  </View>
                  <View style={styles.playlistMeta}>
                    <Text style={[styles.playlistName, { color: colors.fg }]} numberOfLines={1}>{pl.name}</Text>
                    <Text style={{ color: colors.fgDim, fontSize: 13 }}>
                      {items.length} song{items.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {savedAlbums.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.kicker, { color: colors.accent }]}>Saved Albums</Text>
            <Text style={[styles.sectionTitle, { color: colors.fg }]}>Keep the albums you return to.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              {savedAlbums.filter(Boolean).slice(0, 6).map((album) => (
                <AlbumCard
                  key={album!.id}
                  album={album!}
                  onOpen={(a) => router.push(`/album/${encodeURIComponent(a.id)}`)}
                  size={130}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color: colors.fgDim, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.fg, fontSize: 20, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20 },
  likedShortcut: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, gap: 14, marginBottom: 20, overflow: "hidden" },
  playShortcut: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  hero: { marginBottom: 28 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  greeting: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  statRow: { flexDirection: "row", gap: 16 },
  stat: { gap: 2 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  hScroll: { gap: 12, paddingRight: 20 },
  quickCard: { width: 130, borderRadius: 10, padding: 10, gap: 6 },
  quickCover: { width: 110, height: 110, borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  quickCoverImg: { width: 110, height: 110, borderRadius: 8 },
  quickTitle: { fontSize: 13, fontWeight: "500" },
  quickArtist: { fontSize: 12 },
  playlistRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, gap: 12, marginBottom: 8 },
  playlistCover: { width: 48, height: 48, borderRadius: 6, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  playlistCoverImg: { width: 48, height: 48, borderRadius: 6 },
  playlistMeta: { flex: 1, gap: 2 },
  playlistName: { fontSize: 15, fontWeight: "500" },
});
