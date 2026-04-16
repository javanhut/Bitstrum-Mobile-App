import { getServerPass, getServerUrl } from "./config";

// ─── Types ─────────────────────────────────────────────────────────────────

export type Track = {
  key: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number;
  trackNumber: number;
  year: string;
  genre: string;
  mood: string;
  coverKey: string;
  contentType: string;
  totalSize: number;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  coverKey: string;
  year: string;
  tracks: Track[];
};

type ListItem = {
  key: string;
  total_size: number;
  chunk_count: number;
  content_type: string;
  checksum: string;
  created_at: number;
};

type ListResponse = {
  items: ListItem[];
  next_cursor: string | null;
};

type MetaResponse = {
  key: string;
  total_size: number;
  chunk_count: number;
  content_type: string;
  checksum: string;
  metadata: Record<string, string>;
  created_at: number;
  updated_at: number;
};

// ─── API helpers ───────────────────────────────────────────────────────────

const TRACK_PREFIX = "music/tracks/";

function apiUrl(path: string): string {
  return `${getServerUrl()}/api${path}`;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {};
  const pass = getServerPass();
  if (pass) h["X-Server-Pass"] = pass;
  if (extra) Object.assign(h, extra);
  return h;
}

export function mediaUrl(key: string): string {
  return apiUrl(`/media/${encodeURI(key)}`);
}

export function mediaHeaders(): Record<string, string> {
  return authHeaders();
}

export async function listTrackKeys(): Promise<string[]> {
  const all: string[] = [];
  let cursor = "";
  const url = apiUrl(`/media?prefix=${TRACK_PREFIX}&limit=200`);
  console.log("[kaida] listTrackKeys fetching:", url);
  for (let i = 0; i < 50; i++) {
    const params = new URLSearchParams({ prefix: TRACK_PREFIX, limit: "200" });
    if (cursor) params.set("cursor", cursor);
    const fetchUrl = apiUrl(`/media?${params.toString()}`);
    const r = await fetch(fetchUrl, {
      headers: authHeaders(),
    });
    console.log("[kaida] list response:", r.status, "url:", fetchUrl);
    if (!r.ok) throw new Error(`list failed: ${r.status}`);
    const data = (await r.json()) as ListResponse;
    console.log("[kaida] got", data.items.length, "items, cursor:", data.next_cursor);
    for (const item of data.items) all.push(item.key);
    if (!data.next_cursor) break;
    cursor = data.next_cursor;
  }
  console.log("[kaida] total track keys:", all.length);
  return all;
}

export async function getMeta(key: string): Promise<MetaResponse> {
  const r = await fetch(apiUrl(`/meta/${encodeURI(key)}`), {
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(`meta failed: ${r.status}`);
  return (await r.json()) as MetaResponse;
}

function metaToTrack(m: MetaResponse): Track {
  const md = m.metadata ?? {};
  const fallbackId = m.key.slice(TRACK_PREFIX.length);
  return {
    key: m.key,
    title: md["title"] ?? fallbackId,
    artist: md["artist"] ?? "Unknown Artist",
    album: md["album"] ?? "Unknown Album",
    albumId: md["album-id"] ?? `unknown:${md["artist"] ?? ""}:${md["album"] ?? ""}`,
    duration: Number(md["duration"] ?? "0"),
    trackNumber: Number(md["track-number"] ?? "0"),
    year: md["year"] ?? "",
    genre: md["genre"] ?? "",
    mood: md["mood"] ?? "",
    coverKey: md["cover-key"] ?? "",
    contentType: m.content_type,
    totalSize: m.total_size,
  };
}

export async function loadLibrary(): Promise<Track[]> {
  const keys = await listTrackKeys();
  const metas = await Promise.all(keys.map((k) => getMeta(k).catch(() => null)));
  return metas.filter((m): m is MetaResponse => m !== null).map(metaToTrack);
}

const ALPHA_OPTS: Intl.CollatorOptions = { sensitivity: "base", numeric: true };
function alphaCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, ALPHA_OPTS);
}

export function groupAlbums(tracks: Track[]): Album[] {
  const byId = new Map<string, Album>();
  for (const t of tracks) {
    let album = byId.get(t.albumId);
    if (!album) {
      album = {
        id: t.albumId,
        title: t.album,
        artist: t.artist,
        coverKey: t.coverKey,
        year: t.year,
        tracks: [],
      };
      byId.set(t.albumId, album);
    }
    album.tracks.push(t);
    if (!album.coverKey && t.coverKey) album.coverKey = t.coverKey;
  }
  for (const album of byId.values()) {
    album.tracks.sort((a, b) => {
      const an = a.trackNumber || Number.MAX_SAFE_INTEGER;
      const bn = b.trackNumber || Number.MAX_SAFE_INTEGER;
      if (an !== bn) return an - bn;
      return alphaCompare(a.title, b.title);
    });
  }
  return Array.from(byId.values()).sort((a, b) => alphaCompare(a.title, b.title));
}

// ─── Persisted config blobs ────────────────────────────────────────────────

const LIKES_KEY = "music/config/liked.json";
const PROFILE_KEY = "music/config/profile.json";
const RESUME_KEY = "music/config/resume.json";
const PLAYLISTS_KEY = "music/config/playlists.json";
const SAVED_ALBUMS_KEY = "music/config/saved-albums.json";

