import { describe, expect, it } from "vitest";
import { pureRandom } from "./pureRandom";
import { balancedRandom, autoPicksFor } from "./balancedRandom";
import { mutualMatch, fullListOverlap } from "./mutualMatch";
import {
  castVote,
  createTournament,
  resolveMatchup,
  sampleCandidates,
} from "./headToHead";
import { autoDecide } from "./autoDecide";
import { applyExclusions } from "./exclusions";
import { canonicalKey } from "@/lib/types";
import { fixedRng, makeItem, makeList } from "./testUtils";

describe("pureRandom", () => {
  it("draws from the combined pool with multiple users", () => {
    const pools = {
      marco: makeList("marco", ["A", "B", "C"]),
      dani: makeList("dani", ["D", "E"]),
    };
    const { winner, pool } = pureRandom(pools, "item");
    expect(pool).toHaveLength(5);
    expect(pool).toContain(winner);
  });

  it("works with a single user", () => {
    const { winner } = pureRandom({ marco: makeList("marco", ["Solo"]) });
    expect(winner.title).toBe("Solo");
  });

  it("throws when every list is empty", () => {
    expect(() => pureRandom({ marco: [], dani: [] })).toThrow();
  });

  it("skips empty lists but keeps non-empty ones", () => {
    const { winner } = pureRandom({ marco: [], dani: makeList("dani", ["X"]) }, "person");
    expect(winner.title).toBe("X");
  });

  it("equal-person weighting gives each person 1/N regardless of list size", () => {
    const pools = {
      marco: makeList("marco", Array.from({ length: 200 }, (_, i) => `M${i}`)),
      dani: makeList("dani", ["D0", "D1"]),
    };
    // rng first picks the person index, then the item index.
    const fromDani = pureRandom(pools, "person", fixedRng([1, 0]));
    expect(fromDani.winner.owner_id).toBe("dani");
    const fromMarco = pureRandom(pools, "person", fixedRng([0, 5]));
    expect(fromMarco.winner.owner_id).toBe("marco");
  });

  it("dedupes shared items in equal-item weighting", () => {
    const pools = {
      marco: makeList("marco", ["Dune", "Arrival"]),
      dani: makeList("dani", ["dune"]),
    };
    const { pool } = pureRandom(pools, "item");
    expect(pool).toHaveLength(2);
  });
});

describe("balancedRandom", () => {
  it("combines picks from different list sizes evenly", () => {
    const picks = {
      marco: makeList("marco", ["A", "B", "C", "D", "E"]),
      dani: makeList("dani", ["F", "G", "H", "I", "J"]),
    };
    const { pool, winner } = balancedRandom(picks);
    expect(pool).toHaveLength(10);
    expect(pool).toContain(winner);
  });

  it("dedupes duplicate items across participants", () => {
    const picks = {
      marco: makeList("marco", ["Dune", "Arrival"]),
      dani: makeList("dani", ["DUNE", "Parasite"]),
    };
    const { pool } = balancedRandom(picks);
    expect(pool).toHaveLength(3);
  });

  it("throws on an empty pool", () => {
    expect(() => balancedRandom({ marco: [] })).toThrow();
  });

  it("autoPicksFor caps at list size when N is larger", () => {
    const list = makeList("marco", ["A", "B", "C"]);
    expect(autoPicksFor(list, 10)).toHaveLength(3);
  });
});

