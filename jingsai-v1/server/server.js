// server/server.js —— 竞赛一体化管理平台 · 服务端（零依赖 Node HTTP）
// 用法：
//   node server/server.js            # 默认 127.0.0.1:3000（PORT 可覆盖）
//   JS_DATA_DIR=xxx node server.js   # 换数据目录（演示可用独立库）
// 设计：模块导入无副作用（scan_require 可安全 require）；仅 require.main 时启动监听。
'use strict';
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const store = require('./lib/store');
const boot = require('./lib/bootstrap');
const d = require('./lib/domain');

const VERSION = 'V1.6.0';
const SERVICE = 'jingsai-server';

/* ================= 会话（内存演示态：重启即失效，需重新登录） ================= */
const sessions = new Map(); // token -> user
function issue(user) {
  const token = crypto.randomBytes(18).toString('hex');
  sessions.set(token, { ...user, loginAt: d.fullStamp() });
  return token;
}

/* ================= 小型路由 ================= */
// route: [method, regex, handler(ctx)]
// ctx = { db, user, seg, query, body, save }
function createApp() {
  let db = store.load();
  if (!db) {
    db = boot.emptyDb();
    store.save(db);
    console.log('[boot] 首次启动：已从客户端种子播种 ' + db.registrations.length + ' 张报名单 / ' +
      db.messages.length + ' 条消息 / ' + db.plazaPosts.length + ' 篇广场帖');
  }

  const save = () => store.save(db);
  const R = [];

  /* ---------- 公开 ---------- */
  R.push(['GET', /^\/$/, () => ({ html: cardHtml() })]);
  R.push(['GET', /^\/api\/health$/, () => ({
    ok: true, service: SERVICE, version: VERSION,
    node: process.version, now: d.fullStamp(),
    counts: {
      registrations: db.registrations.length,
      messages: db.messages.length,
      posts: db.posts.length,
      plazaPosts: db.plazaPosts.length
    }
  })]);
  R.push(['POST', /^\/api\/login$/, (c) => {
    const role = String(c.body.role || 'student');
    if (!d.ROLE_KEYS.includes(role)) d.fail(400, '未知角色：' + role);
    const user = d.mockUser(role);
    return { token: issue(user), user };
  }]);

  /* ---------- 鉴权辅助 ---------- */
  const adminOnly = (u) => { if (!u || u.role !== 'admin') d.fail(403, '仅管理员可执行此操作'); };

  R.push(['GET', /^\/api\/me$/, (c) => ({ user: c.user })]);
  R.push(['POST', /^\/api\/logout$/, (c) => { sessions.delete(c.token); return { ok: true }; }]);
  R.push(['POST', /^\/api\/reset$/, (c) => {
    adminOnly(c.user);
    db = boot.emptyDb();
    save();
    return { ok: true, message: '演示数据已重置为种子', counts: { registrations: db.registrations.length } };
  }]);
  R.push(['GET', /^\/api\/bootstrap$/, () => ({
    competitions: db.competitions,
    teachers: db.teachers,
    templates: db.templates,
    winnerGroups: db.winnerGroups
  })]);

  /* ---------- 报名单 ---------- */
  R.push(['GET', /^\/api\/registrations$/, () => ({ registrations: db.registrations })]);
  R.push(['GET', /^\/api\/registrations\/export\.csv$/, (c) => {
    const csv = d.exportCSV(db, c.query.status || 'all', c.query.comp || 'all');
    return { csv, csvName: 'registrations.csv' };
  }]);
  R.push(['POST', /^\/api\/registrations$/, (c) => {
    // 报名主体 = 当前登录学生（owner 落 openid）；演示账号 teacher/dept/admin 也可代建但不落 owner 语义
    const reg = d.newReg(db, c.body, c.user);
    save();
    return { registration: reg };
  }]);
  R.push(['GET', /^\/api\/registrations\/([^/]+)$/, (c) => {
    const reg = db.registrations.find((r) => r._id === c.seg[0]);
    if (!reg) d.fail(404, '报名单不存在');
    return { registration: reg };
  }]);
  R.push(['POST', /^\/api\/registrations\/([^/]+)\/resubmit$/, (c) => {
    const reg = d.resubmit(db, c.seg[0]); save(); return { registration: reg };
  }]);
  R.push(['POST', /^\/api\/registrations\/([^/]+)\/withdraw$/, (c) => {
    const reg = d.withdrawReg(db, c.seg[0]); save(); return { registration: reg };
  }]);
  R.push(['POST', /^\/api\/registrations\/([^/]+)\/team$/, (c) => {
    const reg = d.updateTeam(db, c.seg[0], c.body.members); save(); return { registration: reg };
  }]);
  R.push(['POST', /^\/api\/registrations\/([^/]+)\/act$/, (c) => {
    const reg = d.act(db, c.seg[0], c.body.action, c.body.note, c.body.signature, c.user);
    save(); return { registration: reg };
  }]);
  R.push(['GET', /^\/api\/registrations\/([^/]+)\/verify$/, (c) => {
    const result = d.verifyReg(db, c.seg[0]);
    if (result.autoSealed) save(); // 旧卷宗补封落库
    return { verified: result };
  }]);

  /* ---------- 教师队列 / 报表 / 导出 ---------- */
  R.push(['GET', /^\/api\/queue$/, (c) => ({ queue: d.teacherQueue(db, c.user.name) })]);
  R.push(['GET', /^\/api\/report\/stats$/, (c) => ({ stats: d.reportStats(db, c.query.comp || 'all') })]);
  R.push(['GET', /^\/api\/report\/approver\/([^/]+)$/, (c) => ({
    rows: d.approverDetail(db, decodeURIComponent(c.seg[1]))
  })]);

  /* ---------- 消息 ---------- */
  R.push(['GET', /^\/api\/messages$/, () => ({ messages: db.messages })]);
  R.push(['POST', /^\/api\/messages\/read-all$/, () => {
    db.messages.forEach((m) => { m.read = true; });
    save(); return { ok: true, unread: 0 };
  }]);
  R.push(['POST', /^\/api\/messages\/batch-delete$/, (c) => {
    const set = c.body.ids || [];
    db.messages = db.messages.filter((m) => set.indexOf(m._id) === -1);
    save(); return { ok: true, left: db.messages.length };
  }]);
  R.push(['POST', /^\/api\/messages\/([^/]+)\/read$/, (c) => {
    const m = db.messages.find((x) => x._id === c.seg[0]);
    if (!m) d.fail(404, '消息不存在');
    m.read = true; save(); return { ok: true };
  }]);
  R.push(['DELETE', /^\/api\/messages\/([^/]+)$/, (c) => {
    const before = db.messages.length;
    db.messages = db.messages.filter((m) => m._id !== c.seg[0]);
    if (db.messages.length === before) d.fail(404, '消息不存在');
    save(); return { ok: true };
  }]);

  /* ---------- 知识广场 / 投稿 ---------- */
  R.push(['GET', /^\/api\/posts$/, (c) => {
    // 已发布 = 种子 + 审核通过投稿；给当前用户标记 isLiked/isFaved
    const st = d.plazaStateOf(db, c.user.openid);
    const list = d.publishedPosts(db).map((p) => ({
      ...p,
      isLiked: st.liked.indexOf(p._id) > -1,
      isFaved: st.faved.indexOf(p._id) > -1,
      isMine: p.owner === c.user.openid
    }));
    return { posts: list };
  }]);
  R.push(['GET', /^\/api\/posts\/mine$/, (c) => ({
    posts: db.posts.filter((p) => p.owner === c.user.openid)
  })]);
  R.push(['POST', /^\/api\/posts$/, (c) => {
    const p = d.submitPost(db, c.body, c.user); save(); return { post: p };
  }]);
  R.push(['POST', /^\/api\/posts\/([^/]+)\/withdraw$/, (c) => {
    const p = d.withdrawPost(db, c.seg[0], c.user); save(); return { post: p };
  }]);
  R.push(['POST', /^\/api\/posts\/([^/]+)\/review$/, (c) => {
    const p = d.reviewPost(db, c.seg[0], c.body.action, c.user); save(); return { post: p };
  }]);

  /* ---------- 广场互动 ---------- */
  R.push(['GET', /^\/api\/plaza\/state$/, (c) => ({ state: d.plazaStateOf(db, c.user.openid) })]);
  R.push(['POST', /^\/api\/plaza\/(like|fav)$/, (c) => {
    const state = d.togglePlaza(db, c.user.openid, c.seg[0], c.body.id);
    save(); return { state };
  }]);

  /* ================= HTTP 处理 ================= */
  async function handler(req, res) {
    const method = req.method;
    const url = new URL(req.url, 'http://x');
    const pathname = decodeURIComponent(url.pathname);
    const query = Object.fromEntries(url.searchParams.entries());
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    };
    if (method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }

    // 找路由（公开端点列表）
    const route = R.find(([m, re]) => m === method && re.test(pathname));
    if (!route) return send(res, 404, cors, { ok: false, error: 'Not Found: ' + method + ' ' + pathname });

    // 鉴权（login/health/根页 除外）
    const PUBLIC = new Set(['/api/health', '/api/login', '/']);
    let user = null;
    let token = '';
    if (!PUBLIC.has(pathname)) {
      const h = req.headers.authorization || '';
      token = h.startsWith('Bearer ') ? h.slice(7) : '';
      user = sessions.get(token) || null;
      if (!user) return send(res, 401, cors, { ok: false, error: '未登录或登录已过期（POST /api/login 换取 token）' });
    }

    try {
      let body = {};
      if (['POST', 'DELETE', 'PUT'].includes(method)) body = await readBody(req);
      const seg = pathname.split('/').slice(3); // 去掉 /api/<res>
      const ctx = { db, user, seg, query, body, save, token };
      const out = route[2](ctx);
      if (out && out.html) { res.writeHead(200, { ...cors, 'Content-Type': 'text/html; charset=utf-8' }); res.end(out.html); return; }
      if (out && out.csv !== undefined) {
        res.writeHead(200, { ...cors, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + out.csvName + '"' });
        res.end('\uFEFF' + out.csv); // BOM 让 Excel 正确识别 UTF-8
        return;
      }
      send(res, 200, cors, { ok: true, data: out });
    } catch (e) {
      const status = e && e.status ? e.status : 500;
      if (status >= 500) console.error('[error]', method, pathname, e);
      send(res, status, cors, { ok: false, error: e && e.message ? e.message : '服务器内部错误' });
    }
  }

  return { handler, dbRef: () => db, save, reset: () => { db = boot.emptyDb(); save(); } };
}

