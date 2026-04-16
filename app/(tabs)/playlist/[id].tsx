import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl, type Track } from "../../../src/api/kaida";
import { useTheme } from "../../../src/theme/ThemeContext";
import { useLibrary } from "../../../src/state/library";
import { usePlaylists } from "../../../src/state/playlists";
import { usePlayer } from "../../../src/state/player";
import { TrackRow } from "../../../src/components/TrackRow";

function fmt(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { tracks } = useLibrary();
  const { playlists, renamePlaylist, deletePlaylist, removeTrackFromPlaylist } = usePlaylists();
  const { playQueue, current, state } = usePlayer();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const playlist = useMemo(() => playlists.find((p) => p.id === id) ?? null, [playlists, id]);
  const byKey = useMemo(() => new Map(tracks.map((t) => [t.key, t] as const)), [tracks]);
  const items = useMemo(() => {
    if (!playlist) return [];
    return playlist.trackKeys.map((k) => byKey.get(k)).filter((t): t is Track => t !== undefined);
  }, [playlist, byKey]);

  const totalSec = useMemo(() => items.reduce((a, t) => a + (t.duration || 0), 0), [items]);
  const coverKey = useMemo(() => {
    if (!playlist) return "";
    return playlist.coverKey || (items.find((t) => t.coverKey)?.coverKey ?? "");
  }, [playlist, items]);

  if (!playlist) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.fgDim }}>Playlist not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.accent, marginTop: 12 }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  function startEdit() {
    setNameDraft(playlist!.name);
    setEditing(true);
  }
  function commitEdit() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== playlist!.name) renamePlaylist(id!, trimmed);
    setEditing(false);
  }
  function doDelete() {
    Alert.alert("Delete playlist", `Delete "${playlist!.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deletePlaylist(id!); router.back(); } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
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
              {coverKey ? (
                <Image source={{ uri: mediaUrl(coverKey) }} style={styles.coverImg} contentFit="cover" />
              ) : (
                <Text style={{ color: colors.fgDim, fontSize: 36 }}>♪</Text>
              )}
            </View>
            <Text style={[styles.kicker, { color: colors.accent }]}>Playlist</Text>
            {editing ? (
              <TextInput
                style={[styles.nameInput, { color: colors.fg, borderColor: colors.border }]}
                value={nameDraft}
                onChangeText={setNameDraft}
                onBlur={commitEdit}
                onSubmitEditing={commitEdit}
                autoFocus
              />
            ) : (
              <Pressable onPress={startEdit}>
                <Text style={[styles.plTitle, { color: colors.fg }]}>{playlist.name}</Text>
              </Pressable>
            )}
            <Text style={{ color: colors.fgDim, fontSize: 14 }}>
              {items.length} song{items.length === 1 ? "" : "s"}{items.length > 0 ? ` · ${fmt(totalSec)}` : ""}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.playBtn, { backgroundColor: colors.accent }]}
                onPress={() => { if (items.length > 0) { playQueue(items, 0); router.push("/now-playing"); } }}
              >
                <Text style={{ color: colors.accentFg, fontWeight: "600" }}>▶ Play</Text>
              </Pressable>
              <Pressable style={[styles.ghostBtn, { borderColor: colors.danger }]} onPress={doDelete}>
                <Text style={{ color: colors.danger }}>Delete</Text>
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
  cover: { width: 160, height: 160, borderRadius: 10, justifyContent: "center", alignItems: "center", overflow: "hidden", marginBottom: 12 },
  coverImg: { width: 160, height: 160, borderRadius: 10 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  plTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  nameInput: { fontSize: 22, fontWeight: "700", textAlign: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, minWidth: 200 },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  playBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  ghostBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
});
