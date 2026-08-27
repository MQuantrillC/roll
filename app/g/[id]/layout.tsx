import Link from "next/link";
import { getGroupContext } from "@/lib/groups";
import { GroupNav } from "@/components/groups/group-nav";
import { ArrowLeft, Settings } from "lucide-react";

export default async function GroupLayout({
  children,
  params,
}: LayoutProps<"/g/[id]">) {
  const { id } = await params;
  const { group } = await getGroupContext(id);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 py-3">
          <Link
            href="/home"
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Back to groups"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold">{group.name}</h1>
          <Link
            href={`/g/${id}/settings`}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Group settings"
          >
            <Settings className="size-5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-28 pt-5">{children}</div>

      <GroupNav groupId={id} />
    </div>
  );
}
