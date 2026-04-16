import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "../../src/theme/ThemeContext";
import { MiniPlayer } from "../../src/components/MiniPlayer";
import { useTrackPlayerSync } from "../../src/hooks/useTrackPlayer";
import { usePlayer } from "../../src/state/player";

export default function TabLayout() {
  const { colors } = useTheme();
  const { current } = usePlayer();

  // Sync player state <-> TrackPlayer service.
  useTrackPlayerSync();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bgElev,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.fgDim,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <TabIcon color={color} icon="⌂" />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color }) => (
              <TabIcon color={color} icon="♫" />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => (
              <TabIcon color={color} icon="⌕" />
            ),
          }}
        />
        <Tabs.Screen
          name="playlists"
          options={{
            title: "Playlists",
            tabBarIcon: ({ color }) => (
              <TabIcon color={color} icon="≣" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <TabIcon color={color} icon="⚙" />
            ),
          }}
        />
      </Tabs>
      {current && <MiniPlayer />}
    </View>
  );
}

function TabIcon({ color, icon }: { color: string; icon: string }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color, fontSize: 20 }}>{icon}</Text>
    </View>
  );
}
