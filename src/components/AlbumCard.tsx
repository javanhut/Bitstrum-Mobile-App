import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { Album } from "../api/kaida";
import { mediaUrl } from "../api/kaida";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  album: Album;
  onOpen: (album: Album) => void;
  size?: number;
};

export function AlbumCard({ album, onOpen, size = 150 }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.card, { width: size }]} onPress={() => onOpen(album)}>
      <View style={[styles.cover, { width: size, height: size, backgroundColor: colors.bgElev }]}>
        {album.coverKey ? (
          <Image
            source={{ uri: mediaUrl(album.coverKey) }}
            style={{ width: size, height: size, borderRadius: 8 }}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.placeholder, { color: colors.fgDim }]}>♪</Text>
        )}
      </View>
      <Text style={[styles.title, { color: colors.fg }]} numberOfLines={1}>{album.title}</Text>
      <Text style={[styles.artist, { color: colors.fgDim }]} numberOfLines={1}>{album.artist}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
  },
  cover: {
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    fontSize: 32,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
  },
  artist: {
    fontSize: 12,
  },
});
