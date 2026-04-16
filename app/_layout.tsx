import { useRef } from "react";
import { Stack, usePathname } from "expo-router";
import { View, PanResponder } from "react-native";
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
import { SidebarProvider, useSidebar } from "../src/state/sidebar";
import { MiniPlayer } from "../src/components/MiniPlayer";
import { Sidebar } from "../src/components/Sidebar";
import { useTrackPlayerSync } from "../src/hooks/useTrackPlayer";

const EDGE_THRESHOLD = 40;
const SWIPE_MIN_DISTANCE = 60;

function AppContent() {
  const { current } = usePlayer();
  const { colors } = useTheme();
  const pathname = usePathname();
  const { isOpen, open, close } = useSidebar();

  useTrackPlayerSync();

  const showMiniPlayer = current && pathname !== "/now-playing";

  // Swipe from left edge to open sidebar.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        return !isOpen && evt.nativeEvent.pageX < EDGE_THRESHOLD;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          !isOpen &&
          evt.nativeEvent.pageX < EDGE_THRESHOLD + 30 &&
          gestureState.dx > 10 &&
          Math.abs(gestureState.dy) < Math.abs(gestureState.dx)
        );
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > SWIPE_MIN_DISTANCE) {
          open();
        }
      },
    }),
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} {...panResponder.panHandlers}>
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
        <View style={{ position: "absolute", bottom: 64, left: 0, right: 0, zIndex: 10 }}>
          <MiniPlayer />
        </View>
      )}
      <Sidebar visible={isOpen} onClose={close} />
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
                  <SidebarProvider>
                    <AppContent />
                  </SidebarProvider>
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
