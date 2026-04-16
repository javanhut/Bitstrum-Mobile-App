import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadPlaylists, savePlaylists, ulid, type Playlist } from "../api/kaida";

type Ctx = {
  playlists: Playlist[];
  loaded: boolean;
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTracksToPlaylist: (id: string, trackKeys: string[]) => void;
  removeTrackFromPlaylist: (id: string, trackKey: string) => void;
  reorderPlaylist: (id: string, fromIdx: number, toIdx: number) => void;
  setPlaylistCover: (id: string, coverKey: string) => void;
};

const PlaylistsContext = createContext<Ctx | null>(null);

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPlaylists()
      .then((list) => {
        if (!cancelled) { setPlaylists(list); setLoaded(true); }
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePlaylists(playlists).catch((e) => console.warn("savePlaylists failed", e));
    }, 500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [playlists, loaded]);

  const createPlaylist = useCallback((name: string) => {
    const now = Date.now();
    const id = ulid();
    setPlaylists((prev) => [
      { id, name: name.trim() || "New playlist", trackKeys: [], coverKey: "", createdAt: now, updatedAt: now },
      ...prev,
    ]);
    return id;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p)),
    );
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addTracksToPlaylist = useCallback((id: string, trackKeys: string[]) => {
    if (trackKeys.length === 0) return;
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const existing = new Set(p.trackKeys);
        const added: string[] = [];
        for (const k of trackKeys) {
          if (!existing.has(k)) { added.push(k); existing.add(k); }
        }
        if (added.length === 0) return p;
        return { ...p, trackKeys: [...p.trackKeys, ...added], updatedAt: Date.now() };
      }),
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((id: string, trackKey: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, trackKeys: p.trackKeys.filter((k) => k !== trackKey), updatedAt: Date.now() }
          : p,
      ),
    );
  }, []);

  const reorderPlaylist = useCallback((id: string, fromIdx: number, toIdx: number) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (fromIdx < 0 || fromIdx >= p.trackKeys.length || toIdx < 0 || toIdx > p.trackKeys.length || fromIdx === toIdx)
          return p;
        const next = p.trackKeys.slice();
        const [moved] = next.splice(fromIdx, 1);
        if (moved === undefined) return p;
        const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
        next.splice(insertAt, 0, moved);
        return { ...p, trackKeys: next, updatedAt: Date.now() };
      }),
    );
  }, []);

  const setPlaylistCover = useCallback((id: string, coverKey: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, coverKey, updatedAt: Date.now() } : p)),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      playlists, loaded, createPlaylist, renamePlaylist, deletePlaylist,
      addTracksToPlaylist, removeTrackFromPlaylist, reorderPlaylist, setPlaylistCover,
    }),
    [playlists, loaded, createPlaylist, renamePlaylist, deletePlaylist,
     addTracksToPlaylist, removeTrackFromPlaylist, reorderPlaylist, setPlaylistCover],
  );

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

export function usePlaylists(): Ctx {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error("usePlaylists outside PlaylistsProvider");
  return ctx;
}
