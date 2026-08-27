import { cn } from "@/lib/utils";

export function EmptyState({
  emoji,
  title,
  description,
  children,
  className,
}: {
  emoji: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border px-6 py-12 text-center",
        className
      )}
    >
      <div className="text-5xl">{emoji}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}
