import { useEffect, useRef } from "react";
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../theme/ThemeContext";
import { useProfile } from "../state/profile";
import { useLibrary } from "../state/library";
import { useLikes } from "../state/likes";
import { usePlaylists } from "../state/playlists";
import { findTheme } from "../theme/colors";

const SIDEBAR_WIDTH = 280;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function Sidebar({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { albums } = useLibrary();
  const { order: likedOrder } = useLikes();
  const { playlists } = usePlaylists();
  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -SIDEBAR_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const trimmedName = profile.displayName.trim();
  const theme = findTheme(profile.themeId);

  function nav(path: string) {
    onClose();
    setTimeout(() => router.push(path as any), 50);
  }

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sidebar,
          { backgroundColor: colors.bgElev, borderRightColor: colors.border, transform: [{ translateX: slideAnim }] },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.accent }]}>Bitstrum</Text>
          <View style={[styles.profileCard, { backgroundColor: colors.bgElev2 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={{ color: colors.accentFg, fontSize: 18, fontWeight: "700" }}>
                {(trimmedName[0] ?? "\u25C9").toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={{ color: colors.fg, fontWeight: "600", fontSize: 15 }}>
                {trimmedName || "Set your name"}
              </Text>
              <Text style={{ color: colors.fgDim, fontSize: 12 }}>
                {theme.name} theme
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.nav}>
          <SidebarItem
            label="Liked Songs"
            icon={"\u2661"}
            badge={likedOrder.length > 0 ? String(likedOrder.length) : undefined}
            colors={colors}
            onPress={() => nav("/liked-songs")}
          />
          <SidebarItem
            label="Library"
            icon={"\u266B"}
            badge={`${albums.length} albums`}
            colors={colors}
            onPress={() => nav("/library")}
          />
          <SidebarItem
            label="Playlists"
            icon={"\u2263"}
            badge={playlists.length > 0 ? String(playlists.length) : undefined}
            colors={colors}
            onPress={() => nav("/playlists")}
          />
        </View>

        <View style={styles.footerSection}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SidebarItem
            label="Settings"
            icon={"\u2699"}
            colors={colors}
            onPress={() => nav("/settings")}
          />
        </View>
      </Animated.View>
    </View>
  );
}

function SidebarItem({
  label,
  icon,
  badge,
  colors,
  onPress,
}: {
  label: string;
  icon: string;
  badge?: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.navItem}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.1)", borderless: false }}
    >
      <Text style={{ color: colors.fgDim, fontSize: 20, width: 28, textAlign: "center" }}>{icon}</Text>
      <Text style={{ color: colors.fg, fontSize: 15, flex: 1 }}>{label}</Text>
      {badge && (
        <Text style={{ color: colors.fgDim, fontSize: 12 }}>{badge}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 101,
    borderRightWidth: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  footerSection: {
    paddingBottom: 15,
  },
});
