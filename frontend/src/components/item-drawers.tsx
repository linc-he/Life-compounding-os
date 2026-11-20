import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppState, CompoundingItem } from "@/types";
import { GLOBAL_ACTIVE_LIMIT } from "@/types";
import { cn } from "@/lib/utils";
import { activeQuota, categoryQuota, sortedCategories, todayStr, uid } from "@/lib/store";
import { ColorDot } from "@/components/color-dot";
import { Checkbox } from "@/components/ui/checkbox";
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

const inputCls = "mac-field px-2.5 py-2 text-[12.5px] leading-relaxed";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[11.5px] font-medium text-[var(--ink-secondary)]">{children}</div>;
}

function DrawerFrame({
  open,
  onOpenChange,
  view,
  onViewChange,
  views,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: string;
  onViewChange: (view: string) => void;
  views: ViewsRegistry;
}) {
  return (
    <FamilyDrawerRoot open={open} onOpenChange={onOpenChange} view={view} onViewChange={onViewChange}>
      <FamilyDrawerPortal>
        <FamilyDrawerOverlay className="bg-black/20 backdrop-blur-[2px] dark:bg-black/40" />
        <FamilyDrawerContent className="max-w-[520px] rounded-2xl border border-black/[0.06] text-foreground shadow-[0_24px_64px_-16px_rgba(0,0,0,0.28)] dark:border-white/[0.08]">
          <FamilyDrawerClose />
          <FamilyDrawerAnimatedWrapper className="max-h-[min(78vh,680px)] overflow-y-auto">
            <FamilyDrawerAnimatedContent>
              <FamilyDrawerViewContent views={views} />
            </FamilyDrawerAnimatedContent>
          </FamilyDrawerAnimatedWrapper>
        </FamilyDrawerContent>
      </FamilyDrawerPortal>
    </FamilyDrawerRoot>
  );
}

/* ================= 新增：两步，含 90 天承诺与软上限提醒 ================= */

type AddCtx = {
  state: AppState;
  form: {
    categoryId: string;
    title: string;
    knowledge: string;
    action: string;
    weight: number;
  };
  setForm: React.Dispatch<React.SetStateAction<AddCtx["form"]>>;
  committed: boolean;
  setCommitted: (v: boolean) => void;
  submit: () => void;
};

const AddContext = createContext<AddCtx | null>(null);
function useAdd() {
  const ctx = useContext(AddContext);
  if (!ctx) throw new Error("AddItem context missing");
  return ctx;
}

