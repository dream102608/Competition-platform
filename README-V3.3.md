# V3.3 · 数据导出模块（教师/管理权限）

> 服务对象：燕京理工学院 · 信息科学与技术学院
> 本版本主题：**新增独立「数据导出」页**，按角色自动限定导出范围
> 设计语言：沿用「墨纸编辑部」（纸 `#F4EDDF` · 墨 `#1A1815` · 朱砂 `#C8442A`）

---

## 1. 做了什么

### 1.1 新增独立页面 `pages/export/export`
- 取代原 `pages/stats/stats` 中"只有管理员能看见"的两个内嵌导出按钮
- 按"科创赛事数据 → 学生数据 → 行政台账"三段分区，每张卡片一张 Excel
- 每张卡片自带筛选条件（竞赛 / 状态 / 等级 / 教师 / 培训 / 星期 / 节次 / 学期）
- 顶部彩色 banner 显示权限范围（黑色=全院 / 蓝色=指导范围）
- 学生/评审专家等无权限角色进入会看到 🔒 闸门页

### 1.2 权限模型（关键修复）
| 角色 | 导出范围 |
| --- | --- |
| 学生 / 评审专家 | 无权访问（闸门页） |
| 教师 / 辅导员 | **指导范围**（仅本人指导过的报名/学生） |
| 教学秘书 / 教研室主任 / 教学副院长 / 院长 / 管理员 | 全院 |

教师身份自动按 `teacherName` 过滤，文件名前缀 `[本人指导范围]`、审计日志也加标记。管理级不受限。

### 1.3 9 种导出类型（云函数 `exportXlsx`）

| Kind | Excel Sheet | 关键列 | 权限 |
| --- | --- | --- | --- |
| `regs` | 报名名单 | 单号/竞赛/形式/队名/申请人/指导教师/状态/时间 | 教师/管理 |
| `oneCompRegs` | 单个竞赛明细 | + 队员/学号/当前节点/项目简介 | 教师/管理 |
| `myAdvisees` | 指导学生 | 姓名/学号/指导教师/报名总数/已通过/参赛项目 | 教师/管理 |
| `studentAwards` | 获奖名单 | 学生/竞赛/奖项/年份/审核时间 | 教师/管理 |
| `trainingSignups` | 培训记录 | 申请人/培训/主讲/状态/报名时间 | 教师/管理 |
| `free` | 空闲学生 | 姓名/学院/专业（按星期+节次筛） | 教师/管理 |
| `expenses` | 经费台账 | 申请人/事项/金额/用途/状态 | 仅管理员级 |
| `schedules` | 课表明细 | 姓名/学院/学期/课程/星期/小节/地点 | 仅管理员级 |
| `regs/expenses/schedules/free` | （原有 4 个） | 现支持 `compId`/`status`/`semester` 等筛选 | — |

### 1.4 入口与可达性
- `pages/profile/profile`「功能一览」宫格新增 **数据导出** 入口（墨绿 `#1F6E5C`）
  - 教师/辅导员可见
  - 教学秘书/教研室主任/副院长/院长/管理员可见
  - 学生/评审专家不显示该入口
- `pages/stats/stats` 修复 `isManager` 判定，教师/辅导员也能看到原有 2 个快速导出按钮
- `pages/stats/stats.wxml` 提示语从"管理员/院长/副院长/教学秘书"更新为"教师/管理/学院领导"

### 1.5 审计
每次导出都会写入云函数日志：`addLog(openid, '导出Excel', '[本人指导范围] 报名名单_2026-09-04.xlsx')`，可在「我的 → 操作记录」中查询；文件存于云存储 `exports/` 目录，14 天后自动清理。

---

## 2. 代码解析

### 2.1 新增文件

