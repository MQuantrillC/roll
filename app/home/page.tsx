import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus, UserPlus } from "lucide-react";

export const metadata = { title: "Your groups" };

const CATEGORY_EMOJI: Record<string, string> = {
  movies_series: "🎬",
  food: "🍔",
  mixed: "🎲",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from("group_members")
      .select("group_id, groups(id, name, code, category, created_at)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false }),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  const groups = (memberships ?? [])
    .map((m) => m.groups as unknown as { id: string; name: string; code: string; category: string })
    .filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-24 pt-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            Hey {profile?.display_name ?? "there"} 👋
          </div>
          <h1 className="text-2xl font-extrabold">Your groups</h1>
        </div>
        <form action="/auth/signout" method="post">
          <button className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link href="/new" className={cn(buttonVariants({ size: "lg", full: true }))}>
          <Plus className="size-5" /> Create group
        </Link>
        <Link
          href="/join"
          className={cn(buttonVariants({ variant: "outline", size: "lg", full: true }))}
        >
          <UserPlus className="size-5" /> Join group
        </Link>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          emoji="🎲"
          title="No groups yet"
          description="Create a group and share the code, or join a friend's group to get rolling."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/g/${g.id}`}>
              <Card className="transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-2xl">
                    {CATEGORY_EMOJI[g.category] ?? "🎲"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{g.name}</div>
                    <div className="font-mono text-xs tracking-widest text-muted-foreground">
                      {g.code}
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