function AddStepOne() {
  const { state, form, setForm } = useAdd();
  const { setView } = useFamilyDrawer();
  const cats = sortedCategories(state);
  const cat = cats.find((c) => c.id === form.categoryId);
  const catQuota = cat ? categoryQuota(state, cat.id) : null;
  const globalQuota = activeQuota(state);
  const overCategory = Boolean(catQuota && catQuota.count >= catQuota.limit);
  const overGlobal = globalQuota.count >= GLOBAL_ACTIVE_LIMIT;
  const step1Valid =
    form.title.trim().length >= 2 &&
    form.knowledge.trim().length >= 8 &&
    form.action.trim().length >= 8 &&
    Boolean(form.categoryId);

  return (
    <div className="space-y-4 pt-2">
      <FamilyDrawerTitle className="text-base tracking-tight">新增复利点</FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">步骤 1 / 2 · 写下知与行</FamilyDrawerDescription>
      {(overCategory || overGlobal) && (
        <div className="warn-glass rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          复利贵在专注。
          {overCategory && catQuota && (
            <span>
              「{cat?.name}」活跃已达软上限
              <span className="font-mono font-medium"> {catQuota.count}/{catQuota.limit}</span>
              。
            </span>
          )}
          {overGlobal && (
            <span>
              全局活跃已达
              <span className="font-mono font-medium"> {globalQuota.count}/{GLOBAL_ACTIVE_LIMIT}</span>
              ，再增加会稀释每日注意力。
            </span>
          )}
        </div>
      )}
      <div>
        <FieldLabel>分类</FieldLabel>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="分类" data-vaul-no-drag="">
          {cats.map((c, index) => {
            const selected = form.categoryId === c.id;
            const q = categoryQuota(state, c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setForm({ ...form, categoryId: c.id })}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors",
                  selected
                    ? "border-black/[0.12] bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-white/20 dark:bg-white/[0.1]"
                    : "border-black/[0.06] text-[var(--ink-secondary)] hover:text-foreground dark:border-white/[0.08]"
                )}
              >
                <ColorDot token={c.colorToken} name={c.name} index={index} />
                {c.name}
                <span className="font-mono text-[10px] tabular-nums text-[var(--ink-tertiary)]">{q.count}/{q.limit}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <FieldLabel>名称</FieldLabel>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="如：公众号 AI 日更"
          className={inputCls}
          data-vaul-no-drag=""
        />
      </div>
      <div>
        <FieldLabel>知 · 底层原则</FieldLabel>
        <textarea
          rows={2}
          value={form.knowledge}
          onChange={(e) => setForm({ ...form, knowledge: e.target.value })}
          placeholder="为什么长期值得做"
          className={inputCls}
          data-vaul-no-drag=""
        />
      </div>
      <div>
        <FieldLabel>行 · 最小可执行标准</FieldLabel>
        <textarea
          rows={2}
          value={form.action}
          onChange={(e) => setForm({ ...form, action: e.target.value })}
          placeholder="什么程度算 5 星"
          className={inputCls}
          data-vaul-no-drag=""
        />
      </div>
      <div>
        <FieldLabel>权重</FieldLabel>
        <div
          className="inline-flex gap-0.5 rounded-[9px] border border-black/[0.05] bg-black/[0.045] p-[3px] dark:border-white/[0.06] dark:bg-white/[0.07]"
          role="radiogroup"
          aria-label="权重"
          data-vaul-no-drag=""
        >
          {[
            { w: 1, label: "轻" },
            { w: 2, label: "中" },
            { w: 3, label: "重" },
          ].map(({ w, label }) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={form.weight === w}
              onClick={() => setForm({ ...form, weight: w })}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] transition-colors",
                form.weight === w
                  ? "bg-white text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:bg-zinc-700/90"
                  : "text-[var(--ink-secondary)] hover:text-foreground"
              )}
            >
              <span className="font-mono tabular-nums">×{w}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      <FamilyDrawerButton
        onClick={() => step1Valid && setView("commit")}
        className={cn("bg-foreground text-background", !step1Valid && "pointer-events-none opacity-40")}
      >
        下一步 · 90 天承诺
      </FamilyDrawerButton>
    </div>
  );
}

function AddStepTwo() {
  const { state, form, committed, setCommitted, submit } = useAdd();
  const { setView } = useFamilyDrawer();
  const cats = sortedCategories(state);
  const catIndex = cats.findIndex((c) => c.id === form.categoryId);
  const cat = cats[catIndex];
  return (
    <div className="space-y-4 pt-2">
      <FamilyDrawerTitle className="text-base tracking-tight">长期承诺</FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">步骤 2 / 2 · 回显知与行，确认 90 天</FamilyDrawerDescription>
      <div className="material-texture overflow-hidden rounded-xl">
        <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 dark:border-white/[0.06]">
          {cat && <ColorDot token={cat.colorToken} name={cat.name} index={catIndex} />}
          <span className="truncate text-[13.5px] font-medium tracking-tight text-foreground">{form.title}</span>
          <span className="ml-auto shrink-0 font-mono text-[10.5px] tabular-nums text-[var(--ink-tertiary)]">
            {cat?.name} · ×{form.weight}
          </span>
        </div>
        <div className="grid divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          <div className="px-4 py-3">
            <div className="mb-1 text-[10.5px] font-medium text-[var(--ink-tertiary)]">知 · 底层原则</div>
            <p className="text-[13px] leading-relaxed text-foreground">{form.knowledge}</p>
          </div>
          <div className="px-4 py-3">
            <div className="mb-1 text-[10.5px] font-medium text-[var(--ink-tertiary)]">行 · 5 星标准</div>
            <p className="text-[13px] leading-relaxed text-foreground">{form.action}</p>
          </div>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-black/[0.06] p-3 transition-colors hover:bg-black/[0.02] dark:border-white/[0.08] dark:hover:bg-white/[0.03]" data-vaul-no-drag="">
        <Checkbox
          checked={committed}
          onCheckedChange={(v) => setCommitted(v === true)}
          className="mt-0.5"
        />
        <span className="text-[12px] leading-relaxed text-[var(--ink-secondary)]">
          我愿意按此原则持续复利至少
          <span className="font-mono text-foreground"> 90 </span>
          天，不因短期波动中断。
        </span>
      </label>
      <div className="grid gap-2">
        <FamilyDrawerButton
          onClick={() => committed && submit()}
          className={cn("bg-foreground text-background", !committed && "pointer-events-none opacity-40")}
        >
          激活这条复利点
        </FamilyDrawerButton>
        <FamilyDrawerSecondaryButton onClick={() => setView("default")} className="text-muted-foreground">
          上一步
        </FamilyDrawerSecondaryButton>
      </div>
    </div>
  );
}

