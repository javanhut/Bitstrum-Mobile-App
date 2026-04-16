import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import TrackPlayer from "react-native-track-player";
import { PlaybackService } from "../src/services/trackPlayerService";
import { ProfileProvider, useProfile } from "../src/state/profile";
import { LikesProvider } from "../src/state/likes";
import { PlaylistsProvider } from "../src/state/playlists";
import { SavedAlbumsProvider } from "../src/state/savedAlbums";
import { ResumeProvider } from "../src/state/resume";
import { PlayerProvider } from "../src/state/player";
import { LibraryProvider } from "../src/state/library";
import { ThemeProvider } from "../src/theme/ThemeContext";

TrackPlayer.registerPlaybackService(() => PlaybackService);

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
                        presentation: "modal",
                        animation: "slide_from_bottom",
                      }}
                    />
                    <Stack.Screen name="album/[id]" />
                    <Stack.Screen name="playlist/[id]" />
                    <Stack.Screen name="explore" />
                    <Stack.Screen name="liked-songs" />
                    <Stack.Screen name="collection/[kind]/[value]" />
                  </Stack>
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
