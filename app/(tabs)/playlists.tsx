import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { mediaUrl, type Track } from "../../src/api/kaida";
import { useTheme } from "../../src/theme/ThemeContext";
import { useLibrary } from "../../src/state/library";
import { usePlaylists } from "../../src/state/playlists";
import { usePlayer } from "../../src/state/player";

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const { tracks } = useLibrary();
  const { playlists, createPlaylist } = usePlaylists();
  const { playQueue } = usePlayer();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const byKey = useMemo(
    () => new Map(tracks.map((t) => [t.key, t] as const)),
    [tracks],
  );

  function doCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = createPlaylist(trimmed);
    setNewName("");
    setCreating(false);
    router.push(`/playlist/${encodeURIComponent(id)}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colors.accent }]}>Playlists</Text>
        <Text style={[styles.title, { color: colors.fg }]}>Your queues and mixes.</Text>

        <Pressable
          style={[styles.createBtn, { backgroundColor: colors.accent }]}
          onPress={() => setCreating(true)}
        >
          <Text style={{ color: colors.accentFg, fontWeight: "600" }}>+ New Playlist</Text>
        </Pressable>

        {creating && (
          <View style={[styles.createForm, { backgroundColor: colors.bgElev }]}>
            <TextInput
              style={[styles.input, { color: colors.fg, borderColor: colors.border }]}
              placeholder="Playlist name..."
              placeholderTextColor={colors.fgDim}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={doCreate}
            />
            <View style={styles.formBtns}>
              <Pressable onPress={() => { setCreating(false); setNewName(""); }}>
                <Text style={{ color: colors.fgDim }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={doCreate}>
                <Text style={{ color: colors.accent, fontWeight: "600" }}>Create</Text>
              </Pressable>
            </View>
          </View>
        )}

        {playlists.length === 0 && !creating && (
          <View style={styles.empty}>
            <Text style={{ color: colors.fgDim, fontSize: 32 }}>≣</Text>
            <Text style={{ color: colors.fgDim }}>No playlists yet. Create one above.</Text>
          </View>
        )}

        {playlists.map((pl) => {
          const items = pl.trackKeys.map((k) => byKey.get(k)).filter((t): t is Track => t !== undefined);
          const coverKey = pl.coverKey || items.find((t) => t.coverKey)?.coverKey || "";
          return (
            <Pressable
              key={pl.id}
              style={[styles.playlistCard, { backgroundColor: colors.bgElev }]}
              onPress={() => router.push(`/playlist/${encodeURIComponent(pl.id)}`)}
            >
              <View style={[styles.cover, { backgroundColor: colors.bgElev2 }]}>
                {coverKey ? (
                  <Image source={{ uri: mediaUrl(coverKey) }} style={styles.coverImg} contentFit="cover" />
                ) : (
                  <Text style={{ color: colors.fgDim, fontSize: 24 }}>♪</Text>
                )}
              </View>
              <View style={styles.meta}>
                <Text style={{ color: colors.fgDim, fontSize: 11, fontWeight: "600", textTransform: "uppercase" }}>Playlist</Text>
                <Text style={{ color: colors.fg, fontSize: 16, fontWeight: "600" }} numberOfLines={1}>{pl.name}</Text>
                <Text style={{ color: colors.fgDim, fontSize: 13 }}>
                  {items.length} song{items.length === 1 ? "" : "s"}
                </Text>
              </View>
              <Pressable
                onPress={() => { if (items.length > 0) { playQueue(items, 0); router.push("/now-playing"); } }}
                style={styles.playBtn}
              >
                <Text style={{ color: colors.accent, fontSize: 20 }}>▶</Text>
              </Pressable>
            </Pressable>
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  createBtn: { alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 16 },
  createForm: { padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  formBtns: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  empty: { alignItems: "center", gap: 8, paddingTop: 60 },
  playlistCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, gap: 14, marginBottom: 10 },
  cover: { width: 60, height: 60, borderRadius: 8, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  coverImg: { width: 60, height: 60, borderRadius: 8 },
  meta: { flex: 1, gap: 2 },
  playBtn: { padding: 12 },
});
