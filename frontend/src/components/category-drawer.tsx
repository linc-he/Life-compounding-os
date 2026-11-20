import { createContext, useContext, useEffect, useState } from "react";
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
  FamilyDrawerTitle,
  FamilyDrawerViewContent,
  useFamilyDrawer,
  type ViewsRegistry,
} from "@/components/ui/family-drawer";

const inputCls =
  "w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring";

function ColorChoices({
  value,
  onChange,
}: {
  value: ColorToken;
  onChange: (token: ColorToken) => void;
}) {
  return (
    <div className="flex items-center gap-2" data-vaul-no-drag="">
      <span className="text-[11px] text-muted-foreground">微色</span>
      <div className="flex items-center gap-1.5">
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
                "size-3.5 rounded-full",
                style.dot,
                selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
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
      <FamilyDrawerTitle className="text-base tracking-tight">管理复利分类</FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">
        新建、改名、定位、软上限与排序。删除含复利点的分类必须先迁移。
      </FamilyDrawerDescription>
      {notice && (
        <div className="warn-glass rounded-lg px-3 py-2 text-[11px]">{notice}</div>
      )}

      <div className="space-y-2 rounded-xl border border-black/[0.06] bg-white/55 p-3 dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">新建分类</div>
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
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">软上限</span>
          <input
            type="number"
            min={1}
            value={creating.softCap}
            onChange={(e) => setCreating({ ...creating, softCap: e.target.value })}
            className={cn(inputCls, "w-20 font-mono")}
            data-vaul-no-drag=""
          />
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
            className="ml-auto rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950"
          >
            新建
          </button>
        </div>
        <ColorChoices
          value={creating.colorToken}
          onChange={(colorToken) => setCreating({ ...creating, colorToken })}
        />
      </div>

      <div className="space-y-3">
        {categories.map((category, index) => {
          const draft = draftOf(category);
          const count = itemsInCategory(state, category.id).length;
          const tone = colorStyle(draft.colorToken, category.name, index);
          const ratio = Math.min(100, (count / Math.max(1, category.softCap)) * 100);
          return (
            <div key={category.id} className="space-y-2 rounded-xl border border-black/[0.06] bg-white/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <ColorDot token={draft.colorToken} name={category.name} index={index} />
                  #{index + 1} · {count} 项
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => setState(moveCategory(state, category.id, -1))}
                    className="rounded-md border border-border px-2 py-1 text-[10px] disabled:opacity-30"
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={index === categories.length - 1}
                    onClick={() => setState(moveCategory(state, category.id, 1))}
                    className="rounded-md border border-border px-2 py-1 text-[10px] disabled:opacity-30"
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(category)}
                    className="rounded-md border border-border px-2 py-1 text-[10px] text-foreground"
                  >
                    删除
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
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                软上限
                <input
                  type="number"
                  min={1}
                  value={draft.softCap}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [category.id]: { ...draft, softCap: e.target.value } }))}
                  onBlur={(e) => commit(category, { softCap: e.target.value })}
                  className={cn(inputCls, "w-20 font-mono")}
                  data-vaul-no-drag=""
                />
              </label>
              <ColorChoices
                value={draft.colorToken}
                onChange={(colorToken) => commit(category, { colorToken })}
              />
              <div className="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${ratio}%` }} />
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
      <FamilyDrawerTitle className="text-base tracking-tight">迁移后删除</FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">
        步骤 2 / 2 · 「{source.name}」仍有 {owned.length} 个复利点（含毕业与中止）。选择目标分类后才会删除，评分与历史不会级联清除。
      </FamilyDrawerDescription>
      <div className="space-y-2">
        {targets.map((category) => (
          <label
            key={category.id}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-xl border p-3",
              targetId === category.id ? "border-foreground bg-black/[0.03] dark:bg-white/[0.05]" : "border-black/[0.06] dark:border-white/10"
            )}
          >
            <input
              type="radio"
              name="migrate-target"
              checked={targetId === category.id}
              onChange={() => setTargetId(category.id)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ColorDot token={category.colorToken} name={category.name} />
                {category.name}
              </span>
              <span className="block text-[11px] text-muted-foreground">{category.description || "无定位"}</span>
            </span>
          </label>
        ))}
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
        迁移全部项目并删除
      </FamilyDrawerButton>
      <button
        type="button"
        onClick={() => {
          setPendingId(null);
          setView("default");
        }}
        className="w-full text-center text-xs text-muted-foreground"
      >
        取消
      </button>
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
          <FamilyDrawerOverlay className="bg-zinc-950/40" />
          <FamilyDrawerContent className="max-w-[560px] rounded-2xl border border-black/[0.06] text-foreground dark:border-white/[0.08]">
            <FamilyDrawerClose />
            <FamilyDrawerAnimatedWrapper className="max-h-[min(82vh,760px)] overflow-y-auto">
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
