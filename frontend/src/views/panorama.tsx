import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import type { AppState } from "@/types";
import {
  HEAT_SCALE,
  activeQuota,
  consistencyRate,
  heatColor,
  lastNDates,
  sealedStreak,
  todayStr,
  weightedScore,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  TextureCard,
  TextureCardContent,
  TextureCardDescription,
  TextureCardHeader,
} from "@/components/ui/texture-card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const chartConfig = {
  system: { label: "系统加权分", color: "var(--ink)" },
  subjective: { label: "主观自评", color: "var(--cobalt)" },
} satisfies ChartConfig;

const HEATMAP_RANGES = [7, 30, 60, 90] as const;

export function PanoramaView({
  state,
  onOpenDate,
}: {
  state: AppState;
  onOpenDate: (date: string) => void;
}) {
  const quota = activeQuota(state);
  const streak = sealedStreak(state);
  const consistency = consistencyRate(state);
  const todayCheck = state.checkIns[todayStr()];
  const todayScore = todayCheck ? weightedScore(todayCheck.itemScores, state.items) : null;
  const [heatRange, setHeatRange] = useState<(typeof HEATMAP_RANGES)[number]>(90);

  const chartData = useMemo(() => {
    return lastNDates(30).map((date) => {
      const c = state.checkIns[date];
      const sys = c ? weightedScore(c.itemScores, state.items) : null;
      return {
        date: date.slice(5),
        system: sys != null ? Number(sys.toFixed(2)) : null,
        subjective: c?.subjective ?? null,
      };
    });
  }, [state]);

  const heatDates = useMemo(() => lastNDates(heatRange), [heatRange]);
  const lead = new Date(heatDates[0] + "T12:00:00").getDay();
  const cells: Array<string | null> = [...Array.from({ length: lead }, () => null), ...heatDates];
  const columns = Math.max(1, Math.ceil(cells.length / 7));
  // 周数越少格子越大，让 7 / 30 天视图也填满卡片而不是缩在角落
  const cellSize = columns <= 2 ? 28 : columns <= 5 ? 24 : columns <= 9 ? 20 : 17;
  const cellGap = cellSize >= 22 ? 5 : 4;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1080px] space-y-6 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="今日知行均分" value={todayScore != null ? todayScore.toFixed(1) : "—"} suffix="/ 5.0" dot="bg-[#1D1D1F] dark:bg-zinc-100" />
        <Kpi label="连续封存" value={String(streak)} suffix="天" dot={streak > 0 ? "bg-[#059669]" : "bg-[#86868B]"} />
        <Kpi
          label="活跃复利点"
          value={`${quota.count}/${quota.globalLimit}`}
          dot={quota.count >= quota.globalLimit ? "bg-[#D97706]" : "bg-[#86868B]"}
        />
        <Kpi label="30 日一致率" value={consistency != null ? `${Math.round(consistency * 100)}%` : "—"} dot="bg-[#007AFF]" />
      </div>

      <section className="material-card rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <SectionHeading title="30 天知行双曲线" hint="实线贴合虚线，知行才合一。" />
          <div className="flex items-center gap-4 pt-0.5 text-[11px] text-[var(--ink-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 rounded-full bg-[var(--ink)]" />
              系统加权
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-4 border-b-[1.5px] border-dashed border-[#007AFF]" />
              主观自评
            </span>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="aspect-auto h-52 w-full min-w-0 sm:h-60">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="systemFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-system)" stopOpacity={0.08} />
                <stop offset="100%" stopColor="var(--color-system)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={4}
              tick={{ fontSize: 10, fill: "var(--ink-tertiary)" }}
            />
            <YAxis
              domain={[1, 5]}
              tickCount={5}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "var(--ink-tertiary)" }}
            />
            <ChartTooltip
              cursor={{ stroke: "var(--hairline)", strokeWidth: 1 }}
              content={<ChartTooltipContent className="material-chrome rounded-lg border border-black/[0.06] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] dark:border-white/[0.08]" indicator="line" />}
            />
            <Area
              type="monotone"
              dataKey="system"
              name="system"
              stroke="var(--color-system)"
              strokeWidth={1.75}
              fill="url(#systemFill)"
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-system)", stroke: "none" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="subjective"
              name="subjective"
              stroke="var(--color-subjective)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-subjective)", stroke: "none" }}
              connectNulls
            />
          </ComposedChart>
        </ChartContainer>
      </section>

      <section className="material-card rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            title={`${heatRange} 天复利热力图`}
            hint={`过去 ${heatDates.length} 个日历日 · 悬停查看记录，点击进入当日。`}
          />
          <div
            className="inline-flex items-center gap-0.5 rounded-lg border border-black/[0.05] bg-black/[0.045] p-[2px] dark:border-white/[0.06] dark:bg-white/[0.07]"
            role="group"
            aria-label="热力图日期范围"
          >
            {HEATMAP_RANGES.map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={heatRange === days}
                onClick={() => setHeatRange(days)}
                className={cn(
                  "rounded-md px-2.5 py-0.5 font-mono text-[10.5px] tabular-nums transition-colors",
                  heatRange === days
                    ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-700/90"
                    : "text-[var(--ink-secondary)] hover:text-foreground"
                )}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 overflow-x-auto py-1 [align-items:safe_center]">
        <div
          className="grid w-fit"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${cellSize}px)`,
            gridTemplateRows: `repeat(7, ${cellSize}px)`,
            gridAutoFlow: "column",
            gap: `${cellGap}px`,
          }}
        >
          {cells.map((date, index) => {
            if (!date) return <span key={`pad-${index}`} style={{ width: cellSize, height: cellSize }} />;
            const row = state.checkIns[date];
            const sys = row ? weightedScore(row.itemScores, state.items) : null;
            const color = heatColor(sys, row?.sealed ?? false);
            const summary = row?.summary || "（无总结）";
            return (
              <Tooltip key={date}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${date} 系统分 ${sys != null ? sys.toFixed(1) : "无"} 主观分 ${row?.subjective ?? "无"} ${summary}`}
                    onClick={() => onOpenDate(date)}
                    className="rounded-[4px] outline-none ring-offset-background transition-[box-shadow] hover:ring-1 hover:ring-black/20 focus-visible:ring-2 focus-visible:ring-[#007AFF]/50 dark:hover:ring-white/30"
                    style={{ background: color, width: cellSize, height: cellSize }}
                  />
                </TooltipTrigger>
                <TooltipContent className="material-chrome max-w-xs rounded-lg border border-black/[0.06] px-3 py-2 text-popover-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] dark:border-white/[0.08]">
                  <div className="font-mono text-[11px] font-medium tabular-nums">{date}</div>
                  <div className="mt-1 flex gap-3 font-mono text-[11px] tabular-nums text-[var(--ink-secondary)]">
                    <span>系统 {sys != null ? sys.toFixed(1) : "—"}</span>
                    <span>主观 {row?.subjective ?? "—"}</span>
                  </div>
                  <div className="mt-1 max-w-[220px] text-[11px] leading-relaxed">{summary}</div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--ink-tertiary)]" aria-hidden>
            <span>少</span>
            {HEAT_SCALE.map((color) => (
              <span key={color} className="size-2.5 rounded-[3px]" style={{ background: color }} />
            ))}
            <span>多</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1 text-[11.5px] text-[var(--ink-tertiary)]">{hint}</p>
    </div>
  );
}

function Kpi({ label, value, suffix, dot }: { label: string; value: string; suffix?: string; dot?: string }) {
  return (
    <TextureCard className="min-w-0">
      <TextureCardHeader className="px-5 pb-0 pt-4 first:pt-4">
        <TextureCardDescription className="flex items-center gap-2 pl-0 text-[11.5px] font-medium text-[var(--ink-secondary)]">
          {dot && <span className={cn("size-1.5 rounded-full", dot)} />}
          {label}
        </TextureCardDescription>
      </TextureCardHeader>
      <TextureCardContent className="px-5 pb-5 pt-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[28px] font-medium leading-none tracking-tight text-foreground tabular-nums">{value}</span>
          {suffix && <span className="font-mono text-xs tabular-nums text-[var(--ink-tertiary)]">{suffix}</span>}
        </div>
      </TextureCardContent>
    </TextureCard>
  );
}
