import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import {
  allGenres,
  allMoods,
  BUILTIN_GENRES,
  BUILTIN_MOODS,
  fuzzyScore,
  getMeta,
  groupAlbums,
  listTrackKeys,
  loadLibrary,
  loadLikes,
  loadPlaylists,
  loadProfile,
  loadResume,
  loadSavedAlbums,
  mediaHeaders,
  mediaUrl,
  savePlaylists,
  saveProfile,
  saveResume,
  saveSavedAlbums,
  saveLikes,
  ulid,
  type Track,
} from "./kaida";
import { setServerPass, setServerUrl } from "./config";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function makeResponse(body: unknown, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function track(overrides: Partial<Track> = {}): Track {
  return {
    key: "music/tracks/one",
    title: "One",
    artist: "A",
    album: "X",
    albumId: "album-1",
    duration: 120,
    trackNumber: 1,
    year: "2020",
    genre: "Rock",
    mood: "Chill",
    coverKey: "music/covers/x",
    contentType: "audio/mpeg",
    totalSize: 1000,
    ...overrides,
  };
}

let fetchSpy: ReturnType<typeof spyOn> | null = null;

beforeEach(() => {
  setServerUrl("https://server.test");
  setServerPass("pw");
  const originalFetch = globalThis.fetch;
  globalThis.fetch =
    originalFetch ?? ((async () => makeResponse({})) as unknown as typeof fetch);
  fetchSpy = spyOn(globalThis, "fetch");
  // Silence console noise from kaida.ts logs during tests.
  spyOn(console, "log").mockImplementation(() => {});
  spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = null;
  mock.restore();
});

describe("mediaUrl / mediaHeaders", () => {
  it("builds a media URL using the stored server URL", () => {
    expect(mediaUrl("music/tracks/song one")).toBe(
      "https://server.test/api/media/music/tracks/song%20one",
    );
  });

  it("includes the server pass header when configured", () => {
    expect(mediaHeaders()).toEqual({ "X-Server-Pass": "pw" });
  });

  it("omits the server pass header when empty", () => {
    setServerPass("");
    expect(mediaHeaders()).toEqual({});
  });
});

describe("listTrackKeys", () => {
  it("paginates and concatenates keys across pages", async () => {
    const calls: string[] = [];
    fetchSpy!.mockImplementation(async (url: unknown) => {
      const u = String(url);
      calls.push(u);
      if (!u.includes("cursor=")) {
        return makeResponse({
          items: [{ key: "music/tracks/a" }, { key: "music/tracks/b" }],
          next_cursor: "c1",
        }) as unknown as Response;
      }
      return makeResponse({
        items: [{ key: "music/tracks/c" }],
        next_cursor: null,
      }) as unknown as Response;
    });

    const keys = await listTrackKeys();
    expect(keys).toEqual([
      "music/tracks/a",
      "music/tracks/b",
      "music/tracks/c",
    ]);
    expect(calls.length).toBe(2);
    expect(calls[1]).toContain("cursor=c1");
  });

  it("throws when the server returns a non-OK response", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({}, 500) as unknown as Response,
    );
    await expect(listTrackKeys()).rejects.toThrow(/list failed: 500/);
  });
});

describe("getMeta", () => {
  it("returns the parsed metadata body", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({
        key: "music/tracks/a",
        total_size: 1,
        chunk_count: 1,
        content_type: "audio/mpeg",
        checksum: "abc",
        metadata: { title: "A" },
        created_at: 0,
        updated_at: 0,
      }) as unknown as Response,
    );
    const meta = await getMeta("music/tracks/a");
    expect(meta.key).toBe("music/tracks/a");
    expect(meta.metadata.title).toBe("A");
  });

  it("throws on non-OK response", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({}, 404) as unknown as Response,
    );
    await expect(getMeta("music/tracks/missing")).rejects.toThrow(
      /meta failed: 404/,
    );
  });
});

describe("loadLibrary", () => {
  it("maps metadata into Track objects and filters failures", async () => {
    fetchSpy!.mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (u.includes("/media?")) {
        return makeResponse({
          items: [
            { key: "music/tracks/a" },
            { key: "music/tracks/b" },
            { key: "music/tracks/broken" },
          ],
          next_cursor: null,
        }) as unknown as Response;
      }
      if (u.endsWith("/meta/music/tracks/a")) {
        return makeResponse({
          key: "music/tracks/a",
          total_size: 10,
          chunk_count: 1,
          content_type: "audio/mpeg",
          checksum: "x",
          metadata: {
            title: "A title",
            artist: "Artist A",
            album: "Album A",
            "album-id": "album-a",
            duration: "200",
            "track-number": "3",
            year: "2021",
            genre: "Rock",
            mood: "Chill",
            "cover-key": "covers/a",
          },
          created_at: 0,
          updated_at: 0,
        }) as unknown as Response;
      }
      if (u.endsWith("/meta/music/tracks/b")) {
        return makeResponse({
          key: "music/tracks/b",
          total_size: 20,
          chunk_count: 1,
          content_type: "audio/mpeg",
          checksum: "y",
          metadata: {},
          created_at: 0,
          updated_at: 0,
        }) as unknown as Response;
      }
      // "broken" meta fails — should be filtered out.
      return makeResponse({}, 500) as unknown as Response;
    });

    const library = await loadLibrary();
    expect(library).toHaveLength(2);
    const a = library.find((t) => t.key === "music/tracks/a")!;
    expect(a.title).toBe("A title");
    expect(a.trackNumber).toBe(3);
    expect(a.duration).toBe(200);
    expect(a.coverKey).toBe("covers/a");

    const b = library.find((t) => t.key === "music/tracks/b")!;
    expect(b.title).toBe("b"); // fallback = key after prefix
    expect(b.artist).toBe("Unknown Artist");
    expect(b.album).toBe("Unknown Album");
    expect(b.albumId).toBe("unknown::");
    expect(b.trackNumber).toBe(0);
  });
});

