import type { AppState, Category, CompoundingItem, DailyCheckIn, ScoreEntry, ChangeLog } from "@/types";
import { daysAgoStr, lastNDates, uid, weightedScore } from "./store";

/** 内置 3 分类 + 8 复利点 + 近 30 天真实感模拟数据 */
export function buildSeedState(): AppState {
  const now = new Date().toISOString();

  const categories: Category[] = [
    { id: "cat-learn", name: "学习与输入", softLimit: 5, archived: false, createdAt: now },
    { id: "cat-invest", name: "投资与决策", softLimit: 5, archived: false, createdAt: now },
    { id: "cat-life", name: "生活与精力", softLimit: 5, archived: false, createdAt: now },
  ];

  const items: CompoundingItem[] = [
    {
      id: "it-1", categoryId: "cat-learn", title: "公众号 AI 日更",
      knowledge: "输出是最好的输入：把每天所学转写为文章，倒逼深度理解，积累可检索的知识资产",
      action: "当天发布 ≥1 篇 AI 主题文章并附 3 条要点（1–3 星：仅完成；4 星：有个人观点；5 星：引发评论或转发）",
      weight: 3, status: "active", createdAt: now,
    },
    {
      id: "it-2", categoryId: "cat-learn", title: "英文技术阅读",
      knowledge: "一手信息源永远先于二手翻译，直接读原文能保持信息时差优势",
      action: "精读 ≥2 页英文技术文档或论文并划 3 处笔记",
      weight: 2, status: "active", createdAt: now,
    },
    {
      id: "it-3", categoryId: "cat-learn", title: "周复盘一页",
      knowledge: "不复盘的重复是漂移，复盘把经验转成可复用的原则",
      action: "周日写下：验证了什么知 / 推翻了什么知 / 下周唯一实验",
      weight: 1, status: "active", createdAt: now,
    },
    {
      id: "it-4", categoryId: "cat-invest", title: "定投主航道",
      knowledge: "宽基指数长期向上且无需预测市场，纪律本身就是 alpha",
      action: "发薪日自动定投 VOO + 少量 QQQ，除此之外不操作",
      weight: 2, status: "active", createdAt: now,
    },
    {
      id: "it-5", categoryId: "cat-invest", title: "沙盒限额",
      knowledge: "赌性不可消灭只能疏导，封顶沙盒把冲动伤害限制在可承受范围",
      action: "想买 SOXL/TQQQ 只用 ≤15% 沙盒仓，亏完当月不补",
      weight: 2, status: "active", createdAt: now,
    },
    {
      id: "it-6", categoryId: "cat-invest", title: "投资日记",
      knowledge: "决策时的理由才是日后最珍贵的资产，情绪不记录就会自我美化",
      action: "任何一次买卖前后各记一句：预期与恐惧",
      weight: 1, status: "active", createdAt: now,
    },
    {
      id: "it-7", categoryId: "cat-life", title: "23:30 前入睡",
      knowledge: "睡眠是复利的底层利率，熬夜是复利的高利贷",
      action: "23:30 放下手机上床（5 星：自然醒且精神饱满）",
      weight: 3, status: "active", createdAt: now,
    },
    {
      id: "it-8", categoryId: "cat-life", title: "每日 20 分钟散步",
      knowledge: "身体是所有复利的容器，低速有氧同时是思考的暗房",
      action: "户外步行 ≥20 分钟，不带播客留白思考",
      weight: 1, status: "active", createdAt: now,
    },
  ];

  const summaries = [
    "写作进入心流，把提示词模板拆成了 3 段公开",
    "定投日，无操作就是最好的操作",
    "熬夜赶稿，次日修正了作息",
    "沙盒手痒买了一点 SOXL，止损执行了，没有补仓",
    "读完模型文档一章，比想象中薄",
    "周末只写了 1 篇但质量高，收到 2 条付费咨询意向",
    "一致率满分的一天：想的和做的是同一件事",
    "陪家人，低频项 N/A 较多，正常",
    "标题实验生效，完读率 +18%",
    "身体不适提前睡，散步改拉伸",
  ];

  const deviations = ["时间被切得太碎", "低估了任务难度", "情绪性拖延", "标准定得过高"];

  const activeItems = items.filter((i) => i.status === "active");
  const checkIns: Record<string, DailyCheckIn> = {};
  const dates = lastNDates(30);

  dates.forEach((date, idx) => {
    const isToday = idx === dates.length - 1;
    const progress = idx / (dates.length - 1); // 0 -> 1 上升基线
    const itemScores: Record<string, ScoreEntry> = {};

    for (let k = 0; k < activeItems.length; k++) {
      const item = activeItems[k];
      // 今天最后一项留空，让用户亲手体验打分
      if (isToday && k === activeItems.length - 1) {
        itemScores[item.id] = { score: null };
        continue;
      }
      const na = Math.random() < 0.08 && (item.id === "it-2" || item.id === "it-8");
      if (na) {
        itemScores[item.id] = { score: null };
      } else {
        const base = 2.2 + progress * 2.0; // 2.2 -> 4.2
        const jitter = (Math.random() - 0.5) * 1.8;
        const score = Math.max(1, Math.min(5, Math.round(base + jitter)));
        const entry: ScoreEntry = { score };
        if (score <= 3 && Math.random() < 0.5) {
          entry.deviation = deviations[Math.floor(Math.random() * deviations.length)];
        }
        itemScores[item.id] = entry;
      }
    }

    const sys = weightedScore(itemScores, items);
    const subjective =
      sys == null ? null : Math.max(1, Math.min(5, Math.round(sys + (Math.random() - 0.5))));
    const summary = isToday ? "" : summaries[Math.floor(idx / 3) % summaries.length];

    checkIns[date] = { date, itemScores, subjective, summary, sealed: !isToday };
  });

  const changeLogs: ChangeLog[] = [
    { id: uid(), type: "created", title: "公众号 AI 日更", note: "量变到质变，先跑通 100 天", date: daysAgoStr(29) },
    { id: uid(), type: "created", title: "沙盒限额", note: "为 SOXL 冲动建合法出口，亏完不补", date: daysAgoStr(29) },
    { id: uid(), type: "retired", title: "每日 5 点早起", note: "原则修正：与作息类冲突，合并入 23:30 入睡标准", date: daysAgoStr(12) },
    { id: uid(), type: "graduated", title: "晨间计划 3 件事", note: "已内化为本能，连续 60 天无需提醒", date: daysAgoStr(8) },
  ];

  return { version: 2, categories, items, checkIns, changeLogs };
}