function send(res, status, cors, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    let done = false;
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6 && !done) { done = true; resolve({}); req.destroy(); }
    });
    req.on('end', () => {
      if (done) return;
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

/* 根页：墨纸风格的服务端信息卡（浏览器预览用） */
function cardHtml() {
  const dots = (n) => '·'.repeat(n);
  return `<!DOCTYPE html><html lang="zh"><meta charset="utf-8"><title>${SERVICE} · ${VERSION}</title>
<body style="margin:0;background:#F4EDDF;color:#1A1815;font-family:'KaiTi','STKaiti','Songti SC',serif;min-height:100vh">
<div style="max-width:680px;margin:0 auto;padding:56px 28px">
  <div style="border:3px solid #1A1815;padding:36px;box-shadow:8px 8px 0 #1A1815;background:#FBF7EE">
    <div style="font-size:13px;letter-spacing:4px;color:#C8442A;border-bottom:2px dashed #1A1815;padding-bottom:14px">JINGSAI INTEGRATED MANAGEMENT PLATFORM · SERVER</div>
    <h1 style="font-size:40px;margin:22px 0 6px;letter-spacing:6px">竞赛一体化管理平台 · 服务端</h1>
    <div style="font-family:monospace;font-size:15px;line-height:2">version &nbsp; ${VERSION}<br>service &nbsp;&nbsp; ${SERVICE}<br>node &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${process.version}</div>
    <div style="margin-top:26px;border-top:2px solid #1A1815;padding-top:18px;font-size:14px;line-height:2.1">
      <div>◆ POST /api/login &nbsp;—&nbsp; role: student / teacher / dept / admin 换取 Bearer token</div>
      <div>◆ GET /api/health &nbsp;—&nbsp; 健康检查与集合计数</div>
      <div>◆ GET /api/registrations/:id/verify &nbsp;—&nbsp; 服务端哈希加封链防伪校验</div>
      <div>◆ POST /api/registrations/:id/act &nbsp;—&nbsp; 审批签批（越权返回 403）</div>
      <div>◆ POST /api/posts/:id/review &nbsp;—&nbsp; 管理员投稿审核（admin 专属）</div>
      <div style="margin-top:12px;color:#C8442A">完整接口见 README-V1.6.md · 数据落盘 server/data/db.json</div>
    </div>
  </div>
  <div style="text-align:center;margin-top:30px;font-size:13px;letter-spacing:2px;color:#8a8070">墨纸编辑部 · ${dots(12)}</div>
</div></body></html>`;
}

/* ================= 入口 ================= */
function start() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '127.0.0.1';
  const app = createApp();
  const server = http.createServer(app.handler);
  server.listen(port, host, () => {
    console.log('');
    console.log('┌──────────────────────────────────────────────┐');
    console.log('│  ' + SERVICE + '  ' + VERSION + '（零依赖 Node HTTP）        │');
    console.log('├──────────────────────────────────────────────┤');
    console.log('│  服务地址  http://' + host + ':' + port + '                    │');
    console.log('│  健康检查  /api/health                         │');
    console.log('│  数据文件  server/data/db.json                 │');
    console.log('│  演示登录  POST /api/login {role}              │');
    console.log('└──────────────────────────────────────────────┘');
  });
  return server;
}

module.exports = { createApp, start, VERSION, SERVICE, sessions };
if (require.main === module) start();
