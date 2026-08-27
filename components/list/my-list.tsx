"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type { Item, ItemType } from "@/lib/types";
import { deleteItem, setItemStatus } from "@/lib/items";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { Poster, TYPE_EMOJI } from "@/components/items/poster";
import { releaseYear } from "@/lib/tmdb/types";
import { AddItems } from "@/components/list/add-items";
import { cn } from "@/lib/utils";
import { Check, FileText, Plus, Star, Trash2, Undo2 } from "lucide-react";

const FILTERS: { value: ItemType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "🎬 Movies" },
  { value: "series", label: "📺 Series" },
  { value: "restaurant", label: "🍔 Food" },
];

export function MyList({
  groupId,
  userId,
  groupCategory,
  initialItems,
}: {
  groupId: string;
  userId: string;
  groupCategory: string;
  initialItems: Item[];
}) {
  const params = useSearchParams();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [filter, setFilter] = useState<ItemType | "all">("all");
  const [adding, setAdding] = useState(params.get("add") === "1");

  const visible = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((i) =>
            filter === "restaurant" ? i.type === "restaurant" || i.type === "food" : i.type === filter
          ),
    [items, filter]
  );

  async function toggleStatus(item: Item) {
    const status = item.status === "want" ? "done" : "want";
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
    try {
      await setItemStatus(item.id, status);
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
    }
  }

  async function remove(item: Item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteItem(item.id);
    } catch {
      setItems((prev) => [item, ...prev]);
    }
  }

  return (
    <main className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Your list</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/g/${groupId}/import`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <FileText className="size-4" /> Import
          </Link>
          <Button size="sm" onClick={() => setAdding((a) => !a)}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AddItems
              groupId={groupId}
              userId={userId}
              groupCategory={groupCategory}
              onAdded={(item) => setItems((prev) => [item, ...prev])}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
              filter === f.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          emoji="🎬"
          title={items.length === 0 ? "Nothing here yet" : "Nothing in this category"}
          description={
            items.length === 0
              ? "You need at least a few options before the group can decide."
              : undefined
          }
        >
          {items.length === 0 && (
            <>
              <Button size="sm" onClick={() => setAdding(true)}>
                Add an item
              </Button>
              <Link
                href={`/g/${groupId}/import`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Import a list
              </Link>
            </>
          )}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border bg-card p-3",
                  item.status === "done" && "opacity-55"
                )}
              >
                <Poster item={item} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate font-bold", item.status === "done" && "line-through")}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{TYPE_EMOJI[item.type]}</span>
                    {releaseYear(item.metadata?.release_date) && (
                      <span>{releaseYear(item.metadata?.release_date)}</span>
                    )}
                    {item.metadata?.vote_average ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {item.metadata.vote_average.toFixed(1)}
                      </span>
                    ) : null}
                    {item.metadata?.genres?.length ? (
                      <span className="truncate">{item.metadata.genres.slice(0, 2).join(" / ")}</span>
                    ) : null}
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(item)}
                  className={cn(
                    "rounded-xl p-2 transition-colors",
                    item.status === "done"
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground hover:text-success"
                  )}
                  title={item.status === "done" ? "Mark as want to watch" : "Mark as watched"}
                >
                  {item.status === "done" ? <Undo2 className="size-4" /> : <Check className="size-4" />}
                </button>
                <button
                  onClick={() => remove(item)}
                  className="rounded-xl p-2 text-muted-foreground transition-colors hover:text-red-500"
                  title="Remove"
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </main>
  );
}
