"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Item } from "@/lib/types";
import type { Pools } from "@/lib/decision/types";
import type { Member } from "@/components/decide/decide-flow";
import { dedupeByCanonicalKey } from "@/lib/decision/dedupe";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Poster } from "@/components/items/poster";
import { cn } from "@/lib/utils";
import { Check, Shuffle } from "lucide-react";
import { autoPicksFor } from "@/lib/decision/balancedRandom";

/**
 * Pass-the-phone picker: each participant in turn selects up to
 * `maxPicks` from their own list. In private mode (Mutual Match) an
 * interstitial hides the screen between turns so picks stay secret.
 */
export function PassPhonePicker({
  members,
  pools,
  maxPicks,
  privateMode,
  onDone,
}: {
  members: Member[];
  pools: Pools;
  maxPicks: number;
  privateMode?: boolean;
  onDone: (picks: Pools) => void;
}) {
  const [turn, setTurn] = useState(0);
  const [handoff, setHandoff] = useState(true);
  const [collected, setCollected] = useState<Pools>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const member = members[turn];
  const myItems = dedupeByCanonicalKey(pools[member?.userId] ?? []);

  function confirm(picks: Item[]) {
    const next = { ...collected, [member.userId]: picks };
    if (turn + 1 < members.length) {
      setCollected(next);
      setSelected(new Set());
      setTurn(turn + 1);
      setHandoff(true);
    } else {
      onDone(next);
    }
  }

  if (!member) return null;

  if (handoff) {
    return (
      <motion.div
        key={`handoff-${turn}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5 py-16 text-center"
      >
        <Avatar name={member.name} src={member.avatarUrl} size="lg" />
        <div>
          <h2 className="text-2xl font-extrabold">Pass the phone to {member.name}</h2>
          <p className="mt-1 text-muted-foreground">
            {privateMode
              ? `Pick your top ${maxPicks} — no peeking, no influencing!`
              : `Pick up to ${maxPicks} you'd be happy with tonight.`}
          </p>
        </div>
        <Button size="xl" onClick={() => setHandoff(false)}>
          I&apos;m {member.name} — let&apos;s pick
        </Button>
      </motion.div>
    );
  }

  if (myItems.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="text-5xl">🫗</div>
        <p className="font-semibold text-muted-foreground">
          {member.name} has no options in this category.
        </p>
        <Button onClick={() => confirm([])}>Skip {member.name}</Button>
      </div>
    );
  }

  const picked = myItems.filter((i) => selected.has(i.id));

  return (
    <motion.div
      key={`pick-${turn}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <header className="flex items-center gap-3">
        <Avatar name={member.name} src={member.avatarUrl} />
        <div className="flex-1">
          <h2 className="font-extrabold">{member.name}, pick your favorites</h2>
          <p className="text-sm text-muted-foreground">
            {picked.length}/{maxPicks} selected
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const random = autoPicksFor(myItems, maxPicks);
            setSelected(new Set(random.map((i) => i.id)));
          }}
          title="Pick randomly for me"
        >
          <Shuffle className="size-4" /> Surprise me
        </Button>
      </header>

      <ul className="grid grid-cols-1 gap-2">
        <AnimatePresence initial={false}>
          {myItems.map((item) => {
            const on = selected.has(item.id);
            const full = picked.length >= maxPicks && !on;
            return (
              <motion.li key={item.id} layout>
                <button
                  onClick={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (on) next.delete(item.id);
                      else if (!full) next.add(item.id);
                      return next;
                    })
                  }
                  disabled={full}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition-colors",
                    on ? "border-primary bg-primary/5" : "border-border bg-card",
                    full && "opacity-40"
                  )}
                >
                  <Poster item={item} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-bold">{item.title}</span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg border-2",
                      on ? "border-primary bg-primary text-white" : "border-border"
                    )}
                  >
                    {on && <Check className="size-4" />}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      <div className="sticky bottom-24 z-10">
        <Button size="xl" full disabled={picked.length === 0} onClick={() => confirm(picked)}>
          {turn + 1 < members.length
            ? `Done — pass to ${members[turn + 1].name}`
            : "Done — see the result"}
        </Button>
      </div>
    </motion.div>
  );
}