describe("mutualMatch", () => {
  it("finds the full intersection", () => {
    const picks = {
      marco: makeList("marco", ["Interstellar", "Dune", "Parasite", "The Prestige", "Whiplash"]),
      dani: makeList("dani", ["Interstellar", "Dune", "Parasite", "Arrival", "EEAAO"]),
    };
    const { matches, winner } = mutualMatch(picks);
    expect(matches.map((m) => m.normalized_title).sort()).toEqual([
      "dune",
      "interstellar",
      "parasite",
    ]);
    expect(winner).not.toBeNull();
  });

  it("full intersection when everyone picks the same", () => {
    const picks = {
      a: makeList("a", ["X", "Y"]),
      b: makeList("b", ["x", "y"]),
      c: makeList("c", ["X", "y"]),
    };
    expect(mutualMatch(picks).matches).toHaveLength(2);
  });

  it("returns no winner when there is no intersection", () => {
    const picks = {
      marco: makeList("marco", ["A"]),
      dani: makeList("dani", ["B"]),
    };
    const { matches, winner } = mutualMatch(picks);
    expect(matches).toEqual([]);
    expect(winner).toBeNull();
  });

  it("handles different numbers of selections", () => {
    const picks = {
      marco: makeList("marco", ["A", "B", "C", "D"]),
      dani: makeList("dani", ["B"]),
    };
    expect(mutualMatch(picks).matches.map((m) => m.title)).toEqual(["B"]);
  });

  it("duplicate picks by the same person don't count as agreement", () => {
    const picks = {
      marco: makeList("marco", ["Dune", "dune"]),
      dani: makeList("dani", ["Arrival"]),
    };
    expect(mutualMatch(picks).matches).toEqual([]);
  });

  it("matches TMDB entities by id, not by title", () => {
    const dune84 = makeItem("Dune", "marco", { external_source: "tmdb", external_id: "841" });
    const dune21 = makeItem("Dune", "dani", { external_source: "tmdb", external_id: "438631" });
    expect(mutualMatch({ marco: [dune84], dani: [dune21] }).matches).toEqual([]);

    const same = makeItem("Dune", "dani", { external_source: "tmdb", external_id: "841" });
    expect(mutualMatch({ marco: [dune84], dani: [same] }).matches).toHaveLength(1);
  });

  it("fullListOverlap detects overlap across whole lists", () => {
    const pools = {
      marco: makeList("marco", ["A", "B", "C"]),
      dani: makeList("dani", ["c", "D"]),
    };
    expect(fullListOverlap(pools).map((i) => i.normalized_title)).toEqual(["c"]);
  });
});

