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

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="今日知行均分" value={todayScore != null ? todayScore.toFixed(1) : "—"} suffix="/ 5.0" dot="bg-[#1D1D1F] dark:bg-zinc-100" />
        <Kpi label="连续封存" value={String(streak)} suffix="天" dot={streak > 0 ? "bg-[#059669]" : "bg-[#86868B]"} />
        <Kpi
          label="活跃复利点"
          value={`${quota.count}/${quota.globalLimit}`}
          dot={quota.count >= quota.globalLimit ? "bg-[#D97706]" : "bg-[#86868B]"}
        />
        <Kpi label="30 日一致率" value={consistency != null ? `${Math.round(consistency * 100)}%` : "—"} dot="bg-[#007AFF]" />
      </div>

      <section className="material-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">30 天 · 知行双曲线</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">实线贴合虚线，知行才合一。</p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
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
                <stop offset="0%" stopColor="var(--color-system)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--color-system)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
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
            <ChartTooltip content={<ChartTooltipContent className="border border-black/[0.06] bg-popover/95 shadow-none" indicator="line" />} />
            <Area
              type="monotone"
              dataKey="system"
              name="system"
              stroke="var(--color-system)"
              strokeWidth={2}
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

      <section className="material-card rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{heatRange} 天复利热力图</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">过去 {heatDates.length} 个日历日 · 悬停查看记录，点击进入当日。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-black/[0.06] bg-black/[0.025] p-0.5 dark:border-white/[0.08] dark:bg-white/[0.04]" aria-label="热力图日期范围">
              {HEATMAP_RANGES.map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={heatRange === days}
                  onClick={() => setHeatRange(days)}
                  className={`rounded-md px-2 py-1 text-[10px] tabular-nums transition-colors ${heatRange === days ? "bg-white text-foreground shadow-sm dark:bg-zinc-800" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {days}天
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1" aria-hidden>
              {HEAT_SCALE.map((color) => (
                <span key={color} className="size-2.5 rounded-[3px] border border-black/[0.08] dark:border-white/[0.1]" style={{ background: color }} />
              ))}
            </div>
          </div>
        </div>
        <div
          className="grid w-fit"
          style={{
            gridTemplateColumns: `repeat(${columns}, 11px)`,
            gridTemplateRows: "repeat(7, 11px)",
            gridAutoFlow: "column",
            gap: "3px",
          }}
        >
          {cells.map((date, index) => {
            if (!date) return <span key={`pad-${index}`} className="size-[11px]" />;
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
                    className="size-[11px] rounded-[3px] outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-[#007AFF]/50"
                    style={{ background: color }}
                  />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs border border-black/[0.06] bg-popover/95 text-popover-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] dark:border-white/10">
                  <div className="font-mono text-[11px] tabular-nums">{date}</div>
                  <div className="mt-1 font-mono text-[11px] tabular-nums">系统分 {sys != null ? sys.toFixed(1) : "—"}</div>
                  <div className="font-mono text-[11px] tabular-nums">主观分 {row?.subjective ?? "—"}</div>
                  <div className="mt-1 max-w-[220px] text-[11px] leading-relaxed">{summary}</div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, suffix, dot }: { label: string; value: string; suffix?: string; dot?: string }) {
  return (
    <TextureCard className="min-w-0">
      <TextureCardHeader className="px-5 pb-0 pt-4 first:pt-4">
        <TextureCardDescription className="flex items-center gap-2 pl-0 text-[11px] font-medium tracking-wide text-[var(--ink-tertiary)]">
          {dot && <span className={cn("size-1.5 rounded-full", dot)} />}
          {label}
        </TextureCardDescription>
      </TextureCardHeader>
      <TextureCardContent className="px-5 pb-4 pt-2">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[26px] font-medium leading-none tracking-tight text-foreground tabular-nums">{value}</span>
          {suffix && <span className="font-mono text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </TextureCardContent>
    </TextureCard>
  );
}
