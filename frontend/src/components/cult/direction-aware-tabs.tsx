import { cn } from "@/lib/utils";

/**
 * DirectionAwareTabs —— 顶部三视图切换。
 * 极简下划线式（Linear 风），方向感知的细微位移可后续加。
 */
export function DirectionAwareTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-200/80 bg-white p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-xs font-medium motion-safe-trans",
            value === t.key
              ? "bg-zinc-900 text-zinc-50"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
