import { getGroupContext } from "@/lib/groups";
import { ImportWizard } from "@/components/list/import-wizard";

export const metadata = { title: "Import a list" };

export default async function ImportPage({ params }: PageProps<"/g/[id]/import">) {
  const { id } = await params;
  const { userId, group } = await getGroupContext(id);

  return <ImportWizard groupId={id} userId={userId} groupCategory={group.category} />;
}
