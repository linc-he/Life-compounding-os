import { beforeEach, describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import { buildSeedState } from "./seed";
import {
  HEAT_SCALE,
  STORAGE_KEY,
  createEmptyState,
  daysAgoStr,
  deleteCategory,
  ensureState,
  heatColor,
  hasUserContent,
  lastNDates,
  loadState,
  migrateState,
  resetState,
  saveState,
  scoreGapLabel,
  todayStr,
  weightedScore,
} from "./store";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
});

function baseState(): AppState {
  return {
    version: 2,
    categories: [
      { id: "c1", name: "学习与输入", description: "", softCap: 5, order: 1 },
      { id: "c2", name: "投资与决策", description: "自定", softCap: 3, order: 0 },
    ],
    items: [
      {
        id: "i1",
        categoryId: "c1",
        title: "阅读",
        knowledge: "知",
        action: "行",
        weight: 3,
        status: "active",
        createdAt: "2024-01-01",
      },
      {
        id: "i2",
        categoryId: "c1",
        title: "旧习惯",
        knowledge: "知",
        action: "行",
        weight: 1,
        status: "graduated",
        createdAt: "2024-01-01",
      },
    ],
    checkIns: {
      "2024-05-01": {
        date: "2024-05-01",
        itemScores: {
          i1: { score: 4, deviation: "keep" },
          i2: { score: null },
        },
        subjective: 5,
        summary: "原总结",
        sealed: true,
      },
    },
    changeLogs: [{ id: "l1", type: "created", title: "阅读", note: "n", date: "2024-05-01" }],
  };
}

describe("local migration", () => {
  it("keeps user data when version is not current and maps softLimit", () => {
    const legacy = {
      version: 1,
      categories: [{ id: "c1", name: "学习与输入", softLimit: 4, archived: false }],
      items: baseState().items,
      checkIns: baseState().checkIns,
      changeLogs: baseState().changeLogs,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    const loaded = loadState();
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(3);
    expect(loaded!.categories[0].softCap).toBe(4);
    expect(loaded!.categories[0].description).toContain("认知护城河");
    expect(loaded!.categories[0].colorToken).toBe("cobalt");
    expect(loaded!.categories[0].order).toBe(0);
    expect(loaded!.items).toHaveLength(2);
    expect(loaded!.items[1].status).toBe("graduated");
    expect(loaded!.checkIns["2024-05-01"].itemScores.i1).toEqual({ score: 4, deviation: "keep" });
    expect(loaded!.checkIns["2024-05-01"].summary).toBe("原总结");
    expect(loaded!.changeLogs.some((log) => log.id === "l1")).toBe(true);
  });

  it("does not discard a newer or unknown version", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...baseState(), version: 99 }));
    expect(loadState()?.items).toHaveLength(2);
  });

  it("falls back to a legacy key instead of seeding over it", () => {
    localStorage.setItem("zhixing-compounding-os-v1", JSON.stringify({ ...baseState(), version: 2 }));
    const loaded = ensureState();
    expect(loaded.items[0].title).toBe("阅读");
  });

  it("returns null for corrupt payloads without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{");
    expect(loadState()).toBeNull();
    expect(migrateState("nope")).toBeNull();
  });

  it("round-trips migrated state through save", () => {
    const migrated = migrateState({ ...baseState(), version: 2, categories: [{ id: "c1", name: "生活与精力", softLimit: 2 }] });
    expect(migrated).not.toBeNull();
    saveState(migrated!);
    const again = loadState();
    expect(again?.categories[0].softCap).toBe(2);
    expect(again?.categories[0].description).toContain("睡眠");
    resetState();
    expect(loadState()).toBeNull();
  });
});

describe("weighted score", () => {
  it("ignores N/A and weights the rest", () => {
    const items = baseState().items;
    const score = weightedScore(
      {
        i1: { score: 5 },
        i2: { score: null },
        missing: { score: 1 },
      },
      items
    );
    expect(score).toBeCloseTo((5 * 3 + 1 * 1) / 4);
  });

  it("returns null when every entry is N/A", () => {
    expect(weightedScore({ i1: { score: null } }, baseState().items)).toBeNull();
  });

  it("labels the gap direction", () => {
    expect(scoreGapLabel(4.2, 5)).toBe("主观偏高 +0.8");
    expect(scoreGapLabel(4.2, 3)).toBe("主观偏低 −1.2");
    expect(scoreGapLabel(4, 4)).toBe("知行贴合 0.0");
    expect(scoreGapLabel(null, 4)).toBe("待对照");
  });
});

