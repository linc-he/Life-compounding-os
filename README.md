# Life Compounding OS — 人生复利系统

> 核心主题：**知行合一** —— 降低正确行为的执行成本，提高错误行为的执行成本。

一个自我管理的复利系统，覆盖三个领域：**学习、投资、生活习惯**。

## 系统理念

复利公式：**本金 × 增长率 × 时间 + 不中断**。多数人失败不在前两项，而在"中断"——而中断的根源是知行脱节。本系统不靠意志力，靠机制：

| 机制 | 说明 |
|---|---|
| 最低契约 | 每个复利点的日常目标必须低到不会失败（如"每天至少 1 篇"而非"每天 2 篇"） |
| 意图门（添加门槛） | 添加复利点必须回答"意图四问"，并经过 24 小时冷静期 |
| 冷却期（删除门槛） | 没有删除，只有归档；归档需填原因并归因（知错了 vs 行断了），7 天冷却期内可恢复 |
| 聚焦上限 | 同时 active 的复利点 ≤ 5，超出必须先归档一个 |
| 每日对照评分 | 0–5 分制；0 分需记录"发生了什么"；每月 2 天豁免，不断连续记录 |
| 周复盘 | 三栏结构：本周验证了什么知 / 推翻了什么知 / 下周唯一实验 |
| 领先指标优先 | 看完成率、完读率等领先指标，而非粉丝数等滞后指标 |

## 状态机

```
pending ──(24h 冷静期后手动确认)──> active ──(申请归档: 原因+归因)──> archiving ──(7天冷却期满确认)──> archived
   ^                                   |                                 |
   └── 新建点进入这里                    └─────(冷却期内可一键恢复)─────────┘
```

## 技术栈

```
后端：Go + Gin + SQLite (glebarez/sqlite，纯 Go 驱动，免 CGO)
前端：Vite + React + TypeScript + Tailwind CSS + minimal-cards 设计语言
组件：shadcn/ui 兼容生态（cult-ui https://www.cult-ui.com/ 按需引入）
通信：REST + JSON，前端 /api 代理到 :8080
```

## 运行

```bash
# 后端
cd backend
go mod tidy
go run main.go          # 监听 :8080，自动建表 + 预置分类

# 前端
cd frontend
npm install
npm run dev             # http://localhost:5173
```

当前前端状态会通过 `/api/app-state` 写入 SQLite 的 `app_state_snapshots` 表；浏览器 localStorage 作为离线缓存。数据库为空或只有空白初始状态时，已有浏览器记录会自动迁入；全新安装使用空白状态（不生成示例评分）。数据库默认位置为 `backend/data/life.db`，可通过 `LIFE_DB_PATH` 覆盖；服务端口默认 8080，可通过 `LIFE_PORT` 覆盖。Vite 默认代理到 8080，也可用 `VITE_API_PROXY_TARGET` 指定其他后端地址。

## API 概览

| 方法 | 路径 | 作用 |
|---|---|---|
| GET/PUT | `/api/app-state` | 读取 / 持久化当前前端状态快照（SQLite） |
| GET | `/api/today` | 今日检查清单（streak、豁免余量、冷却提醒） |
| POST | `/api/checks` | 提交评分（0–5 分；0 分可选用月豁免） |
| GET/POST | `/api/points` | 列表 / 提交添加申请（意图四问） |
| POST | `/api/points/:id/activate` | 冷静期满后确认激活 |
| POST | `/api/points/:id/archive` | 申请归档（必须带 reason + cause） |
| POST | `/api/points/:id/restore` | 冷却期内恢复 |
| POST | `/api/points/:id/confirm-archive` | 冷却期满确认 |
| GET | `/api/categories` | 复利分类 |
| GET | `/api/events` | 审计日志 |
| GET/POST | `/api/reviews` | 周/月复盘 |

## 设计语言（minimal-cards）

数字卡片遵循 [minimal-cards] 设计规范：

- 舞台浅灰 `#ECECEB`，白卡片 22px 圆角，发丝描边 + 柔和长影
- 单一 accent 强调色，未点亮元素统一为 `#EBEBEE`
- 卡片头部统一：5px accent 圆点 + 灰色小标签（左），灰胶囊（右）
- 大数字 Inter 600 + tabular figures（`tnum`），数字变化时不跳动
- 界面干净整洁：大量留白，无渐变，无重阴影

## 目录结构

```
backend/
├── main.go                       # Gin 路由注册
├── internal/
│   ├── model/model.go            # Category, Point, DailyCheck, PointEvent, Review
│   ├── handler/points.go         # 意图门 + 冷却期
│   ├── handler/checks.go         # 今日清单 + 评分 + streak
│   └── handler/misc.go           # 分类 / 审计 / 复盘
└── internal/store/store.go       # SQLite 初始化 + 迁移 + 预置分类

frontend/
├── src/
│   ├── main.tsx                  # 路由 + 顶部导航
│   ├── index.css                 # Tailwind + Inter tabular figures
│   ├── pages/today.tsx           # 今日对照（打分卡片）
│   ├── pages/points.tsx          # 复利点（意图门向导 + 冷却）
│   ├── pages/review.tsx          # 周复盘（三栏结构）
│   ├── components/widget-card.tsx  # minimal-cards 基础卡片
│   └── lib/{api.ts,utils.ts}     # 类型化 API 客户端
```

## 路线图

- [x] 第 1 步：SQLite schema + Gin CRUD
- [x] 第 2 步："今日"页打分闭环
- [x] 第 3 步：意图门 + 冷却期机制
- [x] 第 4 步：周复盘页
- [ ] 第 5 步：看板（完成率热力图、趋势线，Recharts）
- [ ] 第 6 步：cult-ui 动效组件按需引入（数字滚动、卡片入场）
- [ ] 第 7 步：月复盘 + 月度归因报告（知错/行断比例统计）

## 许可

MIT
