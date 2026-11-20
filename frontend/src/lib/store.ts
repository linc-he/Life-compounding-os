import type {
  AppState,
  Category,
  ChangeLog,
  ColorToken,
  CompoundingItem,
  DailyCheckIn,
  ScoreEntry,
  Weight,
} from "@/types";
import { defaultColorToken, isColorToken } from "@/lib/palette";
import {
  BUILTIN_CATEGORY_DESCRIPTIONS,
  CATEGORY_DEFAULT_CAP,
  GLOBAL_ACTIVE_LIMIT,
  STATE_VERSION,
  SUMMARY_LIMIT,
} from "@/types";

export const STORAGE_KEY = "zhixing-compounding-os-v2";
const LEGACY_KEYS = [
  "zhixing-compounding-os-v1",
  "zhixing-compounding-os",
  "life-compounding-os",
];

const LOG_TYPES = new Set(["created", "graduated", "retired", "category"]);

/* ---------- localStorage：迁移优先，禁止因版本号丢弃用户数据 ---------- */

export function migrateState(input: unknown): AppState | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const hasShape =
    Array.isArray(raw.categories) ||
    Array.isArray(raw.items) ||
    (raw.checkIns != null && typeof raw.checkIns === "object");
  if (!hasShape) return null;

  let categories = Array.isArray(raw.categories)
    ? raw.categories.map((c, i) => migrateCategory(c, i)).filter((c): c is Category => c != null)
    : [];
  let items = Array.isArray(raw.items)
    ? raw.items.map((item, i) => migrateItem(item, i)).filter((item): item is CompoundingItem => item != null)
    : [];
  const checkIns = migrateCheckIns(raw.checkIns);
  let changeLogs = migrateLogs(raw.changeLogs);

  if (categories.length === 0) {
    categories = [
      {
        id: "cat-default",
        name: "未分类",
        description: "迁移时自动保留的分类，原有复利点与评分都未删除",
        softCap: CATEGORY_DEFAULT_CAP,
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  categories = categories
    .map((c, i) => ({ ...c, order: Number.isFinite(c.order) ? c.order : i }))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((c, i) => ({ ...c, order: i }));

  const ids = new Set(categories.map((c) => c.id));
  let repaired = 0;
  items = items.map((item) => {
    if (ids.has(item.categoryId)) return item;
    repaired += 1;
    return { ...item, categoryId: categories[0].id };
  });
  if (repaired > 0) {
    changeLogs = [
      {
        id: `log-repair-${categories[0].id}`,
        type: "category",
        title: "分类修复",
        note: `将 ${repaired} 个失去分类的复利点归入「${categories[0].name}」，评分与历史记录均保留`,
        date: todayStr(),
      },
      ...changeLogs,
    ];
  }

  return {
    version: STATE_VERSION,
    categories,
    items,
    checkIns,
    changeLogs,
  };
}

function migrateCategory(input: unknown, index: number): Category | null {
  if (!input || typeof input !== "object") return null;
  const c = input as Record<string, unknown>;
  const name = String(c.name ?? "未命名分类").trim() || "未命名分类";
  const description =
    typeof c.description === "string"
      ? c.description
      : (BUILTIN_CATEGORY_DESCRIPTIONS[name] ?? "");
  const capSource = c.softCap ?? c.softLimit ?? CATEGORY_DEFAULT_CAP;
  const capNum = Number(capSource);
  return {
    id: c.id != null ? String(c.id) : `cat-migrated-${index}`,
    name,
    description,
    softCap: Number.isFinite(capNum) ? Math.max(1, Math.round(capNum)) : CATEGORY_DEFAULT_CAP,
    order: typeof c.order === "number" && Number.isFinite(c.order) ? c.order : index,
    colorToken: isColorToken(c.colorToken) ? c.colorToken : defaultColorToken(name, index),
    ...(typeof c.archived === "boolean" ? { archived: c.archived } : {}),
    ...(typeof c.createdAt === "string" ? { createdAt: c.createdAt } : {}),
  };
}

function migrateItem(input: unknown, index: number): CompoundingItem | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;
  const status: CompoundingItem["status"] =
    item.status === "graduated" || item.status === "retired" || item.status === "active"
      ? item.status
      : "active";
  const weightNum = Number(item.weight);
  const weight = (weightNum === 1 || weightNum === 2 || weightNum === 3 ? weightNum : 2) as Weight;
  return {
    id: item.id != null ? String(item.id) : `item-migrated-${index}`,
    categoryId: String(item.categoryId ?? item.category_id ?? ""),
    title: String(item.title ?? item.name ?? "未命名复利点"),
    knowledge: String(item.knowledge ?? item.intent_reason ?? ""),
    action: String(item.action ?? item.contract ?? ""),
    weight,
    status,
    createdAt: String(item.createdAt ?? item.created_at ?? new Date().toISOString()),
  };
}

function migrateCheckIns(input: unknown): Record<string, DailyCheckIn> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, DailyCheckIn> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    const date = typeof row.date === "string" && row.date ? row.date : key;
    const itemScores: Record<string, ScoreEntry> = {};
    if (row.itemScores && typeof row.itemScores === "object" && !Array.isArray(row.itemScores)) {
      for (const [itemId, entry] of Object.entries(row.itemScores as Record<string, unknown>)) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        itemScores[itemId] = {
          score: normalizeScore(e.score),
          ...(typeof e.deviation === "string" && e.deviation ? { deviation: e.deviation } : {}),
        };
      }
    }
    const summary = typeof row.summary === "string" ? row.summary.slice(0, SUMMARY_LIMIT) : "";
    out[date] = {
      date,
      itemScores,
      subjective: normalizeScore(row.subjective),
      summary,
      sealed: Boolean(row.sealed),
    };
  }
  return out;
}

