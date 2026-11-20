import { useEffect, useState } from "react";
import { API, type TodayPoint } from "@/lib/api";
import { WidgetCard, NumberStat } from "@/components/widget-card";
import { cn } from "@/lib/utils";

const SCORE_LABELS = ["没做", "勉强", "及格", "良好", "优秀", "超预期"];

function ScorePicker({
  pointId,
  onDone,
}: {
  pointId: number;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(score: number, useAllowance = false) {
    setSaving(true);
    setErr(null);
    try {
      await API.submitCheck({ point_id: pointId, score, note, use_allowance: useAllowance });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSaving(false);
    }
  }

  // 0 分时强制填写一行"发生了什么"——复盘的原料
  const needNote = selected === 0;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {SCORE_LABELS.map((lab, i) => (
          <button
            key={i}
            disabled={saving}
            onClick={() => setSelected(i)}
            className={cn(
              "text-xs rounded-full px-2.5 py-1 border transition-colors",
              selected === i
                ? "bg-accent text-white border-accent"
                : "border-hairline text-muted hover:border-accent hover:text-accent"
            )}
          >
            {i} · {lab}
          </button>
        ))}
      </div>
      {needNote && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="今天发生了什么？（0 分必填，这是复盘的原料）"
          className="w-full text-xs rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          disabled={selected === null || saving || (needNote && !note.trim())}
          onClick={() => selected !== null && submit(selected)}
          className="text-xs font-medium rounded-full bg-accent text-white px-4 py-1.5 disabled:opacity-40"
        >
          记录
        </button>
        <button
          disabled={saving}
          onClick={() => submit(0, true)}
          className="text-xs text-muted underline underline-offset-2"
        >
          今天用豁免
        </button>
        {err && <span className="text-xs text-zinc-500">{err}</span>}
      </div>
    </div>
  );
}

export default function TodayPage() {
  const [data, setData] = useState<{ date: string; points: TodayPoint[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => API.today().then(setData).catch((e) => setErr(String(e)));

  useEffect(() => {
    load();
  }, []);

  const actives = data?.points.filter((p) => !p.cooldown_days) ?? [];
  const coolings = data?.points.filter((p) => p.cooldown_days) ?? [];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">今日对照</h1>
        <p className="text-xs text-muted mt-1">
          {data?.date ?? "…"} · 睡前逐一打分，0 是数据不是失败
        </p>
      </header>

      {coolings.map((p) => (
        <div
          key={p.point_id}
          className="rounded-widget border border-dashed border-accent/40 bg-accent/5 px-4 py-3"
        >
          <div className="text-xs font-medium">「{p.name}」归档冷却中 · 剩 {p.cooldown_days} 天</div>
          <div className="text-[11px] text-muted mt-0.5">
            冷静想一想：是知错了，还是行断了？7 天内可随时恢复。
          </div>
        </div>
      ))}

      {actives.map((p) => (
        <WidgetCard key={p.point_id} label={p.name} pill={`${p.streak}/${p.target_days} 天`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-zinc-800">{p.contract}</div>
              <div className="text-[11px] text-muted mt-1">
                连续 {p.streak} 天 · 本月豁免剩 {p.allowance_left} 天
              </div>
            </div>
            <NumberStat value={p.checked_today ? "✓" : "—"} className="shrink-0" />
          </div>
          {!p.checked_today && <ScorePicker pointId={p.point_id} onDone={load} />}
        </WidgetCard>
      ))}

      {err && <div className="text-xs text-zinc-500">{err}</div>}
      {data && actives.length === 0 && (
        <div className="text-xs text-muted py-8 text-center">
          还没有 active 的复利点。去「复利点」页面通过意图门添加第一个。
        </div>
      )}
    </div>
  );
}
