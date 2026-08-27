"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "motion/react";
import type { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";

const WHEEL_MAX = 16;
const COLORS = [
  "#f5484d", "#ff7849", "#f9a825", "#43a047",
  "#00acc1", "#3d6cf5", "#7c5cfc", "#d81b60",
];

function shortTitle(title: string, max = 14): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

/**
 * Visual reveal for random draws. Small pools get a real spinning
 * wheel (GSAP); big pools or "quick" mode get a title-shuffle reveal.
 * The winner is decided BEFORE the animation starts — the wheel only
 * dramatizes it. A skip button ends the suspense instantly.
 */
export function WheelRun({
  pool,
  winner,
  title,
  quick,
  onDone,
}: {
  pool: Item[];
  winner: Item;
  title: string;
  quick?: boolean;
  onDone: () => void;
}) {
  const useWheel = !quick && pool.length >= 2 && pool.length <= WHEEL_MAX;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {useWheel ? (
        <Wheel pool={pool} winner={winner} onDone={onDone} />
      ) : (
        <Shuffle pool={pool} winner={winner} onDone={onDone} />
      )}
      <Button variant="ghost" size="sm" onClick={onDone}>
        Skip the suspense →
      </Button>
    </div>
  );
}

function Wheel({ pool, winner, onDone }: { pool: Item[]; winner: Item; onDone: () => void }) {
  const wheelRef = useRef<SVGGElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const winnerIndex = Math.max(
    0,
    pool.findIndex((p) => p.id === winner.id)
  );
  const seg = 360 / pool.length;

  const segments = useMemo(
    () =>
      pool.map((item, i) => {
        const start = i * seg;
        const end = (i + 1) * seg;
        return {
          item,
          path: arcPath(start, end),
          labelAngle: start + seg / 2,
          color: COLORS[i % COLORS.length],
        };
      }),
    [pool, seg]
  );

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    // Land the winner's segment center under the top pointer (-90°).
    const target = -(90 + winnerIndex * seg + seg / 2);
    const spins = 5;
    const finalRotation = spins * -360 + target;

    const tween = gsap.fromTo(
      el,
      { rotation: 0, transformOrigin: "50% 50%" },
      {
        rotation: finalRotation,
        duration: 4.2,
        ease: "power4.out",
        onComplete: () => {
          gsap.delayedCall(0.5, () => doneRef.current());
        },
      }
    );
    return () => {
      tween.kill();
    };
  }, [winnerIndex, seg]);

  return (
    <div className="relative">
      {/* Pointer */}
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1.5 text-3xl drop-shadow">
        🔻
      </div>
      <svg viewBox="-105 -105 210 210" className="size-[300px] max-w-full sm:size-[340px]">
        <g ref={wheelRef}>
          <circle r="103" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
          {segments.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.color} opacity={0.92} stroke="var(--background)" strokeWidth="1.5" />
              <text
                transform={`rotate(${s.labelAngle}) translate(58 0) ${
                  s.labelAngle > 90 && s.labelAngle < 270 ? "rotate(180)" : ""
                }`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={pool.length > 10 ? 7 : 8.5}
                fontWeight="700"
                style={{ userSelect: "none" }}
              >
                {shortTitle(s.item.title, pool.length > 10 ? 11 : 14)}
              </text>
            </g>
          ))}
          <circle r="16" fill="var(--background)" stroke="var(--border)" strokeWidth="2" />
        </g>
        <text textAnchor="middle" dominantBaseline="central" fontSize="14">
          🎲
        </text>
      </svg>
    </div>
  );
}

function arcPath(startDeg: number, endDeg: number, r = 100): string {
  const s = polar(startDeg, r);
  const e = polar(endDeg, r);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M 0 0 L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

function Shuffle({ pool, winner, onDone }: { pool: Item[]; winner: Item; onDone: () => void }) {
  const [label, setLabel] = useState(pool[0]?.title ?? "…");
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    let i = 0;
    let delay = 60;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      if (cancelled) return;
      i++;
      setLabel(pool[i % pool.length]?.title ?? "…");
      delay = Math.min(delay * 1.12, 420);
      if (delay >= 420) {
        setLabel(winner.title);
        timer = setTimeout(() => !cancelled && doneRef.current(), 650);
        return;
      }
      timer = setTimeout(tick, delay);
    }
    timer = setTimeout(tick, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pool, winner]);

  return (
    <motion.div
      className="flex h-40 w-full items-center justify-center rounded-3xl border-2 border-dashed border-border px-6"
      animate={{ scale: [1, 1.02, 1] }}
      transition={{ repeat: Infinity, duration: 0.6 }}
    >
      <span className="text-center text-2xl font-extrabold">{label}</span>
    </motion.div>
  );
}
