import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Track } from "../api/kaida";

export type NowPlayingView = "info" | "visualizer";

type State = {
  queue: Track[];
  index: number;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: "off" | "all" | "one";
  seekRequest: { t: number; nonce: number } | null;
  nowPlayingOpen: boolean;
  nowPlayingView: NowPlayingView;
};

type Action =
  | { type: "playQueue"; tracks: Track[]; startIndex: number }
  | { type: "appendToQueue"; tracks: Track[] }
  | { type: "jumpToIndex"; index: number }
  | { type: "toggle" }
  | { type: "setPlaying"; playing: boolean }
  | { type: "next" }
  | { type: "prev" }
  | { type: "seek"; t: number }
  | { type: "setVolume"; v: number }
  | { type: "toggleShuffle" }
  | { type: "cycleRepeat" }
  | { type: "ended" }
  | { type: "openNowPlaying" }
  | { type: "closeNowPlaying" }
  | { type: "setNowPlayingView"; view: NowPlayingView }
  | { type: "flipNowPlaying" };

const initial: State = {
  queue: [],
  index: -1,
  isPlaying: false,
  volume: 0.8,
  shuffle: false,
  repeat: "off",
  seekRequest: null,
  nowPlayingOpen: false,
  nowPlayingView: "info",
};

function advance(state: State, dir: 1 | -1): State {
  if (state.queue.length === 0) return state;
  let next = state.index + dir;
  if (state.shuffle && dir === 1) {
    next = Math.floor(Math.random() * state.queue.length);
  }
  if (next < 0) next = 0;
  if (next >= state.queue.length) {
    if (state.repeat === "all") next = 0;
    else return { ...state, isPlaying: false };
  }
  return { ...state, index: next, isPlaying: true };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "playQueue":
      if (action.tracks.length === 0) return state;
      return {
        ...state,
        queue: action.tracks,
        index: Math.min(Math.max(action.startIndex, 0), action.tracks.length - 1),
        isPlaying: true,
      };
    case "appendToQueue":
      if (action.tracks.length === 0) return state;
      if (state.queue.length === 0) {
        return { ...state, queue: action.tracks, index: 0, isPlaying: true };
      }
      return { ...state, queue: [...state.queue, ...action.tracks] };
    case "jumpToIndex":
      if (action.index < 0 || action.index >= state.queue.length) return state;
      return { ...state, index: action.index, isPlaying: true };
    case "toggle":
      if (state.index < 0) return state;
      return { ...state, isPlaying: !state.isPlaying };
    case "setPlaying":
      return { ...state, isPlaying: action.playing };
    case "next":
      return advance(state, 1);
    case "prev":
      return advance(state, -1);
    case "seek":
      return { ...state, seekRequest: { t: action.t, nonce: Date.now() } };
    case "setVolume":
      return { ...state, volume: Math.max(0, Math.min(1, action.v)) };
    case "toggleShuffle":
      return { ...state, shuffle: !state.shuffle };
    case "cycleRepeat": {
      const order: State["repeat"][] = ["off", "all", "one"];
      const i = order.indexOf(state.repeat);
      return { ...state, repeat: order[(i + 1) % order.length]! };
    }
    case "ended":
      if (state.repeat === "one") {
        return { ...state, seekRequest: { t: 0, nonce: Date.now() }, isPlaying: true };
      }
      return advance(state, 1);
    case "openNowPlaying":
      return { ...state, nowPlayingOpen: true };
    case "closeNowPlaying":
      return { ...state, nowPlayingOpen: false };
    case "setNowPlayingView":
      return { ...state, nowPlayingView: action.view };
    case "flipNowPlaying":
      return {
        ...state,
        nowPlayingView: state.nowPlayingView === "info" ? "visualizer" : "info",
      };
  }
}

type Ctx = {
  state: State;
  current: Track | null;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  appendToQueue: (tracks: Track[]) => void;
  jumpToIndex: (index: number) => void;
  toggle: () => void;
  setPlaying: (playing: boolean) => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  ended: () => void;
  openNowPlaying: () => void;
  closeNowPlaying: () => void;
  setNowPlayingView: (view: NowPlayingView) => void;
  flipNowPlaying: () => void;
};

const PlayerContext = createContext<Ctx | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const current = state.index >= 0 ? (state.queue[state.index] ?? null) : null;

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) =>
      dispatch({ type: "playQueue", tracks, startIndex }),
    [],
  );
  const appendToQueue = useCallback(
    (tracks: Track[]) => dispatch({ type: "appendToQueue", tracks }),
    [],
  );
  const jumpToIndex = useCallback(
    (index: number) => dispatch({ type: "jumpToIndex", index }),
    [],
  );
  const toggle = useCallback(() => dispatch({ type: "toggle" }), []);
  const setPlaying = useCallback(
    (playing: boolean) => dispatch({ type: "setPlaying", playing }),
    [],
  );
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const prev = useCallback(() => dispatch({ type: "prev" }), []);
  const seek = useCallback((t: number) => dispatch({ type: "seek", t }), []);
  const setVolume = useCallback((v: number) => dispatch({ type: "setVolume", v }), []);
  const toggleShuffle = useCallback(() => dispatch({ type: "toggleShuffle" }), []);
  const cycleRepeat = useCallback(() => dispatch({ type: "cycleRepeat" }), []);
  const ended = useCallback(() => dispatch({ type: "ended" }), []);
  const openNowPlaying = useCallback(() => dispatch({ type: "openNowPlaying" }), []);
  const closeNowPlaying = useCallback(() => dispatch({ type: "closeNowPlaying" }), []);
  const setNowPlayingView = useCallback(
    (view: NowPlayingView) => dispatch({ type: "setNowPlayingView", view }),
    [],
  );
  const flipNowPlaying = useCallback(() => dispatch({ type: "flipNowPlaying" }), []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      current,
      playQueue,
      appendToQueue,
      jumpToIndex,
      toggle,
      setPlaying,
      next,
      prev,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      ended,
      openNowPlaying,
      closeNowPlaying,
      setNowPlayingView,
      flipNowPlaying,
    }),
    [state, current],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): Ctx {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer outside PlayerProvider");
  return ctx;
}
