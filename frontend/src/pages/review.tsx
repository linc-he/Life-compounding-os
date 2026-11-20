import { useEffect, useState } from "react";
import { API, type Review } from "@/lib/api";
import { WidgetCard } from "@/components/widget-card";

/**
 * 周复盘页：三栏结构 —— 验证了什么知 / 推翻了什么知 / 下周唯一实验。
 * 这是知行合一的校验环节：行不通的知要修正，做不到的行要拆解。
 */

export default function ReviewPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [draft, setDraft] = useState({
    period_start: "",
    period_end: "",
    validated: "",
    overturned: "",
    next_experiment: "",
  });
  const [err, setErr] = useState<string | null>(null);

  const load = () => API.listReviews("weekly").then(setReviews).catch((e) => setErr(String(e)));
  useEffect(() => {
    load();
    // 默认填充本周区间（周一 ~ 今天）
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 周一=0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setDraft((d) => ({ ...d, period_start: fmt(monday), period_end: fmt(now) }));
  }, []);

  async function save() {
    setErr(null);
    try {
      await API.upsertReview({ kind: "weekly", ...draft });
      setDraft((d) => ({ ...d, validated: "", overturned: "", next_experiment: "" }));
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">周复盘</h1>
        <p className="text-xs text-muted mt-1">
          {draft.period_start} ~ {draft.period_end}
        </p>
      </header>

      <WidgetCard label="本周验证了什么知" pill="知">
        <textarea
          rows={3}
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          placeholder="哪个认知被行动验证有效？例：写 1 篇比写 2 篇的完成率更高"
          value={draft.validated}
          onChange={(e) => setDraft({ ...draft, validated: e.target.value })}
        />
      </WidgetCard>

      <WidgetCard label="本周推翻了什么知" pill="行">
        <textarea
          rows={3}
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          placeholder="哪个认知被行动证伪？例：原以为周末能补两篇，实际完全不想写"
          value={draft.overturned}
          onChange={(e) => setDraft({ ...draft, overturned: e.target.value })}
        />
      </WidgetCard>

      <WidgetCard label="下周唯一实验" pill="一">
        <textarea
          rows={2}
          className="w-full text-sm rounded-xl border border-hairline px-3 py-2 outline-none focus:border-accent"
          placeholder="一次只改一个变量。例：下周所有文章标题改用疑问式"
          value={draft.next_experiment}
          onChange={(e) => setDraft({ ...draft, next_experiment: e.target.value })}
        />
      </WidgetCard>

      <button
        onClick={save}
        className="w-full text-sm font-medium rounded-full bg-accent text-white px-4 py-2.5"
      >
        保存本周复盘
      </button>
      {err && <div className="text-xs text-zinc-500">{err}</div>}

      {reviews.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-medium text-muted">历史复盘</h2>
          {reviews.map((r) => (
            <WidgetCard key={r.id} label={`${r.period_start} ~ ${r.period_end}`} pill="周">
              <dl className="space-y-2 text-xs">
                {r.validated && (
                  <div>
                    <dt className="text-muted">验证</dt>
                    <dd className="text-zinc-800">{r.validated}</dd>
                  </div>
                )}
                {r.overturned && (
                  <div>
                    <dt className="text-muted">推翻</dt>
                    <dd className="text-zinc-800">{r.overturned}</dd>
                  </div>
                )}
                {r.next_experiment && (
                  <div>
                    <dt className="text-muted">实验</dt>
                    <dd className="text-zinc-800">{r.next_experiment}</dd>
                  </div>
                )}
              </dl>
            </WidgetCard>
          ))}
        </div>
      )}
    </div>
  );
}
