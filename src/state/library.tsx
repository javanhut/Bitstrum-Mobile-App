import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { groupAlbums, loadLibrary, type Album, type Track } from "../api/kaida";
import { isConfigured } from "../api/config";

type Ctx = {
  tracks: Track[];
  albums: Album[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const LibraryContext = createContext<Ctx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const configured = isConfigured();
    console.log("[library] refresh called, isConfigured:", configured);
    if (!configured) {
      setLoading(false);
      setError("Server not configured");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const t = await loadLibrary();
      console.log("[library] loaded", t.length, "tracks");
      setTracks(t);
      setAlbums(groupAlbums(t));
    } catch (e) {
      console.log("[library] error:", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<Ctx>(
    () => ({ tracks, albums, loading, error, refresh }),
    [tracks, albums, loading, error, refresh],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): Ctx {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary outside LibraryProvider");
  return ctx;
}
