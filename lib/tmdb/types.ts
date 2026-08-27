export interface TmdbSearchResult {
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  original_title: string;
  release_date: string | null; // release_date / first_air_date
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genres: string[];
  vote_average: number;
  popularity: number;
}

export function tmdbImageUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" | "w780" = "w342"): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function releaseYear(date: string | null | undefined): string | null {
  return date ? date.slice(0, 4) : null;
}