| 文件 | 行数 | 作用 |
| --- | --- | --- |
| `pages/export/export.wxml` | 113 | 三段分区 + 9 张卡片 + 闸门页 |
| `pages/export/export.wxss` | 50 | 卡片/筛选/按钮/闸门样式 |
| `pages/export/export.js` | 187 | 加载下拉 / 筛选状态 / 9 个导出动作 |
| `pages/export/export.json` | 5 | 页面配置（custom 导航 + 关闭滚动） |

### 2.2 修改文件

| 文件 | 改动 |
| --- | --- |
| `app.json` | `pages` 数组追加 `pages/export/export` |
| `pages/profile/profile.js` | 计算 `isTeacher`/`isManager` → 教师/管理角色追加「数据导出」宫格入口 |
| `pages/stats/stats.wxml` | 提示语更新为"教师/管理/学院领导" |
| `utils/data.js` | `getStats()` 本地兜底加 `teacher`/`counselor` 到 `isManager`（演示模式也能用导出） |
| `cloudfunctions/api/index.js` | `MANAGER_ROLES` 注释更新；新增 `FULL_ROLES` 与 `teacherFilter()` 辅助；`exportXlsx` 扩到 9 个 kind；`stats` 端点的 `isManager` 加入教师/辅导员 |

### 2.3 核心代码片段

**教师自动过滤（云函数）**
```js
const FULL_ROLES = ['admin', 'dean', 'vicedean', 'secretary', 'dept', 'leader'];
async function teacherFilter(u) {
  if (FULL_ROLES.indexOf(u.role) > -1) return {};
  if (u.role === 'teacher' || u.role === 'counselor') return { teacherName: u.name };
  return {};
}
// 在 exportXlsx 里：
const scope = await teacherFilter(u);           // 教师自动限定
const conds = Object.assign({}, scope);          // 每个 kind 都先合并 scope
if (event.compId) conds.compId = event.compId;   // 再叠加用户筛选项
```

**单竞赛明细（新 kind）**
```js
} else if (kind === 'oneCompRegs') {
  const compId = event.compId;
  const conds = Object.assign({ compId }, scope);
  const r = await db.collection('registrations').where(conds).limit(500).get();
  // ... 含队员 / 学号 / 当前节点 / 项目简介
}
```

**指导学生聚合（新 kind）**
```js
} else if (kind === 'myAdvisees') {
  const teacherName = event.teacherName || (u.role === 'teacher' ? u.name : '');
  const r = await db.collection('registrations').where({ teacherName }).limit(1000).get();
  // 按 applicantName 去重 → 报名/通过统计 + 参赛项目
}
```

**审计标记**
```js
const scopeTag = (u.role === 'teacher' || u.role === 'counselor') ? '本人指导范围_' : '';
const res = await uploadXlsx(wb, 'exports/' + (scopeTag ? scopeTag + fileName : fileName));
await addLog(openid, '导出Excel', (scopeTag ? '[本人指导范围] ' : '') + fileName);
```

**前端权限闸门**
```js
const ALLOWED_ROLES = FULL_ROLES.concat(TEACHER_ROLES); // ['teacher','counselor','admin','dean','vicedean','secretary','dept']
if (!authorized) {
  this.setData({ user, authorized: false, roleLabel: '' });
  return; // 不加载下拉
}
```

### 2.4 设计取舍

1. **不内置本地 CSV 导出**：演示模式直接抛错，避免双重实现复杂度。开通云开发后即可使用全部 9 种。
2. **教师过滤用 `teacherName` 字段而非 openid 关联**：演示数据按姓名聚合，与 V2.1 已落地的 `teacherName` 字段一致，未来升级到真实学号/工号体系时只需替换聚合 key。
3. **不做"教师看管理员的导出"分级权限**：管理角色统一使用 FULL_ROLES，避免 9 个 kind × 5 种角色 × 6 种作用域的笛卡尔积爆炸。
4. **没动 `pages/stats/stats` 的旧按钮**：保留作为快捷入口，避免破坏 V3.2 已发布的"教师看到导出"预期。

---

## 3. 下一版迭代计划

### V3.4 候选（按优先级）

