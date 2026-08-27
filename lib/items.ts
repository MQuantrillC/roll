"use client";

import { createClient } from "@/lib/supabase/client";
import { normalizeTitle } from "@/lib/normalize";
import type { Item, ItemMetadata, ItemType } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb/types";

const DUPLICATE_CODE = "23505";

export type AddResult = { item: Item; duplicate: false } | { item: null; duplicate: true };

/** Add a TMDB-matched movie/series to the caller's list. */
export async function addTmdbItem(
  groupId: string,
  ownerId: string,
  result: TmdbSearchResult
): Promise<AddResult> {
  const metadata: ItemMetadata = {
    tmdb_id: result.tmdb_id,
    original_title: result.original_title,
    release_date: result.release_date ?? undefined,
    poster_path: result.poster_path,
    backdrop_path: result.backdrop_path,
    overview: result.overview,
    genres: result.genres,
    vote_average: result.vote_average,
  };
  return insertItem({
    group_id: groupId,
    owner_id: ownerId,
    type: result.media_type === "tv" ? "series" : "movie",
    title: result.title,
    normalized_title: normalizeTitle(result.title),
    external_id: String(result.tmdb_id),
    external_source: "tmdb",
    metadata,
  });
}

/** Add a plain-text item (unmatched title, restaurant, food...). */
export async function addTextItem(
  groupId: string,
  ownerId: string,
  type: ItemType,
  title: string,
  metadata: ItemMetadata | null = null
): Promise<AddResult> {
  return insertItem({
    group_id: groupId,
    owner_id: ownerId,
    type,
    title: title.trim(),
    normalized_title: normalizeTitle(title),
    external_id: null,
    external_source: null,
    metadata,
  });
}

async function insertItem(
  row: Omit<Item, "id" | "created_at" | "status"> & { metadata: ItemMetadata | null }
): Promise<AddResult> {
  const supabase = createClient();
  const { data, error } = await supabase.from("items").insert(row).select().single();
  if (error) {
    if (error.code === DUPLICATE_CODE) return { item: null, duplicate: true };
    throw new Error(error.message);
  }
  return { item: data as Item, duplicate: false };
}

export async function setItemStatus(itemId: string, status: "want" | "done") {
  const supabase = createClient();
  const { error } = await supabase.from("items").update({ status }).eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function deleteItem(itemId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}
