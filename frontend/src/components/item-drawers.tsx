import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppState, CompoundingItem } from "@/types";
import { GLOBAL_ACTIVE_LIMIT } from "@/types";
import { cn } from "@/lib/utils";
import { activeQuota, categoryQuota, sortedCategories, todayStr, uid } from "@/lib/store";
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

const inputCls =
  "w-full rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">{children}</div>;
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
        <FamilyDrawerOverlay className="bg-zinc-950/40" />
        <FamilyDrawerContent className="max-w-[520px] rounded-2xl border border-black/[0.06] text-foreground dark:border-white/[0.08]">
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
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className={inputCls}
          data-vaul-no-drag=""
        >
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
        <FieldLabel>权重 1–3</FieldLabel>
        <div className="flex gap-2">
          {[1, 2, 3].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setForm({ ...form, weight: w })}
              className={cn(
                "rounded-md border px-3 py-1.5 font-mono text-xs",
                form.weight === w
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground"
              )}
            >
              {w}
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
  const { form, committed, setCommitted, submit } = useAdd();
  const { setView } = useFamilyDrawer();
  return (
    <div className="space-y-4 pt-2">
      <FamilyDrawerTitle className="text-base tracking-tight">长期承诺</FamilyDrawerTitle>
      <FamilyDrawerDescription className="text-xs">步骤 2 / 2 · 回显知与行，确认 90 天</FamilyDrawerDescription>
      <div className="rounded-xl border border-black/[0.06] bg-white/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
        <div className="mb-1 text-[10px] font-medium tracking-wider text-[var(--ink-tertiary)]">知 · 底层原则</div>
        <p className="text-[13px] leading-relaxed text-foreground">{form.knowledge}</p>
      </div>
      <div className="rounded-xl border border-black/[0.06] bg-white/70 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
        <div className="mb-1 text-[10px] font-medium tracking-wider text-[var(--ink-tertiary)]">行 · 执行标准</div>
        <p className="text-[13px] leading-relaxed text-foreground">{form.action}</p>
      </div>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 hover:bg-muted/50">
        <input
          type="checkbox"
          checked={committed}
          onChange={(e) => setCommitted(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5"
          data-vaul-no-drag=""
        />
        <span className="text-[11px] leading-relaxed text-muted-foreground">
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
      <div className="font-mono text-[10px] text-muted-foreground">{note.trim().length} 字 · 至少 8 字</div>
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
