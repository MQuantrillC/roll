import Link from "next/link";
import { getGroupContext, getGroupItems } from "@/lib/groups";
import { ShareCode } from "@/components/groups/share-code";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { Dices, Plus } from "lucide-react";

export default async function GroupDashboard({ params }: PageProps<"/g/[id]">) {
  const { id } = await params;
  const [{ group, members, userId }, items] = await Promise.all([
    getGroupContext(id),
    getGroupItems(id),
  ]);

  const countByOwner = new Map<string, number>();
  for (const item of items) {
    countByOwner.set(item.owner_id, (countByOwner.get(item.owner_id) ?? 0) + 1);
  }

  const sortedMembers = [...members].sort((a, b) =>
    a.user_id === userId ? -1 : b.user_id === userId ? 1 : 0
  );

  return (
    <main className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5">
          <div className="text-sm font-semibold text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"} · share this code
          </div>
          <ShareCode code={group.code} groupName={group.name} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/g/${id}/list?add=1`}
          className={cn(buttonVariants({ variant: "outline", size: "lg", full: true }))}
        >
          <Plus className="size-5" /> Add items
        </Link>
        <Link
          href={`/g/${id}/decide`}
          className={cn(buttonVariants({ size: "lg", full: true }))}
        >
          <Dices className="size-5" /> Decide
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          Members
        </h2>
        <div className="flex flex-col gap-2">
          {sortedMembers.map((m) => {
            const isYou = m.user_id === userId;
            const count = countByOwner.get(m.user_id) ?? 0;
            return (
              <Card key={m.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Avatar name={m.profile?.display_name ?? "?"} src={m.profile?.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">
                      {m.profile?.display_name ?? "Someone"}
                      {isYou && <span className="ml-1.5 text-xs font-semibold text-primary">you</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {count} {count === 1 ? "item" : "items"}
                    </div>
                  </div>
                  {isYou && (
                    <Link
                      href={`/g/${id}/list`}
                      className="text-sm font-bold text-primary hover:underline"
                    >
                      Your list →
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {items.length === 0 && (
        <EmptyState
          emoji="🍿"
          title="Your group is empty"
          description="Add some movies (or restaurants) to get started. Paste a whole list at once — we'll clean it up."
        >
          <Link href={`/g/${id}/list?import=1`} className={cn(buttonVariants({ size: "sm" }))}>
            Import a list
          </Link>
          <Link
            href={`/g/${id}/list?add=1`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Add one item
          </Link>
        </EmptyState>
      )}
    </main>
  );
}
