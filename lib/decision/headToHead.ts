import type { Item } from "@/lib/types";
import { pickOne, sample, secureRng, shuffle, type Rng } from "@/lib/decision/random";
import { dedupeByCanonicalKey } from "@/lib/decision/dedupe";
import type { Pools } from "@/lib/decision/types";

/**
 * MODE 3 — Head-to-Head ⚔️
 *
 * "Two options enter. One survives."
 *
 * A single-elimination mini tournament. Candidates are sampled fairly
 * (round-robin across participants so nobody's list dominates), then
 * seeded randomly. Every participant votes on each matchup; ties
 * trigger one revote, and if the revote also ties the matchup is
 * settled by a coin flip (surfaced to the UI as `settledByChance`).
 */

export interface Matchup {
  a: Item;
  b: Item;
  /** userId -> "a" | "b" */
  votes: Record<string, "a" | "b">;
  tie?: boolean;
  settledByChance?: boolean;
}

export interface TournamentState {
  round: number;
  /** Contenders still waiting to fight in the current round. */
  queue: Item[];
  /** Winners advancing to the next round. */
  advancing: Item[];
  current: Matchup | null;
  winner: Item | null;
  totalCandidates: number;
}

/**
 * Fairly sample up to `count` candidates: repeatedly take one random
 * item from each participant's (shuffled) list in round-robin order, so
 * a 200-item list and a 20-item list contribute evenly. Gracefully
 * returns fewer candidates when lists are small.
 */
export function sampleCandidates(pools: Pools, count: number, rng: Rng = secureRng): Item[] {
  const lists = Object.values(pools)
    .map((items) => shuffle(dedupeByCanonicalKey(items), rng))
    .filter((l) => l.length > 0);
  if (lists.length === 0) return [];

  const chosen: Item[] = [];
  const seen = new Set<string>();
  let depth = 0;
  while (chosen.length < count) {
    let took = false;
    for (const list of shuffle(lists, rng)) {
      if (chosen.length >= count) break;
      const item = list[depth];
      if (!item) continue;
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      chosen.push(item);
      took = true;
    }
    if (!took) break; // every list exhausted
    depth++;
  }
  return shuffle(chosen, rng);
}

function itemKey(item: Item): string {
  return item.external_source && item.external_id
    ? `${item.external_source}:${item.external_id}`
    : `text:${item.type}:${item.normalized_title}`;
}

export function createTournament(candidates: Item[], rng: Rng = secureRng): TournamentState {
  const unique = dedupeByCanonicalKey(candidates);
  if (unique.length === 0) throw new Error("Need at least one candidate");
  const seeded = shuffle(unique, rng);
  const state: TournamentState = {
    round: 1,
    queue: seeded,
    advancing: [],
    current: null,
    winner: null,
    totalCandidates: seeded.length,
  };
  return nextMatchup(state);
}

/** Pull the next pair from the queue, handling byes and round rollover. */
function nextMatchup(state: TournamentState): TournamentState {
  const s: TournamentState = { ...state, queue: [...state.queue], advancing: [...state.advancing] };

  while (true) {
    if (s.queue.length >= 2) {
      const a = s.queue.shift()!;
      const b = s.queue.shift()!;
      s.current = { a, b, votes: {} };
      return s;
    }
    if (s.queue.length === 1) {
      // Odd one out gets a bye into the next round.
      s.advancing.push(s.queue.shift()!);
    }
    if (s.advancing.length === 1 && s.queue.length === 0) {
      s.winner = s.advancing[0];
      s.current = null;
      return s;
    }
    if (s.advancing.length === 0 && s.queue.length === 0) {
      throw new Error("Tournament has no contenders");
    }
    // Start the next round.
    s.queue = s.advancing;
    s.advancing = [];
    s.round += 1;
  }
}

export function castVote(
  state: TournamentState,
  userId: string,
  side: "a" | "b"
): TournamentState {
  if (!state.current) return state;
  return {
    ...state,
    current: { ...state.current, votes: { ...state.current.votes, [userId]: side }, tie: false },
  };
}

export interface ResolveResult {
  state: TournamentState;
  outcome: "advanced" | "tie" | "pending";
  matchWinner?: Item;
  tally?: { a: number; b: number };
}

/**
 * Resolve the current matchup once all participants voted.
 * - missing votes  -> "pending" (nothing changes)
 * - clear majority -> winner advances
 * - tie            -> first time: "tie" (UI offers a revote);
 *                     with breakTie=true: coin flip settles it.
 */
export function resolveMatchup(
  state: TournamentState,
  participantIds: string[],
  opts: { breakTie?: boolean } = {},
  rng: Rng = secureRng
): ResolveResult {
  const match = state.current;
  if (!match) return { state, outcome: "pending" };

  const votes = Object.entries(match.votes).filter(([uid]) => participantIds.includes(uid));
  if (votes.length < participantIds.length) return { state, outcome: "pending" };

  const aVotes = votes.filter(([, v]) => v === "a").length;
  const bVotes = votes.filter(([, v]) => v === "b").length;
  const tally = { a: aVotes, b: bVotes };

  let winner: Item;
  let settledByChance = false;

  if (aVotes > bVotes) winner = match.a;
  else if (bVotes > aVotes) winner = match.b;
  else if (opts.breakTie) {
    winner = pickOne([match.a, match.b], rng);
    settledByChance = true;
  } else {
    return {
      state: { ...state, current: { ...match, tie: true, votes: {} } },
      outcome: "tie",
      tally,
    };
  }

  const advanced: TournamentState = {
    ...state,
    advancing: [...state.advancing, winner],
    current: { ...match, settledByChance },
  };
  return { state: nextMatchup(advanced), outcome: "advanced", matchWinner: winner, tally };
}

/** Convenience: how many matchups remain (including the current one). */
export function remainingMatchups(state: TournamentState): number {
  if (state.winner) return 0;
  const contenders = state.queue.length + state.advancing.length + (state.current ? 2 : 0);
  return Math.max(0, contenders - 1);
}

export { sample as sampleN };