1. **导出格式扩展**：增加 `.csv`（轻量）、`.pdf`（带学院印章的归档版），满足教务处归档格式要求
2. **批量导出**：勾选多个 kind 一次打包为 zip，下载一次拿到全部 Excel
3. **定时导出**：管理员级可设定"每月 1 日自动导出去月经费台账 → 云存储 → 微信服务通知推送"
4. **导出历史记录页**：在「我的 → 操作记录」基础上做独立页，支持按文件名/时间检索 + 重新下载
5. **教师指导学生趋势图**：从 `myAdvisees` 聚合出历年学生数 / 通过率，折线图呈现
6. **导出字段自定义**：管理员可在 admin 页配置每种 Excel 的列与顺序（高级功能）

### 待修复 / 待优化（随时可做）

- 教师身份 `teacherName` 与 `users` 表 `name` 字段一致性：当前按姓名匹配，未来建议加 `teacherId` 字段
- 单竞赛明细 `intro` 字段截断 200 字符，需要时可放开
- 导出 1000 条上限分批：当前一次拉完，可加分批 cursor

---

## 4. V3.3.1 patch · 演示模式真 .xlsx 一键打开

### 4.1 做了什么

- **演示模式也能导出真 Excel 表格**：未开通云开发时，本地手写 OOXML 生成 `.xlsx`，写入 `wx.env.USER_DATA_PATH` 后用 `wx.openDocument` 直接拉起 WPS / Office 打开，不再只显示 CSV 文本 modal
- **多路径写盘兜底**：优先 `USER_DATA_PATH/<file>.xlsx` → 备选 `USER_DATA_PATH/tmp/<file>.xlsx` → 最后 `/tmp/<file>.xlsx`，每条路径都 `statSync` 校验落地字节数
- **base64 写二进制**：绕开 iOS 上 `writeFileSync(path, ArrayBuffer, 'binary')` 编码歧义，改用 `writeFileSync(path, _b64encode(bytes), 'base64')`，手写 base64 编码器零依赖
- **Console 诊断日志**：`[demoExport]` / `[openXlsx]` 在开发者工具 Console 输出写入路径、字节数、openDocument 错误码，便于现场排错
- **失败提示升级**：CSV 兜底 modal 把 `xlsxErr` 放在最前面（`⚠️ xlsx 写盘失败：…`），用户截图一眼能看到失败原因

### 4.2 受影响文件

| 文件 | 改动 |
| --- | --- |
| `utils/data.js` | 新增 `_writeDemoXlsx()`；`demoExport` 改走多路径重试 + 诊断日志；`openXlsx` 加 Console 诊断 + `wx.env` 未定义兜底 |
| `pages/export/export.js` | `_showDemoPreview` 把 `xlsxErr` 提到内容最前方 |

### 4.3 验证

- Node 端用 mock `wx` 全局跑 `_writeDemoXlsx`：USER_DATA_PATH 缺失/正常两种场景均能落到磁盘
- Python `zipfile.testzip()` 校验生成的 xlsx：5 个 entry 齐全、CRC 准确、`testzip OK`
- 在小程序开发者工具 Console 应看到 `[demoExport] xlsx 已写入: …` + `[openXlsx] openDocument 成功(fileType=xlsx): …`

### 4.4 排错速查

如果点了导出仍弹 CSV modal：

1. 打开开发者工具 Console，看是否有 `[demoExport] xlsx 写盘失败: …`，把后面路径/原因截图给我
2. 若 Console 完全没日志：说明 `wx.env.USER_DATA_PATH` 与 `/tmp/` 都被拦截，需检查基础库版本是否 ≥ 2.19.0
3. 若提示 `openDocument 失败`：真机把 xlsx 通过 `showMenu` 转发到文件助手，用 Excel/WPS 打开确认是否 Office 兼容问题

---

_本版本对应云函数需重新部署：右键 `cloudfunctions/api/` → 「上传并部署：云端安装依赖」（确保 ExcelJS 已装）。_