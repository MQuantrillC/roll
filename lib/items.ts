"use client";

import { createClient } from "@/lib/supabase/client";
import { normalizeTitle } from "@/lib/normalize";
import type { Item, ItemMetadata, ItemType } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb/types";

const DUPLICATE_CODE = "23505";

export type AddResult = { item: Item; duplicate: false } | { item: null; duplicate: true };

function tmdbMetadata(result: TmdbSearchResult): ItemMetadata {
  return {
    tmdb_id: result.tmdb_id,
    original_title: result.original_title,
    release_date: result.release_date ?? undefined,
    poster_path: result.poster_path,
    backdrop_path: result.backdrop_path,
    overview: result.overview,
    genres: result.genres,
    vote_average: result.vote_average,
  };
}

/** Add a TMDB-matched movie/series to the caller's list. */
export async function addTmdbItem(
  groupId: string,
  ownerId: string,
  result: TmdbSearchResult
): Promise<AddResult> {
  const metadata = tmdbMetadata(result);
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

export interface BulkEntry {
  title: string;
  normalized: string;
  year?: number;
}

/**
 * Save a whole import at once as plain-text items, in chunked inserts.
 * When `matchLater` is set, each item carries `metadata.match = pending`
 * so background TMDB matching can enrich it afterwards — the user never
 * waits on 200 lookups before their list is usable.
 */
export async function addTextItemsBulk(
  groupId: string,
  ownerId: string,
  type: ItemType,
  entries: BulkEntry[],
  matchLater: boolean
): Promise<{ items: Item[]; duplicates: number }> {
  const supabase = createClient();

  // Dedupe against what the owner already has in this group (any type —
  // a previously matched "Dune" shouldn't come back as a text twin).
  const { data: existing, error: exErr } = await supabase
    .from("items")
    .select("normalized_title")
    .eq("group_id", groupId)
    .eq("owner_id", ownerId);
  if (exErr) throw new Error(exErr.message);
  const seen = new Set((existing ?? []).map((r) => r.normalized_title as string));

  const fresh = entries.filter((e) => {
    if (seen.has(e.normalized)) return false;
    seen.add(e.normalized);
    return true;
  });
  const duplicates = entries.length - fresh.length;

  const rows = fresh.map((e) => ({
    group_id: groupId,
    owner_id: ownerId,
    type,
    title: e.title.trim(),
    normalized_title: e.normalized,
    external_id: null,
    external_source: null,
    metadata: matchLater
      ? ({ match: { status: "pending", ...(e.year ? { year: e.year } : {}) } } as ItemMetadata)
      : null,
  }));

  const items: Item[] = [];
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase.from("items").insert(chunk).select();
    if (error) {
      // A race duplicate aborts the whole chunk — retry it row by row.
      for (const row of chunk) {
        const { data: one, error: oneErr } = await supabase
          .from("items")
          .insert(row)
          .select()
          .single();
        if (oneErr) {
          if (oneErr.code !== DUPLICATE_CODE) throw new Error(oneErr.message);
          continue;
        }
        items.push(one as Item);
      }
      continue;
    }
    items.push(...((data ?? []) as Item[]));
  }
  return { items, duplicates };
}

/**
 * Promote a pending text item to its confirmed TMDB match.
 * Returns the updated item, or null when the match already exists on the
 * owner's list (the pending row is deleted as a duplicate).
 */
export async function applyTmdbMatch(item: Item, result: TmdbSearchResult): Promise<Item | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .update({
      type: result.media_type === "tv" ? ("series" as const) : ("movie" as const),
      title: result.title,
      normalized_title: normalizeTitle(result.title),
      external_id: String(result.tmdb_id),
      external_source: "tmdb",
      metadata: tmdbMetadata(result),
    })
    .eq("id", item.id)
    .select()
    .single();
  if (error) {
    if (error.code === DUPLICATE_CODE) {
      await supabase.from("items").delete().eq("id", item.id);
      return null;
    }
    throw new Error(error.message);
  }
  return data as Item;
}

/** Park an item for the owner to pick between several TMDB candidates. */
export async function setMatchReview(item: Item, options: TmdbSearchResult[]): Promise<Item> {
  return updateMetadata(item, { ...item.metadata, match: { status: "review", year: item.metadata?.match?.year, options } });
}

/** Resolve match state: the item stays as it is, plain text. */
export async function clearMatchState(item: Item): Promise<Item> {
  const rest: ItemMetadata = { ...item.metadata };
  delete rest.match;
  return updateMetadata(item, Object.keys(rest).length > 0 ? rest : null);
}

async function updateMetadata(item: Item, metadata: ItemMetadata | null): Promise<Item> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .update({ metadata })
    .eq("id", item.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Item;
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
