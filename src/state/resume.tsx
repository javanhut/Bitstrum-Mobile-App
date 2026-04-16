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
import { AppState } from "react-native";
import { MMKV } from "react-native-mmkv";
import { loadResume, saveResume, type ResumeMap } from "../api/kaida";

const mmkv = new MMKV({ id: "bitstrum-resume" });

type Ctx = {
  loaded: boolean;
  getPosition: (trackKey: string) => number;
  updatePosition: (trackKey: string, time: number) => void;
  clearPosition: (trackKey: string) => void;
};

const ResumeContext = createContext<Ctx | null>(null);

function readSeed(): ResumeMap {
  try {
    const raw = mmkv.getString("resume");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: ResumeMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function ResumeProvider({ children }: { children: ReactNode }) {
  const mapRef = useRef<ResumeMap>(readSeed());
  const [loaded, setLoaded] = useState(false);
  const dirty = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadResume()
      .then((server) => {
        if (cancelled) return;
        mapRef.current = { ...mapRef.current, ...server };
        try {
          mmkv.set("resume", JSON.stringify(mapRef.current));
        } catch {}
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const scheduleSave = useCallback(() => {
    if (!loaded) return;
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!dirty.current) return;
      dirty.current = false;
      const snapshot = { ...mapRef.current };
      saveResume(snapshot).catch((e) => console.warn("saveResume failed", e));
    }, 1500);
  }, [loaded]);

  // Flush on app background instead of beforeunload.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        if (!dirty.current) return;
        dirty.current = false;
        try {
          mmkv.set("resume", JSON.stringify(mapRef.current));
        } catch {}
        const snapshot = { ...mapRef.current };
        saveResume(snapshot).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  const getPosition = useCallback((key: string) => {
    return mapRef.current[key] ?? 0;
  }, []);

  const updatePosition = useCallback(
    (key: string, time: number) => {
      if (!Number.isFinite(time) || time < 0) return;
      mapRef.current[key] = time;
      try {
        mmkv.set("resume", JSON.stringify(mapRef.current));
      } catch {}
      scheduleSave();
    },
    [scheduleSave],
  );

  const clearPosition = useCallback(
    (key: string) => {
      if (!(key in mapRef.current)) return;
      delete mapRef.current[key];
      try {
        mmkv.set("resume", JSON.stringify(mapRef.current));
      } catch {}
      scheduleSave();
    },
    [scheduleSave],
  );

  const value = useMemo<Ctx>(
    () => ({ loaded, getPosition, updatePosition, clearPosition }),
    [loaded, getPosition, updatePosition, clearPosition],
  );

  return <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>;
}

export function useResume(): Ctx {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error("useResume outside ResumeProvider");
  return ctx;
}
