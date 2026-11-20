/** 分类微色板。仅用于圆点、浅底徽章与进度条，不参与评分。 */
export const COLOR_TOKENS = ["cobalt", "amber", "emerald", "indigo", "rose", "graphite"] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

export interface Category {
  id: string;
  name: string;
  /** 一句话定位 */
  description: string;
  /** 建议活跃软上限 */
  softCap: number;
  /** 排序权重，侧栏与每日分组共用 */
  order: number;
  /** 6 色微色标。旧数据缺失时由迁移补默认值，不改评分与条目。 */
  colorToken?: ColorToken;
  /** 旧数据兼容字段，不参与展示时过滤 */
  archived?: boolean;
  createdAt?: string;
}

export type ItemStatus = "active" | "graduated" | "retired";
export type Weight = 1 | 2 | 3;

/** 复利点：「知」与「行」必须成对记录 */
export interface CompoundingItem {
  id: string;
  categoryId: string;
  title: string;
  knowledge: string;
  action: string;
  weight: Weight;
  status: ItemStatus;
  createdAt: string;
}

export interface ScoreEntry {
  score: number | null; // 1–5；null = N/A，不计入加权分母
  deviation?: string;
}

export interface DailyCheckIn {
  date: string; // YYYY-MM-DD
  itemScores: Record<string, ScoreEntry>;
  subjective: number | null;
  summary: string;
  sealed: boolean;
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
  checkIns: Record<string, DailyCheckIn>;
  changeLogs: ChangeLog[];
}

export const GLOBAL_ACTIVE_LIMIT = 12;
export const CATEGORY_DEFAULT_CAP = 5;
export const STATE_VERSION = 3;
export const SUMMARY_LIMIT = 80;

export const BUILTIN_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  学习与输入: "构建长期认知护城河",
  投资与决策: "用纪律把判断沉淀成可复利的决策",
  生活与精力: "守住睡眠与精力这条底层利率",
};
