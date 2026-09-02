# README-V1.6 · Node HTTP 服务端接入（后端立项）

> 墨纸编辑部 · 竞赛一体化管理平台 —— 从「纯前端可演示」走向「前后端分离」的第一站。
> 依据用户选定方案：**Node.js HTTP**（零外部依赖、JSON 文件持久化、服务端防伪权威）。

---

## 一、本版做了什么

### 1. 服务端立项（server/ 目录，纯 node:http，零 npm 依赖）
- **Node HTTP 服务**：手写路由 + CORS + `{ok:true,data} | {ok:false,error}` 统一信封；`OPTIONS` 预检、404、500 兜底齐全。
- **JSON 文件持久化**：原子写穿（临时文件 + rename），数据落 `server/data/db.json`；`JS_DATA_DIR` / `JS_DB_FILE` 可换库。
- **Bearer token 会话**：`POST /api/login {role}` 换 token（crypto 随机），受保护端点统一鉴权，无 token / 伪 token → 401。
- 模块**导入无副作用**（`require.main === module` 才监听），可被现有自检脚本安全 require。

### 2. 集合迁移服务端（报名 / 消息 / 投稿 / 广场 / 报表）
- 集合形状与 `utils/data.js` 逐字段一致；**首次启动自动从客户端种子播种**（删 `db.json` 重启即重播，种子单一维护点）。
- 已就绪 30+ 端点：health / login / logout / me / reset / bootstrap、报名单 CRUD + 重提 + 撤回 + 队伍更新 + 审批 + 防伪校验 + CSV、教师队列、报表统计与绩效下钻、消息中心全套（标读/全读/单删/批量删）、投稿审核流（含 **admin 审核通过入口**——补上 V1.5 缺的闭环）、广场点赞/收藏（按 openid 隔离）。

### 3. 服务端防伪权威化（本版核心价值）
- 哈希加封链（djb2 变体指纹 + prevHash 链式绑定）**在服务端计算**：提交 / 重提 / 签批后由服务端重封，客户端不再自证。
- `GET /api/registrations/:id/verify`：服务端按当前字段重算整链、逐节点核验衔接与指纹，返回 `{ok,total,bad,items}`。
- 冒烟实测：**篡改节点备注 → 核验断链（bad≥1）；恢复字段 → 复绿**。

### 4. 鉴权与越权防护
- 四角色演示账号：student 李雨桐 / teacher 陈默 / dept 王建国 / admin 教务管理员。
- 审批 `act` 校验「**当前节点指派审批人 = 当前登录人**」：学生审批 403、陈默代签王建国节点 403、管理员可代签；投稿审核仅 admin（403 兜底）。

### 5. 前端远程接入层（utils/api.js）+ 设置页「服务端」状态卡
- `wx.request` 统一封装：token 持久化、超时 2500ms、`offline` 标记（失败可降级本地 Storage）。
- 设置页新增「服务端」区：在线/离线状态灯 + 服务端版本 + 集合计数，点卡片可重试；**离线不打断任何本地功能**。
- 既有页面数据流零改动：本地 Storage 仍是主引擎，为 V1.7「逐页远程优先」铺路。

---

## 二、代码说明

### 目录结构（新增）
```
jingsai-v1/server/
├── package.json          # npm start / smoke / check（无 dependencies）
├── server.js             # HTTP 组装：路由表、鉴权、CSV/HTML 直出、入口启动
├── smoke.js              # 端到端冒烟（隔离临时数据目录，40 断言）
├── lib/
│   ├── store.js          # JSON 文件持久化（原子写穿）
│   ├── bootstrap.js      # 首启播种：内存 wx mock → 抽取 utils/data.js 种子
│   └── domain.js         # 纯领域逻辑：哈希封链引擎 + 全部业务操作（与 data.js 同源）
└── data/db.json          # 运行时生成的数据文件（冒烟用独立临时目录，不污染）
```

### 核心文件职责
| 文件 | 职责 |
| --- | --- |
| `server/server.js` | 路由 `[method, regex, handler]`；`sessions` Map；health 计数；根页返回墨纸风 HTML 服务卡 |
| `server/lib/domain.js` | `hashStr / fingerprint / sealReg / verifyChain` 与 data.js **逐字一致**；`newReg / act / resubmit / submitPost / reviewPost / togglePlaza / reportStats / approverDetail / exportCSV` 等纯函数（抛 `ApiError{status}`） |
| `server/lib/store.js` | `load()` 损坏自动返回 null（触发重播）；`save()` 先写 `.tmp` 再 rename |
| `server/lib/bootstrap.js` | 内存 `wx` mock 后 `require('../utils/data.js')` 抽取种子 → `emptyDb()`（报名单种子自带 V1.3 封链） |
| `utils/api.js` | 小程序侧远程接入层：`request / login / logout / health` + 快捷读方法；token 键 `js_srv_token` |

