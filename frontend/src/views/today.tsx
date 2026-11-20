import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { AppState, Category, CompoundingItem, ScoreEntry } from "@/types";
import { SUMMARY_LIMIT } from "@/types";
import { cn } from "@/lib/utils";
import { colorStyle } from "@/lib/palette";
import {
  cnWeekday,
  last7Scores,
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
  onAdd,
  onLoadSample,
}: {
  state: AppState;
  setState: (next: AppState) => void;
  date: string;
  onDateChange: (date: string) => void;
  focus: ReflectionFocus | null;
  categoryId: string | null;
  onAdd: () => void;
  /** 仅在没有任何用户数据时提供，载入内置 8 条复利点与 90 天模拟记录 */
  onLoadSample?: () => void;
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

  const hasAnyActive = active.length > 0;

  return (
    <div id="today-reflection" className="mx-auto w-full min-w-0 max-w-[1080px] space-y-8 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-xl border border-black/[0.06] bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/[0.08] dark:bg-zinc-900/60 dark:shadow-none">
          <button
            type="button"
            onClick={() => onDateChange(shiftDate(date, -1))}
            className="rounded-lg p-1.5 text-[var(--ink-secondary)] transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
            aria-label="前一天"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <div className="min-w-32 px-2 text-center">
            <div className="font-mono text-[13px] font-medium tabular-nums tracking-tight text-foreground">{date}</div>
            <div className="text-[10.5px] text-[var(--ink-tertiary)]">
              {cnWeekday(date)}{isToday ? " · 今天" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDateChange(shiftDate(date, 1))}
            disabled={isToday || isFuture}
            className="rounded-lg p-1.5 text-[var(--ink-secondary)] transition-colors hover:bg-black/[0.04] hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/[0.06]"
            aria-label="后一天"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(todayStr())}
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
            >
              回到今天
            </button>
          )}
          {/* 今天的封存状态由顶栏 HaloBadge 展示，这里只标注历史日期 */}
          {!isToday && checkIn?.sealed && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              已封存
            </span>
          )}
        </div>
      </div>

      {!hasAnyActive && onLoadSample ? (
        <EmptyWelcome onAdd={onAdd} onLoadSample={onLoadSample} />
      ) : byCategory.length === 0 ? (
        <div className="material-card rounded-2xl px-5 py-10 text-center">
          <p className="text-[13px] text-[var(--ink-secondary)]">这里还没有可对照的活跃复利点。</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 text-[12px] font-medium text-[#007AFF] hover:underline"
          >
            新增一条
          </button>
        </div>
      ) : null}

      {byCategory.map(({ category, items }, index) => {
        const tone = colorStyle(category.colorToken, category.name, index);
        const ratio = Math.min(100, (items.length / Math.max(1, category.softCap)) * 100);
        return (
          <section key={category.id} className="space-y-3">
            <div className="flex items-end justify-between gap-4 px-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ColorDot token={category.colorToken} name={category.name} index={index} />
                  <h3 className="truncate text-[13px] font-semibold tracking-tight text-foreground">{category.name}</h3>
                </div>
                {category.description && (
                  <p className="mt-0.5 truncate pl-3.5 text-[11.5px] text-[var(--ink-tertiary)]">{category.description}</p>
                )}
              </div>
              <div className="mb-0.5 flex shrink-0 items-center gap-2.5">
                <div className="hidden h-[3px] w-14 overflow-hidden rounded-full bg-black/[0.06] sm:block dark:bg-white/10">
                  <div className={cn("h-full rounded-full opacity-80", tone.bar)} style={{ width: `${ratio}%` }} />
                </div>
                <span className="font-mono text-[11px] tabular-nums text-[var(--ink-tertiary)]">
                  {items.length}/{category.softCap}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <CheckRow
                  key={item.id}
                  item={item}
                  category={category}
                  categoryIndex={index}
                  showCategory={false}
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
            showCategory
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

      {(hasAnyActive || checkIn) && (
      <ClosingCard
        sysScore={sysScore}
        subjective={checkIn?.subjective ?? null}
        summary={checkIn?.summary ?? ""}
        sealed={checkIn?.sealed ?? false}
        onSubjective={(n) => setState(upsertCheckIn(state, date, (c) => ({ ...c, subjective: n })))}
        onSummary={(text) => setState(upsertCheckIn(state, date, (c) => ({ ...c, summary: text.slice(0, SUMMARY_LIMIT) })))}
        onSeal={() => setState(upsertCheckIn(state, date, (c) => ({ ...c, sealed: true })))}
      />
      )}
    </div>
  );
}

function EmptyWelcome({ onAdd, onLoadSample }: { onAdd: () => void; onLoadSample: () => void }) {
  return (
    <TextureCard className="px-6 py-12 text-center sm:px-10">
      <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#1D1D1F] text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:bg-zinc-100 dark:text-zinc-950">
        知
      </div>
      <h2 className="mt-5 text-[17px] font-semibold tracking-tight text-foreground">从一条复利点开始</h2>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-[var(--ink-secondary)]">
        写下一条「知」与对应的「行」，每天用五星对照一次。也可以先载入示例数据，看看 90 天后的样子。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onAdd}
          className="h-8 rounded-lg bg-[#1D1D1F] px-4 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.12)] transition-colors hover:bg-[#2C2C2E] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
        >
          新增第一条复利点
        </button>
        <button
          type="button"
          onClick={onLoadSample}
          className="h-8 rounded-lg border border-black/[0.08] bg-white/80 px-4 text-[12px] font-medium text-[var(--ink-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
        >
          载入示例数据
        </button>
      </div>
    </TextureCard>
  );
}

function CheckRow({
  item,
  category,
  categoryIndex,
  showCategory,
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
  /** 分组视图里组头已说明分类，行内不再重复彩色徽章 */
  showCategory: boolean;
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
        "material-card material-card-interactive rounded-xl",
        isNA && "opacity-70",
        lowScore && "border-amber-500/25 dark:border-amber-500/25",
        highlighted && "ring-2 ring-[#007AFF]/30"
      )}
    >
      <ExpandableTrigger
        aria-expanded={expanded}
        aria-label={`${item.title}，展开知与行`}
        className="rounded-xl px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/30 sm:px-4"
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <ChevronRight
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-[var(--ink-tertiary)] transition-transform duration-200",
                expanded && "rotate-90"
              )}
            />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                {showCategory && <ColorDot token={category.colorToken} name={category.name} index={categoryIndex} />}
                <span className="truncate text-[13.5px] font-medium tracking-tight text-foreground">{item.title}</span>
                <span
                  className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-tertiary)]"
                  title={`权重 ${item.weight}`}
                >
                  ×{item.weight}
                </span>
              </div>
              {showCategory && (
                <span className={cn("mt-1 inline-block max-w-[10rem] truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium", tone.badge)}>
                  {category.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 pl-6 sm:pl-0" onClick={(e) => e.stopPropagation()}>
            {lowScore && (
              <PopoverForm
                title="记偏差"
                layoutId={`偏差-${item.id}`}
                open={noteOpen}
                setOpen={setNoteOpen}
                showSuccess={noted}
                width="260px"
                height="168px"
                triggerClassName="h-6 border-amber-500/25 bg-amber-500/[0.07] text-amber-900 dark:text-amber-100"
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
                      className="mac-field min-h-0 flex-1 resize-none px-2 py-1.5 text-xs"
                    />
                    <div className="mt-2 flex justify-end">
                      <PopoverFormButton loading={false} text="记下" />
                    </div>
                  </form>
                }
                successChild={<PopoverFormSuccess title="已记下" description="偏差已写入今日记录" />}
              />
            )}
            <StarRating value={score} onChange={onScore} size={15} />
            <button
              type="button"
              onClick={onNA}
              aria-pressed={isNA}
              className={cn(
                "h-6 rounded-md border px-1.5 font-mono text-[10px] transition-colors",
                isNA
                  ? "border-zinc-400/60 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300"
                  : "border-black/[0.08] text-[var(--ink-tertiary)] hover:text-foreground dark:border-white/10"
              )}
              title="今日未触发，不计入加权分母"
            >
              N/A
            </button>
          </div>
        </div>
      </ExpandableTrigger>
      <ExpandableContent preset="fade">
        <div className="mx-3.5 space-y-3.5 border-t border-black/[0.05] pb-4 pt-3.5 sm:mx-4 dark:border-white/[0.06]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-black/[0.025] p-3.5 dark:bg-white/[0.035]">
              <div className="mb-1.5 text-[10.5px] font-medium text-[var(--ink-tertiary)]">知 · 底层原则</div>
              <p className="text-[13px] leading-relaxed text-foreground">{item.knowledge}</p>
            </div>
            <div className="rounded-xl bg-black/[0.025] p-3.5 dark:bg-white/[0.035]">
              <div className="mb-1.5 text-[10.5px] font-medium text-[var(--ink-tertiary)]">行 · 5 星标准</div>
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
            <span className="text-[10.5px] text-[var(--ink-tertiary)]">近 7 日</span>
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
            ? "bg-[var(--heat-0)]"
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
  const delta = sysScore != null && subjective != null ? subjective - sysScore : null;
  const aligned = delta != null && Math.abs(delta) < 0.05;
  const gapValue = delta == null ? "—" : aligned ? "0.0" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`;
  const gapCaption = delta == null ? "待对照" : aligned ? "知行贴合" : delta > 0 ? "主观偏高" : "主观偏低";
  return (
    <TextureCard>
      <TextureCardHeader className="flex items-center justify-between px-5 pb-0 pt-5 first:pt-5 sm:px-6">
        <TextureCardTitle className="pl-0 text-[13px] font-semibold tracking-tight text-foreground">
          每日结账
        </TextureCardTitle>
        <span className="text-[11px] text-[var(--ink-tertiary)]">N/A 不计入分母</span>
      </TextureCardHeader>
      <TextureCardContent className="space-y-5 px-5 pb-5 pt-4 sm:px-6">
        <div className="grid grid-cols-1 divide-y divide-black/[0.06] rounded-xl bg-black/[0.02] sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-white/[0.06] dark:bg-white/[0.03]">
          <Metric label="系统加权知行分">
            <span className="font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums text-foreground">
              {sysScore != null ? sysScore.toFixed(1) : "—"}
            </span>
            <span className="font-mono text-xs tabular-nums text-[var(--ink-tertiary)]">/ 5.0</span>
          </Metric>
          <Metric label="今日主观自评">
            <StarRating value={subjective} onChange={onSubjective} size={17} />
            <span className="ml-1 font-mono text-xs tabular-nums text-[var(--ink-tertiary)]">{subjective ?? "—"}</span>
          </Metric>
          <Metric label="知行落差">
            <span
              className={cn(
                "font-mono text-[28px] font-medium leading-none tracking-tight tabular-nums",
                delta == null ? "text-[var(--ink-tertiary)]" : aligned ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}
            >
              {gapValue}
            </span>
            <span className="text-[11px] text-[var(--ink-tertiary)]">{gapCaption}</span>
          </Metric>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <input
              value={summary}
              maxLength={SUMMARY_LIMIT}
              onChange={(e) => onSummary(e.target.value)}
              placeholder="今日一句封存总结"
              aria-label="今日一句封存总结"
              className="mac-field h-9 pl-3 pr-14 text-[13px]"
            />
            <span
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10.5px] tabular-nums",
                summary.length >= SUMMARY_LIMIT ? "text-amber-700 dark:text-amber-300" : "text-[var(--ink-tertiary)]"
              )}
            >
              {summary.length}/{SUMMARY_LIMIT}
            </span>
          </div>
          <button
            type="button"
            onClick={onSeal}
            disabled={sealed}
            className={cn(
              "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-5 text-[12.5px] font-medium transition-colors",
              sealed
                ? "border border-emerald-600/20 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-200"
                : "bg-[#1D1D1F] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.12)] hover:bg-[#2C2C2E] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            )}
          >
            {sealed && <Check className="size-3.5" />}
            {sealed ? "已封存" : "封存今日"}
          </button>
        </div>
      </TextureCardContent>
    </TextureCard>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3.5">
      <div className="text-[11px] text-[var(--ink-tertiary)]">{label}</div>
      <div className="mt-2 flex h-7 items-baseline gap-1.5">{children}</div>
    </div>
  );
}
