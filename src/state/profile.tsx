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
import { MMKV } from "react-native-mmkv";
import { loadProfile, saveProfile, type Profile } from "../api/kaida";

const storage = new MMKV({ id: "bitstrum-profile" });

type Ctx = {
  profile: Profile;
  loaded: boolean;
  setDisplayName: (name: string) => void;
  setThemeId: (id: string) => void;
};

const ProfileContext = createContext<Ctx | null>(null);

const DEFAULT: Profile = { displayName: "", themeId: "ocean" };

function readSeed(): Profile {
  try {
    const raw = storage.getString("profile");
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Profile) };
  } catch {}
  return DEFAULT;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(readSeed);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      storage.set("profile", JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    loadProfile()
      .then((p) => {
        if (cancelled) return;
        setProfile((prev) => ({
          displayName: p.displayName?.trim() ? p.displayName : prev.displayName,
          themeId: p.themeId ? p.themeId : prev.themeId,
        }));
        setLoaded(true);
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
      saveProfile(profile).catch((e) => console.warn("saveProfile failed", e));
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [profile, loaded]);

  const setDisplayName = useCallback(
    (name: string) => setProfile((p) => ({ ...p, displayName: name })),
    [],
  );
  const setThemeId = useCallback(
    (id: string) => setProfile((p) => ({ ...p, themeId: id })),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({ profile, loaded, setDisplayName, setThemeId }),
    [profile, loaded, setDisplayName, setThemeId],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile outside ProfileProvider");
  return ctx;
}
