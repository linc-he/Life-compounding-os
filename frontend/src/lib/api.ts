// ---------- 旧版后端 API 类型（保留，不与本地复利模型混用） ----------

import type { AppState } from "@/types";

export interface Category {
  id: number;
  name: string;
}

export type PointStatus = "pending" | "active" | "archiving" | "archived";

export interface Point {
  id: number;
  category_id: number;
  name: string;
  intent_reason: string;
  contract: string;
  measure: string;
  target_days: number;
  status: PointStatus;
  archived_reason?: string;
  archived_cause?: "wrong_knowledge" | "broken_execution";
  activated_at?: string | null;
  archived_at?: string | null;
  created_at: string;
}

export interface TodayPoint {
  point_id: number;
  name: string;
  contract: string;
  category_id: number;
  streak: number;
  target_days: number;
  checked_today: boolean;
  allowance_left: number;
  cooldown_days?: number;
}

export interface TodayResponse {
  date: string;
  points: TodayPoint[];
}

export interface DailyCheck {
  id: number;
  point_id: number;
  check_date: string;
  score: number;
  note?: string;
  used_allowance: boolean;
}

export interface PointEvent {
  id: number;
  point_id: number;
  event_type: string;
  reason?: string;
  status: string;
  expires_at?: string | null;
  created_at: string;
}

export interface Review {
  id: number;
  kind: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  validated?: string;
  overturned?: string;
  next_experiment?: string;
}

/**
 * JSON API helper。定义并导出于本文件，避免从 utils 反向导入造成悬空或循环依赖。
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const API = {
	getAppState: () => api<{ state: unknown | null; updated_at?: string }>("/api/app-state"),
	saveAppState: (state: AppState) =>
		api<{ ok: boolean }>("/api/app-state", { method: "PUT", body: JSON.stringify({ state }) }),
	today: () => api<TodayResponse>("/api/today"),
  submitCheck: (body: { point_id: number; score: number; note?: string; use_allowance?: boolean }) =>
    api<DailyCheck>("/api/checks", { method: "POST", body: JSON.stringify(body) }),
  listPoints: (status?: string) =>
    api<Point[]>(`/api/points${status ? `?status=${status}` : ""}`),
  createPoint: (body: {
    category_id: number;
    name: string;
    intent_reason: string;
    contract: string;
    measure: string;
    target_days?: number;
  }) => api<Point>("/api/points", { method: "POST", body: JSON.stringify(body) }),
  activatePoint: (id: number) => api<Point>(`/api/points/${id}/activate`, { method: "POST" }),
  archivePoint: (id: number, body: { reason: string; cause: string }) =>
    api<Point>(`/api/points/${id}/archive`, { method: "POST", body: JSON.stringify(body) }),
  restorePoint: (id: number) => api<Point>(`/api/points/${id}/restore`, { method: "POST" }),
  confirmArchive: (id: number) =>
    api<Point>(`/api/points/${id}/confirm-archive`, { method: "POST" }),
  categories: () => api<Category[]>("/api/categories"),
  events: (pointId?: number) =>
    api<PointEvent[]>(`/api/events${pointId ? `?point_id=${pointId}` : ""}`),
  upsertReview: (body: Omit<Review, "id">) =>
    api<Review>("/api/reviews", { method: "POST", body: JSON.stringify(body) }),
  listReviews: (kind?: string) =>
    api<Review[]>(`/api/reviews${kind ? `?kind=${kind}` : ""}`),
};
