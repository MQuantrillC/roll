import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 pt-6" aria-busy>
      <Skeleton className="mb-8 h-12 w-48" />
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Skeleton className="h-13" />
        <Skeleton className="h-13" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
      </div>
    </div>
  );
}
