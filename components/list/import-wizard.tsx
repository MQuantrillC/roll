"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { parseBulkList, type ParsedItem } from "@/lib/parser/bulkListParser";
import { normalizeTitle } from "@/lib/normalize";
import type { ItemType } from "@/lib/types";
import type { TmdbSearchResult } from "@/lib/tmdb/types";
import { releaseYear, tmdbImageUrl } from "@/lib/tmdb/types";
import { addTextItem, addTmdbItem } from "@/lib/items";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Star, Upload } from "lucide-react";

type Step = "paste" | "review" | "match" | "saving" | "done";

interface MatchState {
  parsed: ParsedItem;
  status: "pending" | "matched" | "ambiguous" | "unmatched" | "text";
  match?: TmdbSearchResult;
  options?: TmdbSearchResult[];
}

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
  const [matches, setMatches] = useState<MatchState[]>([]);
  const [matchProgress, setMatchProgress] = useState(0);
  const [saveProgress, setSaveProgress] = useState(0);
  const [summary, setSummary] = useState({ added: 0, duplicates: 0 });
  const [error, setError] = useState<string | null>(null);

  const isScreen = listType === "movie" || listType === "series";

  function parse() {
    const result = parseBulkList(text);
    setParsed(result.items);
    setChecked(new Set(result.items.map((i) => i.normalized)));
    setStep("review");
  }

  const selected = parsed.filter((p) => checked.has(p.normalized));

  // ---- TMDB matching ----

  async function startMatching() {
    setStep("match");
    setError(null);
    const initial: MatchState[] = selected.map((p) => ({ parsed: p, status: "pending" }));
    setMatches(initial);
    setMatchProgress(0);

    const results = [...initial];
    const CONCURRENCY = 4;
    let index = 0;
    let done = 0;

    async function worker() {
      while (index < results.length) {
        const i = index++;
        results[i] = await matchOne(results[i]);
        done++;
        setMatches([...results]);
        setMatchProgress(done);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  async function matchOne(state: MatchState): Promise<MatchState> {
    try {
      const type = listType === "series" ? "series" : "movie";
      const res = await fetch(
        `/api/tmdb/search?q=${encodeURIComponent(state.parsed.title)}&type=${type}`
      );
      if (!res.ok) throw new Error();
      const { results: all } = (await res.json()) as { results: TmdbSearchResult[] };
      if (all.length === 0) return { ...state, status: "unmatched" };

      // A source year (e.g. Letterboxd CSV) narrows the candidates and
      // auto-resolves titles with many versions ("Dune", "Parasite").
      const sourceYear = state.parsed.year;
      const inYear = sourceYear
        ? all.filter((r) => {
            const y = Number(r.release_date?.slice(0, 4));
            return Number.isInteger(y) && Math.abs(y - sourceYear) <= 1;
          })
        : [];
      const results = inYear.length > 0 ? inYear : all;

      const exact = results.filter(
        (r) => normalizeTitle(r.title) === state.parsed.normalized
      );
      // Confident: exactly one exact-title match, or a single result overall.
      if (exact.length === 1) return { ...state, status: "matched", match: exact[0] };
      if (results.length === 1) return { ...state, status: "matched", match: results[0] };
      const options = (exact.length > 1 ? exact : results).slice(0, 4);
      return { ...state, status: "ambiguous", options };
    } catch {
      return { ...state, status: "unmatched" };
    }
  }

  function resolveAmbiguous(i: number, choice: TmdbSearchResult | null) {
    setMatches((prev) =>
      prev.map((m, j) =>
        j === i
          ? choice
            ? { ...m, status: "matched", match: choice }
            : { ...m, status: "text", options: undefined }
          : m
      )
    );
  }

  const unresolved = matches.filter((m) => m.status === "pending" || m.status === "ambiguous");

  // ---- Saving ----

  async function save(list: MatchState[]) {
    setStep("saving");
    setError(null);
    let added = 0;
    let duplicates = 0;
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      try {
        const res = m.match
          ? await addTmdbItem(groupId, userId, m.match)
          : await addTextItem(groupId, userId, listType, m.parsed.title);
        if (res.duplicate) duplicates++;
        else added++;
      } catch {
        // keep going — one bad row shouldn't sink a 50-item import
      }
      setSaveProgress(i + 1);
    }
    setSummary({ added, duplicates });
    setStep("done");
  }

  function saveWithoutMatching() {
    save(selected.map((p) => ({ parsed: p, status: "text" as const })));
  }

  function saveMatched() {
    // Ambiguous items the user didn't resolve fall back to plain text.
    save(matches.map((m) => (m.status === "matched" ? m : { ...m, match: undefined })));
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
            Clean up my list ✨
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
            {isScreen ? (
              <>
                <Button size="lg" onClick={startMatching} disabled={selected.length === 0}>
                  Match {selected.length} with TMDB 🔍
                </Button>
                <Button variant="ghost" onClick={saveWithoutMatching} disabled={selected.length === 0}>
                  Skip matching — add as plain text
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={saveWithoutMatching} disabled={selected.length === 0}>
                Add {selected.length} {selected.length === 1 ? "item" : "items"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setStep("paste")}>
              Back to editing
            </Button>
          </div>
        </>
      )}

      {step === "match" && (
        <>
          <div>
            <h1 className="text-xl font-extrabold">Matching with TMDB</h1>
            <p className="text-sm text-muted-foreground">
              {matchProgress < matches.length
                ? `Looking up ${matchProgress}/${matches.length}...`
                : unresolved.length > 0
                  ? `${unresolved.length} need${unresolved.length === 1 ? "s" : ""} your call`
                  : "All matched!"}
            </p>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-gradient-brand"
              animate={{ width: `${matches.length ? (matchProgress / matches.length) * 100 : 0}%` }}
            />
          </div>

          <ul className="flex flex-col gap-2">
            {matches.map((m, i) => (
              <li key={m.parsed.normalized} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-bold">{m.parsed.title}</span>
                  {m.status === "pending" && <Spinner className="size-4" />}
                  {m.status === "matched" && <Check className="size-5 shrink-0 text-success" />}
                  {m.status === "unmatched" && (
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      no match — will add as text
                    </span>
                  )}
                  {m.status === "text" && (
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      plain text
                    </span>
                  )}
                </div>

                {m.status === "matched" && m.match && (
                  <MatchRow result={m.match} />
                )}

                {m.status === "ambiguous" && m.options && (
                  <div className="mt-2 flex flex-col gap-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Multiple matches — which one?
                    </div>
                    {m.options.map((o) => (
                      <button
                        key={`${o.media_type}-${o.tmdb_id}`}
                        onClick={() => resolveAmbiguous(i, o)}
                        className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-muted"
                      >
                        <MatchRow result={o} compact />
                      </button>
                    ))}
                    <button
                      onClick={() => resolveAmbiguous(i, null)}
                      className="rounded-xl p-1.5 text-left text-sm font-semibold text-muted-foreground hover:bg-muted"
                    >
                      None of these — keep as text
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            onClick={saveMatched}
            disabled={matchProgress < matches.length}
          >
            {unresolved.filter((m) => m.status === "ambiguous").length > 0
              ? "Add anyway (unresolved stay as text)"
              : `Add ${matches.length} items`}
          </Button>
        </>
      )}

      {step === "saving" && (
        <div className="flex flex-col items-center gap-4 py-16">
          <Spinner className="size-8 text-primary" />
          <p className="font-semibold text-muted-foreground">
            Adding {saveProgress}/{selected.length}...
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

function MatchRow({ result, compact }: { result: TmdbSearchResult; compact?: boolean }) {
  const poster = tmdbImageUrl(result.poster_path, "w185");
  return (
    <div className={cn("flex items-center gap-2", !compact && "mt-2")}>
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
