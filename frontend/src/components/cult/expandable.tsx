import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Expandable —— 今日自省列表的单条复利点行。
 * 紧凑态：标题 + 分类标签 + 五星/N-A 控件；
 * 展开态：知（底层原则）/ 行（执行标准）+ 近 7 天微点阵。
 */
export function Expandable({
  compact,
  detail,
  dimmed = false,
}: {
  compact: React.ReactNode;
  detail: React.ReactNode;
  dimmed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-200/80 bg-white motion-safe-trans",
        dimmed && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left"
      >
        {compact}
      </button>
      {open && (
        <div className="border-t border-zinc-200/60 px-4 py-3.5">{detail}</div>
      )}
    </div>
  );
}

/** 近 7 天微点阵（展开态用） */
export function MicroDotGrid({
  scores,
}: {
  scores: Array<{ date: string; score: number | null; sealed: boolean }>;
}) {
  return (
    <div className="flex items-end gap-1">
      {scores.map((s) => {
        // 高分绿、低分深灰、N/A 或未评浅灰
        const bg =
          s.score == null
            ? "bg-zinc-200"
            : s.score >= 4
              ? "bg-emerald-600"
              : "bg-zinc-700";
        const h =
          s.score == null ? 6 : 6 + s.score * 3.2;
        return (
          <div key={s.date} className="flex flex-col items-center gap-1">
            <div className="flex items-end h-[24px]">
              <div
                className={cn("w-[6px] rounded-sm", bg)}
                style={{ height: `${h}px` }}
                title={`${s.date}${s.score != null ? ` · ${s.score} 星` : " · N/A"}`}
              />
            </div>
            <span className="text-[9px] text-zinc-400 tnum">
              {s.date.slice(5).replace("-", "/")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
