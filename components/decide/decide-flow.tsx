"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { DecisionMode, GroupSettings, Item } from "@/lib/types";
import { applyExclusions } from "@/lib/decision/exclusions";
import { pureRandom, type PureRandomWeighting } from "@/lib/decision/pureRandom";
import { balancedRandom } from "@/lib/decision/balancedRandom";
import { mutualMatch } from "@/lib/decision/mutualMatch";
import { autoDecide } from "@/lib/decision/autoDecide";
import type { Pools } from "@/lib/decision/types";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft } from "lucide-react";
import { WheelRun } from "@/components/decide/wheel-run";
import { PassPhonePicker } from "@/components/decide/picker";
import { HeadToHeadRun } from "@/components/decide/head-to-head";
import { ResultScreen } from "@/components/decide/result";

export interface Member {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

type Category = "movie" | "series" | "food";
type Step = "category" | "participants" | "mode" | "guard" | "run" | "result";

const CATEGORY_LABELS: { value: Category; emoji: string; label: string }[] = [
  { value: "movie", emoji: "🎬", label: "Movies" },
  { value: "series", emoji: "📺", label: "Series" },
  { value: "food", emoji: "🍔", label: "Food" },
];

const MODES: {
  value: DecisionMode;
  emoji: string;
  name: string;
  blurb: string;
}[] = [
  { value: "auto", emoji: "✨", name: "Just Decide For Us", blurb: "Zero effort. We pick the method and the winner." },
  { value: "balanced_random", emoji: "⚖️", name: "Balanced Random", blurb: "Everyone picks a few. We choose from those." },
  { value: "pure_random", emoji: "🎡", name: "Pure Random", blurb: "Everything in one pool. Let fate decide." },
  { value: "head_to_head", emoji: "⚔️", name: "Head-to-Head", blurb: "Vote through a mini tournament." },
  { value: "mutual_match", emoji: "❤️", name: "Mutual Match", blurb: "Find something everyone likes." },
];

export const MODE_LABEL: Record<string, string> = {
  auto: "✨ Just Decide",
  pure_random: "🎡 Pure Random",
  balanced_random: "⚖️ Balanced Random",
  head_to_head: "⚔️ Head-to-Head",
  mutual_match: "❤️ Mutual Match",
};

function itemMatchesCategory(item: Item, cat: Category): boolean {
  if (cat === "food") return item.type === "restaurant" || item.type === "food";
  return item.type === cat;
}

export function DecideFlow({
  groupId,
  userId,
  settings,
  members,
  items,
  recentKeys,
}: {
  groupId: string;
  userId: string;
  settings: GroupSettings;
  members: Member[];
  items: Item[];
  recentKeys: string[];
}) {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<Category>("movie");
  const [participants, setParticipants] = useState<Set<string>>(
    () => new Set(members.map((m) => m.userId))
  );
  const [mode, setMode] = useState<DecisionMode>(settings.default_mode ?? "balanced_random");
  const [weighting, setWeighting] = useState<PureRandomWeighting>("person");
  const [picksPerPerson, setPicksPerPerson] = useState(settings.default_picks_per_person ?? 5);
  const [candidateCount, setCandidateCount] = useState(8);
  const [excludeRecent, setExcludeRecent] = useState(settings.avoid_recent ?? true);
  const [excludeDone, setExcludeDone] = useState(true);
  const [ranWithFullList, setRanWithFullList] = useState(false);

  const countFor = useMemo(() => {
    const map = new Map<Category, number>();
    for (const c of ["movie", "series", "food"] as Category[]) {
      map.set(c, items.filter((i) => itemMatchesCategory(i, c)).length);
    }
    return map;
  }, [items]);

  const activeMembers = members.filter((m) => participants.has(m.userId));

  /** Per-participant pools for the chosen category, after exclusions. */
  const exclusion = useMemo(() => {
    const raw: Pools = {};
    for (const m of activeMembers) {
      raw[m.userId] = items.filter(
        (i) => i.owner_id === m.userId && itemMatchesCategory(i, category)
      );
    }
    return applyExclusions(raw, {
      recentKeys: excludeRecent && !ranWithFullList ? new Set(recentKeys) : undefined,
      excludeDone: excludeDone && !ranWithFullList,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, category, participants, excludeRecent, excludeDone, ranWithFullList]);

  const pools = exclusion.pools;
  const totalAvailable = exclusion.remaining;

  const memberItemCount = (uid: string) =>
    items.filter((i) => i.owner_id === uid && itemMatchesCategory(i, category)).length;

  function begin() {
    if (totalAvailable < 2 && exclusion.removedRecent + exclusion.removedDone > 0) {
      setStep("guard");
    } else {
      setStep("run");
    }
  }

  function restart() {
    setRanWithFullList(false);
    setStep("category");
  }

  // ---------- render ----------

  const back = () => {
    if (step === "participants") setStep("category");
    else if (step === "mode") setStep("participants");
    else if (step === "guard" || step === "run") setStep("mode");
  };

  return (
    <main className="flex flex-col gap-6">
      {step !== "category" && step !== "result" && (
        <button
          onClick={back}
          className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back
        </button>
      )}

      {/* No exit-blocking transitions here: each step animates in on
          mount, so the wizard can never stall waiting on an exit tween
          (e.g. when the tab is backgrounded mid-transition). */}
      <>
        {step === "category" && (
          <StepShell key="category" title="What are we deciding?">
            <div className="flex flex-col gap-3">
              {CATEGORY_LABELS.map((c) => {
                const count = countFor.get(c.value) ?? 0;
                return (
                  <button
                    key={c.value}
                    onClick={() => {
                      setCategory(c.value);
                      setStep("participants");
                    }}
                    disabled={count === 0}
                    className={cn(
                      "flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-40",
                      category === c.value && "border-primary"
                    )}
                  >
                    <span className="text-3xl">{c.emoji}</span>
                    <span className="flex-1">
                      <span className="block text-lg font-extrabold">{c.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {count} {count === 1 ? "option" : "options"} in the group
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {items.length === 0 && (
              <EmptyState
                emoji="🫗"
                title="You need at least a few options before we can decide."
              >
                <Link href={`/g/${groupId}/list?add=1`} className={cn(buttonVariants({ size: "sm" }))}>
                  Add items
                </Link>
              </EmptyState>
            )}
          </StepShell>
        )}

        {step === "participants" && (
          <StepShell key="participants" title="Who is participating?">
            <div className="flex flex-col gap-2">
              {members.map((m) => {
                const on = participants.has(m.userId);
                const count = memberItemCount(m.userId);
                return (
                  <button
                    key={m.userId}
                    onClick={() =>
                      setParticipants((prev) => {
                        const next = new Set(prev);
                        if (on) next.delete(m.userId);
                        else next.add(m.userId);
                        return next;
                      })
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                      on ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <Avatar name={m.name} src={m.avatarUrl} />
                    <span className="flex-1">
                      <span className="block font-bold">
                        {m.name}
                        {m.userId === userId && (
                          <span className="ml-1.5 text-xs font-semibold text-primary">you</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {count} {count === 1 ? "option" : "options"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-lg border-2",
                        on ? "border-primary bg-primary text-white" : "border-border"
                      )}
                    >
                      {on && <Check className="size-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              size="xl"
              full
              disabled={activeMembers.length === 0 || totalAvailable === 0}
              onClick={() => setStep("mode")}
            >
              Continue
            </Button>
          </StepShell>
        )}

        {step === "mode" && (
          <StepShell key="mode" title="How should we decide?">
            <div className="flex flex-col gap-2">
              {MODES.map((m) => {
                const disabled =
                  m.value === "mutual_match" && activeMembers.length < 2;
                return (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center gap-4 rounded-3xl border-2 p-4 text-left transition-colors disabled:opacity-40",
                      mode === m.value ? "border-primary bg-primary/5" : "border-border bg-card",
                      m.value === "auto" && "bg-gradient-to-r from-primary/10 to-accent/10"
                    )}
                  >
                    <span className="text-2xl">{m.emoji}</span>
                    <span className="flex-1">
                      <span className="block font-extrabold">{m.name}</span>
                      <span className="text-sm text-muted-foreground">{m.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Mode options */}
            <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
              {mode === "pure_random" && (
                <OptionRow label="Fairness">
                  <div className="grid grid-cols-1 gap-1.5">
                    {(
                      [
                        ["person", "Equal contribution per person"],
                        ["item", "Equal probability per item"],
                      ] as [PureRandomWeighting, string][]
                    ).map(([w, label]) => (
                      <button
                        key={w}
                        onClick={() => setWeighting(w)}
                        className={cn(
                          "rounded-xl border-2 px-3 py-2 text-left text-sm font-semibold",
                          weighting === w ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </OptionRow>
              )}

              {(mode === "balanced_random" || mode === "mutual_match") && (
                <OptionRow
                  label={
                    mode === "balanced_random"
                      ? `Picks per person: ${picksPerPerson}`
                      : `Top picks each: ${picksPerPerson}`
                  }
                >
                  <input
                    type="range"
                    min={3}
                    max={10}
                    value={picksPerPerson}
                    onChange={(e) => setPicksPerPerson(Number(e.target.value))}
                    className="w-full accent-[var(--primary)]"
                  />
                </OptionRow>
              )}

              {mode === "head_to_head" && (
                <OptionRow label="Candidates">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[4, 8, 16].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCandidateCount(n)}
                        className={cn(
                          "rounded-xl border-2 py-2 text-sm font-bold",
                          candidateCount === n ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </OptionRow>
              )}

              <Toggle
                label="Exclude recently chosen"
                on={excludeRecent}
                onChange={setExcludeRecent}
              />
              {category !== "food" && (
                <Toggle
                  label="Exclude items marked watched"
                  on={excludeDone}
                  onChange={setExcludeDone}
                />
              )}
            </div>

            <Button size="xl" full onClick={begin}>
              Start
            </Button>
          </StepShell>
        )}

        {step === "guard" && (
          <StepShell key="guard" title="Not enough new options">
            <p className="text-muted-foreground">
              After excluding recent picks{excludeDone ? " and watched items" : ""}, only{" "}
              {totalAvailable} {totalAvailable === 1 ? "option is" : "options are"} left.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                full
                onClick={() => {
                  setRanWithFullList(true);
                  setStep("run");
                }}
              >
                Use the full list
              </Button>
              {totalAvailable >= 2 && (
                <Button variant="outline" size="lg" full onClick={() => setStep("run")}>
                  Continue with {totalAvailable}
                </Button>
              )}
              <Link
                href={`/g/${groupId}/list?add=1`}
                className={cn(buttonVariants({ variant: "ghost", size: "lg", full: true }))}
              >
                Add more items
              </Link>
            </div>
          </StepShell>
        )}

        {step === "run" && (
          <motion.div
            key="run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Runner
              groupId={groupId}
              mode={mode}
              pools={pools}
              members={activeMembers}
              weighting={weighting}
              picksPerPerson={picksPerPerson}
              candidateCount={candidateCount}
              onRestart={restart}
              onSwitchMode={(m) => {
                setMode(m);
                setStep("run");
              }}
            />
          </motion.div>
        )}
      </>
    </main>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5"
    >
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {children}
    </motion.section>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-sm font-bold">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex items-center justify-between py-1 text-sm font-semibold"
      type="button"
    >
      {label}
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          on ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
            on ? "left-[22px]" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

// ============================================================
// Runner: dispatches to the right mode experience
// ============================================================

function Runner({
  groupId,
  mode,
  pools,
  members,
  weighting,
  picksPerPerson,
  candidateCount,
  onRestart,
  onSwitchMode,
}: {
  groupId: string;
  mode: DecisionMode;
  pools: Pools;
  members: Member[];
  weighting: PureRandomWeighting;
  picksPerPerson: number;
  candidateCount: number;
  onRestart: () => void;
  onSwitchMode: (m: DecisionMode) => void;
}) {
  const [phase, setPhase] = useState<"pick" | "reveal" | "nomatch" | "done">(
    mode === "balanced_random" || mode === "mutual_match" ? "pick" : "reveal"
  );
  const [picks, setPicks] = useState<Pools>({});
  const [result, setResult] = useState<{
    winner: Item;
    pool: Item[];
    modeUsed: DecisionMode;
    detail?: string;
  } | null>(null);

  const participantIds = members.map((m) => m.userId);

  function finish(winner: Item, pool: Item[], modeUsed: DecisionMode, detail?: string) {
    setResult({ winner, pool, modeUsed, detail });
    setPhase("done");
  }

  if (phase === "done" && result) {
    return (
      <ResultScreen
        groupId={groupId}
        type={result.winner.type}
        winner={result.winner}
        pool={result.pool}
        mode={result.modeUsed}
        detail={result.detail}
        participantIds={participantIds}
        onAgain={onRestart}
      />
    );
  }

  // ---- pick phase (balanced + mutual) ----
  if (phase === "pick") {
    return (
      <PassPhonePicker
        members={members}
        pools={pools}
        maxPicks={picksPerPerson}
        privateMode={mode === "mutual_match"}
        onDone={(collected) => {
          setPicks(collected);
          if (mode === "mutual_match") {
            const { matches, winner } = mutualMatch(collected);
            if (!winner) {
              setPhase("nomatch");
              return;
            }
            finish(
              winner,
              matches,
              "mutual_match",
              `${matches.length} mutual ${matches.length === 1 ? "pick" : "picks"}`
            );
          } else {
            setPhase("reveal");
          }
        }}
      />
    );
  }

  // ---- no mutual match: graceful fallback ----
  if (phase === "nomatch") {
    return (
      <div className="flex flex-col gap-5 py-6 text-center">
        <div className="text-6xl">😬</div>
        <h2 className="text-2xl font-extrabold">No mutual matches</h2>
        <p className="text-muted-foreground">
          Nobody picked the same thing. That&apos;s okay — try another way:
        </p>
        <div className="flex flex-col gap-2">
          <Button size="lg" full onClick={() => setPhase("pick")}>
            Expand selections & retry
          </Button>
          <Button
            variant="outline"
            size="lg"
            full
            onClick={() => {
              const { winner, pool } = balancedRandom(picks);
              finish(winner, pool, "balanced_random", "picked from everyone's selections");
            }}
          >
            ⚖️ Use Balanced Random on the picks
          </Button>
          <Button variant="ghost" size="lg" full onClick={() => onSwitchMode("head_to_head")}>
            ⚔️ Switch to Head-to-Head
          </Button>
        </div>
      </div>
    );
  }

  // ---- reveal phase ----
  if (mode === "head_to_head") {
    return (
      <HeadToHeadRun
        pools={pools}
        members={members}
        candidateCount={candidateCount}
        onDone={(winner, pool, detail) => finish(winner, pool, "head_to_head", detail)}
      />
    );
  }

  if (mode === "balanced_random") {
    return (
      <RandomReveal
        compute={() => ({ ...balancedRandom(picks), detail: undefined })}
        title="Spinning your picks..."
        onDone={(o) => finish(o.winner, o.pool, "balanced_random")}
      />
    );
  }

  if (mode === "pure_random") {
    return (
      <RandomReveal
        compute={() => ({
          ...pureRandom(pools, weighting),
          detail: weighting === "person" ? "equal chance per person" : "equal chance per item",
        })}
        title="Let fate decide..."
        onDone={(o) => finish(o.winner, o.pool, "pure_random", o.detail)}
      />
    );
  }

  // auto
  return (
    <RandomReveal
      compute={() => {
        const auto = autoDecide(pools);
        return {
          winner: auto.winner,
          pool: auto.pool,
          detail:
            auto.strategy === "mutual_overlap"
              ? "found something everyone has on their list"
              : "fair random draw across everyone",
        };
      }}
      title="Deciding for you..."
      quick
      onDone={(o) => finish(o.winner, o.pool, "auto", o.detail)}
    />
  );
}

interface RevealOutcome {
  winner: Item;
  pool: Item[];
  detail?: string;
}

/**
 * Computes the (crypto-random) outcome exactly once on mount, then lets
 * the wheel animation represent it. The animation never determines the
 * result.
 */
function RandomReveal({
  compute,
  title,
  quick,
  onDone,
}: {
  compute: () => RevealOutcome;
  title: string;
  quick?: boolean;
  onDone: (o: RevealOutcome) => void;
}) {
  const [outcome] = useState<RevealOutcome>(compute);
  return (
    <WheelRun
      pool={outcome.pool}
      winner={outcome.winner}
      title={title}
      quick={quick}
      onDone={() => onDone(outcome)}
    />
  );
}