describe("category safety", () => {
  it("refuses to delete the last category or skip migration", () => {
    const state = baseState();
    expect(deleteCategory({ ...state, categories: [state.categories[0]] }, "c1").ok).toBe(false);
    const blocked = deleteCategory(state, "c1");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe("needs-migration");
  });

  it("moves every active and historical item, preserving check-ins", () => {
    const state = baseState();
    const before = JSON.stringify(state.checkIns);
    const result = deleteCategory(state, "c1", "c2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.categories.map((c) => c.id)).toEqual(["c2"]);
    expect(result.state.items.every((item) => item.categoryId === "c2")).toBe(true);
    expect(result.state.items.find((item) => item.id === "i2")?.status).toBe("graduated");
    expect(JSON.stringify(result.state.checkIns)).toBe(before);
    expect(result.state.changeLogs[0].type).toBe("category");
    expect(result.state.changeLogs[0].note).toContain("迁入");
  });

  it("keeps an explicit color token and does not touch scores", () => {
    const migrated = migrateState({
      ...baseState(),
      categories: [
        { id: "c1", name: "学习与输入", softCap: 5, order: 0, colorToken: "rose" },
        { id: "c2", name: "自定航道", softCap: 3, order: 1 },
      ],
    });
    expect(migrated?.categories[0].colorToken).toBe("rose");
    expect(migrated?.categories[1].colorToken).toBe("amber");
    expect(migrated?.checkIns["2024-05-01"].itemScores.i1).toEqual({ score: 4, deviation: "keep" });
    expect(migrated?.items).toHaveLength(2);
  });

  it("deletes an empty category without touching history", () => {
    const state = baseState();
    const result = deleteCategory(state, "c2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.categories.map((c) => c.id)).toEqual(["c1"]);
    expect(result.state.items).toHaveLength(2);
    expect(result.state.checkIns["2024-05-01"].sealed).toBe(true);
  });
});

describe("initial state", () => {
  it("starts with built-in categories but no sample items or check-ins", () => {
    const state = createEmptyState();
    expect(state.categories.map((category) => category.name)).toEqual(["学习与输入", "投资与决策", "生活与精力"]);
    expect(state.items).toEqual([]);
    expect(state.checkIns).toEqual({});
    expect(state.changeLogs).toEqual([]);
  });

  it("distinguishes a blank snapshot from meaningful local data", () => {
    const empty = createEmptyState();
    expect(hasUserContent(empty)).toBe(false);
    expect(hasUserContent({ ...empty, items: baseState().items })).toBe(true);
    expect(hasUserContent({ ...empty, checkIns: baseState().checkIns })).toBe(true);
    expect(hasUserContent({ ...empty, categories: [...empty.categories, { id: "custom", name: "自定", description: "", softCap: 2, order: 3 }] })).toBe(true);
  });
});

describe("seed coverage", () => {
  it("covers exactly the last 90 calendar days", () => {
    const dates = lastNDates(90);
    expect(dates).toHaveLength(90);
    expect(new Set(dates).size).toBe(90);
    expect(dates[0]).toBe(daysAgoStr(89));
    expect(dates.at(-1)).toBe(todayStr());
    const seed = buildSeedState();
    for (const date of dates) {
      expect(seed.checkIns[date]?.date).toBe(date);
    }
    expect(Object.keys(seed.checkIns)).toHaveLength(90);
    const colors = new Set(
      dates.map((date) => {
        const row = seed.checkIns[date];
        return heatColor(weightedScore(row.itemScores, seed.items), row.sealed);
      })
    );
    expect(colors.has(HEAT_SCALE[0])).toBe(true);
    expect(colors.has(HEAT_SCALE[4])).toBe(true);
  });
});
