export interface Category {
  id: string;
  name: string;
  softLimit: number; // 分类软上限（活跃复利点数）
  archived: boolean;
  createdAt: string;
}

export type ItemStatus = "active" | "graduated" | "retired"; // 活跃 / 已内化毕业 / 原则修正中止
export type Weight = 1 | 2 | 3;

/** 复利点：「知」与「行」必须成对记录 */
export interface CompoundingItem {
  id: string;
  categoryId: string;
  title: string;
  knowledge: string; // 知：底层原则 —— 为什么长期值得做
  action: string; // 行：最小可执行标准 —— 什么程度算 5 星
  weight: Weight;
  status: ItemStatus;
  createdAt: string;
}

export interface ScoreEntry {
  score: number | null; // 1–5 星；null = N/A（今日未触发，不计入加权分母）
  deviation?: string; // ≤3 星时的偏差原因（一句）
}

export interface DailyCheckIn {
  date: string; // "YYYY-MM-DD"
  itemScores: Record<string, ScoreEntry>; // itemId -> score
  subjective: number | null; // 今日综合自评 1–5 星
  summary: string; // 今日一句封存总结（≤80 字）
  sealed: boolean; // 每日封存
}

export interface ChangeLog {
  id: string;
  type: "created" | "graduated" | "retired" | "category";
  title: string;
  note: string;
  date: string;
}

export interface AppState {
  version: number;
  categories: Category[];
  items: CompoundingItem[];
  checkIns: Record<string, DailyCheckIn>; // date -> check-in
  changeLogs: ChangeLog[];
}

export const GLOBAL_ACTIVE_LIMIT = 12;
export const CATEGORY_DEFAULT_LIMIT = 5;
