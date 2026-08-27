import { cn } from "@/lib/utils";
import type { Item, ItemType } from "@/lib/types";
import { tmdbImageUrl } from "@/lib/tmdb/types";

export const TYPE_EMOJI: Record<ItemType, string> = {
  movie: "🎬",
  series: "📺",
  restaurant: "🍔",
  food: "🍕",
};

export function Poster({
  item,
  size = "md",
  className,
}: {
  item: Pick<Item, "title" | "type" | "metadata">;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const src = tmdbImageUrl(item.metadata?.poster_path, size === "lg" ? "w500" : "w342");
  const sizes = {
    sm: "w-10 h-14 rounded-lg text-lg",
    md: "w-14 h-20 rounded-xl text-2xl",
    lg: "w-40 h-60 rounded-2xl text-6xl",
  };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={item.title}
      loading="lazy"
      className={cn("shrink-0 object-cover shadow-md", sizes[size], className)}
    />
  ) : (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-muted",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {TYPE_EMOJI[item.type]}
    </span>
  );
}
