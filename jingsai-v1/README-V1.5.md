# 竞赛一体化管理平台 · 小程序 V1.5（版本说明）

> 在 V1.4 知识分享闭环之上，把三个高频场景补成**可管理的闭环**：消息能单条处理与批量整理、同报名单自动聚成时间线；广场能点赞收藏、还能自己发帖走审核；报表可按赛项全联动、绩效可下钻到逐单。
> 视觉延续「墨纸编辑部」设计语言；数据层继续云优先 + Storage 回落，纯前端零配置演示。

---

## 一、本版本功能（V1.5 做了什么）

| 模块 | 功能 |
| --- | --- |
| **消息 · 单条操作** | 长按任意来函弹出操作单：未读可「标为已读」；带报名单的「查看报名单」直达审批；「删除该条」二次确认后移除 |
| **消息 · 批量整理** | 页头「整 理」进入多选模式：逐条勾选 / 全选 / 底部「已选 N 封 · 删除」，删除二次确认；「完成」退出。计数与未读全程联动 |
| **消息 · 同单聚合时间线** | 同一报名单 ≥2 条消息自动折叠为「卷宗」卡（队伍 · 赛项 · 报名单号 · N 条动态 · 未读数），点开展开该报名单的审批时间线，单条仍可点入；V1.5 种子新增 reg-0817 第二轮消息用于演示 |
| **广场 · 点赞收藏** | 经验帖卡新增「♥ 收藏 / ▲ 有用」两个互动钮，点击即时切换、计数 +1，状态本地持久化（重置数据前一直保留）；catchtap 防误触全文弹层 |
| **广场 · 我要发帖（审核流）** | 经验帖栏顶部「✎ 我要发帖」：标题（40 字）+ 赛事 picker（大厅全部赛项）+ 正文（600 字、≥20 字校验、实时字数）→ 提交后进**审核队列**并投递「投稿动态」站内信 |
| **广场 · 我的投稿** | 「我的投稿（N）」抽屉：状态徽章（审核中·荧光黄 / 已撤回·纸灰）、摘要留档；审核中的稿件可「撤回这篇投稿」（撤回即不再进入审核） |
| **报表 · 按赛项筛选** | 总览下新增赛项 chips（全部 + 各赛项，带全局计数、超长截断）：选中某赛项后**全部图表联动**（总览票 / 状态堆叠 / 赛道 / 教师负载 / 评审绩效），顶部「当前筛选 ✕」一键清除 |
| **报表 · 绩效下钻** | 评审绩效每一行可点 → 下钻弹层：该审批人逐单明细（通过/驳回/待审 徽章 + 队伍 + 赛项 + 报名单号 + 版本 + 时间 + 批语原文） |
| **导出 · 双维修复** | `exportCSV` 支持「状态 × 赛项」双维过滤，报表导出与当前视图严格一致（修复此前筛选参数被忽略、导出恒为全量的隐性缺陷） |

### 角色路由总览（V1.5）
```
登录页选身份 → app.login(role)
├── student → 首页学生视图（宫格 4：知识广场）
│    ├── 知识广场：点赞/收藏 → 我要发帖 → 我的投稿（撤回） → 消息中心收「投稿动态」
│    └── 审批轨迹 / 队伍 / 附件 / 防伪校验（V1.2-1.3 不变）
└── teacher / dept / college / school → 工作台（⌑ 报表 / ◔ 消息）
     ├── 报表：赛项 chips 联动 → 绩效行下钻逐单明细 → 状态×赛项双维导出
     └── 消息：四档分组 + 长按单条 + 整理批量删 + 同单卷宗时间线
```

---

## 二、代码说明

### 数据层 `utils/data.js`（V1.5 新增/调整）
| API / 函数 | 说明 |
| --- | --- |
| `markMsgRead(id)` | 单条标已读（替代页面直写 Storage 的旧写法，统一入口） |
| `removeMsg(id)` / `removeMsgs(ids)` | 删除单条 / 批量删除，写回前 50 条上限 |
| `regBrief(regId)` | 报名单简报（regNo / compTitle / teamName），供卷宗卡头与跳转用 |
| `exportCSV(status, comp)` | **双维过滤**：status 与 comp 传 `'all'`/空 = 该维不过滤；修复了此前忽略参数恒导全量的缺陷 |
| `reportStats(comp)` | 可选赛项过滤：传 compTitle（或 `'all'`/空 = 全量）后所有维度（总量/状态/赛道/教师/绩效）在过滤集上聚合 |
| `approverDetail(name)` | 绩效下钻明细：遍历报名单节点，凡 approver 为该人 → `{regNo, compTitle, teamName, version, act:通过/驳回/待审, time, note}` |
| `getPlazaState()` | 广场互动状态 `{liked:[], faved:[]}`（新键 `K.PLAZA = 'js_plaza'`） |
| `togglePlazaLike(id)` / `togglePlazaFav(id)` | 点赞/收藏切换并持久化，返回最新状态 |
| `submitPost(p)` | 投稿入 `K.POSTS = 'js_posts'`（status `'pending'`），作者取自当前登录用户，正文按行拆段，投递「投稿动态」notice 消息 |
| `getMyPosts()` | 我的投稿列表（空为 `[]`，无种子） |
| `withdrawPost(id)` | 撤回待审稿（仅 pending 可撤），置 `withdrawn` 留档并发消息 |

