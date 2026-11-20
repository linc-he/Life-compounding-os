import type { AppState, CompoundingItem, ScoreEntry, DailyCheckIn } from "@/types";
import { buildSeedState } from "./seed";

const STORAGE_KEY = "zhixing-compounding-os-v2";

/* ---------- localStorage 持久化 ---------- */

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 存储满等异常静默降级 */
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}

/* ---------- 日期工具 ---------- */

export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return fmtDate(new Date());
}

export function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtDate(d);
}

export function lastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgoStr(n - 1 - i));
}

export function cnWeekday(dateStr: string): string {
  const names = ["日", "一", "二", "三", "四", "五", "六"];
  return "周" + names[new Date(dateStr + "T12:00:00").getDay()];
}

export function shiftDate(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return fmtDate(d);
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- 评分与统计 ---------- */

/**
 * 系统加权知行分：所有非 N/A 项的加权五星均分。
 * N/A（今日未触发）不计入分母。
 */
export function weightedScore(
  itemScores: Record<string, ScoreEntry>,
  items: CompoundingItem[]
): number | null {
  const active = items.filter((i) => i.status === "active");
  let sum = 0;
  let weightSum = 0;
  for (const item of active) {
    const entry = itemScores[item.id];
    if (!entry || entry.score == null) continue; // 未评 / N/A 不计
    sum += entry.score * item.weight;
    weightSum += item.weight;
  }
  if (weightSum === 0) return null;
  return sum / weightSum;
}

/** 30 日知行一致率：|系统分 - 主观分| ≤ 0.5 的封存日占比 */
export function consistencyRate(state: AppState, days = 30): number | null {
  let matched = 0;
  let total = 0;
  for (const date of lastNDates(days)) {
    const c = state.checkIns[date];
    if (!c || !c.sealed || c.subjective == null) continue;
    const sys = weightedScore(c.itemScores, state.items);
    if (sys == null) continue;
    total++;
    if (Math.abs(sys - c.subjective) <= 0.5) matched++;
  }
  return total > 0 ? matched / total : null;
}

/** 连续封存天数（今天未封存不算断，从昨天回溯） */
export function sealedStreak(state: AppState): number {
  let streak = 0;
  const startToday = state.checkIns[todayStr()]?.sealed === true;
  for (let i = startToday ? 0 : 1; ; i++) {
    if (state.checkIns[daysAgoStr(i)]?.sealed) streak++;
    else break;
  }
  return streak;
}

/** 活跃复利点配额 */
export function activeQuota(state: AppState): { count: number; globalLimit: number } {
  return {
    count: state.items.filter((i) => i.status === "active").length,
    globalLimit: 12,
  };
}

/** 分类活跃配额 */
export function categoryQuota(state: AppState, categoryId: string): { count: number; limit: number } {
  const cat = state.categories.find((c) => c.id === categoryId);
  return {
    count: state.items.filter((i) => i.categoryId === categoryId && i.status === "active").length,
    limit: cat?.softLimit ?? 5,
  };
}

/** 近 7 天微点阵数据（用于展开行） */
export function last7Scores(
  state: AppState,
  itemId: string
): Array<{ date: string; score: number | null; sealed: boolean }> {
  return lastNDates(7).map((date) => {
    const entry = state.checkIns[date]?.itemScores[itemId];
    return { date, score: entry?.score ?? null, sealed: state.checkIns[date]?.sealed ?? false };
  });
}

/** 更新或创建某日 check-in（不可变写法） */
export function upsertCheckIn(
  state: AppState,
  date: string,
  patch: (c: DailyCheckIn) => DailyCheckIn
): AppState {
  const existing: DailyCheckIn =
    state.checkIns[date] ??
    { date, itemScores: {}, subjective: null, summary: "", sealed: false };
  return {
    ...state,
    checkIns: { ...state.checkIns, [date]: patch(existing) },
  };
}
