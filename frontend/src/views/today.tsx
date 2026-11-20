import { useMemo, useState } from "react";
import type { AppState, Category, CompoundingItem, ScoreEntry } from "@/types";
import { cn, cn as _cn } from "@/lib/utils";
import {
  weightedScore, todayStr, shiftDate, cnWeekday, last7Scores, upsertCheckIn,
} from "@/lib/store";
import { StarRating } from "@/components/ui/star-rating";
import { PopoverForm } from "@/components/ui/popover-form";
import { TextureCard } from "@/components/cult/texture-card";
import { Expandable, MicroDotGrid } from "@/components/cult/expandable";

/** 今日自省视图：按分类分组的五星打分 + 每日结账仪式 */
export function TodayView({
  state,
  setState,
}: {
  state: AppState;
  setState: (next: AppState) => void;
}) {
  const [date, setDate] = useState(todayStr());
  const checkIn = state.checkIns[date];

  const active = useMemo(() => state.items.filter((i) => i.status === "active"), [state.items]);
  const byCategory = useMemo(() => {
    return state.categories
      .filter((c) => !c.archived)
      .map((c) => ({
        category: c,
        items: active.filter((i) => i.categoryId === c.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [state.categories, active]);

  function setScore(itemId: string, score: number | null) {
    setState(upsertCheckIn(state, date, (c) => {
      const entry: ScoreEntry = { ...(c.itemScores[itemId] ?? { score: null }), score };
      // 重新评分 >3 星时清除偏差记录
      if (score != null && score > 3) delete entry.deviation;
      return { ...c, itemScores: { ...c.itemScores, [itemId]: entry } };
    }));
  }

  function setNA(itemId: string) {
    setScore(itemId, null);
  }

  function setDeviation(itemId: string, text: string) {
    setState(upsertCheckIn(state, date, (c) => ({
      ...c,
      itemScores: {
        ...c.itemScores,
        [itemId]: { score: c.itemScores[itemId]?.score ?? null, deviation: text || undefined },
      },
    })));
  }

  const sysScore = checkIn ? weightedScore(checkIn.itemScores, state.items) : null;

  function setSubjective(n: number | null) {
    setState(upsertCheckIn(state, date, (c) => ({ ...c, subjective: n })));
  }

  function setSummary(text: string) {
    setState(upsertCheckIn(state, date, (c) => ({ ...c, summary: text.slice(0, 80) })));
  }

  function seal() {
    setState(upsertCheckIn(state, date, (c) => ({ ...c, sealed: true })));
  }

  const isFuture = date > todayStr();

  return (
    <div className="space-y-6">
      {/* 日期切换 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(shiftDate(date, -1))}
            className="rounded-md border border-zinc-200/80 bg-white p-1.5 text-zinc-500 motion-safe-trans hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="前一天"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="min-w-40 text-center">
            <div className="text-sm font-semibold text-zinc-950 tnum">{date}</div>
            <div className="text-[11px] text-zinc-400">{cnWeekday(date)}</div>
          </div>
          <button
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={isFuture}
            className="rounded-md border border-zinc-200/80 bg-white p-1.5 text-zinc-500 motion-safe-trans hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40"
            aria-label="后一天"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        {checkIn?.sealed && (
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
            已封存
          </span>
        )}
      </div>

      {/* 按分类分组的打分列表 */}
      {byCategory.map(({ category, items }) => (
        <section key={category.id} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-semibold text-zinc-600">{category.name}</h3>
            <span className="text-[11px] text-zinc-400 tnum">{items.length} 项</span>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <CheckRow
                key={item.id}
                item={item}
                category={category}
                entry={checkIn?.itemScores[item.id]}
                state={state}
                date={date}
                onScore={(n) => setScore(item.id, n)}
                onNA={() => setNA(item.id)}
                onDeviation={(t) => setDeviation(item.id, t)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 每日结账仪式 */}
      <ClosingCard
        sysScore={sysScore}
        subjective={checkIn?.subjective ?? null}
        summary={checkIn?.summary ?? ""}
        sealed={checkIn?.sealed ?? false}
        onSubjective={setSubjective}
        onSummary={setSummary}
        onSeal={seal}
        hasScores={Object.values(checkIn?.itemScores ?? {}).some((e) => e.score != null)}
      />
    </div>
  );
}

/* ---------- 单条复利点行 ---------- */

function CheckRow({
  item, category, entry, state, date,
  onScore, onNA, onDeviation,
}: {
  item: CompoundingItem;
  category: Category;
  entry?: ScoreEntry;
  state: AppState;
  date: string;
  onScore: (n: number | null) => void;
  onNA: () => void;
  onDeviation: (t: string) => void;
}) {
  const score = entry?.score ?? null;
  const isNA = entry != null && score == null;
  const lowScore = score != null && score <= 3;

  return (
    <Expandable
      dimmed={isNA}
      compact={
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-zinc-950">{item.title}</span>
              <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">
                {category.name}
              </span>
              <span className="shrink-0 text-[10px] text-zinc-400 tnum">w{item.weight}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <StarRating value={score} onChange={onScore} />
            <button
              type="button"
              onClick={onNA}
              className={cn(
                "rounded-md border px-1.5 py-0.5 text-[10px] font-medium motion-safe-trans",
                isNA
                  ? "border-zinc-400 bg-zinc-100 text-zinc-600"
                  : "border-zinc-200/80 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600"
              )}
              title="今日未触发，不计入加权分母"
            >
              N/A
            </button>
            {lowScore && (
              <PopoverForm
                title={`「${item.title}」偏差原因`}
                placeholder="一句即可，如：时间被切碎 / 低估难度"
                initial={entry?.deviation}
                onSubmit={onDeviation}
                trigger={
                  <span className="text-[10px] text-zinc-400 underline underline-offset-2 motion-safe-trans hover:text-zinc-600">
                    记偏差
                  </span>
                }
              />
            )}
          </div>
        </div>
      }
      detail={
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-zinc-50 border border-zinc-200/60 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">知 · 底层原则</div>
              <p className="text-xs leading-relaxed text-zinc-700">{item.knowledge}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 border border-zinc-200/60 p-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">行 · 执行标准</div>
              <p className="text-xs leading-relaxed text-zinc-700">{item.action}</p>
            </div>
          </div>
          {entry?.deviation && (
            <div className="text-[11px] text-zinc-500">
              <span className="text-zinc-400">偏差：</span>
              {entry.deviation}
            </div>
          )}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">近 7 天</span>
            <MicroDotGrid scores={last7Scores(state, item.id)} />
          </div>
        </div>
      }
    />
  );
}

/* ---------- 每日结账仪式卡 ---------- */

function ClosingCard({
  sysScore, subjective, summary, sealed,
  onSubjective, onSummary, onSeal, hasScores,
}: {
  sysScore: number | null;
  subjective: number | null;
  summary: string;
  sealed: boolean;
  onSubjective: (n: number | null) => void;
  onSummary: (t: string) => void;
  onSeal: () => void;
  hasScores: boolean;
}) {
  return (
    <TextureCard label="每日结账" className="border-zinc-300/80">
      <div className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        {/* 左：系统加权分 */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">系统加权知行分</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-zinc-950 tnum">
              {sysScore != null ? sysScore.toFixed(1) : "—"}
            </span>
            <span className="text-xs text-zinc-400 tnum">/ 5.0</span>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-400 tnum">
            {hasScores ? "N/A 项不计入分母" : "尚无有效评分"}
          </div>
        </div>

        {/* 中：主观自评 + 一句话总结 */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">今日自评</span>
            <StarRating value={subjective} onChange={onSubjective} />
          </div>
          <input
            value={summary}
            onChange={(e) => onSummary(e.target.value)}
            placeholder="今日一句封存总结（≤80 字）"
            className="w-full rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-950 outline-none motion-safe-trans placeholder:text-zinc-400 focus:border-zinc-400"
          />
        </div>

        {/* 右：封存按钮 */}
        <div className="md:text-right">
          <button
            onClick={onSeal}
            className={cn(
              "rounded-md px-4 py-2 text-xs font-medium motion-safe-trans",
              sealed
                ? "border border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-zinc-900 text-zinc-50 hover:bg-zinc-700"
            )}
          >
            {sealed ? "重新保存" : "封存今日"}
          </button>
          {sealed && (
            <div className="mt-1.5 text-[10px] text-emerald-600">已写入当日档案</div>
          )}
        </div>
      </div>
    </TextureCard>
  );
}
