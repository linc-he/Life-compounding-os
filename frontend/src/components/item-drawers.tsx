import { useEffect, useState } from "react";
import type { AppState, Category, CompoundingItem } from "@/types";
import { cn } from "@/lib/utils";
import { activeQuota, categoryQuota, uid } from "@/lib/store";
import { FamilyDrawer, DrawerBlock } from "@/components/cult/family-drawer";

/* ================= 新增复利点：两步冷静流 ================= */

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
  const cats = state.categories.filter((c) => !c.archived);
  const [form, setForm] = useState({
    categoryId: defaultCategoryId ?? cats[0]?.id ?? "",
    title: "",
    knowledge: "",
    action: "",
    weight: 2,
  });
  const [committed, setCommitted] = useState(false);

  const cat = cats.find((c) => c.id === form.categoryId);
  const catQuota = cat ? categoryQuota(state, cat.id) : null;
  const globalQuota = activeQuota(state);
  const showFriction =
    (catQuota && catQuota.count >= catQuota.limit) || globalQuota.count >= globalQuota.globalLimit - 2;

  const step1Valid =
    form.title.trim().length >= 2 &&
    form.knowledge.trim().length >= 8 &&
    form.action.trim().length >= 8;

  function submit() {
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
    const log = {
      id: uid(),
      type: "created" as const,
      title: item.title,
      note: form.knowledge.trim().slice(0, 40),
      date: new Date().toISOString().slice(0, 10),
    };
    setState({
      ...state,
      items: [...state.items, item],
      changeLogs: [log, ...state.changeLogs],
    });
    setForm({ categoryId: cats[0]?.id ?? "", title: "", knowledge: "", action: "", weight: 2 });
    setCommitted(false);
    onClose();
  }

  return (
    <FamilyDrawer open={open} onClose={onClose} title="新增复利点">
      {({ step, next, back }) => (
        <>
          {/* 温和的灰底提示条：防贪多 */}
          {step === 0 && showFriction && (
            <div className="mb-4 rounded-lg bg-zinc-100/80 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
              复利贵在专注，当前已有
              <span className="font-semibold tnum"> {globalQuota.count} </span>
              项活跃复利点，新增可能稀释每日注意力。
            </div>
          )}

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <FieldLabel>分类</FieldLabel>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={inputCls}
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
                />
              </div>
              <div>
                <FieldLabel>知 · 底层原则（为什么长期值得做）</FieldLabel>
                <textarea
                  rows={2}
                  value={form.knowledge}
                  onChange={(e) => setForm({ ...form, knowledge: e.target.value })}
                  placeholder="如：输出是最好的输入，倒逼深度理解"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>行 · 最小可执行标准（什么程度算 5 星）</FieldLabel>
                <textarea
                  rows={2}
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  placeholder="如：当天发布 ≥1 篇并附 3 条要点"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>权重（对系统加权分的影响）</FieldLabel>
                <div className="flex gap-2">
                  {[1, 2, 3].map((w) => (
                    <button
                      key={w}
                      onClick={() => setForm({ ...form, weight: w })}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs font-medium tnum motion-safe-trans",
                        form.weight === w
                          ? "border-zinc-900 bg-zinc-900 text-zinc-50"
                          : "border-zinc-200/80 text-zinc-500 hover:border-zinc-400"
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <DrawerFooter>
                <button
                  disabled={!step1Valid}
                  onClick={next}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 motion-safe-trans hover:bg-zinc-700 disabled:opacity-40"
                >
                  下一步 · 长期承诺确认
                </button>
              </DrawerFooter>
            </div>
          )}

          {/* Step 2：长期承诺确认页 */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500">
                确认这条复利点的「知」与「行」——这将写入你的原则库。
              </p>
              <DrawerBlock label="知 · 底层原则">
                <p className="text-xs leading-relaxed text-zinc-900">{form.knowledge}</p>
              </DrawerBlock>
              <DrawerBlock label="行 · 最小可执行标准">
                <p className="text-xs leading-relaxed text-zinc-900">{form.action}</p>
              </DrawerBlock>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200/80 p-3 motion-safe-trans hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={committed}
                  onChange={(e) => setCommitted(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-zinc-900"
                />
                <span className="text-[11px] leading-relaxed text-zinc-600">
                  我愿意按此原则持续复利至少
                  <span className="font-semibold text-zinc-950 tnum"> 90 </span>
                  天，不因短期波动中断。
                </span>
              </label>
              <DrawerFooter>
                <button
                  onClick={back}
                  className="rounded-md px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100"
                >
                  上一步
                </button>
                <button
                  disabled={!committed}
                  onClick={submit}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 motion-safe-trans hover:bg-zinc-700 disabled:opacity-40"
                >
                  激活这条复利点
                </button>
              </DrawerFooter>
            </div>
          )}
        </>
      )}
    </FamilyDrawer>
  );
}

/* ================= 移除复利点：两步毕业/中止流 ================= */

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
  const [choice, setChoice] = useState<"graduated" | "retired" | null>(null);
  const [note, setNote] = useState("");

  if (!item) return null;

  const noteValid =
    note.trim().length >= 8 &&
    (choice === "graduated"
      ? true
      : choice === "retired"
        ? true
        : false) && choice != null;

  function submit() {
    if (!choice) return;
    const log = {
      id: uid(),
      type: choice,
      title: item.title,
      note: note.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    setState({
      ...state,
      items: state.items.map((i) =>
        i.id === item.id ? { ...i, status: choice } : i
      ),
      changeLogs: [log, ...state.changeLogs],
    });
    setChoice(null);
    setNote("");
    onClose();
  }

  return (
    <FamilyDrawer open={open} onClose={onClose} title={`移除 · ${item.title}`}>
      {({ step, next, back }) => (
        <>
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-500">
                禁止一键静默删除。请二选一，这条复利点的去向将写入原则档案。
              </p>

              <button
                onClick={() => setChoice("graduated")}
                className={cn(
                  "w-full rounded-lg border p-4 text-left motion-safe-trans",
                  choice === "graduated"
                    ? "border-emerald-600 bg-emerald-50/60"
                    : "border-zinc-200/80 hover:border-zinc-400"
                )}
              >
                <div className="text-xs font-semibold text-zinc-950">
                  已内化为本能 · 毕业归档
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  保留全部历史评分，转为绿色毕业档案。它已是你的第二天性。
                </div>
              </button>

              <button
                onClick={() => setChoice("retired")}
                className={cn(
                  "w-full rounded-lg border p-4 text-left motion-safe-trans",
                  choice === "retired"
                    ? "border-zinc-500 bg-zinc-100"
                    : "border-zinc-200/80 hover:border-zinc-400"
                )}
              >
                <div className="text-xs font-semibold text-zinc-950">
                  原则修正 · 中止移除
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  深灰态档案。认知被行动证伪，或标准过大需拆分。
                </div>
              </button>

              <DrawerFooter>
                <button
                  disabled={!choice}
                  onClick={next}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-50 motion-safe-trans hover:bg-zinc-700 disabled:opacity-40"
                >
                  下一步
                </button>
              </DrawerFooter>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[11px] text-zinc-500">
                必填一句移出复盘，将记入「原则变更日志」供日后回看。
              </p>
              <DrawerBlock label={choice === "graduated" ? "毕业理由" : "中止原因"}>
                <textarea
                  autoFocus
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    choice === "graduated"
                      ? "如：已成习惯无需再追踪，连续 60 天零提醒"
                      : "如：标准过大需拆分 / 认知被证伪：与 X 冲突"
                  }
                  className={inputCls}
                />
              </DrawerBlock>
              <div className="text-[10px] text-zinc-400 tnum">{note.trim().length}/8 字起</div>
              <DrawerFooter>
                <button
                  onClick={back}
                  className="rounded-md px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100"
                >
                  上一步
                </button>
                <button
                  disabled={!noteValid}
                  onClick={submit}
                  className={cn(
                    "rounded-md px-4 py-2 text-xs font-medium text-zinc-50 motion-safe-trans disabled:opacity-40",
                    choice === "graduated" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  {choice === "graduated" ? "确认毕业归档" : "确认中止移除"}
                </button>
              </DrawerFooter>
            </div>
          )}
        </>
      )}
    </FamilyDrawer>
  );
}

/* ---------- 小件 ---------- */

const inputCls =
  "w-full rounded-md border border-zinc-200/80 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-950 outline-none motion-safe-trans placeholder:text-zinc-400 focus:border-zinc-400";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-medium text-zinc-500">{children}</div>
  );
}

function DrawerFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 pt-1">{children}</div>;
}
