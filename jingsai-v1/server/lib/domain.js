// server/lib/domain.js —— 纯领域逻辑（服务端权威实现）
// 哈希算法 / 审批链 / 业务语义与 utils/data.js 逐字对齐；不触碰 HTTP 与 wx。
'use strict';

/* ================= 错误 ================= */
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new ApiError(status, message); };

/* ================= 时间 ================= */
function fullStamp(d) {
  const t = d || new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}`;
}
/** 短时间 'MM.DD HH:mm'（与种子文案风格一致，视觉统一为点号） */
function shortStamp() {
  const s = fullStamp(); // YYYY-MM-DD HH:mm
  return s.slice(5, 10).replace('-', '.') + s.slice(10);
}
const rnd = () => Math.random().toString(36).slice(2, 8);

/* ================= 审批链引擎（与 data.js chainFor 一致） ================= */
function chainFor(level) {
  const sys = { key: 'system', name: '系统初审', auto: true };
  const teacher = { key: 'teacher', name: '指导教师审批' };
  const dept = { key: 'dept', name: '系级审核' };
  const college = { key: 'college', name: '院级审核' };
  const school = { key: 'school', name: '校级终审' };
  if (level === 'A') return [sys, teacher, dept, college, school];
  if (level === 'B') return [sys, teacher, college];
  return [sys, teacher];
}
const CHAIN_NAMES = { A: '五级审批', B: '三级审批', C: '一级审批' };

/* ================= 哈希加封链（与 data.js V1.3 逐字一致） ================= */
function hashStr(str) {
  let h = 5381;
  const s = String(str == null ? '' : str);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return '0x' + h.toString(16).padStart(8, '0');
}
function fingerprint(node) {
  const sig = node.signature ? node.signature.length + ':' + hashStr(node.signature) : '';
  return hashStr([node.name, node.approver, node.status, node.time, node.note, node.prevHash, sig].join('|'));
}
function sealReg(reg) {
  let prev = 'root';
  (reg.nodes || []).forEach((n) => {
    n.prevHash = prev;
    n.hash = fingerprint(n);
    prev = n.hash;
  });
  return reg;
}
/** 逐节点核验：prevHash 衔接 + 自身字段指纹重算（服务端权威防伪） */
function verifyChain(reg) {
  const legacy = !reg.nodes || !reg.nodes.length || !reg.nodes[0].hash;
  let prev = 'root';
  const items = [];
  const bad = [];
  reg.nodes.forEach((n, i) => {
    const ok = n.prevHash === prev && n.hash === fingerprint(n);
    if (!ok) bad.push(i);
    items.push({ i, name: n.name, ok, fp: (n.hash || '').slice(0, 9), time: n.time });
    prev = n.hash;
  });
  return {
    ok: bad.length === 0, total: reg.nodes.length, bad, items,
    regNo: reg.regNo, version: reg.version,
    sealedAt: reg.sealedAt || '—', autoSealed: legacy
  };
}

/* ================= 演示账号（与 data.js mockUser 对齐） ================= */
const USERS = {
  student: {
    openid: 'demo-openid-0001', name: '李雨桐', studentId: 'STU-2023-0817',
    college: '数学与统计学院', role: 'student', title: '',
    avatar: 'https://picsum.photos/seed/js-avatar/160/160',
    tagline: '白鹭队 · 队长 · 参赛 4 次'
  },
  teacher: {
    openid: 'demo-openid-tea-1', name: '陈默', empId: 'TEA-2019-0042',
    college: '数学与统计学院', role: 'teacher', title: '副教授',
    avatar: 'https://picsum.photos/seed/js-tea/160/160',
    tagline: '数学建模 · 已带赛 6 届'
  },
  dept: {
    openid: 'demo-openid-dept-1', name: '王建国', empId: 'DEPT-2015-0088',
    college: '数学与统计学院', role: 'dept', title: '系主任',
    avatar: 'https://picsum.photos/seed/js-dept/160/160',
    tagline: '系级评审 · 五级审批第二关'
  },
  admin: {
    openid: 'demo-openid-adm-1', name: '教务管理员', empId: 'ADM-0001',
    college: '教务处', role: 'admin', title: '',
    avatar: 'https://picsum.photos/seed/js-adm/160/160',
    tagline: '竞赛一体化管理平台 · 系统管理'
  }
};
const ROLE_KEYS = Object.keys(USERS);
const mockUser = (role) => USERS[ROLE_KEYS.indexOf(role) > -1 ? role : 'student'];

/* ================= 工具 ================= */
function log(db, action, detail) {
  db.logs.unshift({ action, detail, time: fullStamp() });
  db.logs = db.logs.slice(0, 100);
}
function esc(s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; }
const STATUS_LABEL = { approving: '审批中', rejected: '已驳回', passed: '已通过', withdrawn: '已撤回' };

/* ================= 消息 ================= */
/** 站内信（cap 50；演示态默认全类型放行） */
function pushMsg(db, type, title, body, regId) {
  db.messages.unshift({
    _id: 'msg-' + Date.now() + '-' + rnd(), type, title, body,
    time: shortStamp(), read: false, regId: regId || ''
  });
  db.messages = db.messages.slice(0, 50);
}

/* ================= 报名单 ================= */
function newReg(db, payload, user) {
  const comp = db.competitions.find((c) => c._id === payload.compId);
  if (!comp) fail(400, '未知竞赛：' + payload.compId);
  if (!payload.teamName || !String(payload.teamName).trim()) fail(400, '队伍名称不能为空');
  if (!payload.members || !payload.members.length) fail(400, '至少需要一名队员');
  const chain = chainFor(comp.level);
  const seq = 818 + db.registrations.length;
  const teacherName = payload.teacherName || '待定';
  const reg = {
    _id: 'reg-' + Date.now().toString(36) + rnd(),
    regNo: `NO.2026-${comp.no}-${seq}`,
    compId: comp._id, compTitle: comp.title,
    teamName: String(payload.teamName).trim(),
    track: comp.track === 'subject' ? '学科竞赛' : '创新创业',
    members: payload.members,
    teacherId: payload.teacherId, teacherName,
    planFile: payload.planFile || '',
    owner: user.openid,
    status: 'approving', version: 1, currentNode: 1,
    deadline: comp.deadline, chain,
    nodes: chain.map((n, i) => (i === 0
      ? { name: '系统初审', approver: '—', status: 'pass', time: shortStamp(), note: '表单完整性校验通过' }
      : {
        name: n.key === 'teacher' ? `指导教师审批 · ${teacherName}` : n.name,
        approver: n.key === 'teacher' ? teacherName : '待定',
        status: 'waiting', time: '—', note: '等待'
      })),
    createdAt: fullStamp()
  };
  sealReg(reg);            // 服务端提交即加封
  reg.sealedAt = fullStamp();
  db.registrations.unshift(reg);
  log(db, '提交报名', reg.compTitle + ' · ' + reg.teamName + ' v1');
  return reg;
}

function resubmit(db, regId) {
  const reg = db.registrations.find((r) => r._id === regId);
  if (!reg) fail(404, '报名单不存在');
  if (reg.status !== 'rejected') fail(400, '仅被驳回的报名单可重新提交');
  reg.version += 1;
  reg.status = 'approving';
  const idx = reg.nodes.findIndex((n) => n.status === 'reject');
  if (idx > -1) {
    reg.nodes[idx].status = 'waiting';
    reg.nodes[idx].time = '—';
    reg.nodes[idx].note = '重新提交 · v' + reg.version;
    reg.currentNode = idx;
  }
  sealReg(reg);
  reg.sealedAt = fullStamp();
  log(db, '重新提交', reg.compTitle + ' · v' + reg.version);
  pushMsg(db, 'approval', '重新提交成功',
    `「${reg.teamName}」${reg.compTitle} v${reg.version} 已退回审批链，等待${reg.chain[idx].name}处理。`, regId);
  return reg;
}

function withdrawReg(db, regId) {
  const reg = db.registrations.find((r) => r._id === regId);
  if (!reg) fail(404, '报名单不存在');
  reg.status = 'withdrawn';
  log(db, '撤回报名', reg.compTitle + ' · ' + reg.teamName);
  return reg;
}

function updateTeam(db, regId, members) {
  const reg = db.registrations.find((r) => r._id === regId);
  if (!reg) fail(404, '报名单不存在');
  if (!members || !members.length) fail(400, '至少需要一名队员');
  reg.members = members;
  log(db, '更新队伍', `${reg.compTitle} · ${members.length} 人`);
  return reg;
}

/** 审批动作：仅该节点指派审批人（或管理员）可操作；签批后整链重封 */
function act(db, regId, action, note, signature, user) {
  const reg = db.registrations.find((r) => r._id === regId);
  if (!reg) fail(404, '报名单不存在');
  if (action !== 'pass' && action !== 'reject') fail(400, 'action 仅支持 pass | reject');
  const idx = reg.nodes.findIndex((n) => n.status === 'waiting');
  if (idx < 0) fail(409, '该报名单没有待审节点');
  const node = reg.nodes[idx];
  const assignee = node.approver;
  const isAssignee = assignee && assignee !== '—' && assignee !== '待定' && assignee === user.name;
  if (!isAssignee && user.role !== 'admin') fail(403, `无权审批：当前节点指派给「${assignee}」`);
  if (node.approver === '待定' && user.role !== 'admin') fail(403, '该节点尚未指派审批人');
  node.time = shortStamp();
  if (action === 'pass') {
    node.status = 'pass';
    node.note = note || '已通过并手签';
    if (signature) { node.signature = signature; node.signTime = shortStamp(); }
    if (idx === reg.nodes.length - 1) {
      reg.status = 'passed';
    } else {
      reg.currentNode = idx + 1;
    }
    pushMsg(db, 'approval', '审批动态 · 通过',
      `「${reg.teamName}」${reg.compTitle} v${reg.version} 已通过 ${node.name}，当前停留：${idx + 1 < reg.nodes.length ? reg.chain[idx + 1].name : '已全部通过'}。`, regId);
  } else {
    node.status = 'reject';
    node.note = note || '退回上一级';
    reg.status = 'rejected';
    pushMsg(db, 'approval', '审批动态 · 驳回',
      `「${reg.teamName}」${reg.compTitle} v${reg.version} 被 ${node.name} 驳回：${node.note}`, regId);
  }
  sealReg(reg);            // 签批即重新加封，链上留痕
  reg.sealedAt = fullStamp();
  log(db, action === 'pass' ? '审批通过' : '审批驳回', `${reg.compTitle} · ${node.name}`);
  return reg;
}

/** 防伪校验：旧卷宗先补封（幂等），再逐节点核验 */
function verifyReg(db, regId) {
  const reg = db.registrations.find((r) => r._id === regId);
  if (!reg) fail(404, '报名单不存在');
  const legacy = !reg.nodes || !reg.nodes.length || !reg.nodes[0].hash;
  if (legacy) { sealReg(reg); reg.sealedAt = reg.sealedAt || fullStamp(); }
  return verifyChain(reg);
}

/* ================= 队列 / 报表 / 导出 ================= */
function teacherQueue(db, name) {
  const regs = db.registrations;
  const hasWaitingMine = (r) =>
    r.status === 'approving' &&
    r.nodes.some((n) => n.status === 'waiting' && n.approver === name);
  const mine = regs.filter((r) => r.nodes.some((n) => n.approver === name));
  return {
    pending: mine.filter(hasWaitingMine),
    processed: mine.filter((r) => !hasWaitingMine(r) && r.nodes.some((n) => n.approver === name && n.status !== 'waiting'))
  };
}

function reportStats(db, comp) {
  let regs = db.registrations;
  if (comp && comp !== 'all') regs = regs.filter((r) => r.compTitle === comp);
  const byComp = {};
  const byTrack = {};
  const byTeacher = {};
  const byStatus = { approving: 0, rejected: 0, passed: 0, withdrawn: 0 };
  const approver = {};
  let memberSum = 0;
  regs.forEach((r) => {
    byComp[r.compTitle] = (byComp[r.compTitle] || 0) + 1;
    byTrack[r.track] = (byTrack[r.track] || 0) + 1;
    byTeacher[r.teacherName] = (byTeacher[r.teacherName] || 0) + 1;
    if (byStatus[r.status] != null) byStatus[r.status] += 1;
    memberSum += (r.members || []).length;
    (r.nodes || []).forEach((n) => {
      const a = n.approver;
      if (!a || a === '—' || a === '待定') return;
      const o = approver[a] || (approver[a] = { name: a, pass: 0, reject: 0, pending: 0 });
      if (n.status === 'waiting') o.pending += 1;
      else if (n.status === 'pass') o.pass += 1;
      else if (n.status === 'reject') o.reject += 1;
    });
  });
  const toArr = (o) => Object.keys(o).map((k) => ({ k, v: o[k] })).sort((a, b) => b.v - a.v);
  const total = regs.length;
  const approverStats = Object.keys(approver).map((k) => {
    const o = approver[k];
    const done = o.pass + o.reject;
    return {
      name: o.name, done, pass: o.pass, reject: o.reject, pending: o.pending,
      rate: done ? Math.round((o.pass / done) * 100) : null
    };
  }).sort((a, b) => (b.done + b.pending) - (a.done + a.pending));
  return {
    total,
    approving: byStatus.approving, rejected: byStatus.rejected,
    passed: byStatus.passed, withdrawn: byStatus.withdrawn,
    passRate: total ? Math.round((byStatus.passed / total) * 100) : 0,
    members: memberSum,
    avgTeam: total ? +(memberSum / total).toFixed(1) : 0,
    byComp: toArr(byComp),
    byTrack: toArr(byTrack),
    byTeacher: toArr(byTeacher),
    approverStats,
    statusSeq: ['approving', 'rejected', 'passed', 'withdrawn'].map((k) => ({ k, label: STATUS_LABEL[k], v: byStatus[k] }))
  };
}

function approverDetail(db, name) {
  const rows = [];
  db.registrations.forEach((r) => {
    (r.nodes || []).forEach((n) => {
      if (!n.approver || n.approver !== name) return;
      if (n.status === 'waiting') {
        rows.push({ _id: r._id, regNo: r.regNo, compTitle: r.compTitle, teamName: r.teamName, version: r.version, act: '待审', time: '—', note: '' });
      } else if (n.status === 'pass' || n.status === 'reject') {
        rows.push({
          _id: r._id, regNo: r.regNo, compTitle: r.compTitle, teamName: r.teamName, version: r.version,
          act: n.status === 'pass' ? '通过' : '驳回', time: n.time, note: n.note || ''
        });
      }
    });
  });
  return rows;
}

function exportCSV(db, status, comp) {
  let regs = db.registrations;
  if (status && status !== 'all') regs = regs.filter((r) => r.status === status);
  if (comp && comp !== 'all') regs = regs.filter((r) => r.compTitle === comp);
  const rows = [['报名单号', '竞赛', '队伍', '版本', '状态', '指导教师', '截止日', '队长', '人数']];
  regs.forEach((r) => rows.push([
    r.regNo, r.compTitle, r.teamName, 'v' + r.version,
    STATUS_LABEL[r.status] || r.status, r.teacherName, r.deadline,
    (r.members.find((m) => m.lead) || r.members[0] || {}).name, r.members.length
  ]));
  return rows.map((row) => row.map(esc).join(',')).join('\n');
}

/* ================= 知识广场 ================= */
function plazaStateOf(db, openid) {
  const st = db.plaza[openid] || (db.plaza[openid] = { liked: [], faved: [] });
  return st;
}
function togglePlaza(db, openid, kind, id) {
  if (kind !== 'like' && kind !== 'fav') fail(400, 'kind 仅支持 like | fav');
  const st = plazaStateOf(db, openid);
  const arr = kind === 'like' ? st.liked : st.faved;
  const i = arr.indexOf(id);
  if (i > -1) arr.splice(i, 1); else arr.push(id);
  return { liked: st.liked.slice(), faved: st.faved.slice() };
}

/* ================= 投稿审核流 ================= */
function submitPost(db, p, user) {
  const title = String(p.title || '').trim();
  if (!title) fail(400, '标题不能为空');
  if (!p.comp) fail(400, '请选择所属赛事');
  const bodyText = String(p.body || '').trim();
  if (bodyText.length < 20) fail(400, '正文至少 20 字');
  const body = bodyText.split('\n').filter((s) => s.trim());
  const brief = bodyText.replace(/\s+/g, ' ').slice(0, 58) + '…';
  const post = {
    _id: 'post-' + Date.now().toString(36) + rnd(),
    owner: user.openid, mine: true, status: 'pending',
    author: user.name, from: (user.college || '在校学生') + ' · 投稿',
    title, comp: p.comp,
    track: '经验分享', views: '0', likes: 0,
    date: shortStamp().slice(0, 5), brief, body,
    submittedAt: fullStamp()
  };
  db.posts.unshift(post);
  log(db, '投稿', `《${post.title}》进入审核`);
  pushMsg(db, 'notice', '投稿动态 · 已收到',
    `你的投稿《${post.title}》已进入审核队列，通过后将展示在知识广场「经验帖」栏目。`, '');
  return post;
}

/** 广场已发布帖子 = 种子经验帖 + 审核通过的投稿 */
function publishedPosts(db) {
  return db.plazaPosts
    .concat(db.posts.filter((p) => p.status === 'published').map((p) => ({ ...p, published: true })));
}

function withdrawPost(db, id, user) {
  const p = db.posts.find((x) => x._id === id);
  if (!p) fail(404, '投稿不存在');
  if (p.owner !== user.openid) fail(403, '只能撤回自己的投稿');
  if (p.status !== 'pending') fail(409, '仅待审核的投稿可撤回（当前：' + p.status + '）');
  p.status = 'withdrawn';
  p.withdrawnAt = fullStamp();
  log(db, '撤回投稿', `《${p.title}》`);
  pushMsg(db, 'notice', '投稿动态 · 已撤回', `《${p.title}》已撤回，不再进入审核。可以重新编辑后再投。`, '');
  return p;
}

/** 审核动作（管理员）：publish 通过 → 混入广场；reject 驳回 → 留档可改后重投 */
function reviewPost(db, id, action, user) {
  if (user.role !== 'admin') fail(403, '仅管理员可审核投稿');
  const p = db.posts.find((x) => x._id === id);
  if (!p) fail(404, '投稿不存在');
  if (p.status !== 'pending') fail(409, '该投稿已处理（当前：' + p.status + '）');
  if (action === 'publish') {
    p.status = 'published';
    p.publishedAt = fullStamp();
    pushMsg(db, 'notice', '投稿动态 · 已通过',
      `你的投稿《${p.title}》已通过审核，现展示在知识广场「经验帖」栏目。`, '');
  } else if (action === 'reject') {
    p.status = 'rejected';
    p.rejectedAt = fullStamp();
    pushMsg(db, 'notice', '投稿动态 · 未通过',
      `《${p.title}》未通过审核，可在「我的投稿」查看原因并修改后重投。`, '');
  } else {
    fail(400, 'action 仅支持 publish | reject');
  }
  log(db, '审核投稿', `《${p.title}》→ ${action === 'publish' ? '通过' : '驳回'}`);
  return p;
}

module.exports = {
  ApiError, fail,
  hashStr, fingerprint, sealReg, verifyChain,
  chainFor, CHAIN_NAMES,
  USERS, ROLE_KEYS, mockUser,
  fullStamp, shortStamp,
  log, esc,
  pushMsg,
  newReg, resubmit, withdrawReg, updateTeam, act, verifyReg,
  teacherQueue, reportStats, approverDetail, exportCSV,
  plazaStateOf, togglePlaza,
  submitPost, publishedPosts, withdrawPost, reviewPost
};