const ADD_VIEWS: ViewsRegistry = { default: AddStepOne, commit: AddStepTwo };

export function AddItemDrawer({
  open,
  onClose,
  state,
  setState,
  defaultCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  setState: (s: AppState) => void;
  defaultCategoryId?: string | null;
}) {
  const cats = sortedCategories(state);
  const [view, setView] = useState("default");
  const [form, setForm] = useState({
    categoryId: defaultCategoryId ?? cats[0]?.id ?? "",
    title: "",
    knowledge: "",
    action: "",
    weight: 2,
  });
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setView("default");
    setCommitted(false);
    setForm({
      categoryId: defaultCategoryId ?? cats[0]?.id ?? "",
      title: "",
      knowledge: "",
      action: "",
      weight: 2,
    });
  }, [open, defaultCategoryId, cats[0]?.id]);

  const ctx = useMemo<AddCtx>(
    () => ({
      state,
      form,
      setForm,
      committed,
      setCommitted,
      submit: () => {
        const item: CompoundingItem = {
          id: uid(),
          categoryId: form.categoryId,
          title: form.title.trim(),
          knowledge: form.knowledge.trim(),
          action: form.action.trim(),
          weight: form.weight as 1 | 2 | 3,
          status: "active",
          createdAt: new Date().toISOString(),
        };
        setState({
          ...state,
          items: [...state.items, item],
          changeLogs: [
            {
              id: uid(),
              type: "created",
              title: item.title,
              note: item.knowledge.slice(0, 40),
              date: todayStr(),
            },
            ...state.changeLogs,
          ],
        });
        onClose();
      },
    }),
    [state, form, committed, setState, onClose]
  );

  return (
    <AddContext.Provider value={ctx}>
      <DrawerFrame
        open={open}
        onOpenChange={(next) => !next && onClose()}
        view={view}
        onViewChange={setView}
        views={ADD_VIEWS}
      />
    </AddContext.Provider>
  );
}

/* ================= 移出：毕业 / 中止，禁止一键删除 ================= */

type RemoveCtx = {
  item: CompoundingItem;
  choice: "graduated" | "retired" | null;
  setChoice: (v: "graduated" | "retired") => void;
  note: string;
  setNote: (v: string) => void;
  submit: () => void;
};

const RemoveContext = createContext<RemoveCtx | null>(null);
function useRemove() {
  const ctx = useContext(RemoveContext);
  if (!ctx) throw new Error("RemoveItem context missing");
  return ctx;
}

