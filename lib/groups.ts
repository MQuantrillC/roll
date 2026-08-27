import "server-only";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Group, GroupMember, Item, Profile } from "@/lib/types";

export interface GroupContext {
  userId: string;
  group: Group;
  members: (GroupMember & { profile: Profile })[];
  isAdmin: boolean;
}

/**
 * Load a group the current user belongs to (RLS enforces membership —
 * a non-member simply gets no row back and lands on 404).
 */
export async function getGroupContext(groupId: string): Promise<GroupContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("*, profile:profiles(*)")
      .eq("group_id", groupId)
      .order("joined_at"),
  ]);

  if (!group) notFound();

  return {
    userId: user.id,
    group: group as Group,
    members: (members ?? []) as GroupContext["members"],
    isAdmin: group.created_by === user.id,
  };
}

/** All items in a group (RLS scoped). */
export async function getGroupItems(groupId: string): Promise<Item[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Item[];
}
