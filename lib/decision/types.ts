import type { Item } from "@/lib/types";

/** Items grouped by participant user id. */
export type Pools = Record<string, Item[]>;

export interface DecisionOutcome {
  winner: Item;
  /** The effective pool the winner was drawn from (deduped). */
  pool: Item[];
}