function RemoveStepOne() {
  const { item, choice, setChoice } = useRemove();
  const { setView } = useFamilyDrawer();
  return (
    <div className="space-y-3 pt-2">
      <FamilyDrawerTitle className="text-base tracking-tight">移出 · {item.title}</FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">
        步骤 1 / 2 · 禁止一键删除，先选择去向
      </FamilyDrawerDescription>
      <button
        type="button"
        onClick={() => setChoice("graduated")}
        className={cn(
          "w-full rounded-xl border p-4 text-left",
          choice === "graduated"
            ? "border-emerald-600/30 bg-emerald-500/[0.07]"
            : "border-black/[0.06] hover:border-black/15 dark:border-white/10"
        )}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-200">毕业</span>
          已内化为本能 · 毕业归档
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          翡翠绿标签。历史评分全部保留，它已是第二天性。
        </div>
      </button>
      <button
        type="button"
        onClick={() => setChoice("retired")}
        className={cn(
          "w-full rounded-xl border p-4 text-left",
          choice === "retired"
            ? "border-zinc-400 bg-zinc-500/[0.08]"
            : "border-black/[0.06] hover:border-black/15 dark:border-white/10"
        )}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="rounded-md bg-zinc-500/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">中止</span>
          原则修正 · 主动中止
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          中性灰标签。认知被行动证伪，或标准过大需要拆分。历史记录不删除。
        </div>
      </button>
      <FamilyDrawerButton
        onClick={() => choice && setView("reason")}
        className={cn("bg-foreground text-background", !choice && "pointer-events-none opacity-40")}
      >
        下一步
      </FamilyDrawerButton>
    </div>
  );
}

function RemoveStepTwo() {
  const { choice, note, setNote, submit } = useRemove();
  const { setView } = useFamilyDrawer();
  const valid = note.trim().length >= 8 && choice != null;
  return (
    <div className="space-y-4 pt-2">
      <FamilyDrawerTitle className="text-base tracking-tight">
        {choice === "graduated" ? "毕业复盘" : "中止复盘"}
      </FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">步骤 2 / 2 · 必填一句原因，写入原则变更日志</FamilyDrawerDescription>
      <textarea
        autoFocus
        rows={4}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={choice === "graduated" ? "如：已成习惯，连续 60 天无需提醒" : "如：标准过大需拆分，或与另一条原则冲突"}
        className={inputCls}
        data-vaul-no-drag=""
      />
      <div className={cn("font-mono text-[10.5px] tabular-nums", note.trim().length >= 8 ? "text-[var(--ink-tertiary)]" : "text-amber-700 dark:text-amber-300")}>
        {note.trim().length} 字 · 至少 8 字
      </div>
      <FamilyDrawerButton
        onClick={() => valid && submit()}
        className={cn(
          choice === "graduated" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground",
          !valid && "pointer-events-none opacity-40"
        )}
      >
        {choice === "graduated" ? "确认毕业归档" : "确认主动中止"}
      </FamilyDrawerButton>
      <FamilyDrawerSecondaryButton onClick={() => setView("default")} className="text-muted-foreground">
        上一步
      </FamilyDrawerSecondaryButton>
    </div>
  );
}

const REMOVE_VIEWS: ViewsRegistry = { default: RemoveStepOne, reason: RemoveStepTwo };

export function RemoveItemDrawer({
  open,
  item,
  onClose,
  state,
  setState,
}: {
  open: boolean;
  item: CompoundingItem | null;
  onClose: () => void;
  state: AppState;
  setState: (s: AppState) => void;
}) {
  const [view, setView] = useState("default");
  const [choice, setChoice] = useState<"graduated" | "retired" | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setView("default");
    setChoice(null);
    setNote("");
  }, [open, item?.id]);

  if (!item) return null;

  const ctx: RemoveCtx = {
    item,
    choice,
    setChoice,
    note,
    setNote,
    submit: () => {
      if (!choice) return;
      setState({
        ...state,
        items: state.items.map((row) => (row.id === item.id ? { ...row, status: choice } : row)),
        changeLogs: [
          {
            id: uid(),
            type: choice,
            title: item.title,
            note: note.trim(),
            date: todayStr(),
          },
          ...state.changeLogs,
        ],
      });
      onClose();
    },
  };

  return (
    <RemoveContext.Provider value={ctx}>
      <DrawerFrame
        open={open}
        onOpenChange={(next) => !next && onClose()}
        view={view}
        onViewChange={setView}
        views={REMOVE_VIEWS}
      />
    </RemoveContext.Provider>
  );
}
