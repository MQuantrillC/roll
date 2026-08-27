"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Item } from "@/lib/types";
import type { Pools } from "@/lib/decision/types";
import type { Member } from "@/components/decide/decide-flow";
import {
  castVote,
  createTournament,
  resolveMatchup,
  sampleCandidates,
  type TournamentState,
} from "@/lib/decision/headToHead";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/items/poster";
import { releaseYear } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils";

/**
 * Couch-mode tournament: candidates are sampled fairly, then for each
 * matchup the phone is passed around — every participant casts exactly
 * one hidden vote. Ties trigger a revote; a second tie is settled by
 * coin flip.
 */
export function HeadToHeadRun({
  pools,
  members,
  candidateCount,
  onDone,
}: {
  pools: Pools;
  members: Member[];
  candidateCount: number;
  onDone: (winner: Item, pool: Item[], detail?: string) => void;
}) {
  const [candidates] = useState<Item[]>(() => sampleCandidates(pools, candidateCount));
  const [state, setState] = useState<TournamentState | null>(() =>
    candidates.length >= 2 ? createTournament(candidates) : null
  );
  const [voterIndex, setVoterIndex] = useState(0);
  const [banner, setBanner] = useState<{ kind: "win" | "tie"; text: string } | null>(null);
  const [wasTie, setWasTie] = useState(false);

  const participantIds = members.map((m) => m.userId);

  // Exiting AnimatePresence cards keep the previous render's onClick
  // alive for the transition; routing taps through a stable ref makes a
  // fast tap always hit the LATEST vote logic instead of stale state.
  const voteRef = useRef<(side: "a" | "b") => void>(() => {});

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  const winner = state?.winner ?? null;
  useEffect(() => {
    if (winner) {
      onDoneRef.current(winner, candidates, `${candidates.length}-candidate tournament`);
    }
  }, [winner, candidates]);

  function vote(side: "a" | "b") {
    if (!state || state.winner || banner) return;
    const voterNow = members[voterIndex];
    const next = castVote(state, voterNow.userId, side);

    if (voterIndex + 1 < members.length) {
      setState(next);
      setVoterIndex(voterIndex + 1);
      return;
    }

    // Everyone voted — resolve.
    const res = resolveMatchup(next, participantIds, { breakTie: wasTie });
    if (res.outcome === "tie") {
      setState(res.state);
      setVoterIndex(0);
      setWasTie(true);
      setBanner({ kind: "tie", text: "It's a tie! Vote again 🔁" });
      setTimeout(() => setBanner(null), 1600);
      return;
    }
    if (res.outcome === "advanced" && res.matchWinner) {
      const tallyText = res.tally ? `${res.tally.a} – ${res.tally.b}` : "";
      setBanner({
        kind: "win",
        text: `${res.matchWinner.title} wins ${tallyText ? `(${tallyText})` : ""}`,
      });
      setWasTie(false);
      setTimeout(() => {
        setBanner(null);
        setState(res.state);
        setVoterIndex(0);
      }, 1400);
    }
  }

  useEffect(() => {
    voteRef.current = vote;
  });

  // Not enough candidates for a tournament — degrade gracefully.
  if (!state) {
    const only = candidates[0];
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="text-5xl">🤷</div>
        <p className="font-semibold text-muted-foreground">
          Not enough options for a tournament.
        </p>
        {only && (
          <Button size="lg" onClick={() => onDone(only, candidates, "only option standing")}>
            Go with “{only.title}”
          </Button>
        )}
      </div>
    );
  }

  if (state.winner) return null; // effect above hands off to the result screen

  const match = state.current!;
  const voter = members[voterIndex];
  const totalRounds = Math.ceil(Math.log2(state.totalCandidates));

  return (
    <div className="flex flex-col gap-5">
      <header className="text-center">
        <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Round {state.round} of {totalRounds}
        </div>
        <h2 className="mt-1 text-xl font-extrabold">
          {members.length > 1 ? `${voter.name}, which one?` : "Which one?"}
        </h2>
        {members.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {members.map((m, i) => (
              <span
                key={m.userId}
                className={cn(
                  "size-2 rounded-full",
                  i < voterIndex ? "bg-success" : i === voterIndex ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </div>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${match.a.id}-${match.b.id}-${voterIndex}-${match.tie}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}
          className="relative grid grid-cols-2 gap-3"
        >
          {([match.a, match.b] as const).map((item, i) => (
            <button
              key={item.id}
              onClick={() => voteRef.current(i === 0 ? "a" : "b")}
              disabled={banner !== null}
              className="group flex flex-col items-center gap-3 rounded-3xl border-2 border-border bg-card p-4 transition-all hover:border-primary hover:shadow-lg active:scale-[0.97]"
            >
              <Poster item={item} size="lg" className="h-44 w-32 sm:h-52 sm:w-36" />
              <span className="text-center">
                <span className="block font-extrabold leading-tight">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {releaseYear(item.metadata?.release_date) ?? ""}
                </span>
              </span>
            </button>
          ))}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-foreground px-3 py-1 text-sm font-black text-background shadow-lg">
              VS
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {members.length > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Avatar name={voter.name} src={voter.avatarUrl} size="sm" />
          Voting: <strong className="text-foreground">{voter.name}</strong> — votes stay hidden
        </div>
      )}

      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-x-0 bottom-28 z-30 mx-auto w-fit rounded-2xl px-5 py-3 text-center font-extrabold text-white shadow-xl",
              banner.kind === "win" ? "bg-gradient-brand" : "bg-accent"
            )}
          >
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
