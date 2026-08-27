"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { DecisionMode, Item } from "@/lib/types";
import { deleteDecision } from "@/lib/decisions";
import { Poster } from "@/components/items/poster";
import { releaseYear } from "@/lib/tmdb/types";
import { MODE_LABEL } from "@/components/decide/decide-flow";
import { Trash2 } from "lucide-react";

export interface HistoryEntry {
  id: string;
  mode: DecisionMode;
  type: string;
  completedAt: string;
  createdBy: string;
  detail: string | null;
  winner: Item | null;
}

export function HistoryList({
  entries: initial,
  userId,
}: {
  entries: HistoryEntry[];
  userId: string;
}) {
  const [entries, setEntries] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function remove(entry: HistoryEntry) {
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    try {
      await deleteDecision(entry.id);
    } catch {
      setEntries((prev) => [entry, ...prev]);
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">History</h1>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {entries.map((e) => {
            const date = new Date(e.completedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const open = expanded === e.id;
            return (
              <motion.li
                key={e.id}
                layout
                exit={{ opacity: 0, scale: 0.96 }}
                className="rounded-2xl border border-border bg-card"
              >
                <button
                  onClick={() => setExpanded(open ? null : e.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  {e.winner ? (
                    <Poster item={e.winner} size="sm" />
                  ) : (
                    <span className="flex h-14 w-10 items-center justify-center rounded-lg bg-muted">
                      ❓
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {e.winner?.title ?? "(item removed)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {date} · {MODE_LABEL[e.mode] ?? e.mode}
                    </span>
                  </span>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                        <div>
                          {e.winner && releaseYear(e.winner.metadata?.release_date) && (
                            <div>{releaseYear(e.winner.metadata?.release_date)}</div>
                          )}
                          {e.detail && <div>{e.detail}</div>}
                        </div>
                        {e.createdBy === userId && (
                          <button
                            onClick={() => remove(e)}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="size-4" /> Remove
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </main>
  );
}
