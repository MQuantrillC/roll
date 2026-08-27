import { cn } from "@/lib/utils";

/** The Roll die mark — used in the wordmark, headers, and empty spots. */
export function DieMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id="roll-die-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-2)" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#roll-die-g)" />
      <circle cx="21" cy="21" r="5.5" fill="#fff" />
      <circle cx="43" cy="21" r="5.5" fill="#fff" />
      <circle cx="32" cy="32" r="5.5" fill="#fff" />
      <circle cx="21" cy="43" r="5.5" fill="#fff" />
      <circle cx="43" cy="43" r="5.5" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <DieMark className={markClassName} />
      Roll
    </span>
  );
}
