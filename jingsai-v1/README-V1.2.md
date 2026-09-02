# 竞赛一体化管理平台 · 小程序 V1.2（版本说明）

> 在 V1.1 教师审批工作台基础上，补齐**多级评审角色**与**审批链深化**：手写签名、附件预览、队伍管理、CSV 导出。
> 视觉延续「墨纸编辑部」设计语言；页面结构兼容 V1.0 / V1.1 数据（无需清空本地存储）。

---

## 一、本版本功能（V1.2 做了什么）

| 模块 | 功能 |
| --- | --- |
| **评审票根（系级/院级/校级）** | 登录页新增「评审票根」（V1.2 启用）：系级评审王建国（DEPT-2015-0088 · 系主任）。审批角色从「仅教师」扩展为四类：`teacher / dept / college / school` |
| **审批角色统一分流** | `APPROVER_ROLES` 提升为全局常量（data.js），首页工作台卡片、我的页档案统计、审批中心三处按角色判断，任意评审角色登录都进入工作台视图，不再只认 `role === 'teacher'` |
| **canvas 手写签名板** | 审批人点「✎ 签名通过」弹出签名板：Canvas 2D 真笔迹（墨色 #1A1815、圆头圆角、dpr 高清适配），支持重写/取消；确认后签名以 base64 PNG 写入审批链节点 `node.signature` |
| **签名上链可回看** | 学生端「我发起的」审批轨迹中，已通过节点渲染真实签名图片（虚线框 + 墨迹），审批留痕真实可查 |
| **附件预览** | 报名单新增计划书附件行（plan-row）：云开发可用时按 fileID 下载预览，否则回落内置演示 PDF（`assets/demo-plan.pdf`）→ `wx.openDocument` 打开（支持转发/菜单） |
| **队伍管理** | 学生端每张报名单可「管理队伍」：从队员邀请池（5 人）拉人入队（上限 8 人）、移出队员（队长受保护不可移除），变更实时写回报名单并记操作日志 |
| **报名汇总导出（CSV）** | 审批人页头新增「导出 CSV」：生成 9 列汇总表（报名单号/竞赛/队伍/版本/状态/指导教师/截止日/队长/人数），写入 `registrations.csv`，弹窗一键复制到剪贴板 |
| **种子数据修正** | `reg-0817` 夜航西飞 v2 系级节点由 `reject` 修正为 `waiting`，与消息中心 msg-002「当前停留：系级审核」一致——系级评审王建国登录即有 1 件待办可演示 |

### 角色路由总览（V1.2）
```
登录页选身份 → app.login(role)
├── student → 首页学生视图（报名进度）→ 审批页「我发起的」（含队伍管理 / 附件预览）
└── teacher / dept / college / school → 首页审批人工作台 → 审批页「待我审批 / 我处理过的」
    ├── 通过 → ✎ 签名板手写 → 盖章通过（签名落链）
    ├── 驳回 → 4 条模板批语
    └── 页头「导出 CSV」汇总全部报名
```

---

## 二、代码说明

### 数据层 `utils/data.js`（V1.2 新增/调整）
| API | 说明 |
| --- | --- |
| `APPROVER_ROLES` | 全局常量 `['teacher','dept','college','school']`，home / profile / approval 三页共用 |
| `mockUser('dept')` | 系级评审档案：王建国 / DEPT-2015-0088 / 系主任 / tagline「系级评审 · 五级审批第二关」 |
| `act(regId, action, note, signature)` | 签名感知：`action==='pass' && signature` 时写 `node.signature = 'data:image/png;base64,...'`，随卷宗持久化 |
| `updateTeam(regId, members)` | 队伍成员写回 + 操作日志（换人/退出/邀请共用） |
| `exportCSV()` | 9 列 CSV：`esc()` 双重引号转义，状态映射中文（审批中/已驳回/已通过/已撤回），返回字符串 |
| `previewPlan(reg)` | Promise：云 fileID → `wx.cloud.downloadFile`；否则内置 `demo-plan.pdf` 复制到 `USER_DATA_PATH`；均失败则 reject（前端 toast 演示模式） |

### 审批页 `pages/approval/`（V1.2 重写）
- **签名画布**：`pass(e)` 打开弹窗 → 120ms 后 `initSigCanvas()`（`createSelectorQuery().in(this).select('#sigCanvas').fields({node:true,size:true})`）→ dpr 缩放 + 米白底 #FBF7EC + 墨色笔触；`sigStart/sigMove/sigEnd` 维护 `this._sig`；`sigConfirm` → `canvasToTempFilePath` → `fs.readFile(base64)` → `data.act(..., sig)`。
- **队伍管理**：`showPool` 过滤已在队成员、8 人上限校验；`addMember`（data-* 传参）直接入队；`removeMember` 校验 `target.lead` 后二次确认移除。
- **附件**：`previewPlan(e)` 用 `data.previewPlan(reg)` 拿本地路径 → `wx.openDocument({fileType:'pdf', showMenu:true})`。
- **导出**：`exportCSV()` 写 `USER_DATA_PATH/registrations.csv` + modal「复制 CSV」→ `wx.setClipboardData`。
- **遮罩规范化**：弹层 `catchtouchmove="noop"`（新增空函数），消除「未定义处理函数」告警。

### 首页 / 我的页（V1.2 泛化）
- `home.js` / `profile.js`：`isTeacher` → `isApprover`（`data.APPROVER_ROLES.indexOf(user.role) > -1`），工作台统计、档案统计对全部评审角色生效；wxml 同步字段（`userName/userEmp/roleLabel`），学号/工号、角色标签按审批人/学生自适应。

### 资源
- `assets/demo-plan.pdf`：脚本生成的约 754 字节最小有效 PDF（Helvetica 纯 ASCII 文本），作为附件预览的演示回落文件。

### 兼容性
V1.0 / V1.1 已写入的 Storage 可直接升级（V1.2 不新增键、不破坏旧结构）；种子修正仅影响重置后首次初始化。重置路径：我的 → 重置演示数据。

### Hotfix（2026-09-02）
- **修复启动即崩**：`utils/data.js` 的 `module.exports` 内残留一段属性简写列表（`getMessages, pushMsg, ...`），但这些名字只以对象方法形式定义在对象内部——简写求值引用不存在的自由变量 → 模块加载即抛 `ReferenceError: getMessages is not defined`（login 页 require 时报错）。已删除冗余简写（方法与导出本就同体，删除无副作用）。
- **新增回归工具**：mock wx/App/Page 后逐个 require 全部业务 js 的冒烟脚本，并全量验证 data.js 关键 API（消息引擎 / 教师·评审队列 / act 签名 / 队伍管理 / CSV 导出），全部通过。

---

## 三、下一版本迭代功能（V1.3）

- **云开发正式接入**：报名单/消息/队伍集合云端化，多端实时同步，替换 Storage 回落主路径
- **订阅消息推送**：`wx.requestSubscribeMessage`，审批/驳回/催办推送到微信服务通知（不再仅站内信）
- **签名防伪**：签名图压缩 + 节点哈希（防篡改校验链），加水印与签署时间戳
- **统计报表**：按赛项/学院/审批状态汇总，柱状/环形图表，导出增强（筛选 + XLSX）
- **知识广场（V2.0 前置）**：经验帖 / 获奖名单 / 模板下载，先做静态列表版
