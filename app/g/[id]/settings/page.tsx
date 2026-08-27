import { getGroupContext } from "@/lib/groups";
import { GroupSettingsForm } from "@/components/groups/group-settings";
import type { GroupSettings } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/g/[id]/settings">) {
  const { id } = await params;
  const { group, members, userId, isAdmin } = await getGroupContext(id);

  return (
    <GroupSettingsForm
      groupId={id}
      userId={userId}
      isAdmin={isAdmin}
      name={group.name}
      code={group.code}
      settings={(group.settings ?? {}) as GroupSettings}
      members={members.map((m) => ({
        memberId: m.id,
        userId: m.user_id,
        name: m.profile?.display_name ?? "Someone",
        avatarUrl: m.profile?.avatar_url ?? null,
      }))}
    />
  );
}
