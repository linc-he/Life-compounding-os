import { useMemo } from "react";
import type { AppState, ChangeLog, CompoundingItem } from "@/types";
import { cn } from "@/lib/utils";
import { colorStyle } from "@/lib/palette";
import { lastNDates, sortedCategories, weightedScore } from "@/lib/store";
import { ColorDot } from "@/components/color-dot";
import { DataTable, SortHeader, createDataColumns } from "@/components/data-table";

type DiaryRow = {
  date: string;
  sys: string;
  subjective: string;
  summary: string;
};

type LogRow = {
  id: string;
  type: string;
  title: string;
  note: string;
  date: string;
};

const diaryHelper = createDataColumns<DiaryRow>();
const logHelper = createDataColumns<LogRow>();

const TYPE_LABEL: Record<string, string> = {
  created: "新增",
  graduated: "毕业",
  retired: "中止",
  category: "分类",
};

export function PrinciplesView({
  state,
  onRequestRemove,
  onOpenDate,
}: {
  state: AppState;
  onRequestRemove: (item: CompoundingItem) => void;
  onOpenDate: (date: string) => void;
}) {
  const diaries = useMemo<DiaryRow[]>(() => {
    return lastNDates(120)
      .map((date) => {
        const c = state.checkIns[date];
        if (!c || !c.sealed) return null;
        const sys = weightedScore(c.itemScores, state.items);
        return {
          date,
          sys: sys != null ? sys.toFixed(1) : "—",
          subjective: c.subjective != null ? String(c.subjective) : "—",
          summary: c.summary || "（无总结）",
        };
      })
      .filter((row): row is DiaryRow => row != null)
      .reverse();
  }, [state]);

  const logs = useMemo<LogRow[]>(
    () =>
      state.changeLogs.map((log) => ({
        id: log.id,
        type: TYPE_LABEL[log.type] ?? log.type,
        title: log.title,
        note: log.note,
        date: log.date,
      })),
    [state.changeLogs]
  );

  const diaryColumns = useMemo(
    () =>
      diaryHelper.columns([
        diaryHelper.accessor("date", {
          header: ({ column }) => <SortHeader label="日期" column={column} />,
          cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        }),
        diaryHelper.accessor("sys", {
          header: "系统分",
          cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        }),
        diaryHelper.accessor("subjective", {
          header: "主观分",
          cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        }),
        diaryHelper.accessor("summary", {
          header: ({ column }) => <SortHeader label="总结" column={column} />,
          cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
        }),
      ]),
    []
  );

  const logColumns = useMemo(
    () =>
      logHelper.columns([
        logHelper.accessor("type", {
          header: "类型",
          cell: (info) => <LogBadge type={info.row.original.type} raw={state.changeLogs.find((l) => l.id === info.row.original.id)} />,
        }),
        logHelper.accessor("title", {
          header: ({ column }) => <SortHeader label="标题" column={column} />,
          cell: (info) => <span className="font-medium text-foreground">{info.getValue()}</span>,
        }),
        logHelper.accessor("note", {
          header: "记录",
          cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
        }),
        logHelper.accessor("date", {
          header: ({ column }) => <SortHeader label="日期" column={column} />,
          cell: (info) => <span className="font-mono">{info.getValue()}</span>,
        }),
      ]),
    [state.changeLogs]
  );

  const cats = sortedCategories(state, true);
  const activeItems = state.items.filter((item) => item.status === "active");

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1080px] space-y-10 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      <section className="space-y-3">
        <Heading title="活跃复利点" hint="移出需两步：毕业归档或原则修正" />
        <div className="material-card divide-y divide-black/[0.05] overflow-hidden rounded-2xl dark:divide-white/[0.06]">
          {activeItems.length === 0 && (
            <div className="px-4 py-8 text-center text-[12px] text-[var(--ink-tertiary)]">暂无活跃复利点</div>
          )}
          {activeItems.map((item) => {
            const cat = cats.find((c) => c.id === item.categoryId);
            return (
              <div key={item.id} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ColorDot token={cat?.colorToken} name={cat?.name} />
                  <span className="truncate text-[13px] font-medium text-foreground">{item.title}</span>
                  <span className="hidden truncate text-[11px] text-[var(--ink-tertiary)] sm:inline">
                    {cat?.name ?? "未归类"}
                  </span>
                  <span className="hidden font-mono text-[10px] tabular-nums text-[var(--ink-tertiary)] sm:inline">×{item.weight}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRequestRemove(item)}
                  className="shrink-0 rounded-md px-2 py-1 text-[11px] text-[var(--ink-tertiary)] transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                >
                  移出…
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <Heading title="历史封存日记" hint="点击任意一行回到当日" />
        <DataTable
          data={diaries}
          columns={diaryColumns}
          filterColumn="summary"
          filterPlaceholder="筛选封存总结…"
          empty="还没有封存的日记"
          onRowClick={(row) => onOpenDate(row.date)}
        />
      </section>

      <section className="space-y-3">
        <Heading title="原则与分类变更日志" hint="新增、毕业、中止与分类调整都会留痕" />
        <DataTable
          data={logs}
          columns={logColumns}
          filterColumn="note"
          filterPlaceholder="筛选日志…"
          empty="还没有变更"
        />
      </section>

      <section className="space-y-3">
        <Heading title="全部复利点档案" hint="含已毕业与已中止的历史条目" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.items.map((item) => {
            const cat = cats.find((c) => c.id === item.categoryId);
            const tone = colorStyle(cat?.colorToken, cat?.name);
            return (
              <article
                key={item.id}
                id={`archive-${item.id}`}
                className={cn("material-card rounded-2xl p-4", item.status !== "active" && "opacity-80")}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-[13.5px] font-medium tracking-tight text-foreground">{item.title}</span>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] text-[var(--ink-tertiary)]">
                  <span className={cn("rounded-md px-1.5 py-0.5 font-sans text-[10px] font-medium", tone.badge)}>
                    {cat?.name ?? "未归类"}
                  </span>
                  <span className="tabular-nums">×{item.weight}</span>
                </div>
                <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-secondary)]">
                  <span className="text-[var(--ink-tertiary)]">知 · </span>
                  {item.knowledge}
                </p>
                <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--ink-secondary)]">
                  <span className="text-[var(--ink-tertiary)]">行 · </span>
                  {item.action}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
      <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
      {hint && <span className="text-[11.5px] text-[var(--ink-tertiary)]">{hint}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: CompoundingItem["status"] }) {
  const label = status === "active" ? "活跃" : status === "graduated" ? "已内化毕业" : "原则修正中止";
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        status === "graduated" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        status === "retired" && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
        status === "active" && "border border-black/[0.08] text-[var(--ink-secondary)] dark:border-white/10"
      )}
    >
      {label}
    </span>
  );
}

function LogBadge({ type, raw }: { type: string; raw?: ChangeLog }) {
  const graduated = raw?.type === "graduated" || type === "毕业";
  const retired = raw?.type === "retired" || type === "中止";
  const created = raw?.type === "created" || type === "新增";
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        graduated && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        retired && "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
        created && "bg-[#007AFF]/10 text-[#0A4D99] dark:text-[#8ECAFF]",
        !graduated && !retired && !created && "bg-[#6366F1]/10 text-[#4338CA] dark:text-indigo-200"
      )}
    >
      {type}
    </span>
  );
}