describe("headToHead", () => {
  const participants = ["marco", "dani", "alex"];

  function voteAll(state: ReturnType<typeof createTournament>, sides: ("a" | "b")[]) {
    let s = state;
    participants.forEach((p, i) => {
      s = castVote(s, p, sides[i]);
    });
    return s;
  }

  it("runs a 2-candidate final", () => {
    let state = createTournament(makeList("marco", ["A", "B"]));
    expect(state.current).not.toBeNull();
    state = voteAll(state, ["a", "a", "b"]);
    const res = resolveMatchup(state, participants);
    expect(res.outcome).toBe("advanced");
    expect(res.state.winner).not.toBeNull();
    expect(res.tally).toEqual({ a: 2, b: 1 });
  });

  it("runs an 8-candidate bracket over multiple rounds", () => {
    let state = createTournament(makeList("marco", ["A", "B", "C", "D", "E", "F", "G", "H"]));
    let matchups = 0;
    while (!state.winner) {
      state = voteAll(state, ["a", "a", "a"]);
      const res = resolveMatchup(state, participants);
      expect(res.outcome).toBe("advanced");
      state = res.state;
      matchups++;
      expect(matchups).toBeLessThan(20);
    }
    expect(matchups).toBe(7); // 8 candidates -> 7 matchups
    expect(state.round).toBe(3);
  });

  it("handles odd candidate counts with byes", () => {
    let state = createTournament(makeList("marco", ["A", "B", "C"]));
    let matchups = 0;
    while (!state.winner) {
      state = voteAll(state, ["b", "b", "b"]);
      state = resolveMatchup(state, participants).state;
      matchups++;
    }
    expect(matchups).toBe(2);
  });

  it("waits when votes are missing", () => {
    let state = createTournament(makeList("marco", ["A", "B"]));
    state = castVote(state, "marco", "a");
    const res = resolveMatchup(state, participants);
    expect(res.outcome).toBe("pending");
    expect(res.state.current?.votes).toEqual({ a: undefined, ...{ marco: "a" } });
  });

  it("does not let one user vote twice (latest vote wins)", () => {
    let state = createTournament(makeList("marco", ["A", "B"]));
    state = castVote(state, "marco", "a");
    state = castVote(state, "marco", "b");
    expect(Object.keys(state.current!.votes)).toHaveLength(1);
    expect(state.current!.votes["marco"]).toBe("b");
  });

  it("flags ties, clears votes for revote, then breaks ties on demand", () => {
    const two = ["marco", "dani"];
    let state = createTournament(makeList("marco", ["A", "B"]));
    state = castVote(castVote(state, "marco", "a"), "dani", "b");
    const tied = resolveMatchup(state, two);
    expect(tied.outcome).toBe("tie");
    expect(tied.state.current?.tie).toBe(true);
    expect(tied.state.current?.votes).toEqual({});

    const revote = castVote(castVote(tied.state, "marco", "a"), "dani", "b");
    const broken = resolveMatchup(revote, two, { breakTie: true });
    expect(broken.outcome).toBe("advanced");
    expect(broken.state.winner).not.toBeNull();
  });

  it("ignores votes from non-participants", () => {
    let state = createTournament(makeList("marco", ["A", "B"]));
    state = voteAll(state, ["a", "a", "a"]);
    state = castVote(state, "intruder", "b");
    const res = resolveMatchup(state, participants);
    expect(res.outcome).toBe("advanced");
    expect(res.tally).toEqual({ a: 3, b: 0 });
  });

  it("sampleCandidates draws fairly across unequal lists", () => {
    const pools = {
      marco: makeList("marco", Array.from({ length: 50 }, (_, i) => `M${i}`)),
      dani: makeList("dani", ["D0", "D1", "D2", "D3"]),
    };
    const candidates = sampleCandidates(pools, 8);
    expect(candidates).toHaveLength(8);
    const daniCount = candidates.filter((c) => c.owner_id === "dani").length;
    expect(daniCount).toBe(4); // dani's whole list gets in, marco fills the rest
  });

  it("sampleCandidates reduces gracefully when lists are small", () => {
    const pools = { marco: makeList("marco", ["A", "B", "C"]) };
    expect(sampleCandidates(pools, 8)).toHaveLength(3);
  });
});

describe("autoDecide", () => {
  it("uses mutual overlap when lists overlap", () => {
    const pools = {
      marco: makeList("marco", ["Interstellar", "Dune", "X"]),
      dani: makeList("dani", ["interstellar", "Y"]),
    };
    const res = autoDecide(pools);
    expect(res.strategy).toBe("mutual_overlap");
    expect(res.winner.normalized_title).toBe("interstellar");
  });

  it("falls back to balanced pool when there is no overlap", () => {
    const pools = {
      marco: makeList("marco", ["A"]),
      dani: makeList("dani", ["B"]),
    };
    expect(autoDecide(pools).strategy).toBe("balanced_pool");
  });

  it("single participant never uses mutual overlap", () => {
    const pools = { marco: makeList("marco", ["A", "B"]) };
    expect(autoDecide(pools).strategy).toBe("balanced_pool");
  });
});

describe("applyExclusions", () => {
  it("removes recent winners and watched items, reporting counts", () => {
    const items = makeList("marco", ["A", "B", "C"]);
    items[1].status = "done";
    const recent = new Set([canonicalKey(items[0])]);
    const res = applyExclusions({ marco: items }, { recentKeys: recent, excludeDone: true });
    expect(res.removedRecent).toBe(1);
    expect(res.removedDone).toBe(1);
    expect(res.remaining).toBe(1);
    expect(res.pools.marco.map((i) => i.title)).toEqual(["C"]);
  });
});
