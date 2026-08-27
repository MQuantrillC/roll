"use client";

import { useEffect, useRef, useState } from "react";
import type { Item, ItemType } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb/types";
import { releaseYear, tmdbImageUrl } from "@/lib/tmdb/types";
import { addTextItem, addTmdbItem } from "@/lib/items";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";

type Tab = "screen" | "food";

export function AddItems({
  groupId,
  userId,
  groupCategory,
  onAdded,
}: {
  groupId: string;
  userId: string;
  groupCategory: string;
  onAdded: (item: Item) => void;
}) {
  const [tab, setTab] = useState<Tab>(groupCategory === "food" ? "food" : "screen");

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 rounded-2xl bg-muted p-1 text-sm font-semibold">
        <button
          onClick={() => setTab("screen")}
          className={cn("rounded-xl py-2", tab === "screen" ? "bg-card shadow-sm" : "text-muted-foreground")}
        >
          🎬 Movies & series
        </button>
        <button
          onClick={() => setTab("food")}
          className={cn("rounded-xl py-2", tab === "food" ? "bg-card shadow-sm" : "text-muted-foreground")}
        >
          🍔 Restaurants
        </button>
      </div>

      {tab === "screen" ? (
        <TmdbSearch groupId={groupId} userId={userId} onAdded={onAdded} />
      ) : (
        <RestaurantForm groupId={groupId} userId={userId} onAdded={onAdded} />
      )}
    </div>
  );
}

function TmdbSearch({
  groupId,
  userId,
  onAdded,
}: {
  groupId: string;
  userId: string;
  onAdded: (item: Item) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(
      async () => {
        if (q.length < 2) {
          setResults([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(null);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          if (!res.ok) throw new Error();
          const data = (await res.json()) as { results: TmdbSearchResult[] };
          setResults(data.results);
          setLoading(false);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            setError("Search failed. Try again.");
            setLoading(false);
          }
        }
      },
      q.length < 2 ? 0 : 300 // debounce real queries, clear instantly
    );
    return () => clearTimeout(timer);
  }, [query]);

  async function add(result: TmdbSearchResult) {
    setBusyId(result.tmdb_id);
    try {
      const res = await addTmdbItem(groupId, userId, result);
      setAddedIds((prev) => new Set(prev).add(result.tmdb_id));
      if (res.item) onAdded(res.item);
    } catch {
      setError("Couldn't add that. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Search for a movie or series..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {loading && (
        <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
          <Spinner className="size-4" /> Searching...
        </div>
      )}
      {error && <p className="px-1 text-sm font-medium text-red-500">{error}</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="px-1 py-2 text-sm text-muted-foreground">No results found.</p>
      )}
      <ul className="flex flex-col gap-1">
        {results.map((r) => {
          const added = addedIds.has(r.tmdb_id);
          const poster = tmdbImageUrl(r.poster_path, "w185");
          return (
            <li key={`${r.media_type}-${r.tmdb_id}`}>
              <button
                onClick={() => !added && add(r)}
                disabled={added || busyId === r.tmdb_id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-muted",
                  added && "opacity-60"
                )}
              >
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                    {r.media_type === "tv" ? "📺" : "🎬"}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.title}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {releaseYear(r.release_date) ?? "—"} · {r.media_type === "tv" ? "Series" : "Movie"}
                    {r.vote_average > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {r.vote_average.toFixed(1)}
                      </span>
                    )}
                  </span>
                </span>
                {busyId === r.tmdb_id ? (
                  <Spinner className="size-4" />
                ) : added ? (
                  <Check className="size-5 text-success" />
                ) : (
                  <span className="text-sm font-bold text-primary">Add</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RestaurantForm({
  groupId,
  userId,
  onAdded,
}: {
  groupId: string;
  userId: string;
  onAdded: (item: Item) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("restaurant");
  const [address, setAddress] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await addTextItem(groupId, userId, type, name, {
        address: address.trim() || undefined,
        url: url.trim() || undefined,
      });
      if (res.duplicate) {
        setMsg("Already on your list 👍");
      } else if (res.item) {
        onAdded(res.item);
        setMsg(`Added ${name.trim()} ✅`);
      }
      setName("");
      setAddress("");
      setUrl("");
    } catch {
      setMsg("Couldn't add that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Input
        placeholder="Restaurant name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={120}
      />
      <div className="grid grid-cols-2 gap-2">
        {(["restaurant", "food"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={cn(
              "rounded-2xl border-2 py-2 text-sm font-bold capitalize transition-colors",
              type === t ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            {t === "restaurant" ? "🍽️ Restaurant" : "🍕 Food / dish"}
          </button>
        ))}
      </div>
      <Input
        placeholder="Address (optional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Input placeholder="Link (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
      {msg && <p className="px-1 text-sm font-medium text-muted-foreground">{msg}</p>}
      <Button type="submit" disabled={busy || !name.trim()}>
        {busy ? <Spinner /> : "Add to my list"}
      </Button>
    </form>
  );
}
