import { createContext, useContext, useEffect, useState } from "react";
import { ArrowRightLeft, Check, ChevronDown, ChevronUp, FolderPlus, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { AppState, Category, ColorToken } from "@/types";
import { COLOR_TOKENS } from "@/types";
import { cn } from "@/lib/utils";
import { COLOR_TOKEN_STYLES, colorStyle, defaultColorToken } from "@/lib/palette";
import { ColorDot } from "@/components/color-dot";
import {
  createCategory,
  deleteCategory,
  itemsInCategory,
  moveCategory,
  sortedCategories,
  updateCategory,
} from "@/lib/store";
import {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerButton,
  FamilyDrawerClose,
  FamilyDrawerContent,
  FamilyDrawerDescription,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerSecondaryButton,
  FamilyDrawerTitle,
  FamilyDrawerViewContent,
  useFamilyDrawer,
  type ViewsRegistry,
} from "@/components/ui/family-drawer";

const inputCls = "mac-field h-8 px-2.5 text-[12.5px]";
const iconBtn =
  "flex size-7 items-center justify-center rounded-md text-[var(--ink-tertiary)] transition-colors hover:bg-black/[0.05] hover:text-foreground disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/[0.08]";

function ColorChoices({
  value,
  onChange,
}: {
  value: ColorToken;
  onChange: (token: ColorToken) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5" data-vaul-no-drag="">
      <span className="w-12 shrink-0 text-[11.5px] text-[var(--ink-secondary)]">微色</span>
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_TOKENS.map((token) => {
          const style = COLOR_TOKEN_STYLES[token];
          const selected = value === token;
          return (
            <button
              key={token}
              type="button"
              aria-label={style.label}
              aria-pressed={selected}
              title={style.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(token)}
              className={cn(
                "size-3.5 rounded-full transition-shadow",
                style.dot,
                selected
                  ? "ring-2 ring-black/30 ring-offset-2 ring-offset-white dark:ring-white/50 dark:ring-offset-zinc-900"
                  : "hover:ring-2 hover:ring-black/10 hover:ring-offset-1 dark:hover:ring-white/20"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

type Draft = { name: string; description: string; softCap: string; colorToken: ColorToken };

type CatCtx = {
  state: AppState;
  setState: (s: AppState) => void;
  pendingId: string | null;
  setPendingId: (id: string | null) => void;
  targetId: string;
  setTargetId: (id: string) => void;
  notice: string;
  setNotice: (v: string) => void;
};

const CatContext = createContext<CatCtx | null>(null);
function useCat() {
  const ctx = useContext(CatContext);
  if (!ctx) throw new Error("Category drawer context missing");
  return ctx;
}

function CategoryHome() {
  const { state, setState, setPendingId, setTargetId, notice, setNotice } = useCat();
  const { setView } = useFamilyDrawer();
  const categories = sortedCategories(state);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [creating, setCreating] = useState<{ name: string; description: string; softCap: string; colorToken: ColorToken }>({
    name: "",
    description: "",
    softCap: "5",
    colorToken: "cobalt",
  });

  function draftOf(category: Category): Draft {
    return drafts[category.id] ?? {
      name: category.name,
      description: category.description,
      softCap: String(category.softCap),
      colorToken: category.colorToken ?? defaultColorToken(category.name),
    };
  }

  function commit(category: Category, override?: Partial<Draft>) {
    const draft = { ...draftOf(category), ...override };
    const softCap = Math.max(1, Math.round(Number(draft.softCap)) || category.softCap);
    setState(updateCategory(state, category.id, {
      name: draft.name,
      description: draft.description,
      softCap,
      colorToken: draft.colorToken,
    }));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[category.id];
      return next;
    });
  }

  function requestDelete(category: Category) {
    const result = deleteCategory(state, category.id);
    if (result.ok) {
      setState(result.state);
      setNotice("");
      return;
    }
    if (result.reason === "last-category") {
      setNotice("至少保留一个分类。");
      return;
    }
    if (result.reason === "needs-migration") {
      const fallback = categories.find((c) => c.id !== category.id);
      setPendingId(category.id);
      setTargetId(fallback?.id ?? "");
      setNotice("");
      setView("migrate");
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-start gap-2.5 pr-8">
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[var(--ink-secondary)] dark:bg-white/[0.06]"
          aria-hidden
        >
          <SlidersHorizontal className="size-3.5" />
        </span>
        <div className="min-w-0 space-y-1">
          <FamilyDrawerTitle className="pr-0 text-base tracking-tight">管理复利分类</FamilyDrawerTitle>
          <FamilyDrawerDescription className="text-xs">
            新建、改名、定位、软上限与排序。删除含复利点的分类必须先迁移。
          </FamilyDrawerDescription>
        </div>
      </div>
      {notice && (
        <div className="warn-glass rounded-lg px-3 py-2 text-[11px]">{notice}</div>
      )}

      <div className="space-y-2.5 rounded-xl border border-black/[0.06] bg-white/60 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
          <FolderPlus className="size-3.5 shrink-0 text-[var(--ink-secondary)]" aria-hidden />
          新建分类
        </div>
        <input
          value={creating.name}
          onChange={(e) => setCreating({ ...creating, name: e.target.value })}
          placeholder="分类名"
          className={inputCls}
          data-vaul-no-drag=""
        />
        <input
          value={creating.description}
          onChange={(e) => setCreating({ ...creating, description: e.target.value })}
          placeholder="一句话定位"
          className={inputCls}
          data-vaul-no-drag=""
        />
        <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-12 shrink-0 text-[11.5px] text-[var(--ink-secondary)]">软上限</span>
            <input
              type="number"
              min={1}
              value={creating.softCap}
              onChange={(e) => setCreating({ ...creating, softCap: e.target.value })}
              className={cn(inputCls, "!w-24 shrink-0 font-mono tabular-nums")}
              data-vaul-no-drag=""
            />
          </div>
          <button
            type="button"
            disabled={creating.name.trim().length < 1}
            onClick={() => {
              setState(createCategory(state, {
                name: creating.name,
                description: creating.description,
                softCap: Number(creating.softCap) || 5,
                colorToken: creating.colorToken,
              }));
              setCreating({ name: "", description: "", softCap: "5", colorToken: "cobalt" });
            }}
            className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#1D1D1F] px-3.5 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-[#2C2C2E] disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white min-[420px]:ml-auto min-[420px]:w-auto"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden />
            新建
          </button>
        </div>
        <ColorChoices
          value={creating.colorToken}
          onChange={(colorToken) => setCreating({ ...creating, colorToken })}
        />
      </div>

      <div className="space-y-2.5">
        {categories.map((category, index) => {
          const draft = draftOf(category);
          const count = itemsInCategory(state, category.id).length;
          const tone = colorStyle(draft.colorToken, category.name, index);
          const ratio = Math.min(100, (count / Math.max(1, category.softCap)) * 100);
          return (
            <div key={category.id} className="space-y-2.5 rounded-xl border border-black/[0.06] bg-white/70 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[11.5px] text-[var(--ink-secondary)]">
                  <ColorDot token={draft.colorToken} name={category.name} index={index} />
                  <span className="font-mono tabular-nums text-[var(--ink-tertiary)]">#{index + 1}</span>
                  <span>{count} 项复利点</span>
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    title="上移"
                    aria-label={`上移 ${category.name}`}
                    disabled={index === 0}
                    onClick={() => setState(moveCategory(state, category.id, -1))}
                    className={iconBtn}
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="下移"
                    aria-label={`下移 ${category.name}`}
                    disabled={index === categories.length - 1}
                    onClick={() => setState(moveCategory(state, category.id, 1))}
                    className={iconBtn}
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="删除分类"
                    aria-label={`删除 ${category.name}`}
                    onClick={() => requestDelete(category)}
                    className={cn(iconBtn, "hover:text-rose-600 dark:hover:text-rose-400")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <input
                value={draft.name}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [category.id]: { ...draft, name: e.target.value } }))}
                onBlur={(e) => commit(category, { name: e.target.value })}
                className={inputCls}
                aria-label={`${category.name} 名称`}
                data-vaul-no-drag=""
              />
              <input
                value={draft.description}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [category.id]: { ...draft, description: e.target.value } }))}
                onBlur={(e) => commit(category, { description: e.target.value })}
                placeholder="一句话定位"
                className={inputCls}
                aria-label={`${category.name} 定位`}
                data-vaul-no-drag=""
              />
              <label className="flex items-center gap-2 text-[11.5px] text-[var(--ink-secondary)]">
                <span className="w-12 shrink-0">软上限</span>
                <input
                  type="number"
                  min={1}
                  value={draft.softCap}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [category.id]: { ...draft, softCap: e.target.value } }))}
                  onBlur={(e) => commit(category, { softCap: e.target.value })}
                  className={cn(inputCls, "!w-24 shrink-0 font-mono tabular-nums")}
                  data-vaul-no-drag=""
                />
              </label>
              <ColorChoices
                value={draft.colorToken}
                onChange={(colorToken) => commit(category, { colorToken })}
              />
              <div className="h-[3px] overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div className={cn("h-full rounded-full opacity-80", tone.bar)} style={{ width: `${ratio}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryMigrate() {
  const { state, setState, pendingId, setPendingId, targetId, setTargetId } = useCat();
  const { setView } = useFamilyDrawer();
  const source = state.categories.find((c) => c.id === pendingId);
  const targets = sortedCategories(state).filter((c) => c.id !== pendingId);
  const owned = pendingId ? itemsInCategory(state, pendingId) : [];
  if (!source) return null;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-start gap-2.5 pr-8">
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-black/[0.04] text-[var(--ink-secondary)] dark:bg-white/[0.06]"
          aria-hidden
        >
          <ArrowRightLeft className="size-3.5" />
        </span>
        <div className="min-w-0 space-y-1">
          <FamilyDrawerTitle className="pr-0 text-base tracking-tight">迁移后删除</FamilyDrawerTitle>
          <FamilyDrawerDescription className="text-xs">
            步骤 2 / 2 · 「{source.name}」仍有 {owned.length} 个复利点（含毕业与中止）。选择目标分类后才会删除，评分与历史不会级联清除。
          </FamilyDrawerDescription>
        </div>
      </div>
      <div className="space-y-2" role="radiogroup" aria-label="目标迁移分类" data-vaul-no-drag="">
        {targets.map((category) => {
          const selected = targetId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTargetId(category.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-black/[0.14] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:border-white/20 dark:bg-white/[0.08]"
                  : "border-black/[0.06] hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.03]"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                  <ColorDot token={category.colorToken} name={category.name} />
                  {category.name}
                </span>
                <span className="mt-0.5 block pl-3.5 text-[11px] text-[var(--ink-tertiary)]">{category.description || "无定位"}</span>
              </span>
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-[#1D1D1F] bg-[#1D1D1F] text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                    : "border-black/20 dark:border-white/20"
                )}
              >
                {selected && <Check className="size-2.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      <FamilyDrawerButton
        onClick={() => {
          if (!pendingId || !targetId) return;
          const result = deleteCategory(state, pendingId, targetId);
          if (!result.ok) return;
          setState(result.state);
          setPendingId(null);
          setView("default");
        }}
        className={cn("bg-foreground text-background", !targetId && "pointer-events-none opacity-40")}
      >
        <ArrowRightLeft className="size-3.5 shrink-0" aria-hidden />
        迁移全部项目并删除
      </FamilyDrawerButton>
      <FamilyDrawerSecondaryButton
        onClick={() => {
          setPendingId(null);
          setView("default");
        }}
        className="-mt-2"
      >
        取消
      </FamilyDrawerSecondaryButton>
    </div>
  );
}

const VIEWS: ViewsRegistry = { default: CategoryHome, migrate: CategoryMigrate };

export function CategoryDrawer({
  open,
  onClose,
  state,
  setState,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  setState: (s: AppState) => void;
}) {
  const [view, setView] = useState("default");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("default");
    setPendingId(null);
    setNotice("");
  }, [open]);

  return (
    <CatContext.Provider value={{ state, setState, pendingId, setPendingId, targetId, setTargetId, notice, setNotice }}>
      <FamilyDrawerRoot open={open} onOpenChange={(next) => !next && onClose()} view={view} onViewChange={setView}>
        <FamilyDrawerPortal>
          <FamilyDrawerOverlay className="bg-black/20 backdrop-blur-[2px] dark:bg-black/40" />
          <FamilyDrawerContent className="w-[min(calc(100vw-2rem),44rem)] max-w-[min(calc(100vw-2rem),44rem)] rounded-2xl border border-black/[0.06] text-foreground shadow-[0_24px_64px_-16px_rgba(0,0,0,0.28)] dark:border-white/[0.08] md:w-[min(calc(100vw-2rem),44rem)]">
            <FamilyDrawerClose />
            <FamilyDrawerAnimatedWrapper className="max-h-[min(86vh,880px)] overflow-y-auto px-4 sm:px-6">
              <FamilyDrawerAnimatedContent>
                <FamilyDrawerViewContent views={VIEWS} />
              </FamilyDrawerAnimatedContent>
            </FamilyDrawerAnimatedWrapper>
          </FamilyDrawerContent>
        </FamilyDrawerPortal>
      </FamilyDrawerRoot>
    </CatContext.Provider>
  );
}
