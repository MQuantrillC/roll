import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

const MODES = [
  { emoji: "🎡", name: "Pure Random", blurb: "Throw everything in. Let fate decide." },
  { emoji: "⚖️", name: "Balanced Random", blurb: "Everyone picks a few. Fair for all." },
  { emoji: "⚔️", name: "Head-to-Head", blurb: "Two options enter. One survives." },
  { emoji: "❤️", name: "Mutual Match", blurb: "Find something you all agree on." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-2xl font-extrabold tracking-tight">
          🎲 <span className="text-gradient">Roll</span>
        </span>
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Stop arguing about <span className="text-gradient">what to watch.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Add your favorites. Pick a decision style. Let the group decide — in
          seconds, not twenty minutes.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/login?mode=signup" className={cn(buttonVariants({ size: "xl" }))}>
            Create a group
          </Link>
          <Link
            href="/login?next=/join"
            className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
          >
            Join a group
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {MODES.map((m) => (
            <div
              key={m.name}
              className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left shadow-sm"
            >
              <span className="text-3xl">{m.emoji}</span>
              <div>
                <div className="font-bold">{m.name}</div>
                <div className="text-sm text-muted-foreground">{m.blurb}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        You choose the options. We choose the winner. 🎲
      </footer>
    </main>
  );
}
