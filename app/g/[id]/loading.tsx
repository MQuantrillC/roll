import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while a group page's data loads — keeps navigation
// between the group tabs feeling immediate.
export default function GroupLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <Skeleton className="h-24 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-16 rounded-3xl" />
      <Skeleton className="h-16 rounded-3xl" />
      <Skeleton className="h-16 rounded-3xl" />
    </div>
  );
}
