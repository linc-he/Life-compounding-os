import type { AppState, Category, ChangeLog, CompoundingItem, DailyCheckIn, ScoreEntry } from "@/types";
import { STATE_VERSION } from "@/types";
import { daysAgoStr, lastNDates, weightedScore } from "./store";

/** 确定性伪随机，保证种子数据稳定且可复现。 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 内置 3 分类 + 8 条活跃复利点 + 2 条历史档案 + 近 90 个日历日 */
export function buildSeedState(now = new Date()): AppState {
  const createdAt = now.toISOString();
  const rand = mulberry32(20260321);

  const categories: Category[] = [
    {
      id: "cat-learn",
      name: "学习与输入",
      description: "构建长期认知护城河",
      colorToken: "cobalt",
      softCap: 5,
      order: 0,
      createdAt,
    },
    {
      id: "cat-invest",
      name: "投资与决策",
      description: "用纪律把判断沉淀成可复利的决策",
      colorToken: "amber",
      softCap: 5,
      order: 1,
      createdAt,
    },
    {
      id: "cat-life",
      name: "生活与精力",
      description: "守住睡眠与精力这条底层利率",
      colorToken: "emerald",
      softCap: 5,
      order: 2,
      createdAt,
    },
  ];

  const items: CompoundingItem[] = [
    {
      id: "it-1",
      categoryId: "cat-learn",
      title: "公众号 AI 日更",
      knowledge: "输出是最好的输入：把每天所学转写为文章，倒逼深度理解，积累可检索的知识资产",
      action: "当天发布 ≥1 篇 AI 主题文章并附 3 条要点（4 星：有个人观点；5 星：引发评论或转发）",
      weight: 3,
      status: "active",
      createdAt,
    },
    {
      id: "it-2",
      categoryId: "cat-learn",
      title: "英文技术阅读",
      knowledge: "一手信息源永远先于二手翻译，直接读原文能保持信息时差优势",
      action: "精读 ≥2 页英文技术文档或论文并划 3 处笔记",
      weight: 2,
      status: "active",
      createdAt,
    },
    {
      id: "it-3",
      categoryId: "cat-learn",
      title: "周复盘一页",
      knowledge: "不复盘的重复是漂移，复盘把经验转成可复用的原则",
      action: "周日写下：验证了什么知 / 推翻了什么知 / 下周唯一实验",
      weight: 1,
      status: "active",
      createdAt,
    },
    {
      id: "it-4",
      categoryId: "cat-invest",
      title: "定投主航道",
      knowledge: "宽基指数长期向上且无需预测市场，纪律本身就是 alpha",
      action: "发薪日自动定投宽基，除此之外不操作",
      weight: 2,
      status: "active",
      createdAt,
    },
    {
      id: "it-5",
      categoryId: "cat-invest",
      title: "沙盒限额",
      knowledge: "赌性不可消灭只能疏导，封顶沙盒把冲动伤害限制在可承受范围",
      action: "想做杠杆只用 ≤15% 沙盒仓，亏完当月不补",
      weight: 2,
      status: "active",
      createdAt,
    },
    {
      id: "it-6",
      categoryId: "cat-invest",
      title: "投资日记",
      knowledge: "决策时的理由才是日后最珍贵的资产，情绪不记录就会自我美化",
      action: "任何一次买卖前后各记一句：预期与恐惧",
      weight: 1,
      status: "active",
      createdAt,
    },
    {
      id: "it-7",
      categoryId: "cat-life",
      title: "23:30 前入睡",
      knowledge: "睡眠是复利的底层利率，熬夜是复利的高利贷",
      action: "23:30 放下手机上床（5 星：自然醒且精神饱满）",
      weight: 3,
      status: "active",
      createdAt,
    },
    {
      id: "it-8",
      categoryId: "cat-life",
      title: "每日 20 分钟散步",
      knowledge: "身体是所有复利的容器，低速有氧同时是思考的暗房",
      action: "户外步行 ≥20 分钟，不带播客留白思考",
      weight: 1,
      status: "active",
      createdAt,
    },
    {
      id: "it-grad",
      categoryId: "cat-learn",
      title: "晨间计划 3 件事",
      knowledge: "一天只抓三件要事，其余都是噪音",
      action: "起床后写下当天仅有的 3 件事",
      weight: 1,
      status: "graduated",
      createdAt,
    },
    {
      id: "it-ret",
      categoryId: "cat-life",
      title: "每日 5 点早起",
      knowledge: "早起曾经被当成自律本身，但它和睡眠债务冲突",
      action: "5:00 起床并完成一小时深度工作",
      weight: 2,
      status: "retired",
      createdAt,
    },
  ];

  const summaries = [
    "写作进入心流，把提示词模板拆成了 3 段公开",
    "定投日，无操作就是最好的操作",
    "熬夜赶稿，次日把入睡时间重新写进标准",
    "沙盒手痒买了一点，止损执行了，没有补仓",
    "读完模型文档一章，比想象中薄",
    "只写了 1 篇但质量高，收到两条认真反馈",
    "想的和做的是同一件事",
    "陪家人，低频项记了 N/A，没有硬凑分",
    "标题实验生效，完读停留明显变长",
    "身体不适提前睡，散步改成室内拉伸",
    "英文笔记只划了两处，标准没有放水",
    "投资日记补上了昨天漏记的恐惧",
  ];
  const deviations = ["时间被切得太碎", "低估了任务难度", "情绪性拖延", "标准定得过高"];
  const bias: Record<string, number> = {
    "it-1": 0.15,
    "it-2": -0.35,
    "it-3": 0.05,
    "it-4": 0.55,
    "it-5": -0.45,
    "it-6": -0.1,
    "it-7": -0.15,
    "it-8": 0.25,
  };

  const activeItems = items.filter((item) => item.status === "active");
  const dates = lastNDates(90);
  const checkIns: Record<string, DailyCheckIn> = {};

  dates.forEach((date, idx) => {
    const isToday = idx === dates.length - 1;
    const missed = idx === 6 || idx === 21;
    const dow = new Date(date + "T12:00:00").getDay();
    const weekend = dow === 0 || dow === 6;
    const progress = idx / (dates.length - 1);
    const itemScores: Record<string, ScoreEntry> = {};

    if (!missed) {
      activeItems.forEach((item, k) => {
        if (isToday && k >= 5) return;
        const naRoll = rand();
        const na =
          naRoll < (item.id === "it-2" || item.id === "it-8" || item.id === "it-6" ? 0.1 : 0.03);
        if (na) {
          itemScores[item.id] = { score: null };
          return;
        }
        let base = 2.15 + progress * 2.05 + (bias[item.id] ?? 0);
        if (weekend && (item.id === "it-1" || item.id === "it-2")) base -= 0.45;
        if (idx === 12 || idx === 48) base -= 1.35;
        const jitter = (rand() - 0.48) * 1.35;
        const score = Math.max(1, Math.min(5, Math.round(base + jitter)));
        const entry: ScoreEntry = { score };
        if (score <= 3 && rand() < 0.55) {
          entry.deviation = deviations[Math.floor(rand() * deviations.length)];
        }
        itemScores[item.id] = entry;
      });
    }

    const sys = weightedScore(itemScores, items);
    let subjective: number | null = null;
    if (!isToday && !missed && sys != null) {
      const optimism = rand() < 0.22 ? 1 : rand() < 0.12 ? -1 : 0;
      subjective = Math.max(1, Math.min(5, Math.round(sys + optimism)));
    }
    const summary = isToday || missed ? "" : summaries[idx % summaries.length];
    checkIns[date] = {
      date,
      itemScores,
      subjective,
      summary,
      sealed: !isToday && !missed,
    };
  });

  const changeLogs: ChangeLog[] = [
    {
      id: "log-1",
      type: "created",
      title: "公众号 AI 日更",
      note: "量变到质变，先跑通 100 天",
      date: daysAgoStr(89),
    },
    {
      id: "log-2",
      type: "created",
      title: "沙盒限额",
      note: "为冲动交易建合法出口，亏完不补",
      date: daysAgoStr(89),
    },
    {
      id: "log-3",
      type: "category",
      title: "内置分类",
      note: "学习与输入 / 投资与决策 / 生活与精力",
      date: daysAgoStr(89),
    },
    {
      id: "log-4",
      type: "retired",
      title: "每日 5 点早起",
      note: "原则修正：与 23:30 入睡冲突，历史评分保留，不再追踪",
      date: daysAgoStr(40),
    },
    {
      id: "log-5",
      type: "graduated",
      title: "晨间计划 3 件事",
      note: "已内化为本能，连续 60 天无需提醒",
      date: daysAgoStr(18),
    },
  ];

  return { version: STATE_VERSION, categories, items, checkIns, changeLogs };
}
