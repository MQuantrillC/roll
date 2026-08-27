import { getGroupContext, getGroupItems } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";
import { canonicalKey, type GroupSettings, type Item } from "@/lib/types";
import { DecideFlow } from "@/components/decide/decide-flow";

export const metadata = { title: "Decide" };

function sinceIso(windowDays: number): string {
  return new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
}

export default async function DecidePage({ params }: PageProps<"/g/[id]/decide">) {
  const { id } = await params;
  const [{ group, members, userId }, items] = await Promise.all([
    getGroupContext(id),
    getGroupItems(id),
  ]);

  // Recently chosen winners (for the avoid-repeats exclusion).
  const settings = (group.settings ?? {}) as GroupSettings;
  const windowDays = settings.recent_window_days ?? 7;
  const since = sinceIso(windowDays);

  const supabase = await createClient();
  const { data: recent } = await supabase
    .from("decisions")
    .select("winner:items!decisions_winner_item_id_fkey(type, normalized_title, external_id, external_source)")
    .eq("group_id", id)
    .eq("status", "complete")
    .gte("completed_at", since);

  const recentKeys = [
    ...new Set(
      (recent ?? [])
        .map((d) => d.winner as unknown as Item | null)
        .filter((w): w is Item => Boolean(w))
        .map((w) => canonicalKey(w))
    ),
  ];

  return (
    <DecideFlow
      groupId={id}
      userId={userId}
      settings={settings}
      members={members.map((m) => ({
        userId: m.user_id,
        name: m.profile?.display_name ?? "Someone",
        avatarUrl: m.profile?.avatar_url ?? null,
      }))}
      items={items}
      recentKeys={recentKeys}
    />
  );
}
