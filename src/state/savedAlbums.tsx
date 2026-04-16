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
import { loadSavedAlbums, saveSavedAlbums } from "../api/kaida";

type Ctx = {
  order: string[];
  set: Set<string>;
  loaded: boolean;
  isSaved: (id: string) => boolean;
  save: (id: string) => void;
  unsave: (id: string) => void;
  toggle: (id: string) => void;
};

const SavedAlbumsContext = createContext<Ctx | null>(null);

export function SavedAlbumsProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSavedAlbums()
      .then((ids) => { if (!cancelled) { setOrder(ids); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSavedAlbums(order).catch((e) => console.warn("saveSavedAlbums failed", e));
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [order, loaded]);

  const set = useMemo(() => new Set(order), [order]);
  const isSaved = useCallback((id: string) => set.has(id), [set]);
  const save = useCallback((id: string) => {
    setOrder((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  }, []);
  const unsave = useCallback((id: string) => {
    setOrder((prev) => prev.filter((k) => k !== id));
  }, []);
  const toggle = useCallback((id: string) => {
    setOrder((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [id, ...prev],
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({ order, set, loaded, isSaved, save, unsave, toggle }),
    [order, set, loaded, isSaved, save, unsave, toggle],
  );

  return (
    <SavedAlbumsContext.Provider value={value}>{children}</SavedAlbumsContext.Provider>
  );
}

export function useSavedAlbums(): Ctx {
  const ctx = useContext(SavedAlbumsContext);
  if (!ctx) throw new Error("useSavedAlbums outside SavedAlbumsProvider");
  return ctx;
}
