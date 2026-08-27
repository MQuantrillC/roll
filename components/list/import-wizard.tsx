"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { parseBulkList, type ParsedItem } from "@/lib/parser/bulkListParser";
import type { Item, ItemType } from "@/lib/types";
import { addTextItemsBulk } from "@/lib/items";
import { useMatchQueue, isMatchPending, needsMatchReview } from "@/lib/hooks/useMatchQueue";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Upload } from "lucide-react";

type Step = "paste" | "review" | "saving" | "done";

const PLACEHOLDER = `Paste your list — any format works:

Interstellar
- The Dark Knight
2. Dune
"Parasite"
    Arrival`;

export function ImportWizard({
  groupId,
  userId,
  groupCategory,
}: {
  groupId: string;
  userId: string;
  groupCategory: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState("");
  const [listType, setListType] = useState<ItemType>(
    groupCategory === "food" ? "restaurant" : "movie"
  );
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Item[]>([]);
  const [summary, setSummary] = useState({ added: 0, duplicates: 0 });
  const [error, setError] = useState<string | null>(null);

  const isScreen = listType === "movie" || listType === "series";

  // Items save instantly as text; TMDB matching runs here in the background
  // while the user watches (or leaves — the list page picks the queue up).
  useMatchQueue(saved, userId, setSaved);
  const matching = saved.filter(isMatchPending).length;
  const review = saved.filter(needsMatchReview).length;

  function parse() {
    const result = parseBulkList(text);
    setParsed(result.items);
    setChecked(new Set(result.items.map((i) => i.normalized)));
    setStep("review");
  }

  const selected = parsed.filter((p) => checked.has(p.normalized));

  async function save() {
    setStep("saving");
    setError(null);
    try {
      const { items, duplicates } = await addTextItemsBulk(
        groupId,
        userId,
        listType,
        selected.map((p) => ({ title: p.title, normalized: p.normalized, year: p.year })),
        isScreen
      );
      setSaved(items);
      setSummary({ added: items.length, duplicates });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
      setStep("review");
    }
  }

  // ---- Render ----

  return (
    <main className="flex flex-col gap-5">
      <Link
        href={`/g/${groupId}/list`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> My list
      </Link>

      {step === "paste" && (
        <>
          <div>
            <h1 className="text-xl font-extrabold">Import a list</h1>
            <p className="text-sm text-muted-foreground">
              Paste anything — bullets, numbers, quotes, mess. Letterboxd CSV
              and MyAnimeList XML exports work too. We&apos;ll clean it up.
            </p>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {(
              [
                ["movie", "🎬 Movies"],
                ["series", "📺 Series"],
                ["restaurant", "🍔 Restaurants"],
              ] as [ItemType, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setListType(t)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                  listType === t
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Textarea
            rows={12}
            placeholder={PLACEHOLDER}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            className="font-mono text-sm"
          />
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "md", full: true }),
              "cursor-pointer"
            )}
          >
            <Upload className="size-4" /> Upload a file (.csv / .xml / .txt)
            <input
              type="file"
              accept=".csv,.xml,.txt,text/csv,text/xml,text/plain"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setText(await file.text());
                e.target.value = "";
              }}
            />
          </label>
          <Button size="lg" onClick={parse} disabled={!text.trim()}>
            Clean up my list
          </Button>
        </>
      )}

      {step === "review" && (
        <>
          <div>
            <h1 className="text-xl font-extrabold">
              We found {parsed.length} {parsed.length === 1 ? "item" : "items"}
            </h1>
            <p className="text-sm text-muted-foreground">Uncheck anything that snuck in.</p>
          </div>

          {parsed.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
              Nothing parseable found — go back and check the text.
            </div>
          ) : (
            <ul className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto rounded-3xl border border-border bg-card p-3">
              {parsed.map((p) => {
                const on = checked.has(p.normalized);
                return (
                  <li key={p.normalized}>
                    <button
                      onClick={() =>
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (on) next.delete(p.normalized);
                          else next.add(p.normalized);
                          return next;
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                          on ? "border-primary bg-primary text-white" : "border-border"
                        )}
                      >
                        {on && <Check className="size-3.5" />}
                      </span>
                      <span className={cn("truncate font-semibold", !on && "text-muted-foreground line-through")}>
                        {p.title}
                        {p.year ? (
                          <span className="ml-1.5 font-normal text-muted-foreground">({p.year})</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={save} disabled={selected.length === 0}>
              Add {selected.length} {selected.length === 1 ? "item" : "items"}
            </Button>
            {isScreen && (
              <p className="text-center text-xs text-muted-foreground">
                They&apos;re usable right away — posters and details fill in
                automatically in the background.
              </p>
            )}
            <Button variant="ghost" onClick={() => setStep("paste")}>
              Back to editing
            </Button>
          </div>
        </>
      )}

      {step === "saving" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Spinner className="size-8 text-primary" />
          <p className="font-semibold text-muted-foreground">
            Adding {selected.length} {selected.length === 1 ? "item" : "items"}...
          </p>
        </div>
      )}

      {step === "done" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-12 text-center"
        >
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl font-extrabold">
            Added {summary.added} {summary.added === 1 ? "item" : "items"}
          </h1>
          {summary.duplicates > 0 && (
            <p className="text-sm text-muted-foreground">
              {summary.duplicates} already on your list — skipped.
            </p>
          )}

          {matching > 0 && (
            <div className="flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                <Spinner className="size-4 text-primary" />
                Matching with TMDB — {matching} left
              </div>
              <p className="text-xs text-muted-foreground">
                No need to wait — this keeps going on your list page.
              </p>
            </div>
          )}
          {matching === 0 && review > 0 && (
            <p className="text-sm font-semibold text-muted-foreground">
              {review} {review === 1 ? "title" : "titles"} matched several
              versions — pick the right ones on your list.
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <button
              onClick={() => router.push(`/g/${groupId}/list`)}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              See my list
            </button>
            <button
              onClick={() => {
                setText("");
                setSaved([]);
                setStep("paste");
              }}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Import more
            </button>
          </div>
        </motion.div>
      )}

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}
    </main>
  );
}
