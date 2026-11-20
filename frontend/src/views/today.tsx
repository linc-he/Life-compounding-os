import { useEffect, useMemo, useState } from "react";
import type { AppState, Category, CompoundingItem, ScoreEntry } from "@/types";
import { SUMMARY_LIMIT } from "@/types";
import { cn } from "@/lib/utils";
import { colorStyle } from "@/lib/palette";
import {
  cnWeekday,
  last7Scores,
  scoreGapLabel,
  shiftDate,
  sortedCategories,
  todayStr,
  upsertCheckIn,
  weightedScore,
} from "@/lib/store";
import { ColorDot } from "@/components/color-dot";
import { StarRating } from "@/components/ui/star-rating";
import {
  PopoverForm,
  PopoverFormButton,
  PopoverFormSuccess,
} from "@/components/ui/popover-form";
import {
  TextureCard,
  TextureCardContent,
  TextureCardHeader,
  TextureCardTitle,
} from "@/components/ui/texture-card";
import { Expandable, ExpandableContent, ExpandableTrigger } from "@/components/ui/expandable";

export type ReflectionFocus = { nonce: number; itemId?: string };

export function TodayView({
  state,
  setState,
  date,
  onDateChange,
  focus,
  categoryId,
}: {
  state: AppState;
  setState: (next: AppState) => void;
  date: string;
  onDateChange: (date: string) => void;
  focus: ReflectionFocus | null;
  categoryId: string | null;
}) {
  const checkIn = state.checkIns[date];
  const active = useMemo(() => state.items.filter((i) => i.status === "active"), [state.items]);
  const byCategory = useMemo(() => {
    return sortedCategories(state)
      .filter((c) => !categoryId || c.id === categoryId)
      .map((category) => ({
        category,
        items: active.filter((i) => i.categoryId === category.id),
      }))
      .filter((group) => group.items.length > 0);
  }, [state, active, categoryId]);

  const focusItem = focus?.itemId ? state.items.find((item) => item.id === focus.itemId) : undefined;
  const focusVisible = Boolean(
    focusItem &&
      byCategory.some((group) => group.items.some((item) => item.id === focusItem.id))
  );

  useEffect(() => {
    if (!focus) return;
    const id = focus.itemId ? `item-${focus.itemId}` : "today-reflection";
    const handle = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [focus, date]);

  function setScore(itemId: string, score: number | null) {
    setState(upsertCheckIn(state, date, (c) => {
      const prev = c.itemScores[itemId];
      const entry: ScoreEntry = { score };
      if (score != null && score <= 3 && prev?.deviation) entry.deviation = prev.deviation;
      return { ...c, itemScores: { ...c.itemScores, [itemId]: entry } };
    }));
  }

  function setNA(itemId: string) {
    setState(upsertCheckIn(state, date, (c) => ({
      ...c,
      itemScores: { ...c.itemScores, [itemId]: { score: null } },
    })));
  }

  function setDeviation(itemId: string, text: string) {
    setState(upsertCheckIn(state, date, (c) => ({
      ...c,
      itemScores: {
        ...c.itemScores,
        [itemId]: { score: c.itemScores[itemId]?.score ?? null, ...(text ? { deviation: text } : {}) },
      },
    })));
  }

  const sysScore = checkIn ? weightedScore(checkIn.itemScores, state.items) : null;
  const isFuture = date > todayStr();
  const isToday = date === todayStr();

  return (
    <div id="today-reflection" className="w-full min-w-0 space-y-6 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="material-chrome inline-flex items-center gap-1 rounded-xl border border-black/[0.06] p-1 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => onDateChange(shiftDate(date, -1))}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
            aria-label="前一天"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="min-w-36 px-2 text-center">
            <div className="font-mono text-sm font-medium tracking-tight text-foreground">{date}</div>
            <div className="text-[11px] text-[var(--ink-tertiary)]">
              {cnWeekday(date)}{isToday ? " · 今天" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDateChange(shiftDate(date, 1))}
            disabled={isFuture}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/[0.04] hover:text-foreground disabled:opacity-40 dark:hover:bg-white/[0.06]"
            aria-label="后一天"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
        {checkIn?.sealed && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            已封存
          </span>
        )}
      </div>

      {byCategory.length === 0 && (
        <div className="material-card rounded-2xl px-5 py-8 text-center text-sm text-muted-foreground">
          这一天没有可对照的活跃复利点。
        </div>
      )}

      {byCategory.map(({ category, items }, index) => {
        const tone = colorStyle(category.colorToken, category.name, index);
        const ratio = Math.min(100, (items.length / Math.max(1, category.softCap)) * 100);
        return (
          <section key={category.id} className="space-y-2.5">
            <div className="flex items-end justify-between gap-3 px-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ColorDot token={category.colorToken} name={category.name} index={index} />
                  <h3 className="truncate text-[13px] font-semibold tracking-tight text-foreground">{category.name}</h3>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--ink-tertiary)]">
                    {items.length}/{category.softCap}
                  </span>
                </div>
                {category.description && (
                  <p className="mt-0.5 truncate pl-3.5 text-[11px] text-muted-foreground">{category.description}</p>
                )}
              </div>
              <div className="mb-1 hidden h-1 w-16 overflow-hidden rounded-full bg-black/[0.06] sm:block dark:bg-white/10">
                <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${ratio}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <CheckRow
                  key={item.id}
                  item={item}
                  category={category}
                  categoryIndex={index}
                  entry={checkIn?.itemScores[item.id]}
                  state={state}
                  highlighted={focus?.itemId === item.id}
                  forceNonce={focus?.itemId === item.id ? focus.nonce : 0}
                  onScore={(n) => setScore(item.id, n)}
                  onNA={() => setNA(item.id)}
                  onDeviation={(t) => setDeviation(item.id, t)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {focusItem && !focusVisible && (
        <section className="space-y-2">
          <h3 className="px-1 text-xs font-medium text-muted-foreground">定位到的复利点</h3>
          <CheckRow
            item={focusItem}
            category={state.categories.find((c) => c.id === focusItem.categoryId) ?? {
              id: focusItem.categoryId,
              name: "未归类",
              description: "",
              softCap: 5,
              order: 99,
            }}
            categoryIndex={0}
            entry={checkIn?.itemScores[focusItem.id]}
            state={state}
            highlighted
            forceNonce={focus?.nonce ?? 0}
            onScore={(n) => setScore(focusItem.id, n)}
            onNA={() => setNA(focusItem.id)}
            onDeviation={(t) => setDeviation(focusItem.id, t)}
          />
        </section>
      )}

      <ClosingCard
        sysScore={sysScore}
        subjective={checkIn?.subjective ?? null}
        summary={checkIn?.summary ?? ""}
        sealed={checkIn?.sealed ?? false}
        onSubjective={(n) => setState(upsertCheckIn(state, date, (c) => ({ ...c, subjective: n })))}
        onSummary={(text) => setState(upsertCheckIn(state, date, (c) => ({ ...c, summary: text.slice(0, SUMMARY_LIMIT) })))}
        onSeal={() => setState(upsertCheckIn(state, date, (c) => ({ ...c, sealed: true })))}
      />
    </div>
  );
}

function CheckRow({
  item,
  category,
  categoryIndex,
  entry,
  state,
  highlighted,
  forceNonce,
  onScore,
  onNA,
  onDeviation,
}: {
  item: CompoundingItem;
  category: Category;
  categoryIndex: number;
  entry?: ScoreEntry;
  state: AppState;
  highlighted: boolean;
  forceNonce: number;
  onScore: (n: number | null) => void;
  onNA: () => void;
  onDeviation: (t: string) => void;
}) {
  const score = entry?.score ?? null;
  const isNA = entry != null && score == null;
  const lowScore = score != null && score <= 3;
  const tone = colorStyle(category.colorToken, category.name, categoryIndex);
  const [expanded, setExpanded] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(entry?.deviation ?? "");
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    if (forceNonce) setExpanded(true);
  }, [forceNonce]);

  useEffect(() => {
    setNote(entry?.deviation ?? "");
  }, [entry?.deviation]);

  return (
    <Expandable
      id={`item-${item.id}`}
      expanded={expanded}
      onToggle={() => setExpanded((v) => !v)}
      className={cn(
        "material-card rounded-xl",
        isNA && "bg-black/[0.015] dark:bg-white/[0.02]",
        lowScore && "border-amber-500/25",
        highlighted && "ring-2 ring-[#007AFF]/30"
      )}
    >
      <ExpandableTrigger className="px-3.5 py-3 sm:px-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1 text-left">
            <div className="flex min-w-0 items-center gap-2">
              <ColorDot token={category.colorToken} name={category.name} index={categoryIndex} />
              <span className="truncate text-sm font-medium tracking-tight text-foreground">{item.title}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 pl-3.5">
              <span className={cn("max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium", tone.badge)}>
                {category.name}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[var(--ink-tertiary)]">w{item.weight}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <StarRating value={score} onChange={onScore} size={15} />
            <button
              type="button"
              onClick={onNA}
              aria-pressed={isNA}
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-[10px]",
                isNA
                  ? "border-zinc-400 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300"
                  : "border-black/[0.08] text-muted-foreground hover:text-foreground dark:border-white/10"
              )}
              title="今日未触发，不计入加权分母"
            >
              N/A
            </button>
            {lowScore && (
              <PopoverForm
                title="记偏差"
                layoutId={`偏差-${item.id}`}
                open={noteOpen}
                setOpen={setNoteOpen}
                showSuccess={noted}
                width="260px"
                height="168px"
                triggerClassName="border-amber-500/25 bg-amber-500/[0.07] text-amber-950 dark:text-amber-100"
                openChild={
                  <form
                    className="flex h-full flex-col px-3 pb-3 pt-9"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onDeviation(note.trim());
                      setNoted(true);
                      window.setTimeout(() => {
                        setNoted(false);
                        setNoteOpen(false);
                      }, 700);
                    }}
                  >
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="一句即可：时间被切碎 / 低估难度"
                      className="min-h-0 flex-1 resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                    />
                    <div className="mt-2 flex justify-end">
                      <PopoverFormButton loading={false} text="记下" />
                    </div>
                  </form>
                }
                successChild={<PopoverFormSuccess title="已记下" description="偏差已写入今日记录" />}
              />
            )}
          </div>
        </div>
      </ExpandableTrigger>
      <ExpandableContent preset="fade">
        <div className="space-y-3 border-t border-black/[0.05] px-3.5 py-3 sm:px-4 dark:border-white/[0.06]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-black/[0.05] bg-black/[0.02] p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="mb-1 text-[10px] font-medium tracking-wider text-[var(--ink-tertiary)]">知 · 底层原则</div>
              <p className="text-[13px] leading-relaxed text-foreground">{item.knowledge}</p>
            </div>
            <div className="rounded-xl border border-black/[0.05] bg-black/[0.02] p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="mb-1 text-[10px] font-medium tracking-wider text-[var(--ink-tertiary)]">行 · 执行标准</div>
              <p className="text-[13px] leading-relaxed text-foreground">{item.action}</p>
            </div>
          </div>
          {entry?.deviation && (
            <div className="warn-glass rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed">
              <span className="font-medium">偏差 · </span>
              {entry.deviation}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] tracking-wider text-[var(--ink-tertiary)]">近 7 日</span>
            <MicroDots scores={last7Scores(state, item.id)} />
          </div>
        </div>
      </ExpandableContent>
    </Expandable>
  );
}

