import { Stack, usePathname } from "expo-router";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ProfileProvider, useProfile } from "../src/state/profile";
import { LikesProvider } from "../src/state/likes";
import { PlaylistsProvider } from "../src/state/playlists";
import { SavedAlbumsProvider } from "../src/state/savedAlbums";
import { ResumeProvider } from "../src/state/resume";
import { PlayerProvider, usePlayer } from "../src/state/player";
import { LibraryProvider } from "../src/state/library";
import { ThemeProvider, useTheme } from "../src/theme/ThemeContext";
import { MiniPlayer } from "../src/components/MiniPlayer";
import { useTrackPlayerSync } from "../src/hooks/useTrackPlayer";

function AppContent() {
  const { current } = usePlayer();
  const { colors } = useTheme();
  const pathname = usePathname();

  useTrackPlayerSync();

  const showMiniPlayer = current && pathname !== "/now-playing";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="now-playing"
          options={{
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            gestureEnabled: true,
            gestureDirection: "vertical",
            fullScreenGestureEnabled: true,
          }}
        />
      </Stack>
      {showMiniPlayer && (
        <View style={{ position: "absolute", bottom: 56, left: 0, right: 0, zIndex: 10 }}>
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

function ThemedStack() {
  const { profile } = useProfile();
  return (
    <ThemeProvider themeId={profile.themeId}>
      <LikesProvider>
        <PlaylistsProvider>
          <SavedAlbumsProvider>
            <ResumeProvider>
              <PlayerProvider>
                <LibraryProvider>
                  <AppContent />
                </LibraryProvider>
              </PlayerProvider>
            </ResumeProvider>
          </SavedAlbumsProvider>
        </PlaylistsProvider>
      </LikesProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProfileProvider>
        <ThemedStack />
      </ProfileProvider>
    </GestureHandlerRootView>
  );
}
