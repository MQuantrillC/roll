"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";

const CATEGORIES = [
  { value: "movies_series", emoji: "🎬", label: "Movies & Series" },
  { value: "food", emoji: "🍔", label: "Restaurants & Food" },
  { value: "mixed", emoji: "🎲", label: "A bit of everything" },
];

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("movies_series");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_group", {
      p_name: name.trim(),
      p_category: category,
    });
    if (error || !data) {
      setError(error?.message ?? "Something went wrong. Try again.");
      setBusy(false);
      return;
    }
    router.push(`/g/${data.id}?created=1`);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pt-6">
      <Link
        href="/home"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <h1 className="text-2xl font-extrabold">Create a group</h1>
      <p className="mt-1 text-muted-foreground">Name it, pick a vibe, share the code.</p>

      <form onSubmit={create} className="mt-8 flex flex-col gap-6">
        <div>
          <label className="mb-2 block text-sm font-bold">Group name</label>
          <Input
            placeholder="Movie Night"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold">Category</label>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left font-semibold transition-colors ${
                  category === c.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="text-2xl">{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        <Button type="submit" size="xl" full disabled={busy || !name.trim()}>
          {busy ? <Spinner /> : "Create group"}
        </Button>
      </form>
    </main>
  );
}