function normalizeScore(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function migrateLogs(input: unknown): ChangeLog[] {
  if (!Array.isArray(input)) return [];
  return input.map((entry, index) => {
    const log = (entry ?? {}) as Record<string, unknown>;
    const type = LOG_TYPES.has(String(log.type))
      ? (String(log.type) as ChangeLog["type"])
      : "category";
    return {
      id: log.id != null ? String(log.id) : `log-migrated-${index}`,
      type,
      title: String(log.title ?? ""),
      note: String(log.note ?? log.reason ?? ""),
      date: String(log.date ?? "").slice(0, 10),
    };
  });
}

function readStorage(key: string): unknown | undefined {
  if (typeof localStorage === "undefined") return undefined;
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function loadState(): AppState | null {
  const primary = readStorage(STORAGE_KEY);
  if (primary !== undefined) {
    const migrated = migrateState(primary);
    if (migrated) return migrated;
  }
  for (const key of LEGACY_KEYS) {
    const legacy = readStorage(key);
    if (legacy === undefined) continue;
    const migrated = migrateState(legacy);
    if (migrated) return migrated;
  }
  return null;
}

export function ensureState(): AppState {
  return loadState() ?? createEmptyState();
}

export function createEmptyState(): AppState {
  const createdAt = new Date().toISOString();
  return {
    version: STATE_VERSION,
    categories: [
      { id: "cat-learn", name: "学习与输入", description: BUILTIN_CATEGORY_DESCRIPTIONS["学习与输入"], softCap: CATEGORY_DEFAULT_CAP, order: 0, colorToken: "cobalt", createdAt },
      { id: "cat-invest", name: "投资与决策", description: BUILTIN_CATEGORY_DESCRIPTIONS["投资与决策"], softCap: CATEGORY_DEFAULT_CAP, order: 1, colorToken: "amber", createdAt },
      { id: "cat-life", name: "生活与精力", description: BUILTIN_CATEGORY_DESCRIPTIONS["生活与精力"], softCap: CATEGORY_DEFAULT_CAP, order: 2, colorToken: "emerald", createdAt },
    ],
    items: [],
    checkIns: {},
    changeLogs: [],
  };
}

export function hasUserContent(state: AppState): boolean {
  if (state.items.length > 0 || Object.keys(state.checkIns).length > 0 || state.changeLogs.length > 0) {
    return true;
  }
  const defaults = createEmptyState().categories;
  if (state.categories.length !== defaults.length) return true;
  return state.categories.some((category, index) => {
    const baseline = defaults[index];
    return !baseline ||
      category.id !== baseline.id ||
      category.name !== baseline.name ||
      category.description !== baseline.description ||
      category.softCap !== baseline.softCap ||
      category.order !== baseline.order ||
      category.colorToken !== baseline.colorToken ||
      category.archived === true;
  });
}

export function saveState(state: AppState) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: STATE_VERSION }));
  } catch {
    /* 存储满等异常静默降级 */
  }
}

export function resetState() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
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
 * 系统加权知行分。score 为 null（N/A 或未评）不计入分母。
 * 已毕业 / 已中止项目若在当日留有数值评分，仍计入，避免状态变更改写历史曲线。
 */