describe("groupAlbums", () => {
  it("groups tracks by albumId and sorts by track number", () => {
    const tracks: Track[] = [
      track({ key: "k2", albumId: "a1", trackNumber: 2, title: "Second" }),
      track({ key: "k1", albumId: "a1", trackNumber: 1, title: "First" }),
      track({ key: "k3", albumId: "a2", trackNumber: 1, title: "Other", album: "Y" }),
    ];
    const albums = groupAlbums(tracks);
    expect(albums).toHaveLength(2);
    const a1 = albums.find((a) => a.id === "a1")!;
    expect(a1.tracks.map((t) => t.title)).toEqual(["First", "Second"]);
  });

  it("tracks with missing track numbers sort last alphabetically", () => {
    const tracks: Track[] = [
      track({ key: "k1", albumId: "a", trackNumber: 0, title: "Zebra" }),
      track({ key: "k2", albumId: "a", trackNumber: 0, title: "Apple" }),
      track({ key: "k3", albumId: "a", trackNumber: 1, title: "Numbered" }),
    ];
    const [album] = groupAlbums(tracks);
    expect(album!.tracks.map((t) => t.title)).toEqual([
      "Numbered",
      "Apple",
      "Zebra",
    ]);
  });

  it("adopts a later track's coverKey when the first track lacks one", () => {
    const tracks: Track[] = [
      track({ key: "k1", albumId: "a", coverKey: "" }),
      track({ key: "k2", albumId: "a", coverKey: "covers/late" }),
    ];
    const [album] = groupAlbums(tracks);
    expect(album!.coverKey).toBe("covers/late");
  });

  it("returns albums sorted alphabetically by title", () => {
    const tracks: Track[] = [
      track({ key: "k1", albumId: "a", album: "Zephyr" }),
      track({ key: "k2", albumId: "b", album: "Apple" }),
    ];
    const albums = groupAlbums(tracks);
    expect(albums.map((a) => a.title)).toEqual(["Apple", "Zephyr"]);
  });
});

describe("fuzzyScore", () => {
  it("returns 0 for empty queries or text", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
    expect(fuzzyScore("   ", "anything")).toBe(0);
    expect(fuzzyScore("q", "")).toBe(0);
  });

  it("ranks exact matches highest", () => {
    expect(fuzzyScore("hello", "hello")).toBe(10000);
  });

  it("ranks prefix matches above substring matches", () => {
    expect(fuzzyScore("hel", "hello")).toBeGreaterThan(
      fuzzyScore("hel", "shell"),
    );
  });

  it("matches subsequences as a fallback", () => {
    expect(fuzzyScore("hlo", "hello")).toBeGreaterThan(0);
  });

  it("returns 0 if characters are missing", () => {
    expect(fuzzyScore("xyz", "hello")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("HELLO", "hello")).toBe(10000);
  });
});

describe("ulid", () => {
  it("produces strings of stable length", () => {
    const id = ulid();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(32);
  });

  it("is monotonically sortable by time", async () => {
    const a = ulid();
    await new Promise((r) => setTimeout(r, 2));
    const b = ulid();
    expect(a < b).toBe(true);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => ulid()));
    expect(ids.size).toBe(50);
  });
});

describe("allGenres / allMoods", () => {
  it("includes every builtin genre even if tracks omit them", () => {
    const result = allGenres([]);
    for (const g of BUILTIN_GENRES) {
      expect(result).toContain(g);
    }
  });

  it("adds custom genres from tracks, de-duplicated and sorted", () => {
    const result = allGenres([
      track({ genre: "Custom" }),
      track({ genre: "Custom" }),
      track({ genre: "   " }),
    ]);
    expect(result).toContain("Custom");
    const sorted = [...result].sort((a, b) => a.localeCompare(b));
    expect(result).toEqual(sorted);
  });

  it("includes every builtin mood", () => {
    const result = allMoods([]);
    for (const m of BUILTIN_MOODS) {
      expect(result).toContain(m);
    }
  });

  it("adds custom moods from tracks", () => {
    const result = allMoods([track({ mood: "Rainy" })]);
    expect(result).toContain("Rainy");
  });
});

