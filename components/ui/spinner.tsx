import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-[2.5px] border-current border-t-transparent opacity-70",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