export function weightedScore(
  itemScores: Record<string, ScoreEntry> | undefined,
  items: CompoundingItem[]
): number | null {
  if (!itemScores) return null;
  const byId = new Map(items.map((item) => [item.id, item]));
  let sum = 0;
  let weightSum = 0;
  for (const [id, entry] of Object.entries(itemScores)) {
    if (!entry || entry.score == null) continue;
    const weight = byId.get(id)?.weight ?? 1;
    sum += entry.score * weight;
    weightSum += weight;
  }
  if (weightSum === 0) return null;
  return sum / weightSum;
}

/** 主观分 − 系统分。正数表示主观偏高。 */
export function scoreGapLabel(system: number | null, subjective: number | null): string {
  if (system == null || subjective == null) return "待对照";
  const delta = subjective - system;
  if (Math.abs(delta) < 0.05) return "知行贴合 0.0";
  const abs = Math.abs(delta).toFixed(1);
  return delta > 0 ? `主观偏高 +${abs}` : `主观偏低 −${abs}`;
}

/** 冷灰底 → 低饱和翡翠绿。只影响热力图着色，不改变分数。 */
export const HEAT_SCALE = ["#E8E8ED", "#D5E3DC", "#A9CBBB", "#5C9E86", "#2F7A62"] as const;

export function heatColor(score: number | null, sealed: boolean): string {
  if (!sealed || score == null) return HEAT_SCALE[0];
  if (score < 2) return HEAT_SCALE[1];
  if (score < 3) return HEAT_SCALE[2];
  if (score < 4) return HEAT_SCALE[3];
  return HEAT_SCALE[4];
}

export function consistencyRate(state: AppState, days = 30): number | null {
  let matched = 0;
  let total = 0;
  for (const date of lastNDates(days)) {
    const c = state.checkIns[date];
    if (!c || !c.sealed || c.subjective == null) continue;
    const sys = weightedScore(c.itemScores, state.items);
    if (sys == null) continue;
    total += 1;
    if (Math.abs(sys - c.subjective) <= 0.5) matched += 1;
  }
  return total > 0 ? matched / total : null;
}

export function sealedStreak(state: AppState): number {
  let streak = 0;
  const startToday = state.checkIns[todayStr()]?.sealed === true;
  for (let i = startToday ? 0 : 1; ; i++) {
    if (state.checkIns[daysAgoStr(i)]?.sealed) streak += 1;
    else break;
  }
  return streak;
}

export function activeQuota(state: AppState): { count: number; globalLimit: number } {
  return {
    count: state.items.filter((i) => i.status === "active").length,
    globalLimit: GLOBAL_ACTIVE_LIMIT,
  };
}

export function categoryQuota(state: AppState, categoryId: string): { count: number; limit: number } {
  const cat = state.categories.find((c) => c.id === categoryId);
  return {
    count: state.items.filter((i) => i.categoryId === categoryId && i.status === "active").length,
    limit: cat?.softCap ?? CATEGORY_DEFAULT_CAP,
  };
}

export function itemsInCategory(state: AppState, categoryId: string): CompoundingItem[] {
  return state.items.filter((item) => item.categoryId === categoryId);
}

