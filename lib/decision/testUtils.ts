import { normalizeTitle } from "@/lib/normalize";
import type { Item } from "@/lib/types";
import type { Rng } from "@/lib/decision/random";

let counter = 0;

export function makeItem(
  title: string,
  ownerId: string,
  overrides: Partial<Item> = {}
): Item {
  counter++;
  return {
    id: `item-${counter}`,
    group_id: "g1",
    owner_id: ownerId,
    type: "movie",
    title,
    normalized_title: normalizeTitle(title),
    external_id: null,
    external_source: null,
    metadata: null,
    status: "want",
    created_at: new Date(0).toISOString(),
    ...overrides,
  };
}

export function makeList(ownerId: string, titles: string[]): Item[] {
  return titles.map((t) => makeItem(t, ownerId));
}

/** Deterministic RNG for tests: cycles through the provided values. */
export function fixedRng(values: number[]): Rng {
  let i = 0;
  return (max: number) => {
    const v = values[i % values.length];
    i++;
    return Math.min(v, max - 1);
  };
}