export type Profile = {
  displayName: string;
  themeId: string;
};

const DEFAULT_PROFILE: Profile = {
  displayName: "",
  themeId: "ocean",
};

async function getJsonBlob<T>(key: string, fallback: T): Promise<T> {
  const r = await fetch(apiUrl(`/media/${encodeURI(key)}`), {
    headers: authHeaders(),
  });
  if (r.status === 404) return fallback;
  if (!r.ok) throw new Error(`get ${key} failed: ${r.status}`);
  try {
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

async function putJsonBlob(key: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value);
  const r = await fetch(apiUrl(`/media/${encodeURI(key)}`), {
    method: "PUT",
    headers: authHeaders({
      "Content-Type": "application/json",
      "X-KaidaDB-Meta-kind": "config",
    }),
    body,
  });
  if (!r.ok) throw new Error(`put ${key} failed: ${r.status}`);
}

export async function loadLikes(): Promise<string[]> {
  const raw = await getJsonBlob<unknown>(LIKES_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export async function saveLikes(keys: string[]): Promise<void> {
  await putJsonBlob(LIKES_KEY, keys);
}

export async function loadProfile(): Promise<Profile> {
  const raw = await getJsonBlob<Partial<Profile>>(PROFILE_KEY, DEFAULT_PROFILE);
  return {
    displayName:
      typeof raw.displayName === "string" ? raw.displayName : DEFAULT_PROFILE.displayName,
    themeId: typeof raw.themeId === "string" ? raw.themeId : DEFAULT_PROFILE.themeId,
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  await putJsonBlob(PROFILE_KEY, profile);
}

export type ResumeMap = Record<string, number>;

export async function loadResume(): Promise<ResumeMap> {
  const raw = await getJsonBlob<unknown>(RESUME_KEY, {});
  if (!raw || typeof raw !== "object") return {};
  const out: ResumeMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = v;
  }
  return out;
}

export async function saveResume(map: ResumeMap): Promise<void> {
  await putJsonBlob(RESUME_KEY, map);
}

export type Playlist = {
  id: string;
  name: string;
  trackKeys: string[];
  coverKey: string;
  createdAt: number;
  updatedAt: number;
};

export async function loadPlaylists(): Promise<Playlist[]> {
  const raw = await getJsonBlob<unknown>(PLAYLISTS_KEY, []);
  if (!Array.isArray(raw)) return [];
  const out: Playlist[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const obj = p as Record<string, unknown>;
    out.push({
      id: typeof obj.id === "string" ? obj.id : ulid(),
      name: typeof obj.name === "string" ? obj.name : "Untitled playlist",
      trackKeys: Array.isArray(obj.trackKeys)
        ? obj.trackKeys.filter((x): x is string => typeof x === "string")
        : [],
      coverKey: typeof obj.coverKey === "string" ? obj.coverKey : "",
      createdAt: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
      updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : Date.now(),
    });
  }
  return out;
}

export async function savePlaylists(list: Playlist[]): Promise<void> {
  await putJsonBlob(PLAYLISTS_KEY, list);
}

export async function loadSavedAlbums(): Promise<string[]> {
  const raw = await getJsonBlob<unknown>(SAVED_ALBUMS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

export async function saveSavedAlbums(ids: string[]): Promise<void> {
  await putJsonBlob(SAVED_ALBUMS_KEY, ids);
}

// ─── Fuzzy search ──────────────────────────────────────────────────────────

export function fuzzyScore(query: string, text: string): number {
  if (!query) return 0;
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q || !t) return 0;
  if (t === q) return 10000;
  if (t.startsWith(q)) return 5000 - (t.length - q.length);
  const idx = t.indexOf(q);
  if (idx >= 0) return 2000 - idx - (t.length - q.length) * 0.5;
  let qi = 0;
  let streak = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      streak++;
      score += 8 + streak * 2;
    } else {
      streak = 0;
    }
  }
  if (qi < q.length) return 0;
  return score - (t.length - q.length) * 0.2;
}

// ULID-ish: sortable unique IDs.
export function ulid(): string {
  const t = Date.now().toString(16).padStart(12, "0");
  const bytes = new Uint8Array(10);
  for (let i = 0; i < 10; i++) bytes[i] = Math.floor(Math.random() * 256);
  let rhex = "";
  for (const b of bytes) rhex += b.toString(16).padStart(2, "0");
  return `${t}${rhex}`;
}

export const BUILTIN_GENRES = [
  "Alternative", "Ambient", "Blues", "Classical", "Country", "Electronic",
  "Folk", "Funk", "Hip-Hop", "Indie", "Jazz", "Lo-Fi", "Metal", "Pop",
  "Punk", "R&B", "Reggae", "Rock", "Soul", "Soundtrack",
] as const;

export function allGenres(tracks: Track[]): string[] {
  const set = new Set<string>(BUILTIN_GENRES);
  for (const t of tracks) {
    const g = t.genre.trim();
    if (g) set.add(g);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export const BUILTIN_MOODS = [
  "Chill", "Energetic", "Focus", "Happy", "Melancholy", "Party",
  "Romantic", "Sad", "Sleepy", "Workout",
] as const;

export function allMoods(tracks: Track[]): string[] {
  const set = new Set<string>(BUILTIN_MOODS);
  for (const t of tracks) {
    const m = t.mood.trim();
    if (m) set.add(m);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
