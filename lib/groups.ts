import "server-only";
import { cache } from "react";
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
 *
 * Wrapped in React cache() so the group layout and the page it renders
 * share ONE set of queries per request instead of each hitting Supabase.
 */
export const getGroupContext = cache(async (groupId: string): Promise<GroupContext> => {
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
});

/** All items in a group (RLS scoped, request-deduped). */
export const getGroupItems = cache(async (groupId: string): Promise<Item[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Item[];
});

/** Just owner ids of a group's items — enough for dashboard counts. */
export const getGroupItemOwners = cache(async (groupId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("owner_id").eq("group_id", groupId);
  return (data ?? []).map((r) => r.owner_id as string);
});
