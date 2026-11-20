import { useMemo } from "react";
import type { AppState } from "@/types";
import { weightedScore, consistencyRate, sealedStreak, activeQuota, lastNDates } from "@/lib/store";
import { TextureCard } from "@/components/cult/texture-card";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

/** 复利全景视图：4 KPI + 30 天双曲线 */
export function PanoramaView({ state }: { state: AppState }) {
  const quota = activeQuota(state);
  const streak = sealedStreak(state);
  const consistency = consistencyRate(state);
  const todayStrDate = lastNDates(1)[0];
  const todayCheck = state.checkIns[todayStrDate];
  const todayScore = todayCheck ? weightedScore(todayCheck.itemScores, state.items) : null;

  const chartData = useMemo(() => {
    return lastNDates(30).map((date) => {
      const c = state.checkIns[date];
      const sys = c ? weightedScore(c.itemScores, state.items) : null;
      return {
        date: date.slice(5),
        系统加权分: sys != null ? Number(sys.toFixed(2)) : null,
        主观自评: c?.subjective ?? null,
      };
    });
  }, [state]);

  return (
    <div className="space-y-6">
      {/* 4 张 KPI 卡 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TextureCard label="今日知行均分">
          <KpiNumber
            value={todayScore != null ? todayScore.toFixed(1) : "—"}
            suffix="/ 5.0"
          />
        </TextureCard>
        <TextureCard label="连续封存天数">
          <KpiNumber value={String(streak)} suffix="天" />
        </TextureCard>
        <TextureCard label="活跃复利点">
          <KpiNumber value={`${quota.count} / ${quota.globalLimit}`} />
        </TextureCard>
        <TextureCard label="30 日知行一致率">
          <KpiNumber
            value={consistency != null ? `${Math.round(consistency * 100)}%` : "—"}
            accent={consistency != null && consistency >= 0.7}
          />
        </TextureCard>
      </div>

      {/* 30 天双曲线：系统加权分（黑实线） vs 主观自评（绿虚线） */}
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-zinc-400" aria-hidden />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              30 天 · 知行双曲线
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 bg-zinc-950" />系统加权分
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-[2px] w-4 border-b border-dashed border-emerald-600" />主观自评
            </span>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              {/* 仅极淡横向虚线网格 */}
              <CartesianGrid vertical={false} stroke="#f4f4f5" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7" }}
                interval={4}
              />
              <YAxis
                domain={[1, 5]}
                tickCount={5}
                tick={{ fontSize: 10, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid rgba(228,228,231,0.8)",
                  fontSize: 11,
                  boxShadow: "0 4px 12px -4px rgba(0,0,0,0.08)",
                }}
                labelStyle={{ color: "#71717a", fontSize: 10 }}
              />
              <Line
                type="monotone"
                dataKey="系统加权分"
                stroke="#09090b"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: "#09090b" }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="主观自评"
                stroke="#059669"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 3, fill: "#059669" }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[10px] text-zinc-400">
          两线越贴合，知行越合一。虚线高于实线，说明自我评价偏乐观，值得自省。
        </p>
      </div>
    </div>
  );
}

function KpiNumber({
  value, suffix, accent,
}: {
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span
        className={`text-2xl font-semibold tnum ${accent ? "text-emerald-600" : "text-zinc-950"}`}
      >
        {value}
      </span>
      {suffix && <span className="text-xs text-zinc-400 tnum">{suffix}</span>}
    </div>
  );
}
