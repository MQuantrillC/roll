"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";

const CODE_LENGTH = 5;

export default function JoinPage() {
  const router = useRouter();
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = chars.join("");

  function setChar(i: number, value: string) {
    const clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const next = [...chars];
    if (clean.length > 1) {
      // Pasted a whole code
      for (let j = 0; j < CODE_LENGTH; j++) next[j] = clean[j] ?? "";
      setChars(next);
      inputs.current[Math.min(clean.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    next[i] = clean;
    setChars(next);
    if (clean && i < CODE_LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("join_group", { p_code: code });
    if (error || !data) {
      setError(
        error?.message.includes("GROUP_NOT_FOUND")
          ? "No group found with that code. Double-check it!"
          : error?.message ?? "Something went wrong. Try again."
      );
      setBusy(false);
      return;
    }
    router.push(`/g/${data}`);
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pt-6">
      <Link
        href="/home"
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <h1 className="text-2xl font-extrabold">Join a group</h1>
      <p className="mt-1 text-muted-foreground">Enter the 5-character code your friend shared.</p>

      <form onSubmit={join} className="mt-10 flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {chars.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={c}
              onChange={(e) => setChar(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={CODE_LENGTH}
              aria-label={`Code character ${i + 1}`}
              className="h-16 w-12 rounded-2xl border-2 border-border bg-card text-center font-mono text-2xl font-bold uppercase transition-colors focus:border-primary focus:outline-none"
            />
          ))}
        </div>

        {error && <p className="text-sm font-medium text-red-500">{error}</p>}

        <Button type="submit" size="xl" full disabled={busy || code.length !== CODE_LENGTH}>
          {busy ? <Spinner /> : "Join group"}
        </Button>
      </form>
    </main>
  );
}
