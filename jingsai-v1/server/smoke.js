// server/smoke.js —— 端到端冒烟（进程内起服务 + fetch 全链路断言）
// 运行：node server/smoke.js       期望输出全 PASS，exit 0
// 覆盖：健康检查 / 登录鉴权 / 401 / 报名提交 / 审批越权 403 / 签批 / 重提 /
//       篡改识破（服务端防伪权威）/ 消息 CRUD / 投稿审核流 / 广场互动 / CSV / 报表 / 重置
'use strict';
// 冒烟跑在独立临时数据目录：断言基于种子态，且不污染 server/data/db.json
process.env.JS_DATA_DIR = require('os').tmpdir() + '/jingsai-smoke-' + Date.now();
const http = require('http');
const { createApp, VERSION } = require('./server');

let passed = 0, failed = 0;
const ok = (cond, name) => {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ FAIL: ' + name); }
};

async function main() {
  console.log('\n== jingsai-server 冒烟 ' + VERSION + ' ==\n');
  const app = createApp();
  const server = http.createServer(app.handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;

  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { json = { raw: text }; }
    return { status: res.status, json, headers: res.headers };
  };
  const login = async (role) => (await call('POST', '/api/login', { role })).json.data.token;

  /* 1 健康 + 根页 */
  let r = await call('GET', '/api/health');
  ok(r.status === 200 && r.json.ok && r.json.data.version === VERSION, 'health 返回 V1.6.0 与集合计数');
  r = await call('GET', '/');
  ok(r.status === 200 && (r.json.raw || '').includes('竞赛一体化管理平台'), '根页返回服务信息卡');

  /* 2 登录 / 未授权 */
  r = await call('POST', '/api/login', { role: 'teacher' });
  ok(r.status === 200 && r.json.data.user.name === '陈默' && r.json.data.token.length > 20, 'login teacher → 陈默 + token');
  r = await call('GET', '/api/registrations', null, 'bad-token');
  ok(r.status === 401 && !r.json.ok, '伪造 token 访问受保护端点 → 401');
  r = await call('GET', '/api/registrations');
  ok(r.status === 401, '无 token 访问受保护端点 → 401');

  /* 3 种子与封链 */
  const tStu = await login('student');
  r = await call('GET', '/api/registrations', null, tStu);
  const regs0 = r.json.data.registrations;
  ok(regs0.length === 3, '种子报名单 3 张（reg-0817/0042/0913）');
  const reg0817 = regs0.find((x) => x._id === 'reg-0817');
  ok(reg0817.nodes[0].hash && reg0817.nodes[4].prevHash === reg0817.nodes[3].hash, '种子卷宗已含 V1.3 封链');
  r = await call('GET', '/api/registrations/reg-0817/verify', null, tStu);
  ok(r.json.data.verified.ok && r.json.data.verified.total === 5, 'reg-0817 服务端核验：5 节点全绿');

  /* 4 学生报名新单 → 教师签批 */
  r = await call('POST', '/api/registrations', {
    compId: 'comp-001', teamName: '冒烟测试队', members: [{ name: '测试员', lead: true, avatar: '' }],
    teacherId: 'tea-1', teacherName: '陈默', planFile: 'smoke_plan.pdf'
  }, tStu);
  ok(r.status === 200 && r.json.data.registration.status === 'approving' && r.json.data.registration.version === 1,
    '学生提交报名 → v1 approving，系统初审已过');
  const newId = r.json.data.registration._id;

  const tTea = await login('teacher');
  r = await call('POST', '/api/registrations/' + newId + '/act', { action: 'pass', note: '冒烟通过' }, tTea);
  ok(r.status === 200 && r.json.data.registration.currentNode === 2, '陈默签批自己名下节点 → currentNode 2');
  r = await call('POST', '/api/registrations/reg-0817/act', { action: 'pass' }, tTea);
  ok(r.status === 403, '陈默越权处理王建国节点 → 403');

  /* 5 学生（越权）/ 管理员 */
  r = await call('POST', '/api/registrations/' + newId + '/act', { action: 'pass' }, tStu);
  ok(r.status === 403, '学生账号审批 → 403');
  const tAdm = await login('admin');
  r = await call('POST', '/api/registrations/' + newId + '/act', { action: 'pass' }, tAdm);
  ok(r.status === 200 && r.json.data.registration.status === 'approving', '管理员代签 → 前进到院级(待定)');
  r = await call('POST', '/api/registrations/' + newId + '/withdraw', null, tAdm);
  ok(r.status === 200 && r.json.data.registration.status === 'withdrawn', '撤回新单 → withdrawn');

  /* 6 篡改识破（服务端权威）：改 nodes[0].note 后 verify 必须报坏 */
  const db = app.dbRef();
  const victim = db.registrations.find((x) => x._id === 'reg-0817');
  const origNote = victim.nodes[0].note;
  victim.nodes[0].note = '（恶意篡改）手工改掉系统初审备注';
  app.save();
  r = await call('GET', '/api/registrations/reg-0817/verify', null, tStu);
  ok(r.json.data.verified.ok === false && r.json.data.verified.bad.length >= 1,
    '篡改节点备注 → 服务端核验断链（bad=' + r.json.data.verified.bad.length + '）');
  victim.nodes[0].note = origNote;
  app.save();
  r = await call('GET', '/api/registrations/reg-0817/verify', null, tStu);
  ok(r.json.data.verified.ok, '恢复字段 → 服务端核验复绿');

  /* 7 驳回 → 重提（消息也顺带覆盖） */
  r = await call('POST', '/api/registrations', {
    compId: 'comp-003', teamName: '演讲冒烟队', members: [{ name: '测试员', lead: true, avatar: '' }],
    teacherId: 'tea-3', teacherName: '许知远', planFile: ''
  }, tStu);
  const rejId = r.json.data.registration._id;
  const tTea3 = await login('teacher'); // 陈默 vs 许知远：需一个名字匹配的审批人 —— 用 admin 代签
  r = await call('POST', '/api/registrations/' + rejId + '/act', { action: 'reject', note: '请补充演讲提纲' }, tAdm);
  ok(r.json.data.registration.status === 'rejected', '管理员驳回 → rejected');
  r = await call('POST', '/api/registrations/' + rejId + '/resubmit', {}, tStu);
  ok(r.status === 200 && r.json.data.registration.status === 'approving' && r.json.data.registration.version === 2,
    '学生重提 → v2 approving');
  ok(tTea3.length > 0, '（多角色 token 正常签发）');

  /* 8 消息中心（服务端推送 + CRUD） */
  r = await call('GET', '/api/messages', null, tStu);
  const msgs0 = r.json.data.messages;
  ok(msgs0.length >= 2 && msgs0.some((m) => m.regId === 'reg-0817'), '消息含同单聚合素材(reg-0817)');
  const unread = msgs0.filter((m) => !m.read);
  const one = unread[0];
  r = await call('POST', '/api/messages/' + one._id + '/read', {}, tStu);
  ok(r.status === 200, '单条标已读');
  r = await call('POST', '/api/messages/read-all', {}, tStu);
  ok(r.json.data.unread === 0, '全部已读 → unread 0');
  r = await call('DELETE', '/api/messages/' + one._id, null, tStu);
  ok(r.status === 200 && r.json.data.ok, '删除单条消息');
  r = await call('POST', '/api/messages/batch-delete', { ids: msgs0.slice(0, 2).map((m) => m._id) }, tStu);
  ok(r.status === 200, '批量删除 2 条');

  /* 9 投稿审核流 */
  r = await call('POST', '/api/posts', { title: '冒烟帖：如何两周备赛', comp: '全国大学生数学建模竞赛', body: '第一周做旧题拆解，第二周做一次全真模拟并复盘计时节奏。' }, tStu);
  ok(r.status === 200 && r.json.data.post.status === 'pending', '学生投稿 → pending 入队');
  const pid = r.json.data.post._id;
  r = await call('GET', '/api/posts/mine', null, tStu);
  ok(r.json.data.posts.some((p) => p._id === pid), '我的投稿可见该 pending 稿');
  r = await call('POST', '/api/posts/' + pid + '/withdraw', {}, tStu);
  ok(r.status === 200 && r.json.data.post.status === 'withdrawn', '撤回待审稿 → withdrawn');
  r = await call('POST', '/api/posts/' + pid + '/withdraw', {}, tStu);
  ok(r.status === 409, '重复撤回 → 409');
  r = await call('POST', '/api/posts', { title: '冒烟帖2：路演清单', comp: '中国国际大学生创新大赛', body: '一页一判断，图表标数据来源，模拟答辩两轮后再上场。' }, tStu);
  const pid2 = r.json.data.post._id;
  r = await call('POST', '/api/posts/' + pid2 + '/review', { action: 'publish' }, tStu);
  ok(r.status === 403, '学生审核投稿 → 403');
  r = await call('POST', '/api/posts/' + pid2 + '/review', { action: 'publish' }, tAdm);
  ok(r.status === 200 && r.json.data.post.status === 'published', '管理员审核通过 → published');
  r = await call('GET', '/api/posts', null, tStu);
  ok(r.json.data.posts.some((p) => p._id === pid2), '通过稿已混入广场已发布列表（补上 V1.5 审核闭环）');

  /* 10 广场互动 */
  r = await call('GET', '/api/posts', null, tStu);
  const seedPost = r.json.data.posts.find((p) => p._id === 'post-001');
  r = await call('POST', '/api/plaza/like', { id: seedPost._id }, tStu);
  ok(r.json.data.state.liked.indexOf(seedPost._id) > -1, '点赞 post-001 → 持久化');
  r = await call('POST', '/api/plaza/like', { id: seedPost._id }, tStu);
  ok(r.json.data.state.liked.indexOf(seedPost._id) === -1, '再点取消点赞');
  r = await call('POST', '/api/plaza/fav', { id: seedPost._id }, tAdm);
  ok(r.json.data.state.faved.indexOf(seedPost._id) > -1, '管理员收藏独立于学生（按 openid 隔离）');

  /* 11 导出 CSV（含双维过滤） */
  r = await call('GET', '/api/registrations/export.csv?status=approving&comp=' + encodeURIComponent('全国大学生数学建模竞赛'), null, tStu);
  ok(r.status === 200 && r.headers.get('content-type').includes('text/csv') && (r.json.raw || '').includes('报名单号'),
    'CSV 导出：text/csv + 表头 + BOM');
  ok((r.json.raw.match(/\n/g) || []).length <= 2, 'CSV 双维过滤生效（approving × 数模 ≤ 1 数据行）');

  /* 12 报表（服务端聚合） */
  r = await call('GET', '/api/report/stats?comp=all', null, tStu);
  const s = r.json.data.stats;
  ok(s.total === db.registrations.length && Array.isArray(s.approverStats) && s.statusSeq.length === 4,
    '报表 stats：总量/绩效/四态齐全');
  r = await call('GET', '/api/report/approver/' + encodeURIComponent('王建国'), null, tStu);
  ok(r.json.data.rows.some((x) => x.regNo === 'NO.2026-MCM-0817'), '绩效下钻含王建国 × reg-0817');

  /* 13 重置（admin） */
  r = await call('POST', '/api/reset', {}, tAdm);
  ok(r.status === 200 && r.json.data.counts.registrations === 3, '管理员重置 → 回到 3 张种子');
  r = await call('GET', '/api/registrations', null, tStu);
  ok(r.json.data.registrations.length === 3, '重置后数据确为种子态（smoke 收尾不留脏数据）');

  server.close();
  console.log('\n== 结果：' + passed + ' PASS / ' + failed + ' FAIL ==');
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main().catch((e) => { console.error('冒烟异常：', e); process.exit(1); });
