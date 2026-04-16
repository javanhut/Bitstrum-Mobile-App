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
import { loadLikes, saveLikes } from "../api/kaida";

type Ctx = {
  order: string[];
  set: Set<string>;
  loaded: boolean;
  isLiked: (key: string) => boolean;
  like: (key: string) => void;
  unlike: (key: string) => void;
  toggle: (key: string) => void;
  reorder: (fromIdx: number, toIdx: number) => void;
};

const LikesContext = createContext<Ctx | null>(null);

export function LikesProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLikes()
      .then((keys) => {
        if (!cancelled) {
          setOrder(keys);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveLikes(order).catch((e) => console.warn("saveLikes failed", e));
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [order, loaded]);

  const set = useMemo(() => new Set(order), [order]);
  const isLiked = useCallback((key: string) => set.has(key), [set]);

  const like = useCallback((key: string) => {
    setOrder((prev) => (prev.includes(key) ? prev : [key, ...prev]));
  }, []);
  const unlike = useCallback((key: string) => {
    setOrder((prev) => prev.filter((k) => k !== key));
  }, []);
  const toggle = useCallback((key: string) => {
    setOrder((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [key, ...prev],
    );
  }, []);

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    setOrder((prev) => {
      if (
        fromIdx < 0 || fromIdx >= prev.length ||
        toIdx < 0 || toIdx > prev.length ||
        fromIdx === toIdx
      ) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIdx, 1);
      if (moved === undefined) return prev;
      const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
      next.splice(insertAt, 0, moved);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ order, set, loaded, isLiked, like, unlike, toggle, reorder }),
    [order, set, loaded, isLiked, like, unlike, toggle, reorder],
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}

export function useLikes(): Ctx {
  const ctx = useContext(LikesContext);
  if (!ctx) throw new Error("useLikes outside LikesProvider");
  return ctx;
}
