const TrackPlayer = require("react-native-track-player").default;
const { PlaybackService } = require("./src/services/trackPlayerService");

TrackPlayer.registerPlaybackService(() => PlaybackService);

require("expo-router/entry");