export function sortedCategories(state: AppState, includeArchived = false): Category[] {
  return [...state.categories]
    .filter((c) => includeArchived || !c.archived)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function last7Scores(
  state: AppState,
  itemId: string
): Array<{ date: string; score: number | null; sealed: boolean }> {
  return lastNDates(7).map((date) => {
    const entry = state.checkIns[date]?.itemScores[itemId];
    return { date, score: entry?.score ?? null, sealed: state.checkIns[date]?.sealed ?? false };
  });
}

export function upsertCheckIn(
  state: AppState,
  date: string,
  patch: (c: DailyCheckIn) => DailyCheckIn
): AppState {
  const existing: DailyCheckIn = state.checkIns[date] ?? {
    date,
    itemScores: {},
    subjective: null,
    summary: "",
    sealed: false,
  };
  return {
    ...state,
    checkIns: { ...state.checkIns, [date]: patch(existing) },
  };
}

function withLog(state: AppState, log: ChangeLog): AppState {
  return { ...state, changeLogs: [log, ...state.changeLogs] };
}

export function createCategory(
  state: AppState,
  input: { name: string; description: string; softCap: number; colorToken?: ColorToken }
): AppState {
  const name = input.name.trim();
  if (!name) return state;
  const order = state.categories.reduce((max, c) => Math.max(max, c.order), -1) + 1;
  const category: Category = {
    id: uid(),
    name,
    description: input.description.trim(),
    softCap: Math.max(1, Math.round(input.softCap) || CATEGORY_DEFAULT_CAP),
    order,
    colorToken: isColorToken(input.colorToken) ? input.colorToken : defaultColorToken(name, order),
    createdAt: new Date().toISOString(),
  };
  return withLog(
    { ...state, categories: [...state.categories, category] },
    {
      id: uid(),
      type: "category",
      title: "新增分类",
      note: `「${category.name}」· ${category.description || "未写定位"} · 软上限 ${category.softCap}`,
      date: todayStr(),
    }
  );
}

export function updateCategory(
  state: AppState,
  categoryId: string,
  patch: Partial<Pick<Category, "name" | "description" | "softCap" | "colorToken">>
): AppState {
  const current = state.categories.find((c) => c.id === categoryId);
  if (!current) return state;
  const next: Category = {
    ...current,
    name: patch.name != null ? patch.name.trim() || current.name : current.name,
    description: patch.description != null ? patch.description.trim() : current.description,
    softCap:
      patch.softCap != null
        ? Math.max(1, Math.round(patch.softCap) || current.softCap)
        : current.softCap,
    colorToken:
      patch.colorToken != null && isColorToken(patch.colorToken)
        ? patch.colorToken
        : current.colorToken,
  };
  if (
    next.name === current.name &&
    next.description === current.description &&
    next.softCap === current.softCap &&
    next.colorToken === current.colorToken
  ) {
    return state;
  }
  const changes: string[] = [];
  if (next.name !== current.name) changes.push(`名称「${current.name}」→「${next.name}」`);
  if (next.description !== current.description) changes.push("更新了一句话定位");
  if (next.softCap !== current.softCap) changes.push(`软上限 ${current.softCap} → ${next.softCap}`);
  if (next.colorToken !== current.colorToken) changes.push("更换了微色标");
  return withLog(
    {
      ...state,
      categories: state.categories.map((c) => (c.id === categoryId ? next : c)),
    },
    {
      id: uid(),
      type: "category",
      title: "更新分类",
      note: `「${next.name}」${changes.join("；")}`,
      date: todayStr(),
    }
  );
}

export function moveCategory(state: AppState, categoryId: string, direction: -1 | 1): AppState {
  const visible = sortedCategories(state);
  const hidden = state.categories.filter((c) => c.archived);
  const index = visible.findIndex((c) => c.id === categoryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= visible.length) return state;
  const copy = [...visible];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved);
  const categories = [...copy, ...hidden].map((c, i) => ({ ...c, order: i }));
  return withLog(
    { ...state, categories },
    {
      id: uid(),
      type: "category",
      title: "调整排序",
      note: `「${moved.name}」${direction < 0 ? "上移" : "下移"}`,
      date: todayStr(),
    }
  );
}

export type CategoryDeleteResult =
  | { ok: true; state: AppState }
  | { ok: false; reason: "missing" | "last-category" | "needs-migration" | "invalid-target" };

/**
 * 删除分类。只要仍有任意状态的复利点，必须显式迁移；至少保留一个分类。
 * 不删除评分、封存记录或变更日志。
 */
export function deleteCategory(
  state: AppState,
  categoryId: string,
  migrateToId?: string
): CategoryDeleteResult {
  const source = state.categories.find((c) => c.id === categoryId);
  if (!source) return { ok: false, reason: "missing" };
  if (state.categories.filter((c) => !c.archived).length <= 1) {
    return { ok: false, reason: "last-category" };
  }
  const owned = itemsInCategory(state, categoryId);
  if (owned.length > 0) {
    if (!migrateToId) return { ok: false, reason: "needs-migration" };
    if (migrateToId === categoryId) return { ok: false, reason: "invalid-target" };
    const target = state.categories.find((c) => c.id === migrateToId && !c.archived);
    if (!target) return { ok: false, reason: "invalid-target" };
    const items = state.items.map((item) =>
      item.categoryId === categoryId ? { ...item, categoryId: migrateToId } : item
    );
    const categories = state.categories
      .filter((c) => c.id !== categoryId)
      .map((c, i) => ({ ...c, order: i }));
    return {
      ok: true,
      state: withLog(
        { ...state, items, categories, checkIns: state.checkIns },
        {
          id: uid(),
          type: "category",
          title: "迁移并删除分类",
          note: `「${source.name}」下 ${owned.length} 个复利点（含历史）已迁入「${target.name}」，评分与封存未删除`,
          date: todayStr(),
        }
      ),
    };
  }
  const categories = state.categories
    .filter((c) => c.id !== categoryId)
    .map((c, i) => ({ ...c, order: i }));
  return {
    ok: true,
    state: withLog(
      { ...state, categories, checkIns: state.checkIns },
      {
        id: uid(),
        type: "category",
        title: "删除分类",
        note: `「${source.name}」下没有复利点，已删除`,
        date: todayStr(),
      },
    ),
  };
}