### 启动与联调
```bash
node server/server.js              # 默认 http://127.0.0.1:3000（PORT/HOST 可覆盖）
node server/smoke.js               # 40/40 冒烟
```
- 微信开发者工具联调本机：详情 → 本地设置 → 勾选「**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**」。
- 真机预览需部署到 https + 合法域名，改 `utils/api.js` 顶部 `setBase('https://你的域名')`。

### API 速查（成功 `{ok:true,data}` / 失败 `{ok:false,error}`，鉴权头 `Authorization: Bearer <token>`）
```bash
# 登录四种角色任选
curl -X POST http://127.0.0.1:3000/api/login -H 'Content-Type: application/json' -d '{"role":"dept"}'
# 防伪核验（服务端权威）
curl http://127.0.0.1:3000/api/registrations/reg-0817/verify -H "Authorization: Bearer $T"
# 审批签批（越权返回 403）
curl -X POST http://127.0.0.1:3000/api/registrations/reg-0817/act -H "Authorization: Bearer $T" \
     -H 'Content-Type: application/json' -d '{"action":"pass","note":"同意"}'
# 管理员审核投稿（V1.5 闭环补全）
curl -X POST http://127.0.0.1:3000/api/posts/<id>/review -H "Authorization: Bearer $T" \
     -H 'Content-Type: application/json' -d '{"action":"publish"}'
# 双维导出
curl "http://127.0.0.1:3000/api/registrations/export.csv?status=approving&comp=全国大学生数学建模竞赛" \
     -H "Authorization: Bearer $T" -o regs.csv
```
端点总表（节选）：`/api/health` `/api/login` `/api/logout` `/api/me` `/api/reset`(admin) `/api/bootstrap`
`/api/registrations`(+`/:id` `/export.csv` `/…/resubmit|withdraw|team|act|verify`)
`/api/queue` `/api/report/stats?comp=` `/api/report/approver/:name`
`/api/messages`(+`/read-all` `/batch-delete` `/:id/read` `DELETE /:id`)
`/api/posts`(+`/mine` `/…/withdraw|review`) `/api/plaza/state|like|fav`

### 与前端的一致性设计
- **算法同源**：服务端 `hashStr/fingerprint/sealReg` 从 data.js 逐字移植；种子数据直接抽取自 data.js（单点维护，改种子删库重启即可）。
- **契约同形**：集合字段名与前端 Storage 键内容一致，后续逐页切远程时前端渲染代码无需改字段。
- **诚实降级**：`utils/api.js` 网络失败/超时 reject `err.offline=true`；页面捕获即回退 `utils/data.js`。

### 自检结果
- 前端 14 个 JS + 服务端 5 个 JS：`node --check` 全过、`scan_require`（mock wx 全量 require）19/19 PASS。
- `server/smoke.js`：**40 PASS / 0 FAIL**（含越权 403 ×3、篡改识破、CSV 双维、绩效下钻、投稿审核闭环、重置收尾）。
- `check_mp.py`：仅剩 `note` 已知误报；`package.json` JSON 合法；无 V1.5.0 版本号残留（settings/reports 已升 V1.6.0）。

---

## 三、下一版本迭代功能（V1.7）

1. **页面逐页「远程优先」切换**：把消息 / 报名 / 审批 / 投稿 / 广场的数据调用从 `data.js` 迁到 `utils/api.js`，Storage 只作离线降级缓存（刷新优先取服务端，失败回落本地并提示）。
2. **订阅消息正式推送**：服务端在审批/催办/投稿事件时按用户订阅偏好触发模板消息（需小程序后台模板 ID）。
3. **登录 openid 化**：`wx.login` → code2session 换真实 openid，替换演示角色登录；token 下发改为短时效 + 续期。
4. **投稿「未通过」原因回填 + 修改重投**：admin 驳回可填原因，作者在我的投稿里编辑后重新入队。
5. **XLSX 导出**：服务端加 `/api/registrations/export.xlsx`（或前端 sheet 库），替代 CSV 单表。
6. **规模化就绪**：`db.json` 内存库换 SQLite / MongoDB 适配层（store.js 接口不变，零侵入切换）。
