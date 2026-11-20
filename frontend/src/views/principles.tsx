import type { AppState, CompoundingItem } from "@/types";
import { cn } from "@/lib/utils";
import { weightedScore, lastNDates } from "@/lib/store";

/** 原则库与日志视图：历史封存日记表 + 原则变更日志 */
export function PrinciplesView({ state }: { state: AppState }) {
  // 历史封存日记表（倒序）
  const diaries = lastNDates(60)
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
    .filter((x): x is NonNullable<typeof x> => x != null)
    .reverse();

  const typeLabel: Record<string, { label: string; cls: string }> = {
    created: { label: "新增", cls: "bg-zinc-100 text-zinc-600" },
    graduated: { label: "毕业", cls: "bg-emerald-50 text-emerald-700" },
    retired: { label: "中止", cls: "bg-zinc-200 text-zinc-500" },
    category: { label: "分类", cls: "bg-zinc-100 text-zinc-600" },
  };

  return (
    <div className="space-y-6">
      {/* 历史封存日记 */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          历史封存日记
        </h3>
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/60">
                <Th>日期</Th>
                <Th>系统分</Th>
                <Th>主观分</Th>
                <Th>一句话总结</Th>
              </tr>
            </thead>
            <tbody>
              {diaries.map((d) => (
                <tr key={d.date} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2.5 text-xs text-zinc-600 tnum whitespace-nowrap">{d.date}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-900 tnum">{d.sys}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-900 tnum">{d.subjective}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500">{d.summary}</td>
                </tr>
              ))}
              {diaries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-zinc-400">
                    还没有封存的日记
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 原则变更日志 */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          原则增删变更日志
        </h3>
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/60">
                <Th>类型</Th>
                <Th>标题</Th>
                <Th>移出复盘</Th>
                <Th>日期</Th>
              </tr>
            </thead>
            <tbody>
              {state.changeLogs.map((log) => {
                const t = typeLabel[log.type] ?? typeLabel.created;
                return (
                  <tr key={log.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", t.cls)}>
                        {t.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-zinc-900">{log.title}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{log.note}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400 tnum whitespace-nowrap">{log.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 全部复利点一览（含毕业/中止档案） */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          全部复利点档案
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {state.items.map((item) => (
            <ItemArchiveCard key={item.id} item={item} state={state} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ItemArchiveCard({ item, state }: { item: CompoundingItem; state: AppState }) {
  const cat = state.categories.find((c) => c.id === item.categoryId);
  const statusLabel =
    item.status === "active" ? "活跃"
    : item.status === "graduated" ? "已内化毕业"
    : "原则修正中止";
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        item.status === "graduated"
          ? "border-emerald-600/30 bg-emerald-50/40"
          : "border-zinc-200/80 bg-white"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-950">{item.title}</span>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-medium tnum",
            item.status === "graduated"
              ? "bg-emerald-100 text-emerald-700"
              : item.status === "retired"
                ? "bg-zinc-200 text-zinc-500"
                : "bg-zinc-100 text-zinc-600"
          )}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mb-2 text-[10px] text-zinc-400">
        {cat?.name} · 权重 {item.weight}
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-2">{item.knowledge}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
      {children}
    </th>
  );
}
