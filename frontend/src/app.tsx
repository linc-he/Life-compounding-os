import { useEffect, useState } from "react";
import type { AppState, CompoundingItem } from "@/types";
import { cn } from "@/lib/utils";
import { todayStr } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { DirectionAwareTabs } from "@/components/cult/direction-aware-tabs";
import { HaloBadge } from "@/components/ui/halo-badge";
import { CommandK } from "@/components/command-k";
import { AddItemDrawer, RemoveItemDrawer } from "@/components/item-drawers";
import { TodayView } from "@/views/today";
import { PanoramaView } from "@/views/panorama";
import { PrinciplesView } from "@/views/principles";

const TABS = [
  { key: "today", label: "今日自省" },
  { key: "panorama", label: "复利全景" },
  { key: "principles", label: "原则库与日志" },
];

export function App() {
  const [state, setStateRaw] = useState<AppState>(() => ensureState());
  const [tab, setTab] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [removeItem, setRemoveItem] = useState<CompoundingItem | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);

  const setState = (next: AppState) => {
    setStateRaw(next);
    saveState(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sealedToday = state.checkIns[todayStr()]?.sealed === true;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar
        state={state}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          if (tab === "principles") setTab("today");
        }}
        onAdd={() => setAddOpen(true)}
        onManage={() => setTab("principles")}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-6">
          <DirectionAwareTabs tabs={TABS} value={tab} onChange={setTab} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 rounded-md border border-zinc-200/80 bg-white px-2.5 py-1.5 text-[11px] text-zinc-400 motion-safe-trans hover:border-zinc-400"
            >
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1 tnum">⌘K</kbd>
              搜索
            </button>
            <HaloBadge sealed={sealedToday} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-6">
            {tab === "today" && <TodayView state={state} setState={setState} />}
            {tab === "panorama" && <PanoramaView state={state} />}
            {tab === "principles" && (
              <PrinciplesShell state={state} onRequestRemove={setRemoveItem} />
            )}
          </div>
        </div>
      </main>

      <AddItemDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        state={state}
        setState={setState}
        defaultCategoryId={selectedCategory}
      />
      <RemoveItemDrawer
        open={removeItem != null}
        item={removeItem}
        onClose={() => setRemoveItem(null)}
        state={state}
        setState={setState}
      />
      <CommandK
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        state={state}
        onSelectItem={() => setTab("today")}
        onSelectDate={() => setTab("today")}
      />
    </div>
  );
}

function PrinciplesShell({
  state,
  onRequestRemove,
}: {
  state: AppState;
  onRequestRemove: (item: CompoundingItem) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <span className="text-[11px] text-zinc-400">
          移除需两步冷静流：毕业归档或原则修正，无一键删除
        </span>
      </div>
      <div className="space-y-2">
        {state.items
          .filter((i) => i.status === "active")
          .map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200/80 bg-white px-4 py-2.5"
            >
              <span className="text-xs font-medium text-zinc-950">{item.title}</span>
              <button
                onClick={() => onRequestRemove(item)}
                className={cn(
                  "rounded-md border border-zinc-200/80 px-2 py-1 text-[11px] text-zinc-500",
                  "motion-safe-trans hover:border-zinc-400 hover:text-zinc-900"
                )}
              >
                移除…
              </button>
            </div>
          ))}
      </div>
      <PrinciplesView state={state} />
    </div>
  );
}
