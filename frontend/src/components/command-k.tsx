import { useEffect, useMemo, useState } from "react";
import type { AppState } from "@/types";

/**
 * Command (⌘K) —— 全局快速定位复利点或历史总结。
 */
export function CommandK({
  open,
  onClose,
  state,
  onSelectItem,
  onSelectDate,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onSelectItem: (itemId: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = state.items
      .filter((i) => !q || i.title.toLowerCase().includes(q) || i.knowledge.toLowerCase().includes(q))
      .slice(0, 5)
      .map((i) => ({ kind: "item" as const, id: i.id, label: i.title, hint: i.knowledge.slice(0, 30) + "…" }));
    const diaries = Object.values(state.checkIns)
      .filter((c) => c.sealed && c.summary && (!q || c.summary.toLowerCase().includes(q) || c.date.includes(q)))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
      .map((c) => ({ kind: "date" as const, id: c.date, label: c.date, hint: c.summary.slice(0, 34) }));
    return [...items, ...diaries];
  }, [query, state]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-zinc-950/20" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-zinc-200/80 bg-white"
        style={{ animation: "cmd-in 0.18s ease" }}
      >
        <style>{`@keyframes cmd-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && results[0]) {
              results[0].kind === "item" ? onSelectItem(results[0].id) : onSelectDate(results[0].id);
              onClose();
            }
          }}
          placeholder="搜索复利点或历史总结…"
          className="w-full border-b border-zinc-200/80 bg-white px-4 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
        />
        <div className="max-h-64 overflow-y-auto py-1.5">
          {results.map((r) => (
            <button
              key={r.kind + r.id}
              onClick={() => {
                r.kind === "item" ? onSelectItem(r.id) : onSelectDate(r.id);
                onClose();
              }}
              className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left motion-safe-trans hover:bg-zinc-50"
            >
              <span className="truncate text-xs font-medium text-zinc-900">{r.label}</span>
              <span className="truncate text-[10px] text-zinc-400">{r.hint}</span>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-zinc-400">无匹配结果</div>
          )}
        </div>
        <div className="border-t border-zinc-100 px-4 py-1.5 text-[10px] text-zinc-400">
          <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1">Esc</kbd> 关闭 ·
          <kbd className="ml-1 rounded border border-zinc-200 bg-zinc-50 px-1">↵</kbd> 打开第一条
        </div>
      </div>
    </div>
  );
}
