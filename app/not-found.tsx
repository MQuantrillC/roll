import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="text-6xl">🫥</div>
      <h1 className="text-2xl font-extrabold">Nothing here</h1>
      <p className="text-muted-foreground">
        This page doesn&apos;t exist, or you&apos;re not a member of this group.
      </p>
      <Link href="/home" className={cn(buttonVariants({ size: "lg" }))}>
        Back to your groups
      </Link>
    </main>
  );
}
