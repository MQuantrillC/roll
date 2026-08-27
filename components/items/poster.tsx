import { cn } from "@/lib/utils";
import type { Item, ItemType } from "@/lib/types";
import { tmdbImageUrl } from "@/lib/tmdb/types";
import { Film, Tv, UtensilsCrossed, Pizza, type LucideIcon } from "lucide-react";

export const TYPE_ICON: Record<ItemType, LucideIcon> = {
  movie: Film,
  series: Tv,
  restaurant: UtensilsCrossed,
  food: Pizza,
};

export const TYPE_LABEL: Record<ItemType, string> = {
  movie: "Movie",
  series: "Series",
  restaurant: "Restaurant",
  food: "Food",
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
    sm: "w-10 h-14 rounded-lg",
    md: "w-14 h-20 rounded-xl",
    lg: "w-40 h-60 rounded-2xl",
  };
  const iconSizes = { sm: "size-4", md: "size-6", lg: "size-12" };
  const Icon = TYPE_ICON[item.type];
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
        "flex shrink-0 items-center justify-center bg-muted text-muted-foreground",
        sizes[size],
        className
      )}
      aria-hidden
    >
      <Icon className={iconSizes[size]} />
    </span>
  );
}
