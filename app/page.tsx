import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";
import { Dices, Heart, Scale, Swords, type LucideIcon } from "lucide-react";

const MODES: { icon: LucideIcon; name: string; blurb: string }[] = [
  { icon: Dices, name: "Pure Random", blurb: "Everything in one pool. Let fate decide." },
  { icon: Scale, name: "Balanced Random", blurb: "Everyone picks a few. Fair for all." },
  { icon: Swords, name: "Head-to-Head", blurb: "Two options enter. One survives." },
  { icon: Heart, name: "Mutual Match", blurb: "Find something you all agree on." },
];

const STEPS = [
  { n: "1", title: "Make a group", blurb: "Share a 5-letter code. Friends join in seconds." },
  { n: "2", title: "Add favorites", blurb: "Search titles or paste a whole list — even a messy one." },
  { n: "3", title: "Roll", blurb: "Pick a decision style and get tonight's answer." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Wordmark className="text-xl" />
        <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Sign in
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 pb-20 pt-14 text-center sm:pt-24">
        <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
          Stop arguing about <span className="text-gradient">what to watch.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Everyone adds their favorites. Pick a decision style. The group gets an
          answer in seconds — not twenty minutes.
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          <Link href="/login?mode=signup" className={cn(buttonVariants({ size: "xl" }))}>
            Create a group
          </Link>
          <Link
            href="/login?next=/join"
            className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
          >
            Join with a code
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-2 flex size-8 items-center justify-center rounded-xl bg-gradient-brand text-sm font-extrabold text-white">
                {s.n}
              </div>
              <div className="font-bold">{s.title}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{s.blurb}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
          Four ways to decide
        </h2>
        <div className="mt-4 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.name}
                className="flex items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <div className="font-bold">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.blurb}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        You choose the options. Roll chooses the winner.
      </footer>
    </main>
  );
}
