// Server-only TMDB access. The API key never reaches the client:
// browser code always goes through /api/tmdb/* routes.
import "server-only";
import type { TmdbSearchResult } from "@/lib/tmdb/types";

const TMDB_BASE = "https://api.themoviedb.org/3";

const GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

interface RawResult {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
}

function tmdbFetch(path: string, params: Record<string, string>) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not configured");

  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const headers: Record<string, string> = { accept: "application/json" };
  // v4 keys are JWTs used as bearer tokens; v3 keys go in the query string.
  if (key.startsWith("eyJ")) headers.authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  return fetch(url, { headers, next: { revalidate: 60 * 60 * 24 } });
}

function normalize(raw: RawResult, fallbackType: "movie" | "tv"): TmdbSearchResult | null {
  const mediaType = (raw.media_type ?? fallbackType) as "movie" | "tv";
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const title = raw.title ?? raw.name;
  if (!title) return null;
  return {
    tmdb_id: raw.id,
    media_type: mediaType,
    title,
    original_title: raw.original_title ?? raw.original_name ?? title,
    release_date: raw.release_date ?? raw.first_air_date ?? null,
    poster_path: raw.poster_path ?? null,
    backdrop_path: raw.backdrop_path ?? null,
    overview: raw.overview ?? "",
    genres: (raw.genre_ids ?? []).map((id) => GENRES[id]).filter(Boolean),
    vote_average: raw.vote_average ?? 0,
    popularity: raw.popularity ?? 0,
  };
}

export async function searchTmdb(
  query: string,
  type: "movie" | "series" | "multi" = "multi"
): Promise<TmdbSearchResult[]> {
  const path =
    type === "movie" ? "/search/movie" : type === "series" ? "/search/tv" : "/search/multi";

  const res = await tmdbFetch(path, {
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  if (!res.ok) throw new Error(`TMDB search failed (${res.status})`);

  const data = (await res.json()) as { results?: RawResult[] };
  const fallback = type === "series" ? "tv" : "movie";
  return (data.results ?? [])
    .map((r) => normalize(r, fallback))
    .filter((r): r is TmdbSearchResult => r !== null)
    .slice(0, 10);
}

export async function tmdbDetails(
  id: number,
  mediaType: "movie" | "tv"
): Promise<TmdbSearchResult | null> {
  const res = await tmdbFetch(`/${mediaType}/${id}`, { language: "en-US" });
  if (!res.ok) return null;
  const raw = (await res.json()) as RawResult & { genres?: { id: number; name: string }[] };
  const base = normalize({ ...raw, media_type: mediaType, genre_ids: [] }, mediaType);
  if (!base) return null;
  base.genres = (raw.genres ?? []).map((g) => g.name);
  return base;
}