describe("persisted config blobs", () => {
  it("loadLikes returns [] for missing config (404)", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}, 404) as unknown as Response);
    const likes = await loadLikes();
    expect(likes).toEqual([]);
  });

  it("loadLikes filters non-string entries", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse(["a", 3, null, "b"]) as unknown as Response,
    );
    expect(await loadLikes()).toEqual(["a", "b"]);
  });

  it("loadLikes returns [] when the payload is not an array", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({ not: "array" }) as unknown as Response,
    );
    expect(await loadLikes()).toEqual([]);
  });

  it("loadLikes throws on non-404 errors", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}, 500) as unknown as Response);
    await expect(loadLikes()).rejects.toThrow(/get .* failed: 500/);
  });

  it("saveLikes PUTs JSON to the expected URL", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}) as unknown as Response);
    await saveLikes(["a", "b"]);
    expect(fetchSpy!.mock.calls.length).toBe(1);
    const [url, init] = fetchSpy!.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/media/music/config/liked.json");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify(["a", "b"]));
  });

  it("saveLikes throws if the server rejects the write", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}, 403) as unknown as Response);
    await expect(saveLikes([])).rejects.toThrow(/put .* failed: 403/);
  });

  it("loadProfile returns defaults for an empty payload", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}, 404) as unknown as Response);
    const p = await loadProfile();
    expect(p).toEqual({ displayName: "", themeId: "ocean" });
  });

  it("loadProfile coerces invalid field types to defaults", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({ displayName: 42, themeId: null }) as unknown as Response,
    );
    const p = await loadProfile();
    expect(p.displayName).toBe("");
    expect(p.themeId).toBe("ocean");
  });

  it("loadProfile passes through valid fields", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({ displayName: "Jamie", themeId: "aurora" }) as unknown as Response,
    );
    const p = await loadProfile();
    expect(p).toEqual({ displayName: "Jamie", themeId: "aurora" });
  });

  it("saveProfile writes the profile", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}) as unknown as Response);
    await saveProfile({ displayName: "J", themeId: "forest" });
    const [, init] = fetchSpy!.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({ displayName: "J", themeId: "forest" }),
    );
  });

  it("loadResume keeps only finite non-negative numbers", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({
        a: 10,
        b: -1,
        c: "bad",
        d: Number.NaN,
        e: Number.POSITIVE_INFINITY,
        f: 0,
      }) as unknown as Response,
    );
    const r = await loadResume();
    expect(r).toEqual({ a: 10, f: 0 });
  });

  it("loadResume returns {} if payload is not an object", async () => {
    fetchSpy!.mockResolvedValue(makeResponse(null) as unknown as Response);
    expect(await loadResume()).toEqual({});
  });

  it("saveResume writes the map", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}) as unknown as Response);
    await saveResume({ a: 1 });
    const [, init] = fetchSpy!.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("loadPlaylists normalizes missing fields and filters non-objects", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse([
        null,
        "nope",
        {
          id: "p1",
          name: "Mix",
          trackKeys: ["a", 1, "b"],
          coverKey: "covers/p1",
          createdAt: 100,
          updatedAt: 200,
        },
        { /* empty object → all defaults */ },
      ]) as unknown as Response,
    );
    const lists = await loadPlaylists();
    expect(lists).toHaveLength(2);
    const p1 = lists.find((l) => l.id === "p1")!;
    expect(p1.trackKeys).toEqual(["a", "b"]);
    expect(p1.coverKey).toBe("covers/p1");
    expect(p1.createdAt).toBe(100);

    const defaulted = lists.find((l) => l.id !== "p1")!;
    expect(defaulted.name).toBe("Untitled playlist");
    expect(defaulted.trackKeys).toEqual([]);
    expect(typeof defaulted.id).toBe("string");
    expect(defaulted.id.length).toBeGreaterThan(0);
  });

  it("loadPlaylists returns [] when the payload is not an array", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({ oops: true }) as unknown as Response,
    );
    expect(await loadPlaylists()).toEqual([]);
  });

  it("savePlaylists writes the array", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}) as unknown as Response);
    await savePlaylists([]);
    const [url] = fetchSpy!.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/media/music/config/playlists.json");
  });

  it("loadSavedAlbums filters non-strings", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse(["a", null, 1, "b"]) as unknown as Response,
    );
    expect(await loadSavedAlbums()).toEqual(["a", "b"]);
  });

  it("loadSavedAlbums returns [] for non-array payloads", async () => {
    fetchSpy!.mockResolvedValue(
      makeResponse({ not: "array" }) as unknown as Response,
    );
    expect(await loadSavedAlbums()).toEqual([]);
  });

  it("saveSavedAlbums writes the list", async () => {
    fetchSpy!.mockResolvedValue(makeResponse({}) as unknown as Response);
    await saveSavedAlbums(["a1", "a2"]);
    const [, init] = fetchSpy!.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify(["a1", "a2"]));
  });

  it("falls back to default payload when the body is not valid JSON", async () => {
    fetchSpy!.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    } as unknown as Response);
    expect(await loadLikes()).toEqual([]);
  });
});
