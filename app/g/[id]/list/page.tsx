import { getGroupContext } from "@/lib/groups";
import { createClient } from "@/lib/supabase/server";
import { MyList } from "@/components/list/my-list";
import type { Item } from "@/lib/types";

export const metadata = { title: "My list" };

export default async function ListPage({ params }: PageProps<"/g/[id]/list">) {
  const { id } = await params;
  const { userId, group } = await getGroupContext(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("group_id", id)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  return (
    <MyList
      groupId={id}
      userId={userId}
      groupCategory={group.category}
      initialItems={(data ?? []) as Item[]}
    />
  );
}
