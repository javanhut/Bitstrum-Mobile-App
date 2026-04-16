import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useTheme } from "../../src/theme/ThemeContext";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElev,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: 4,
          height: 56,
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
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2302"} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u266B"} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2315"} />,
        }}
      />
      <Tabs.Screen
        name="playlists"
        options={{
          title: "Playlists",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2263"} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2699"} />,
        }}
      />
      {/* Detail screens — tab bar stays visible */}
      <Tabs.Screen name="album/[id]" options={{ href: null }} />
      <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="liked-songs" options={{ href: null }} />
      <Tabs.Screen name="collection/[kind]/[value]" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ color, icon }: { color: string; icon: string }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color, fontSize: 20 }}>{icon}</Text>
    </View>
  );
}
