"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { normalizeTitle } from "@/lib/normalize";
import { WheelRun } from "@/components/decide/wheel-run";
import { HeadToHeadRun } from "@/components/decide/head-to-head";
import { PassPhonePicker } from "@/components/decide/picker";
import { Button } from "@/components/ui/button";

const TITLES = [
  "Interstellar",
  "The Dark Knight",
  "Dune",
  "The Prestige",
  "Parasite",
  "Arrival",
  "Whiplash",
  "Inception",
];

let n = 0;
function fake(title: string, ownerId: string): Item {
  n++;
  return {
    id: `dev-${n}`,
    group_id: "dev",
    owner_id: ownerId,
    type: "movie",
    title,
    normalized_title: normalizeTitle(title),
    external_id: null,
    external_source: null,
    metadata: { release_date: "2014-11-05", vote_average: 8.4, genres: ["Sci-Fi", "Drama"] },
    status: "want",
    created_at: "2026-01-01T00:00:00Z",
  };
}

const POOL = TITLES.map((t, i) => fake(t, i % 2 ? "marco" : "dani"));
const MEMBERS = [
  { userId: "marco", name: "Marco", avatarUrl: null },
  { userId: "dani", name: "Dani", avatarUrl: null },
];

type View = "menu" | "wheel" | "shuffle" | "h2h" | "picker" | "done";

export function DevPreview() {
  const [view, setView] = useState<View>("menu");
  const [message, setMessage] = useState<string>("");

  if (view === "menu") {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <h1 className="text-xl font-extrabold">Dev preview</h1>
        <Button onClick={() => setView("wheel")}>🎡 Wheel</Button>
        <Button onClick={() => setView("shuffle")}>✨ Shuffle reveal</Button>
        <Button onClick={() => setView("h2h")}>⚔️ Head-to-Head</Button>
        <Button onClick={() => setView("picker")}>☑️ Pass-phone picker</Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </main>
    );
  }

  if (view === "done") {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-3 p-6 text-center">
        <div className="text-5xl">🎉</div>
        <p className="font-bold">{message}</p>
        <Button onClick={() => setView("menu")}>Back to menu</Button>
      </main>
    );
  }

  const finish = (label: string) => {
    setMessage(label);
    setView("done");
  };

  return (
    <main className="mx-auto max-w-md p-6">
      {view === "wheel" && (
        <WheelRun
          pool={POOL}
          winner={POOL[3]}
          title="Let fate decide..."
          onDone={() => finish(`Wheel landed on: ${POOL[3].title}`)}
        />
      )}
      {view === "shuffle" && (
        <WheelRun
          pool={POOL}
          winner={POOL[5]}
          quick
          title="Deciding for you..."
          onDone={() => finish(`Shuffle picked: ${POOL[5].title}`)}
        />
      )}
      {view === "h2h" && (
        <HeadToHeadRun
          pools={{ marco: POOL.slice(0, 4), dani: POOL.slice(4) }}
          members={MEMBERS}
          candidateCount={4}
          onDone={(w) => finish(`Tournament winner: ${w.title}`)}
        />
      )}
      {view === "picker" && (
        <PassPhonePicker
          members={MEMBERS}
          pools={{ marco: POOL.slice(0, 4), dani: POOL.slice(4) }}
          maxPicks={3}
          onDone={(picks) =>
            finish(
              `Picks collected: ${Object.values(picks)
                .flat()
                .map((i) => i.title)
                .join(", ")}`
            )
          }
        />
      )}
    </main>
  );
}
