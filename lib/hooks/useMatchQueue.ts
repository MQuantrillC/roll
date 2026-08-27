"use client";

import { useEffect, useRef } from "react";
import type { Item } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb/types";
import { decideMatch } from "@/lib/tmdb/matching";
import { applyTmdbMatch, clearMatchState, setMatchReview } from "@/lib/items";

const CONCURRENCY = 4;

export function isMatchPending(item: Item): boolean {
  return item.metadata?.match?.status === "pending";
}

export function needsMatchReview(item: Item): boolean {
  return item.metadata?.match?.status === "review";
}

/**
 * Works through items whose `metadata.match` is "pending": looks each
 * title up on TMDB and either enriches it in place, parks it for review
 * (several plausible versions), or clears the flag (no match — stays text).
 *
 * State lives on the item rows, so the queue resumes wherever the owner's
 * list is next rendered — mid-import, after a refresh, on another device.
 * Lookup failures stay "pending" (retried on the next mount, not this one).
 */
export function useMatchQueue(
  items: Item[],
  ownerId: string,
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
) {
  // Ids handled (or failed) this mount — never re-enqueued while mounted.
  const handled = useRef<Set<string>>(new Set());

  useEffect(() => {
    const queue = items.filter(
      (i) => i.owner_id === ownerId && isMatchPending(i) && !handled.current.has(i.id)
    );
    if (queue.length === 0) return;
    for (const item of queue) handled.current.add(item.id);

    let index = 0;
    async function worker() {
      while (index < queue.length) {
        const item = queue[index++];
        try {
          const updated = await matchOne(item);
          setItems((prev) =>
            updated === null
              ? prev.filter((p) => p.id !== item.id)
              : prev.map((p) => (p.id === item.id ? updated : p))
          );
        } catch {
          // Leave it pending in the DB; a later visit retries.
        }
      }
    }
    for (let w = 0; w < CONCURRENCY; w++) void worker();
  }, [items, ownerId, setItems]);
}

/** Returns the updated item, or null when it merged into an existing duplicate. */
async function matchOne(item: Item): Promise<Item | null> {
  const type = item.type === "series" ? "series" : "movie";
  const res = await fetch(
    `/api/tmdb/search?q=${encodeURIComponent(item.title)}&type=${type}`
  );
  if (!res.ok) throw new Error("search failed");
  const { results } = (await res.json()) as { results: TmdbSearchResult[] };

  const decision = decideMatch(item.normalized_title, item.metadata?.match?.year, results);
  if (decision.kind === "match") return applyTmdbMatch(item, decision.result);
  if (decision.kind === "ambiguous") return setMatchReview(item, decision.options);
  return clearMatchState(item);
}
