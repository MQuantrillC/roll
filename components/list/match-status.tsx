"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Item } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb/types";
import { releaseYear, tmdbImageUrl } from "@/lib/tmdb/types";
import { applyTmdbMatch, clearMatchState } from "@/lib/items";
import { isMatchPending, needsMatchReview } from "@/lib/hooks/useMatchQueue";
import { Spinner } from "@/components/ui/spinner";
import { Star } from "lucide-react";

/**
 * Companion to useMatchQueue: a slim progress banner while titles are
 * being matched in the background, and a review card for the ones TMDB
 * couldn't identify with confidence.
 */
export function MatchStatus({
  items,
  setItems,
}: {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}) {
  const pending = items.filter(isMatchPending);
  const review = items.filter(needsMatchReview);
  const [busy, setBusy] = useState<string | null>(null);

  // Largest backlog seen this mount, so the bar fills instead of jumping.
  const [total, setTotal] = useState(0);
  if (pending.length > total) setTotal(pending.length);

  async function choose(item: Item, option: TmdbSearchResult | null) {
    setBusy(item.id);
    try {
      const updated = option ? await applyTmdbMatch(item, option) : await clearMatchState(item);
      setItems((prev) =>
        updated === null
          ? prev.filter((p) => p.id !== item.id)
          : prev.map((p) => (p.id === item.id ? updated : p))
      );
    } catch {
      // leave it in review; the user can tap again
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnimatePresence initial={false}>
      {pending.length > 0 && (
        <motion.div
          key="progress"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Spinner className="size-4 text-primary" />
              Matching with TMDB — {pending.length} left. Your list is ready to use meanwhile.
            </div>
            {total > 1 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full bg-gradient-brand"
                  animate={{ width: `${((total - pending.length) / total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {review.length > 0 && (
        <motion.div
          key="review"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-card p-3">
            <div>
              <div className="font-bold">
                {review.length} {review.length === 1 ? "title needs" : "titles need"} your call
              </div>
              <p className="text-sm text-muted-foreground">
                We found several versions — pick the right one.
              </p>
            </div>
            {review.map((item) => (
              <div key={item.id} className="rounded-xl bg-muted/50 p-2">
                <div className="mb-1 truncate px-1 font-bold">{item.title}</div>
                <div className="flex flex-col gap-1">
                  {(item.metadata?.match?.options ?? []).map((o) => (
                    <button
                      key={`${o.media_type}-${o.tmdb_id}`}
                      onClick={() => choose(item, o)}
                      disabled={busy === item.id}
                      className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-muted disabled:opacity-50"
                    >
                      <MatchRow result={o} />
                    </button>
                  ))}
                  <button
                    onClick={() => choose(item, null)}
                    disabled={busy === item.id}
                    className="rounded-xl p-1.5 text-left text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    None of these — keep as text
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MatchRow({ result }: { result: TmdbSearchResult }) {
  const poster = tmdbImageUrl(result.poster_path, "w185");
  return (
    <div className="flex items-center gap-2">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="h-12 w-8 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="flex h-12 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          {result.media_type === "tv" ? "📺" : "🎬"}
        </span>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <div className="truncate font-semibold">
          {result.title}{" "}
          <span className="font-normal text-muted-foreground">
            ({releaseYear(result.release_date) ?? "?"})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {result.media_type === "tv" ? "Series" : "Movie"}
          {result.vote_average > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" />
              {result.vote_average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
