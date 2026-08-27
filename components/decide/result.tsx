"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { DecisionMode, Item, ItemType } from "@/lib/types";
import { saveDecision } from "@/lib/decisions";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Poster } from "@/components/items/poster";
import { releaseYear } from "@/lib/tmdb/types";
import { MODE_LABEL } from "@/components/decide/decide-flow";
import { cn, safeHttpUrl } from "@/lib/utils";
import { ExternalLink, MapPin, RotateCcw, Star } from "lucide-react";

const CONFETTI = ["🎉", "🎊", "✨", "🍿", "🎬", "⭐"];

export function ResultScreen({
  groupId,
  type,
  winner,
  pool,
  mode,
  detail,
  participantIds,
  onAgain,
}: {
  groupId: string;
  type: ItemType;
  winner: Item;
  pool: Item[];
  mode: DecisionMode;
  detail?: string;
  participantIds: string[];
  onAgain: () => void;
}) {
  const [saved, setSaved] = useState<"saving" | "saved" | "failed">("saving");
  const savedOnce = useRef(false);

  useEffect(() => {
    if (savedOnce.current) return;
    savedOnce.current = true;
    saveDecision({
      groupId,
      type,
      mode,
      winner,
      participantIds,
      candidates: pool,
      metadata: { detail: detail ?? null, pool_size: pool.length },
    })
      .then((id) => setSaved(id ? "saved" : "failed"))
      .catch(() => setSaved("failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFood = winner.type === "restaurant" || winner.type === "food";
  const year = releaseYear(winner.metadata?.release_date);
  const genres = winner.metadata?.genres?.slice(0, 3).join(" / ");
  const rating = winner.metadata?.vote_average;

  const trailerUrl = !isFood
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${winner.title} ${year ?? ""} trailer`
      )}`
    : null;
  const mapsUrl = isFood
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        winner.metadata?.address ? `${winner.title} ${winner.metadata.address}` : winner.title
      )}`
    : null;

  return (
    <div className="relative flex flex-col items-center gap-5 overflow-hidden py-6 text-center">
      {/* Confetti burst */}
      {CONFETTI.map((c, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute top-24 text-3xl"
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
          animate={{
            opacity: [1, 1, 0],
            x: (i - 2.5) * 60 + (i % 2 ? 20 : -20),
            y: [-10, -90 - (i % 3) * 40, 60],
            scale: [0.6, 1.3, 0.9],
            rotate: (i % 2 ? 1 : -1) * 180,
          }}
          transition={{ duration: 1.6, delay: 0.15, ease: "easeOut" }}
        >
          {c}
        </motion.span>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-black uppercase tracking-[0.25em] text-muted-foreground"
      >
        {isFood ? "🍔 Tonight's pick" : "🎉 Tonight's pick"}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
        className="flex flex-col items-center gap-4"
      >
        <Poster item={winner} size="lg" className="shadow-2xl" />
        <h1 className="max-w-sm text-3xl font-black leading-tight">{winner.title}</h1>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          {year && <span>{year}</span>}
          {genres && <span>· {genres}</span>}
          {rating ? (
            <span className="inline-flex items-center gap-1">
              · <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.toFixed(1)}
            </span>
          ) : null}
          {isFood && winner.metadata?.address && <span>· {winner.metadata.address}</span>}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm font-semibold text-muted-foreground"
      >
        You decided with {MODE_LABEL[mode]}
        {detail ? ` — ${detail}` : ""}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex w-full max-w-xs flex-col gap-2"
      >
        {trailerUrl && (
          <a
            href={trailerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg", full: true }))}
          >
            <ExternalLink className="size-4" /> Watch trailer
          </a>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "lg", full: true }))}
          >
            <MapPin className="size-4" /> Open in Maps
          </a>
        )}
        {safeHttpUrl(winner.metadata?.url) && (
          <a
            href={safeHttpUrl(winner.metadata?.url)!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "lg", full: true }))}
          >
            <ExternalLink className="size-4" /> Visit website
          </a>
        )}
        <Button size="lg" full onClick={onAgain}>
          <RotateCcw className="size-4" /> Choose again
        </Button>
        <Link
          href={`/g/${groupId}/history`}
          className={cn(buttonVariants({ variant: "ghost", size: "lg", full: true }))}
        >
          See history
        </Link>
      </motion.div>

      <p className="text-xs text-muted-foreground">
        {saved === "saving" && "Saving to history..."}
        {saved === "saved" && "Saved to history ✓"}
        {saved === "failed" && "Couldn't save to history — but enjoy the pick!"}
      </p>
    </div>
  );
}
