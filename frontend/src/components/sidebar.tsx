import { useState } from "react";
import type { AppState } from "@/types";
import { cn } from "@/lib/utils";
import { categoryQuota, activeQuota } from "@/lib/store";

/** 左侧可折叠导航：全部复利点 + 分类配额 + 管理入口 */
export function Sidebar({
  state,
  selectedCategory,
  onSelectCategory,
  onAdd,
  onManage,
}: {
  state: AppState;
  selectedCategory: string | null; // null = 全部
  onSelectCategory: (id: string | null) => void;
  onAdd: () => void;
  onManage: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const quota = activeQuota(state);

  return (
    <aside
      className={cn(
        "motion-safe-trans flex h-full shrink-0 flex-col border-r border-zinc-200/80 bg-white",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-zinc-200/80 px-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-[10px] font-bold text-zinc-50 motion-safe-trans hover:bg-zinc-700"
          aria-label="折叠侧栏"
        >
          知
        </button>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-zinc-950">知行</div>
            <div className="text-[10px] text-zinc-400">人生复利系统</div>
          </div>
        )}
      </div>

      {/* 全部复利点 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs motion-safe-trans",
            selectedCategory == null
              ? "bg-zinc-100 font-medium text-zinc-950"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
          )}
        >
          <span>{collapsed ? "全" : "全部复利点"}</span>
          {!collapsed && (
            <span className="text-[10px] text-zinc-400 tnum">{quota.count}/{quota.globalLimit}</span>
          )}
        </button>

        {!collapsed && <div className="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">分类</div>}

        {state.categories
          .filter((c) => !c.archived)
          .map((c) => {
            const q = categoryQuota(state, c.id);
            return (
              <button
                key={c.id}
                onClick={() => onSelectCategory(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs motion-safe-trans",
                  selectedCategory === c.id
                    ? "bg-zinc-100 font-medium text-zinc-950"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                )}
                title={collapsed ? c.name : undefined}
              >
                <span className="truncate">{collapsed ? c.name.slice(0, 1) : c.name}</span>
                {!collapsed && (
                  <span
                    className={cn(
                      "text-[10px] tnum",
                      q.count >= q.limit ? "text-zinc-500" : "text-zinc-400"
                    )}
                  >
                    {q.count}/{q.limit}
                  </span>
                )}
              </button>
            );
          })}
      </nav>

      {/* 底部操作 */}
      <div className="space-y-1 border-t border-zinc-200/80 px-2 py-3">
        <button
          onClick={onAdd}
          className="flex w-full items-center gap-2 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-50 motion-safe-trans hover:bg-zinc-700"
        >
          <span aria-hidden>+</span>
          {!collapsed && "新增复利点"}
        </button>
        <button
          onClick={onManage}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 motion-safe-trans hover:bg-zinc-50 hover:text-zinc-900"
        >
          <span aria-hidden>≡</span>
          {!collapsed && "管理分类"}
        </button>
      </div>
    </aside>
  );
}
