import { cn } from "@/lib/utils";

/**
 * HaloBadge —— 顶部栏今日封存状态。
 * 未封存：静默灰点；已封存：祖母绿微呼吸点。
 */
export function HaloBadge({ sealed }: { sealed: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-zinc-200/80 bg-white px-2 py-1">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          sealed
            ? "bg-emerald-600 halo-breathe"
            : "bg-zinc-300"
        )}
        aria-hidden
      />
      <span
        className={cn(
          "text-[11px] tnum",
          sealed ? "text-emerald-700" : "text-zinc-500"
        )}
      >
        {sealed ? "今日已封存" : "今日未封存"}
      </span>
    </div>
  );
}