> 存储键新增 `js_plaza`、`js_posts`，重置演示数据一并清除；旧键结构不变，V1.0—V1.4 数据可直接升级。

### 消息中心 `pages/messages/`（V1.5 重构）
- 渲染模型改为 `rows`：`{kind:'msg'}` 单条 / `{kind:'thread'}` 卷宗；`buildRows()` 统计同 regId 消息数（≥2 折叠），组落在其首条消息原位置、不打断整体时间序；thread 携带 `titleText/regNo/unreadN/checked/part/open` 预计算标志（WXML 不承载逻辑）。
- 折叠态 `openThreads{}` 页面态存 regId→bool；整理模式下强制全展开、以 thread 为勾选粒度（勾选=整组删除）。
- `picked[]` 统一存消息 `_id`：单条勾选=自身，thread 勾选=组内全部 `_id`，`delPicked()` 直接 `removeMsgs(picked)`，语义自洽无需展开映射。
- 长按 `msgActs()` 用 `wx.showActionSheet` 动态拼菜单；删除类操作一律 `showModal` 二次确认。

### 知识广场 `pages/plaza/`（V1.5 增量）
- `refresh()` 读 `getPlazaState()` 装饰每帖 `isLiked/isFaved/likesN`；`likePost/favPost` 用 `catchtap` 阻断卡片 `openPost` 冒泡。
- 发帖弹层复用 `pl-mask/pl-modal` 家族样式：`picker` 数据源 = `data.getCompetitions()` 全赛项；正文 `<textarea>` 600 字上限 + `{{pubBody.length}}` 实时计数；提交校验（标题/赛事/≥20 字）。
- 顶部黄条 `pub-banner` 由 `pubTip`（审核中稿数）驱动；「我的投稿」抽屉逐条渲染状态徽章与撤回动作（`catchtap` 防冒泡）。
- `submitPost` 落库后经验帖列表不变（待审稿不混入广场已发布内容），体验与"审核通过后再展示"的语义一致。

### 报表中心 `pages/reports/`（V1.5 增量）
- `refresh()` 调两次聚合：`reportStats()` 全量给 chips 计数（不随筛选跳变），`reportStats(compFilter)` 给展示聚合；`short()` 截断超长赛项名。
- 绩效行 `bindtap="openDrill"` 取 `approverDetail(name)` 灌入 `drill{name,rows}` 弹层；行尾「↘ 逐单明细」引导。
- 导出按钮直接 `exportCSV(filter, compFilter)`，`exportHint` 文案拼成「状态 · 赛项」。
- 版本号统一 V1.5.0（settings 同步）。

### 兼容性
Storage 旧键结构不变，新增 `js_plaza` / `js_posts` 两键；`exportCSV`/`reportStats` 新参数均可省略（向后兼容）；消息中心 `rows/openThreads/manage/picked` 均为页面态无持久化。种子新增 msg-005（reg-0817 第二轮消息）需「我的 → 重置演示数据」后可见。重置路径不变。

---

## 三、下一版本迭代功能（V1.6）

- **后端接入（方案待定，本次起正式立项）**：在「微信云开发 / 自建 Node HTTP / Python FastAPI」三者间定案后，将 utils/data.js 的消息、报名、审批、投稿集合迁移到服务端，前端保留 Storage 降级层做离线与演示
- **服务端签名防伪**：节点哈希改由服务端私钥签名（HMAC/国密），客户端只验签不产签——关闭客户端哈希的演示级边界（需后端）
- **订阅消息正式推送**：小程序后台申请模板 ID → `requestSubscribeMessage` 走真推送；审批通过 / 驳回 / 催办 / 投稿审核按事件下发服务通知（需真机 + 后台配置）
- **消息能力**：按报名单聚合时间线已落地（V1.5），继续补「报名单跳转定位到具体节点」、消息分页加载
- **知识广场**：帖子独立详情页、收藏夹管理（已收藏列表入口）、我的投稿「再编辑 / 重新提交」、经验帖作者身份接入真实用户
- **报表增强**：XLSX 导出（sheetjs）、按日期范围筛选、绩效环比（本周期 vs 上周期）
