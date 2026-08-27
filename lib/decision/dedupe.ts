import { canonicalKey, type Item } from "@/lib/types";

/**
 * Collapse items that represent the same real-world thing (same TMDB
 * entity, or same normalized title for plain-text items) into one
 * representative. Prefers the copy with richer metadata (a poster).
 */
export function dedupeByCanonicalKey(items: Item[]): Item[] {
  const byKey = new Map<string, Item>();
  for (const item of items) {
    const key = canonicalKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
    } else if (!existing.metadata?.poster_path && item.metadata?.poster_path) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

/** Group items by canonical key. */
export function groupByCanonicalKey(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>();
  for (const item of items) {
    const key = canonicalKey(item);
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }
  return map;
}
