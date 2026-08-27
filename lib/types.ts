// Core domain types shared across the app.
// The item model is deliberately generic so new categories (games,
// activities, travel...) can be added without schema changes.

export type ItemType = "movie" | "series" | "restaurant" | "food";

export type ItemStatus = "want" | "done"; // done = watched / visited

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  category: string;
  created_by: string;
  settings: GroupSettings | null;
  created_at: string;
}

export interface GroupSettings {
  default_mode?: DecisionMode;
  default_picks_per_person?: number;
  avoid_recent?: boolean;
  recent_window_days?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

/**
 * Background TMDB matching state, persisted on the item so an import
 * can save instantly as plain text and be enriched later — from any
 * page, surviving refreshes and navigation.
 *
 * - "pending": not yet looked up; any client showing the list works the queue.
 * - "review": lookup found several plausible versions; the owner picks one
 *   (or keeps it as text). Absent once resolved.
 */
export interface MatchState {
  status: "pending" | "review";
  /** Release-year hint from the source (e.g. Letterboxd CSV). */
  year?: number;
  /** Candidate matches awaiting the owner's pick (status "review"). */
  options?: import("@/lib/tmdb/types").TmdbSearchResult[];
}

export interface ItemMetadata {
  match?: MatchState;
  // TMDB enrichment (movies / series)
  tmdb_id?: number;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  genres?: string[];
  vote_average?: number;
  // Restaurant fields (MVP: manual entry, enrichable later)
  address?: string;
  url?: string;
  cuisine?: string;
}

export interface Item {
  id: string;
  group_id: string;
  owner_id: string;
  type: ItemType;
  title: string;
  normalized_title: string;
  external_id: string | null;
  external_source: string | null;
  metadata: ItemMetadata | null;
  status: ItemStatus;
  created_at: string;
}

export type DecisionMode =
  | "pure_random"
  | "balanced_random"
  | "head_to_head"
  | "mutual_match"
  | "auto";

export type DecisionStatus = "active" | "complete" | "abandoned";

export interface Decision {
  id: string;
  group_id: string;
  type: ItemType;
  mode: DecisionMode;
  status: DecisionStatus;
  winner_item_id: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  winner?: Item | null;
}

/**
 * Canonical identity for an item across different members' lists.
 * Two rows are "the same thing" if they share an external identity
 * (e.g. the same TMDB id) or, for plain-text items, the same
 * normalized title + type. Different TMDB entities are never merged
 * just because their names are similar.
 */
export function canonicalKey(item: Pick<Item, "type" | "normalized_title" | "external_id" | "external_source">): string {
  if (item.external_source && item.external_id) {
    return `${item.external_source}:${item.external_id}`;
  }
  return `text:${item.type}:${item.normalized_title}`;
}
