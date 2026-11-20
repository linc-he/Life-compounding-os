import { useEffect, useMemo, useRef, useState } from "react";
import { Moon, Search, Sun } from "lucide-react";
import type { AppState, CompoundingItem } from "@/types";
import { API } from "@/lib/api";
import { createEmptyState, hasUserContent, loadState, migrateState, saveState, todayStr } from "@/lib/store";
import { Sidebar } from "@/components/sidebar";
import { DirectionAwareTabs } from "@/components/ui/direction-aware-tabs";
import { HaloBadge } from "@/components/ui/halo-badge";
import { CommandK } from "@/components/command-k";
import { AddItemDrawer, RemoveItemDrawer } from "@/components/item-drawers";
import { CategoryDrawer } from "@/components/category-drawer";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TodayView, type ReflectionFocus } from "@/views/today";
import { PanoramaView } from "@/views/panorama";
import { PrinciplesView } from "@/views/principles";

const SECTIONS = ["今日自省", "复利全景", "原则库与日志"] as const;

export function App() {
  const [state, setStateRaw] = useState<AppState>(() => createEmptyState());
  const [persistenceStatus, setPersistenceStatus] = useState<"loading" | "sqlite" | "local">("loading");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const stateRef = useRef(state);
  stateRef.current = state;
  const [tab, setTab] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [date, setDate] = useState(todayStr());
  const [focus, setFocus] = useState<ReflectionFocus | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [removeItem, setRemoveItem] = useState<CompoundingItem | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const setState = (next: AppState) => {
    stateRef.current = next;
    setStateRaw(next);
    saveState(next);
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await API.saveAppState(next);
        setPersistenceStatus("sqlite");
      } catch {
        setPersistenceStatus("local");
      }
    });
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const localState = loadState();
      try {
        const response = await API.getAppState();
        const remoteState = response.state == null ? null : migrateState(response.state);
        if (response.state != null && remoteState == null) throw new Error("SQLite 中的状态格式无法识别");
        const preserveLocal = localState != null && hasUserContent(localState) && remoteState != null && !hasUserContent(remoteState);
        const next = preserveLocal ? localState : remoteState ?? localState ?? createEmptyState();
        if (remoteState == null || JSON.stringify(response.state) !== JSON.stringify(next)) {
          await API.saveAppState(next);
        }
        saveState(next);
        if (!cancelled) {
          stateRef.current = next;
          setStateRaw(next);
          setPersistenceStatus("sqlite");
        }
      } catch {
        const next = loadState() ?? createEmptyState();
        saveState(next);
        if (!cancelled) {
          stateRef.current = next;
          setStateRaw(next);
          setPersistenceStatus("local");
        }
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const retrySync = () => {
      const latest = stateRef.current;
      saveQueue.current = saveQueue.current.then(async () => {
        try {
          await API.saveAppState(latest);
          setPersistenceStatus("sqlite");
        } catch {
          setPersistenceStatus("local");
        }
      });
    };
    window.addEventListener("online", retrySync);
    return () => window.removeEventListener("online", retrySync);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("zhixing-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

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

  function openItem(itemId: string) {
    setSelectedCategory(null);
    setTab(0);
    setDate(todayStr());
    setFocus({ nonce: Date.now(), itemId });
  }

  function openDate(next: string) {
    setTab(0);
    setDate(next);
    setFocus({ nonce: Date.now() });
  }

  const tabs = useMemo(
    () => [
      {
        id: 0,
        label: "今日自省",
        content: (
          <TodayView
            state={state}
            setState={setState}
            date={date}
            onDateChange={setDate}
            focus={focus}
            categoryId={selectedCategory}
          />
        ),
      },
      {
        id: 1,
        label: "复利全景",
        content: <PanoramaView state={state} onOpenDate={openDate} />,
      },
      {
        id: 2,
        label: "原则库与日志",
        content: (
          <PrinciplesView
            state={state}
            onRequestRemove={setRemoveItem}
            onOpenDate={openDate}
          />
        ),
      },
    ],
    [state, date, focus, selectedCategory]
  );

  if (persistenceStatus === "loading") {
    return <div className="flex h-svh items-center justify-center text-sm text-muted-foreground">正在连接 SQLite 并读取数据…</div>;
  }

  return (
    <SidebarProvider className="canvas-ambient h-svh overflow-hidden text-foreground">
      <Sidebar
        state={state}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setTab(0);
        }}
        onAdd={() => setAddOpen(true)}
        onManage={() => setCategoryOpen(true)}
      />
      <SidebarInset className="min-h-0 min-w-0 w-full overflow-hidden bg-transparent">
        <header className="material-chrome sticky top-0 z-40 flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-black/[0.06] bg-white/72 px-3 py-2 dark:border-white/[0.08] dark:bg-zinc-900/72 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="truncate text-[11px] tracking-wide text-[var(--ink-tertiary)]">知行 · 人生复利系统</div>
              <div className="truncate text-sm font-semibold tracking-tight text-foreground">{SECTIONS[tab]}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white/70 px-2 py-1.5 text-[11px] text-[var(--ink-secondary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:text-foreground dark:border-white/[0.08] dark:bg-zinc-900/70"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">搜索</span>
              <kbd className="hidden rounded-md border border-black/[0.06] bg-black/[0.03] px-1 font-mono text-[10px] sm:inline dark:border-white/10 dark:bg-white/5">
                ⌘K
              </kbd>
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="flex size-8 items-center justify-center rounded-lg border border-black/[0.06] bg-white/70 text-[var(--ink-secondary)] hover:text-foreground dark:border-white/[0.08] dark:bg-zinc-900/70"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
            <span
              aria-label={persistenceStatus === "sqlite" ? "数据已连接 SQLite" : "SQLite 不可用，数据暂存在本地"}
              title={persistenceStatus === "sqlite" ? "数据已保存到 SQLite" : "后端暂不可用，数据暂存在本地；恢复连接后会同步"}
              className="flex h-7 items-center gap-1.5 rounded-full border border-black/[0.06] px-2 text-[10px] text-[var(--ink-tertiary)] dark:border-white/[0.08]"
            >
              <span className={`size-1.5 rounded-full ${persistenceStatus === "sqlite" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="hidden sm:inline">{persistenceStatus === "sqlite" ? "SQLite" : "仅本地"}</span>
            </span>
            <HaloBadge
              variant="outline"
              live={sealedToday}
              solid={false}
              minimal
              translucent={false}
              interactive={false}
              pressScale={false}
              className={
                sealedToday
                  ? "h-7 gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/[0.08] px-2.5 text-[11px] font-medium text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl dark:text-emerald-200"
                  : "h-7 rounded-full border border-black/[0.06] bg-white/72 px-2.5 text-[11px] font-medium text-[var(--ink-tertiary)] shadow-none backdrop-blur-xl dark:border-white/[0.08] dark:bg-zinc-900/72"
              }
            >
              {sealedToday ? "今日已封存" : "今日未封存"}
            </HaloBadge>
          </div>
        </header>
        <div className="min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
          <DirectionAwareTabs
            tabs={tabs}
            activeId={tab}
            onChange={setTab}
            className="mx-auto mt-4 w-fit max-w-full"
          />
        </div>
      </SidebarInset>

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
      <CategoryDrawer
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        state={state}
        setState={setState}
      />
      <CommandK
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        state={state}
        onSelectItem={openItem}
        onSelectDate={openDate}
      />
    </SidebarProvider>
  );
}
