import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeContext";
import { THEMES } from "../../src/theme/colors";
import { useProfile } from "../../src/state/profile";
import { useLibrary } from "../../src/state/library";
import { useLikes } from "../../src/state/likes";
import { getServerUrl, getServerPass, setServerUrl, setServerPass } from "../../src/api/config";

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { profile, setDisplayName, setThemeId } = useProfile();
  const { tracks, albums, refresh } = useLibrary();
  const { order: likedOrder } = useLikes();

  const [url, setUrl] = useState(getServerUrl);
  const [pass, setPass] = useState(getServerPass);
  const [status, setStatus] = useState("");

  const trimmedName = profile.displayName.trim();

  async function saveAndTest() {
    const trimmedUrl = url.trim().replace(/\/+$/, "");
    setServerUrl(trimmedUrl);
    setServerPass(pass.trim());
    setStatus("Connecting...");

    // Quick connectivity test before loading the full library.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const testUrl = `${trimmedUrl}/api/media?prefix=music/tracks/&limit=1`;
      const headers: Record<string, string> = {};
      if (pass.trim()) headers["X-Server-Pass"] = pass.trim();

      const r = await fetch(testUrl, { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (!r.ok) {
        setStatus(`Error: Server returned ${r.status}`);
        return;
      }
      setStatus("Connected! Loading library...");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatus("Error: Connection timed out. Check the URL and that your server is running.");
      } else {
        setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }

    // Now load the full library.
    try {
      await refresh();
      setStatus("Connected!");
    } catch (e) {
      setStatus(`Error loading library: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colors.accent }]}>Settings</Text>
        <Text style={[styles.title, { color: colors.fg }]}>Configure Bitstrum.</Text>

        {/* Server Config */}
        <View style={[styles.card, { backgroundColor: colors.bgElev }]}>
          <Text style={[styles.cardKicker, { color: colors.accent }]}>Server Connection</Text>
          <Text style={[styles.cardTitle, { color: colors.fg }]}>Connect to your Bitstrum server.</Text>

          <Text style={[styles.label, { color: colors.fgDim }]}>Server URL</Text>
          <TextInput
            style={[styles.input, { color: colors.fg, borderColor: colors.border }]}
            placeholder="http://192.168.1.100:3000"
            placeholderTextColor={colors.fgDim}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={[styles.label, { color: colors.fgDim }]}>KaidaDB Password</Text>
          <TextInput
            style={[styles.input, { color: colors.fg, borderColor: colors.border }]}
            placeholder="Server password"
            placeholderTextColor={colors.fgDim}
            value={pass}
            onChangeText={setPass}
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={saveAndTest}
          >
            <Text style={{ color: colors.accentFg, fontWeight: "600" }}>Save & Connect</Text>
          </Pressable>

          {status !== "" && (
            <Text style={{ color: status.startsWith("Error") ? colors.danger : colors.accent, marginTop: 8 }}>
              {status}
            </Text>
          )}
        </View>

        {/* Profile */}
        <View style={[styles.card, { backgroundColor: colors.bgElev }]}>
          <Text style={[styles.cardKicker, { color: colors.accent }]}>Identity</Text>
          <Text style={[styles.cardTitle, { color: colors.fg }]}>Name and profile.</Text>

          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={{ color: colors.accentFg, fontSize: 20, fontWeight: "700" }}>
                {(trimmedName[0] ?? "◉").toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.fgDim }]}>Display name</Text>
              <TextInput
                style={[styles.input, { color: colors.fg, borderColor: colors.border }]}
                placeholder="Your name"
                placeholderTextColor={colors.fgDim}
                value={profile.displayName}
                onChangeText={setDisplayName}
              />
            </View>
          </View>

          <View style={styles.statRow}>
            <StatBadge label="Songs" value={tracks.length} colors={colors} />
            <StatBadge label="Albums" value={albums.length} colors={colors} />
            <StatBadge label="Liked" value={likedOrder.length} colors={colors} />
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.card, { backgroundColor: colors.bgElev }]}>
          <Text style={[styles.cardKicker, { color: colors.accent }]}>Mood</Text>
          <Text style={[styles.cardTitle, { color: colors.fg }]}>Choose the atmosphere.</Text>

          <View style={styles.themeGrid}>
            {THEMES.map((theme) => {
              const active = profile.themeId === theme.id;
              return (
                <Pressable
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: theme.colors.bg, borderColor: active ? theme.colors.accent : "transparent" },
                  ]}
                  onPress={() => setThemeId(theme.id)}
                >
                  <Text style={{ color: theme.colors.fg, fontWeight: "600", fontSize: 14 }}>{theme.name}</Text>
                  <Text style={{ color: theme.colors.fgDim, fontSize: 12 }}>{theme.description}</Text>
                  <View style={styles.swatches}>
                    <View style={[styles.swatch, { backgroundColor: theme.colors.accent }]} />
                    <View style={[styles.swatch, { backgroundColor: theme.colors.fg }]} />
                    <View style={[styles.swatch, { backgroundColor: theme.colors.bgElev2 }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBadge({ label, value, colors }: { label: string; value: number; colors: any }) {
  return (
    <View style={styles.statBadge}>
      <Text style={{ color: colors.fg, fontSize: 18, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: colors.fgDim, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  kicker: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  card: { padding: 18, borderRadius: 14, marginBottom: 16, gap: 10 },
  cardKicker: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "500", marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  primaryBtn: { alignSelf: "flex-start", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  statRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  statBadge: { alignItems: "center", gap: 2 },
  themeGrid: { gap: 10 },
  themeCard: { padding: 14, borderRadius: 10, borderWidth: 2, gap: 4 },
  swatches: { flexDirection: "row", gap: 6, marginTop: 6 },
  swatch: { width: 20, height: 20, borderRadius: 10 },
});
