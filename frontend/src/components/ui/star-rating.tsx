import { cn } from "@/lib/utils";

/**
 * 五星评分控件 —— 1–3 星深炭灰，4–5 星祖母绿。
 * 严禁黄色/橙色星星。
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
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => {
        const filled = value != null && value >= n;
        // 4–5 星用 emerald，1–3 星用深炭灰
        const isGreen = n >= 4 && filled;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} 星`}
            disabled={!interactive}
            onClick={(e) => {
              e.stopPropagation();
              if (!onChange) return;
              // 再点当前星级 = 清空
              onChange(value === n ? null : n);
            }}
            className={cn(
              "motion-safe-trans p-0 leading-none",
              interactive && "hover:scale-110 cursor-pointer",
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
                isGreen
                  ? "text-emerald-600 fill-emerald-600"
                  : filled
                    ? "text-zinc-700 fill-zinc-700"
                    : "text-zinc-300"
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