function MicroDots({
  scores,
}: {
  scores: Array<{ date: string; score: number | null }>;
}) {
  return (
    <div className="flex items-end gap-1.5">
      {scores.map((s) => {
        const bg =
          s.score == null
            ? "bg-[#E8E8ED] dark:bg-zinc-700"
            : s.score >= 4
              ? "bg-[#059669]"
              : "bg-zinc-400";
        const h = s.score == null ? 6 : 6 + s.score * 3;
        return (
          <div key={s.date} className="flex flex-col items-center gap-1" title={`${s.date} ${s.score ?? "N/A"}`}>
            <div className="flex h-6 items-end">
              <div className={cn("w-1.5 rounded-[3px]", bg)} style={{ height: h }} />
            </div>
            <span className="font-mono text-[9px] tabular-nums text-[var(--ink-tertiary)]">{s.date.slice(8)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ClosingCard({
  sysScore,
  subjective,
  summary,
  sealed,
  onSubjective,
  onSummary,
  onSeal,
}: {
  sysScore: number | null;
  subjective: number | null;
  summary: string;
  sealed: boolean;
  onSubjective: (n: number | null) => void;
  onSummary: (t: string) => void;
  onSeal: () => void;
}) {
  const gap = scoreGapLabel(sysScore, subjective);
  return (
    <TextureCard>
      <TextureCardHeader className="px-5 pb-0 pt-5 first:pt-5 sm:px-6">
        <TextureCardTitle className="pl-0 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          每日结账
        </TextureCardTitle>
      </TextureCardHeader>
      <TextureCardContent className="px-5 pb-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="text-[10px] tracking-wider text-[var(--ink-tertiary)]">系统加权知行分</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-[28px] font-medium leading-none tracking-tight text-foreground tabular-nums">
                {sysScore != null ? sysScore.toFixed(1) : "—"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">/ 5.0</span>
            </div>
            <div className="mt-1 text-[10px] text-[var(--ink-tertiary)]">N/A 不计入分母</div>
          </div>
          <div className="min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] tracking-wider text-[var(--ink-tertiary)]">今日主观自评</span>
              <StarRating value={subjective} onChange={onSubjective} />
              <span className="font-mono text-xs tabular-nums text-foreground">{subjective ?? "—"}</span>
            </div>
            <div
              className={cn(
                "inline-flex rounded-md border px-2 py-1 font-mono text-[11px] tabular-nums",
                gap === "待对照"
                  ? "border-black/[0.06] text-muted-foreground dark:border-white/10"
                  : "border-black/[0.06] bg-black/[0.03] text-foreground dark:border-white/10 dark:bg-white/[0.04]"
              )}
            >
              落差 {gap}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={summary}
                maxLength={SUMMARY_LIMIT}
                onChange={(e) => onSummary(e.target.value)}
                placeholder="今日一句封存总结"
                className="w-full min-w-0 rounded-lg border border-black/[0.08] bg-white/80 px-2.5 py-2 text-[13px] text-foreground outline-none placeholder:text-[var(--ink-tertiary)] focus-visible:ring-1 focus-visible:ring-ring dark:border-white/10 dark:bg-zinc-950/40"
              />
              <span className={cn("shrink-0 font-mono text-[11px] tabular-nums", summary.length >= SUMMARY_LIMIT ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground")}>
                {summary.length}/{SUMMARY_LIMIT}
              </span>
            </div>
          </div>
          <div className="lg:text-right">
            <button
              type="button"
              onClick={onSeal}
              className="rounded-lg bg-[#1D1D1F] px-4 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#2C2C2E] dark:bg-zinc-100 dark:text-zinc-950"
            >
              {sealed ? "已封存" : "封存今日"}
            </button>
          </div>
        </div>
      </TextureCardContent>
    </TextureCard>
  );
}
