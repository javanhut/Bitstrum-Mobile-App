import { Tabs } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../src/theme/ThemeContext";
import { useSidebar } from "../../src/state/sidebar";

export default function TabLayout() {
  const { colors } = useTheme();
  const { toggle } = useSidebar();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgElev,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          justifyContent: "center",
        },
        tabBarItemStyle: {
          paddingTop: 2,
          paddingBottom: 16,
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
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2315"} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2726"} />,
        }}
      />
      {/* Menu button opens the sidebar */}
      <Tabs.Screen
        name="menu"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <TabIcon color={color} icon={"\u2630"} />,
          tabBarButton: (props) => (
            <Pressable
              {...props}
              onPress={(e) => {
                e.preventDefault();
                toggle();
              }}
            />
          ),
        }}
      />
      {/* Hidden screens — accessible via sidebar or navigation */}
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="liked-songs" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="playlists" options={{ href: null }} />
      <Tabs.Screen name="album/[id]" options={{ href: null }} />
      <Tabs.Screen name="playlist/[id]" options={{ href: null }} />
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
