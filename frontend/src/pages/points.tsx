import { useEffect, useState } from "react";
import { API, type Category, type Point } from "@/lib/api";
import { WidgetCard } from "@/components/widget-card";
import { cn } from "@/lib/utils";

/**
 * 复利点管理页：意图门向导 + 冷却期。
 * 添加不是点一下按钮——四问必答 + 24h 冷静期。
 */

const STEP_HINTS = [
  "一、为什么加这个复利点？（意图，不是冲动）",
  "二、最低契约是什么？低到你状态最差的一天也能完成",
  "三、用什么领先指标衡量？（完成率/完读率，不是粉丝数）",
  "四、打算做多少天？（建议 100）",
];

function IntentGateWizard({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({
    category_id: 0,
    name: "",
    intent_reason: "",
    contract: "",
    measure: "",
    target_days: 100,
  });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    API.categories().then((cs) => {
      setCats(cs);
      if (cs[0]) setForm((f) => ({ ...f, category_id: cs[0].id }));
    });
  }, []);

  const canNext =
    step === 0 ? form.name.trim().length >= 2
    : step === 1 ? form.intent_reason.trim().length >= 10
    : step === 2 ? form.contract.trim().length >= 4
    : step === 3 ? form.measure.trim().length >= 2
    : true;

  async function submit() {
    setErr(null);
    try {
      await API.createPoint(form);
      setOk(true);
      setTimeout(onCreated, 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
    }
  }

  if (ok)
    return (
      <div className="rounded-widget bg-accent/5 border border-accent/30 px-4 py-6 text-center">
        <div className="text-sm font-medium">已提交 · 进入 24 小时冷静期</div>
        <div className="text-xs text-muted mt-1">
          明天此时回来确认激活。今天想加的，未必是明天想要的。
        </div>
      </div>
    );

  return (
    <WidgetCard label="添加复利点 · 意图门" pill={`${step + 1}/4`}>
      <div className="text-[11px] text-muted mb-3">{STEP_HINTS[step]}</div>
      {step === 0 && (
        <>
          <input
            className="w-full text-sm rounded-xl border border-hairline px-3 py-2 mb-2 outline-none focus:border-accent"
            placeholder="复利点名称，如「每天一篇 AI 文章」"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </>
      )}
      {step === 1 && (
        <textarea
          rows={3}
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          placeholder="我想通过它获得什么长期收益？为什么是现在？"
          value={form.intent_reason}
          onChange={(e) => setForm({ ...form, intent_reason: e.target.value })}
        />
      )}
      {step === 2 && (
        <input
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          placeholder="如「每天至少 1 篇」（状态差也能完成）"
          value={form.contract}
          onChange={(e) => setForm({ ...form, contract: e.target.value })}
        />
      )}
      {step === 3 && (
        <input
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          placeholder="如「完读率 / 转发数」（领先指标）"
          value={form.measure}
          onChange={(e) => setForm({ ...form, measure: e.target.value })}
        />
      )}
      {step === 4 && (
        <input
          type="number"
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          value={form.target_days}
          onChange={(e) => setForm({ ...form, target_days: Number(e.target.value) })}
        />
      )}
      <div className="flex items-center gap-2 mt-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="text-xs text-muted px-3 py-1.5 rounded-full hover:bg-hairline"
          >
            上一步
          </button>
        )}
        {step < 4 ? (
          <button
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className="text-xs font-medium rounded-full bg-accent text-white px-4 py-1.5 disabled:opacity-40"
          >
            下一步
          </button>
        ) : (
          <button
            onClick={submit}
            className="text-xs font-medium rounded-full bg-accent text-white px-4 py-1.5"
          >
            提交（进入 24h 冷静期）
          </button>
        )}
        {err && <span className="text-xs text-red-500">{err}</span>}
      </div>
    </WidgetCard>
  );
}

function PointRow({ p, onChanged }: { p: Point; onChanged: () => void }) {
  const [showArchive, setShowArchive] = useState(false);
  const [reason, setReason] = useState("");
  const [cause, setCause] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function act(fn: () => Promise<unknown>) {
    setErr(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    }
  }

  const statusPill: Record<string, string> = {
    pending: "冷静期",
    active: "进行中",
    archiving: "冷却中",
    archived: "已归档",
  };

  return (
    <WidgetCard label={p.name} pill={statusPill[p.status] ?? p.status}>
      <div className="text-xs text-zinc-700">{p.contract}</div>
      <div className="text-[11px] text-muted mt-1">衡量：{p.measure} · 目标 {p.target_days} 天</div>
      {showArchive ? (
        <div className="mt-3 space-y-2">
          <select
            className="w-full text-xs rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
          >
            <option value="">归因：是哪一种？</option>
            <option value="wrong_knowledge">知错了 — 认知本身不成立</option>
            <option value="broken_execution">行断了 — 执行成本过高</option>
          </select>
          <textarea
            rows={2}
            className="w-full text-xs rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
            placeholder="具体原因（≥10 字）——这是复盘的金矿"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              disabled={reason.trim().length < 10 || !cause}
              onClick={() => act(() => API.archivePoint(p.id, { reason, cause }))}
              className="text-xs rounded-full bg-zinc-900 text-white px-4 py-1.5 disabled:opacity-40"
            >
              申请归档（7 天冷却）
            </button>
            <button onClick={() => setShowArchive(false)} className="text-xs text-muted">
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-3">
          {p.status === "pending" && (
            <button
              onClick={() => act(() => API.activatePoint(p.id))}
              className="text-xs rounded-full bg-accent text-white px-4 py-1.5"
            >
              确认激活
            </button>
          )}
          {p.status === "active" && (
            <button
              onClick={() => setShowArchive(true)}
              className="text-xs text-muted underline underline-offset-2"
            >
              申请归档
            </button>
          )}
          {p.status === "archiving" && (
            <>
              <button
                onClick={() => act(() => API.restorePoint(p.id))}
                className="text-xs rounded-full bg-accent text-white px-4 py-1.5"
              >
                恢复
              </button>
              <button
                onClick={() => act(() => API.confirmArchive(p.id))}
                className="text-xs text-muted underline underline-offset-2"
              >
                确认放弃（冷却期满后）
              </button>
            </>
          )}
        </div>
      )}
      {err && <div className="text-xs text-red-500 mt-1">{err}</div>}
    </WidgetCard>
  );
}

export default function PointsPage() {
  const [points, setPoints] = useState<Point[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => API.listPoints().then(setPoints).catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
  }, []);

  const activeCount = points.filter((p) => p.status === "active" || p.status === "pending").length;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">复利点</h1>
          <p className="text-xs text-muted mt-1">
            聚焦上限 {activeCount}/5 —— 超出必须先归档一个
          </p>
        </div>
        <button
          disabled={activeCount >= 5}
          onClick={() => setShowWizard(!showWizard)}
          className={cn(
            "text-xs font-medium rounded-full px-4 py-2",
            activeCount >= 5
              ? "bg-hairline text-muted"
              : "bg-accent text-white"
          )}
        >
          + 添加
        </button>
      </header>

      {showWizard && <IntentGateWizard onCreated={() => { setShowWizard(false); load(); }} />}
      {err && <div className="text-xs text-red-500">{err}</div>}
      {points.map((p) => (
        <PointRow key={p.id} p={p} onChanged={load} />
      ))}
    </div>
  );
}
