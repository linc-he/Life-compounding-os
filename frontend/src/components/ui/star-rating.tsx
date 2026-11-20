import { cn } from "@/lib/utils";

/**
 * 五星评分：4–5 温润翡翠绿，1–3 低饱和暖灰，未评描边极淡。
 */
export function StarRating({
  value,
  onChange,
  size = 14,
  interactive = true,
}: {
  value: number | null;
  onChange?: (score: number | null) => void;
  size?: number;
  interactive?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="五星评分">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value != null && value >= n;
        const high = filled && (value ?? 0) >= 4;
        const mid = filled && !high;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} 星`}
            aria-pressed={value === n}
            disabled={!interactive}
            onClick={(e) => {
              e.stopPropagation();
              if (!onChange) return;
              onChange(value === n ? null : n);
            }}
            className={cn(
              "p-0 leading-none",
              interactive && "cursor-pointer",
              !interactive && "cursor-default"
            )}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
              className={cn(
                high && "fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400",
                mid && "fill-zinc-400 text-zinc-500",
                !filled && "fill-none text-zinc-300 dark:text-zinc-600"
              )}
            >
              <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
