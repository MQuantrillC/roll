import { getGroupContext } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryList, type HistoryEntry } from "@/components/history/history-list";
import type { Item } from "@/lib/types";

export const metadata = { title: "History" };

export default async function HistoryPage({ params }: PageProps<"/g/[id]/history">) {
  const { id } = await params;
  const { userId } = await getGroupContext(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("decisions")
    .select(
      "id, mode, type, status, metadata, created_by, completed_at, created_at, winner:items!decisions_winner_item_id_fkey(*)"
    )
    .eq("group_id", id)
    .eq("status", "complete")
    .order("completed_at", { ascending: false })
    .limit(50);

  const entries: HistoryEntry[] = (data ?? []).map((d) => ({
    id: d.id,
    mode: d.mode,
    type: d.type,
    completedAt: d.completed_at ?? d.created_at,
    createdBy: d.created_by,
    detail: (d.metadata as { detail?: string } | null)?.detail ?? null,
    winner: (d.winner as unknown as Item) ?? null,
  }));

  if (entries.length === 0) {
    return (
      <EmptyState
        emoji="📜"
        title="No decisions yet"
        description="Once the group decides something, it shows up here — so you never re-watch last week's pick by accident."
      />
    );
  }

  return <HistoryList entries={entries} userId={userId} />;
}
