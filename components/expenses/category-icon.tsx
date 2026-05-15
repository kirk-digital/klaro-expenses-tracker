import { getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const Icon = getCategoryIcon(name ?? "");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 p-1",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 text-slate-600" />
    </span>
  );
}
