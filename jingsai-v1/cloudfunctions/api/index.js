// cloudfunctions/api/index.js —— 大学竞赛一体化管理平台 · 云端后端 V2.0
// 一个云函数承载全部写操作与按人过滤的读操作，靠 OPENID + 角色鉴权。
// 前端调用：wx.cloud.callFunction({ name: 'api', data: { action: '...', ... } })

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// exceljs：真 Excel 生成。部署云函数时选「上传并部署：云端安装依赖」后自动可用；
// 未安装时不影响其他功能，仅 Excel 导出/经费归档提示未安装。
let ExcelJS = null;
try { ExcelJS = require('exceljs'); } catch (e) { console.warn('[api] exceljs 未安装，Excel 功能暂不可用'); }

/* ================= 审批流配置（与前端 utils/config.js 保持一致） ================= */
const FLOWS = {
  student_comp_C: [
    { key: 'teacher', name: '指导教师/辅导员' },
    { key: 'secretary', name: '教学秘书' },
    { key: 'dept',    name: '教研室主任' }
  ],
  student_comp_B: [
    { key: 'teacher', name: '指导教师/辅导员' },
    { key: 'secretary', name: '教学秘书' },
    { key: 'dept',    name: '教研室主任' },
    { key: 'vicedean', name: '教学副院长' }
  ],
  student_comp_A: [
    { key: 'teacher', name: '指导教师/辅导员' },
    { key: 'secretary', name: '教学秘书' },
    { key: 'dept',    name: '教研室主任' },
    { key: 'vicedean', name: '教学副院长' },
    { key: 'dean',    name: '院长（终审）' }
  ],
  teacher_comp: [
    { key: 'secretary', name: '教学秘书（初审）' },
    { key: 'dept',      name: '教研室主任' },
    { key: 'vicedean',  name: '教学副院长' },
    { key: 'dean',      name: '院长（终审）' },
    { key: 'expert',    name: '评审专家（学术评审）' }
  ],
  leave: [
    { key: 'captain',   name: '队长审批', sign: true },
    { key: 'counselor', name: '辅导员审批', sign: true }
  ],
  training: [
    { key: 'teacher', name: '教师审批', sign: true }
  ],
  expense: [
    { key: 'secretary', name: '教学秘书' },
    { key: 'dept',     name: '教研室主任' },
    { key: 'vicedean', name: '教学副院长' },
    { key: 'dean',     name: '院长（终审）' }
  ],
  news: [
    { key: 'admin', name: '管理员审核' }
  ]
};

// 角色 → 可审批的节点 key
const ROLE_NODE_KEYS = {
  teacher: ['teacher'],
  counselor: ['teacher', 'counselor'],
  captain: ['captain'],
  vicecaptain: ['captain'],
  leader: ['secretary'],
  secretary: ['secretary'],
  dept: ['dept'],
  vicedean: ['vicedean'],
  dean: ['dean'],
  expert: ['expert'],
  admin: ['admin']
};

// 审批单类型 → 集合名
const COLL_OF = {
  reg: 'registrations',
  leave: 'leave_requests',
  training: 'training_signups',
  expense: 'expenses',
  news: 'news'
};

const TYPE_NAMES = {
  reg: '竞赛报名', leave: '请假', training: '学习培训', expense: '经费', news: '新闻发布'
};

/* ================= 工具 ================= */
function stamp() {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // 东八区
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const ok = (data) => Object.assign({ ok: true }, data || {});
const fail = (msg) => ({ ok: false, msg: msg || '操作失败' });

async function addLog(openid, action, detail) {
  try {
    await db.collection('operation_logs').add({
      data: { openid, action, detail, time: stamp(), ts: Date.now() }
    });
  } catch (e) { /* 日志失败不阻塞主流程 */ }
}

async function getUser(openid) {
  const q = await db.collection('users').where({ openid }).limit(1).get();
  return q.data.length ? q.data[0] : null;
}

/** 构造审批节点数组（第 0 个系统初审自动通过） */
function buildNodes(flow, extra) {
  const sys = { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: stamp(), note: '表单完整性校验通过' };
  const nodes = flow.map((n) => ({
    key: n.key,
    name: extra && extra[n.key] ? `${n.name} · ${extra[n.key]}` : n.name,
    approver: (extra && extra[n.key]) || '待定',
    needSign: !!n.sign,
    status: 'waiting', time: '—', note: '等待', signature: ''
  }));
  return [sys].concat(nodes);
}

/** 当前待审节点索引 */
function pendingIdx(doc) {
  return (doc.nodes || []).findIndex((n) => n.status === 'waiting');
}

/** 校验当前用户是否有权审批该节点 */
function canAct(user, nodeKey) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const keys = ROLE_NODE_KEYS[user.role] || [];
  return keys.indexOf(nodeKey) > -1;
}

/** 通用审批动作 */
async function genericAct(openid, coll, id, op, note, signature) {
  const u = await getUser(openid);
  const rq = await db.collection(coll).where({ _id: id }).limit(1).get();
  if (!rq.data.length) return fail('单据不存在');
  const doc = rq.data[0];
  const idx = pendingIdx(doc);
  if (idx < 0) return fail('当前没有待审节点');
  const node = doc.nodes[idx];
  if (!canAct(u, node.key)) return fail('当前节点不归你审批');
  if (op === 'reject' && (!note || note.length < 10)) return fail('驳回原因至少填写 10 个字');
  if (op === 'pass' && node.needSign && !signature) return fail('该节点需要手写签字');

  doc.nodes[idx].time = stamp();
  doc.nodes[idx].approver = (u && u.name) || '审批人';
  if (signature) doc.nodes[idx].signature = signature;
  let status = doc.status;
  let currentNode = doc.currentNode;
  if (op === 'pass') {
    doc.nodes[idx].status = 'pass';
    doc.nodes[idx].note = note || '已通过';
    if (idx === doc.nodes.length - 1) { status = 'passed'; } else { currentNode = idx + 1; }
  } else {
    doc.nodes[idx].status = 'reject';
    doc.nodes[idx].note = note || '退回修改';
    status = 'rejected';
  }
  await db.collection(coll).doc(id).update({ data: { nodes: doc.nodes, status, currentNode } });
  await addLog(openid, op === 'pass' ? '审批通过' : '审批驳回', `${doc.title || doc.compTitle || ''} · ${node.name}`);
  // 经费终审通过 → 自动追加进当月 Excel 归档（云存储 archives/经费归档_YYYY-MM.xlsx）
  if (op === 'pass' && status === 'passed' && coll === 'expenses') {
    try { await archiveExpense(doc); } catch (e) { console.error('[api] 经费归档失败（不影响审批）', e); }
  }
  return ok({ status });
}

/** 通用重报（驳回后版本号 +1） */
async function genericResubmit(openid, coll, id) {
  const rq = await db.collection(coll).where({ _id: id }).limit(1).get();
  if (!rq.data.length) return fail('单据不存在');
  const doc = rq.data[0];
  if (doc.openid !== openid) return fail('只能操作自己的单据');
  if (doc.status !== 'rejected') return fail('当前状态不可重报');
  const nodes = doc.nodes;
  const idx = nodes.findIndex((n) => n.status === 'reject');
  const version = (doc.version || 1) + 1;
  if (idx > -1) {
    nodes[idx].status = 'waiting';
    nodes[idx].time = '—';
    nodes[idx].note = '重新提交 · v' + version;
  }
  await db.collection(coll).doc(id).update({
    data: { nodes, version, status: 'approving', currentNode: idx > -1 ? idx : doc.currentNode }
  });
  await addLog(openid, '重新提交', (doc.title || doc.compTitle || '') + ' · v' + version);
  return ok({ version });
}

/** 通用撤回（终极审批通过前可撤回） */
async function genericWithdraw(openid, coll, id) {
  const rq = await db.collection(coll).where({ _id: id }).limit(1).get();
  if (!rq.data.length) return fail('单据不存在');
  const doc = rq.data[0];
  if (doc.openid !== openid) return fail('只能操作自己的单据');
  if (doc.status === 'passed') return fail('终审已通过，不可撤回，请联系管理员');
  await db.collection(coll).doc(id).update({ data: { status: 'withdrawn' } });
  await addLog(openid, '撤回', doc.title || doc.compTitle || id);
  return ok();
}

/** 通用催办（催办×3 自动标记上报） */
async function genericUrge(openid, coll, id) {
  const rq = await db.collection(coll).where({ _id: id }).limit(1).get();
  if (!rq.data.length) return fail('单据不存在');
  const doc = rq.data[0];
  const urgeCount = (doc.urgeCount || 0) + 1;
  const escalated = urgeCount >= 3;
  await db.collection(coll).doc(id).update({ data: { urgeCount, escalated } });
  await addLog(openid, '发送催办', (doc.title || doc.compTitle || id) + (escalated ? ' · 已自动上报' : ` · 第${urgeCount}次`));
  return ok({ urgeCount, escalated });
}

/* ================= 登录与个人资料 ================= */
async function login(openid, event) {
  const exist = await getUser(openid);
  if (exist) {
    if (exist.disabled) return fail('账号已被禁用，请联系管理员');
    // 已注册用户补充/更新学校
    if (event.school && exist.school !== event.school) {
      await db.collection('users').doc(exist._id).update({ data: { school: event.school } });
      exist.school = event.school;
    }
    return ok({ user: exist });
  }
  const user = {
    openid,
    name: event.name || '微信用户',
    studentId: event.studentId || '', college: '燕京理工学院 · 信息科学与技术学院', major: '', phone: event.phone || '', email: '',
    school: event.school || '',
    role: event.role || 'student',
    avatar: '', tagline: '新同学 · 首次登录',
    points: 0,
    disabled: false,
    createdAt: stamp()
  };
  const r = await db.collection('users').add({ data: user });
  user._id = r._id;
  await addLog(openid, '首次注册', '角色：' + user.role);
  return ok({ user });
}

async function updateProfile(openid, p) {
  const u = await getUser(openid);
  if (!u) return fail('用户不存在');
  const data = {};
  ['name', 'studentId', 'college', 'major', 'phone', 'email'].forEach((k) => {
    if (typeof p[k] === 'string') data[k] = p[k];
  });
  await db.collection('users').doc(u._id).update({ data });
  return ok({ user: Object.assign({}, u, data) });
}

/* ================= 首页聚合 ================= */
async function me(openid) {
  const u = await getUser(openid);
  const [regs, leaves, mySignups] = await Promise.all([
    db.collection('registrations').where({ openid }).limit(100).get(),
    db.collection('leave_requests').where({ openid }).limit(100).get(),
    db.collection('training_signups').where({ openid }).limit(100).get()
  ]);
  const points = await db.collection('points_accounts').where({ openid }).limit(1).get();
  const checkins = await db.collection('checkin_records').where({ openid }).limit(100).get();
  const team = u && u.teamId
    ? await db.collection('teams').where({ _id: u.teamId }).limit(1).get()
    : { data: [] };
  const schedule = await db.collection('schedules').where({ openid }).limit(20).get();
  const logs = await db.collection('operation_logs').where({ openid }).limit(50).get();
  return ok({
    user: u,
    regs: regs.data, leaves: leaves.data, signups: mySignups.data,
    points: points.data.length ? points.data[0] : { openid, total: 0, used: 0 },
    checkins: checkins.data,
    team: team.data.length ? team.data[0] : null,
    schedules: schedule.data,
    logs: logs.data
  });
}

/* ================= 待办审批（跨类型聚合） ================= */
async function todoList(openid) {
  const u = await getUser(openid);
  if (!u) return ok({ todos: [], history: [] });
  const keys = u.role === 'admin'
    ? ['teacher', 'counselor', 'captain', 'leader', 'secretary', 'dept', 'vicedean', 'dean', 'expert', 'admin']
    : (ROLE_NODE_KEYS[u.role] || []);
  if (!keys.length) return ok({ todos: [], history: [] });

  const todos = [];
  const history = [];
  const colls = Object.keys(COLL_OF);
  for (const t of colls) {
    const r = await db.collection(COLL_OF[t]).where({ status: 'approving' }).limit(100).get();
    r.data.forEach((doc) => {
      const idx = pendingIdx(doc);
      if (idx > -1 && keys.indexOf(doc.nodes[idx].key) > -1) {
        todos.push(Object.assign({ _type: t, _nodeIdx: idx }, doc));
      }
    });
    const h = await db.collection(COLL_OF[t]).where({ status: _.in(['passed', 'rejected']) }).limit(50).get();
    h.data.forEach((doc) => {
      if ((doc.nodes || []).some((n) => n.approver === (u.name || '—') && n.approver !== '待定' && n.approver !== '—' && keys.indexOf(n.key) > -1)) {
        history.push(Object.assign({ _type: t }, doc));
      }
    });
  }
  return ok({ todos, history });
}

/* ================= 竞赛报名 ================= */
async function submitReg(openid, p) {
  if (!p || !p.compId) return fail('参数不完整');
  const u = await getUser(openid);
  const cq = await db.collection('competitions').where({ _id: p.compId }).limit(1).get();
  if (!cq.data.length) return fail('赛项不存在');
  const comp = cq.data[0];
  if (comp.closed) return fail('该赛项报名已截止');

  const dup = await db.collection('registrations')
    .where({ openid, compId: p.compId, status: _.neq('withdrawn') }).limit(1).get();
  if (dup.data.length) return fail('你已有该赛项的在途报名单');

  const isTeacherTrack = comp.track === 'teacher';
  let flow;
  if (isTeacherTrack) {
    flow = FLOWS.teacher_comp.slice();
    if (!comp.needExpert) flow = flow.filter((n) => n.key !== 'expert'); // 专家评审可跳过
  } else {
    flow = FLOWS['student_comp_' + (comp.level || 'C')];
  }
  const cnt = await db.collection('registrations').count();
  const seq = 1000 + (cnt.total || 0);
  const doc = {
    type: 'reg',
    openid,
    regNo: `NO.2026-${comp.no || 'X'}-${seq}`,
    compId: comp._id,
    compTitle: comp.title,
    title: `${comp.title} · ${p.teamName || (u && u.name) || ''}`,
    applicantName: (u && u.name) || '匿名',
    mode: p.mode || 'team',
    teamName: p.teamName || '',
    members: p.members || [],
    teacherId: p.teacherId || '',
    teacherName: p.teacherName || '',
    intro: p.intro || '', github: p.github || '', awards: p.awards || '',
    planFile: p.planFile || '（后补）',
    planFileID: p.planFileID || '',
    status: 'approving', version: 1, currentNode: 1,
    urgeCount: 0, escalated: false,
    deadline: comp.deadline || '',
    flowKey: isTeacherTrack ? 'teacher_comp' : 'student_comp_' + (comp.level || 'C'),
    nodes: buildNodes(flow, { teacher: p.teacherName }),
    createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('registrations').add({ data: doc });
  doc._id = r._id;
  await addLog(openid, '提交报名', doc.compTitle + ' · ' + (doc.teamName || '个人') + ' v1');
  return ok({ reg: doc });
}

/* ================= 请假 ================= */
async function submitLeave(openid, p) {
  const u = await getUser(openid);
  if (!p || !p.leaveType || !p.reason) return fail('请填写完整信息');
  const nodes = buildNodes(FLOWS.leave);
  // 队长自批机制：申请人自己是队长时，第 1 级自动通过
  if (u && (u.role === 'captain')) {
    nodes[1].status = 'pass';
    nodes[1].time = stamp();
    nodes[1].approver = u.name + '（自批）';
    nodes[1].note = '队长自批机制';
  }
  const doc = {
    type: 'leave',
    openid,
    applicantName: (u && u.name) || '匿名',
    title: `${(u && u.name) || ''} · ${p.leaveType}`,
    leaveType: p.leaveType,
    startTime: p.startTime || '', endTime: p.endTime || '',
    reason: p.reason,
    attachment: p.attachment || '', attachmentID: p.attachmentID || '',
    status: 'approving', version: 1,
    currentNode: (u && u.role === 'captain') ? 2 : 1,
    urgeCount: 0, escalated: false,
    flowKey: 'leave', nodes,
    createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('leave_requests').add({ data: doc });
  doc._id = r._id;
  await addLog(openid, '发起请假', `${p.leaveType} · ${p.startTime}~${p.endTime}`);
  return ok({ leave: doc });
}

/* ================= 培训 ================= */
async function publishTraining(openid, p) {
  const u = await getUser(openid);
  if (!u || ['teacher', 'counselor', 'leader', 'admin'].indexOf(u.role) === -1) return fail('只有教师/辅导员/负责人可以发布培训');
  if (!p || !p.title) return fail('请填写培训标题');
  const doc = {
    title: p.title, cover: p.cover || '/assets/covers/training.png',
    lecturer: p.lecturer || u.name, mode: p.mode || '线下',
    startTime: p.startTime || '', endTime: p.endTime || '',
    place: p.place || '', intro: p.intro || '', files: p.files || '',
    signupCount: 0, publisher: u.name, openid,
    createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('trainings').add({ data: doc });
  await addLog(openid, '发布培训', p.title);
  return ok({ _id: r._id });
}

async function signupTraining(openid, p) {
  const u = await getUser(openid);
  const tq = await db.collection('trainings').where({ _id: p.trainingId }).limit(1).get();
  if (!tq.data.length) return fail('培训不存在');
  const t = tq.data[0];
  const dup = await db.collection('training_signups')
    .where({ openid, trainingId: p.trainingId, status: _.in(['approving', 'passed']) }).limit(1).get();
  if (dup.data.length) return fail('你已报名该培训');
  const doc = {
    type: 'training',
    openid,
    applicantName: (u && u.name) || '匿名',
    trainingId: p.trainingId,
    title: `培训报名 · ${t.title}`,
    status: 'approving', version: 1, currentNode: 1,
    urgeCount: 0, escalated: false,
    flowKey: 'training',
    nodes: buildNodes(FLOWS.training, { teacher: t.lecturer }),
    createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('training_signups').add({ data: doc });
  doc._id = r._id;
  await addLog(openid, '报名培训', t.title);
  return ok({ signup: doc });
}

async function cancelSignup(openid, id) {
  const rq = await db.collection('training_signups').where({ _id: id }).limit(1).get();
  if (!rq.data.length) return fail('报名记录不存在');
  if (rq.data[0].openid !== openid) return fail('只能取消自己的报名');
  await db.collection('training_signups').doc(id).update({ data: { status: 'withdrawn' } });
  await addLog(openid, '取消培训报名', rq.data[0].title);
  return ok();
}

/* ================= 签到打卡与积分 ================= */
const SCENE_POINTS = { daily: 5, training: 10, comp: 15, meeting: 5, self: 5 };

async function checkin(openid, p) {
  const u = await getUser(openid);
  const points = SCENE_POINTS[p.scene] || 5;
  const today = stamp().slice(0, 10);
  const dup = await db.collection('checkin_records')
    .where({ openid, scene: p.scene, day: today }).limit(1).get();
  if (dup.data.length) return fail('今天该场景已打过卡');
  await db.collection('checkin_records').add({
    data: {
      openid, name: (u && u.name) || '匿名',
      scene: p.scene, sceneName: p.sceneName, points,
      location: p.location || '', photoID: p.photoID || '', place: p.place || '',
      day: today, createdAt: stamp(), ts: Date.now()
    }
  });
  const acc = await db.collection('points_accounts').where({ openid }).limit(1).get();
  if (acc.data.length) {
    await db.collection('points_accounts').doc(acc.data[0]._id).update({ data: { total: _.inc(points) } });
  } else {
    await db.collection('points_accounts').add({ data: { openid, total: points, used: 0 } });
  }
  await addLog(openid, '签到打卡', `${p.sceneName} +${points} 分`);
  return ok({ points });
}

/* 全院积分排行榜（公开数据：姓名+积分，不含联系方式） */
async function pointsRank() {
  const accs = await db.collection('points_accounts').orderBy('total', 'desc').limit(100).get();
  const openids = accs.data.map(a => a.openid);
  let users = [];
  if (openids.length) {
    const uq = await db.collection('users').where({ openid: _.in(openids) }).limit(100).get();
    users = uq.data;
  }
  const map = {};
  users.forEach(u => { map[u.openid] = u; });
  const rank = accs.data.map((a, i) => {
    const u = map[a.openid] || {};
    return {
      rank: i + 1,
      name: u.name || '同学',
      school: u.school || '',
      major: u.major || '',
      total: a.total || 0
    };
  });
  return ok({ rank });
}

/* ================= 课表 Excel/CSV 解析 ================= */
function parseSlotNums(text) {
  const t = String(text || '');
  const range = t.match(/(\d{1,2})\s*[-~—–]\s*(\d{1,2})/);
  let nums = [];
  if (range) { for (let i = +range[1]; i <= +range[2]; i++) nums.push(i); }
  else {
    const parts = t.match(/\d{1,2}/g);
    if (parts) parts.forEach(n => nums.push(+n));
  }
  return nums.filter((n, i) => n >= 1 && n <= 12 && nums.indexOf(n) === i);
}
function parseWeekdayNum(text) {
  const t = String(text || '');
  const cn = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
  for (const k in cn) { if (t.indexOf(k) > -1) return cn[k]; }
  const d = t.match(/[1-7]/);
  return d ? +d[0] : 0;
}
function rowsToCourses(rows) {
  // 在前 5 行里找表头：课程名 / 星期 / 节次
  let hi = -1, col = {};
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const r = rows[i] || [];
    const c = {};
    r.forEach((cell, j) => {
      const t = String(cell || '');
      if (/课程|名称|科目/.test(t)) c.name = j;
      if (/星期|周几/.test(t) || t === '周') c.weekday = j;
      if (/节次|节数|时间/.test(t) || t === '节') c.slots = j;
      if (/地点|教室|场所/.test(t)) c.place = j;
      if (/教师|老师/.test(t)) c.teacher = j;
    });
    if (c.name !== undefined && c.weekday !== undefined && c.slots !== undefined) { hi = i; col = c; break; }
  }
  if (hi < 0) return [];
  const courses = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = String(r[col.name] || '').trim();
    const weekday = parseWeekdayNum(r[col.weekday]);
    const slots = parseSlotNums(r[col.slots]);
    if (!name || !weekday || !slots.length) continue;
    courses.push({
      name,
      teacher: col.teacher !== undefined ? String(r[col.teacher] || '').trim() : '',
      place: col.place !== undefined ? String(r[col.place] || '').trim() : '',
      weekday,
      slots,
      slotLabel: slots.length > 1 ? `第${slots[0]}-${slots[slots.length - 1]}节` : `第${slots[0]}节`
    });
  }
  return courses;
}
async function parseSchedule(openid, fileID) {
  if (!fileID) return fail('缺少文件');
  const dl = await cloud.downloadFile({ fileID });
  const buf = dl.fileContent;
  let rows = [];
  if (/\.csv$/i.test(fileID)) {
    rows = buf.toString('utf8').split(/\r?\n/).filter(l => l.trim()).map(l => l.split(/[,\t]/).map(s => s.trim()));
  } else {
    if (!ExcelJS) return fail('云函数未安装 exceljs，请在开发者工具中对该云函数选择「上传并部署：云端安装依赖」');
    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(buf);
    } catch (e) {
      return fail('无法解析该文件：旧版 .xls 请先用 Excel/WPS 另存为 .xlsx 再导入');
    }
    const ws = wb.worksheets[0];
    if (!ws) return fail('Excel 中没有工作表');
    ws.eachRow((r) => {
      rows.push((r.values || []).slice(1).map(v => {
        if (v == null) return '';
        if (typeof v === 'object') {
          if (v.richText) return v.richText.map(x => x.text).join('').trim();
          return String(v.text != null ? v.text : (v.result != null ? v.result : '')).trim();
        }
        return String(v).trim();
      }));
    });
  }
  const courses = rowsToCourses(rows);
  if (!courses.length) return fail('没有识别到课程：请确保表格有「课程名称 / 星期 / 节次」三列表头');
  await addLog(openid, '课表导入', `Excel 解析出 ${courses.length} 门课`);
  return ok({ courses });
}

/* ================= 科创瞭望台 ================= */
// 权限（PRD 变更说明）：管理员增删改查，教学秘书增删查，院长查看，学生/教师观看
async function publishVideo(openid, p) {
  const u = await getUser(openid);
  if (!u || ['admin', 'secretary'].indexOf(u.role) === -1) return fail('仅管理员/教学秘书可上传视频');
  const v = {
    title: String(p.title || '').trim().slice(0, 50),
    courseId: p.courseId || '', lecturerId: p.lecturerId || '',
    intro: p.intro || '', duration: p.duration || '',
    fileID: p.fileID || '', coverFileID: p.coverFileID || '',
    sort: Number(p.sort) || 0, status: 'published', views: 0,
    scope: p.scope || 'all', createdBy: openid, createdAt: stamp(), ts: Date.now()
  };
  if (!v.title || !v.fileID) return fail('视频标题和视频文件必填');
  const r = await db.collection('videos').add({ data: v });
  await addLog(openid, '上传瞭望台视频', v.title);
  return ok({ _id: r._id });
}

async function deleteVideo(openid, id) {
  const u = await getUser(openid);
  if (!u || ['admin', 'secretary'].indexOf(u.role) === -1) return fail('仅管理员/教学秘书可删除视频');
  await db.collection('videos').doc(id).remove();
  await addLog(openid, '删除瞭望台视频', id);
  return ok({});
}

/* 观看记录：同一用户同一视频只记一条，秒数取最大值，≥90% 计完播 */
async function recordWatch(openid, p) {
  const sec = Math.floor(Number(p.seconds) || 0);
  const dur = Math.floor(Number(p.duration) || 0);
  const finished = dur > 0 && sec >= dur * 0.9;
  const q = await db.collection('watch_records').where({ openid, videoId: p.videoId }).limit(1).get();
  if (q.data.length) {
    const rec = q.data[0];
    await db.collection('watch_records').doc(rec._id).update({
      data: { seconds: Math.max(rec.seconds || 0, sec), finished: rec.finished || finished, lastAt: stamp() }
    });
  } else {
    await db.collection('watch_records').add({
      data: { openid, videoId: p.videoId, seconds: sec, finished, lastAt: stamp(), ts: Date.now() }
    });
    await db.collection('videos').doc(p.videoId).update({ data: { views: _.inc(1) } }).catch(() => {});
  }
  return ok({});
}

/* ================= 获奖证书（上传→审核→轮播） ================= */
async function submitCert(openid, p) {
  const u = await getUser(openid);
  if (!u) return fail('请先登录');
  const cert = {
    openid, studentName: p.studentName || u.name || '同学',
    compTitle: String(p.compTitle || '').trim(),
    award: p.award || '', year: p.year || '', certNo: p.certNo || '',
    fileID: p.fileID || '', status: 'pending', note: '',
    createdAt: stamp(), ts: Date.now()
  };
  if (!cert.compTitle || !cert.award) return fail('竞赛名称和获奖等级必填');
  const r = await db.collection('certificates').add({ data: cert });
  await addLog(openid, '上传证书', `${cert.compTitle} · ${cert.award}`);
  return ok({ _id: r._id });
}

async function adminCert(openid, p) {
  const u = await getUser(openid);
  if (!u || u.role !== 'admin') return fail('仅管理员可审核证书');
  if (p.op === 'list') {
    const r = await db.collection('certificates').orderBy('ts', 'desc').limit(100).get();
    return ok({ certs: r.data });
  }
  if (p.op === 'approve' || p.op === 'reject') {
    await db.collection('certificates').doc(p.id).update({
      data: { status: p.op === 'approve' ? 'passed' : 'rejected', note: p.note || '', reviewedAt: stamp() }
    });
    await addLog(openid, p.op === 'approve' ? '证书审核通过' : '证书审核驳回', p.id);
    return ok({});
  }
  return fail('未知操作');
}

async function exchange(openid, p) {
  const u = await getUser(openid);
  const pq = await db.collection('point_exchange_products').where({ _id: p.productId }).limit(1).get();
  if (!pq.data.length) return fail('商品不存在');
  const prod = pq.data[0];
  if (prod.off) return fail('商品已下架');
  if (prod.stock <= 0) return fail('库存不足');
  const acc = await db.collection('points_accounts').where({ openid }).limit(1).get();
  const avail = acc.data.length ? (acc.data[0].total - acc.data[0].used) : 0;
  if (avail < prod.price) return fail('积分不足');
  await db.collection('point_exchange_products').doc(prod._id).update({ data: { stock: _.inc(-1) } });
  if (acc.data.length) {
    await db.collection('points_accounts').doc(acc.data[0]._id).update({ data: { used: _.inc(prod.price) } });
  } else {
    await db.collection('points_accounts').add({ data: { openid, total: 0, used: prod.price } });
  }
  await db.collection('point_exchange_records').add({
    data: {
      openid, name: (u && u.name) || '匿名',
      productId: prod._id, productName: prod.name, price: prod.price,
      address: p.address || '', status: '待审核',
      createdAt: stamp(), ts: Date.now()
    }
  });
  await addLog(openid, '积分兑换', `${prod.name} -${prod.price} 分`);
  return ok();
}

/* ================= 知识广场 ================= */
async function publishKnowledge(openid, p) {
  const u = await getUser(openid);
  if (!u) return fail('请先登录');
  if (u.role === 'expert') return fail('评审专家仅可查看，不可发布');
  if (!p || !p.title || !p.content) return fail('请填写标题和内容');
  const doc = {
    title: p.title, content: p.content,
    tags: p.tags || [], images: p.images || [],
    author: u.name, authorRole: u.role, teamName: p.teamName || '',
    likes: 0, favs: 0, commentCount: 0,
    topped: false, featured: false,
    openid, createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('learning_knowledge').add({ data: doc });
  await addLog(openid, '发布知识点', p.title);
  return ok({ _id: r._id });
}

async function likeKnowledge(openid, p) {
  await db.collection('learning_knowledge').doc(p.id).update({ data: { likes: _.inc(1) } });
  return ok();
}

async function commentKnowledge(openid, p) {
  const u = await getUser(openid);
  if (u && u.role === 'expert') return fail('评审专家仅可查看，不可评论');
  if (!p.content) return fail('评论不能为空');
  await db.collection('knowledge_comments').add({
    data: { knowledgeId: p.id, openid, author: (u && u.name) || '匿名', content: p.content, createdAt: stamp(), ts: Date.now() }
  });
  await db.collection('learning_knowledge').doc(p.id).update({ data: { commentCount: _.inc(1) } });
  return ok();
}

async function topKnowledge(openid, p) {
  const u = await getUser(openid);
  if (!u || ['captain', 'teacher', 'admin'].indexOf(u.role) === -1) return fail('只有队长/教师/管理员可以置顶');
  await db.collection('learning_knowledge').doc(p.id).update({ data: { topped: !!p.on } });
  await addLog(openid, p.on ? '置顶知识点' : '取消置顶', p.id);
  return ok();
}

async function featureKnowledge(openid, p) {
  const u = await getUser(openid);
  if (!u || u.role !== 'admin') return fail('只有管理员可以精选');
  await db.collection('learning_knowledge').doc(p.id).update({ data: { featured: !!p.on } });
  return ok();
}

/* ================= 队伍 ================= */
async function createTeam(openid, p) {
  const u = await getUser(openid);
  if (!u) return fail('请先登录');
  if (u.teamId) return fail('你已有队伍');
  if (!p || !p.name) return fail('请填写队伍名称');
  const doc = {
    name: p.name, intro: p.intro || '',
    captainId: openid, captainName: u.name,
    viceId: '', viceName: '',
    members: [{ openid, name: u.name, role: 'captain' }],
    applicants: [],
    logs: [], files: [], posts: [],
    points: 0, createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('teams').add({ data: doc });
  await db.collection('users').doc(u._id).update({ data: { teamId: r._id, role: 'captain' } });
  await addLog(openid, '创建队伍', p.name);
  return ok({ teamId: r._id });
}

async function applyTeam(openid, p) {
  const u = await getUser(openid);
  const tq = await db.collection('teams').where({ _id: p.teamId }).limit(1).get();
  if (!tq.data.length) return fail('队伍不存在');
  const t = tq.data[0];
  if ((t.members || []).some((m) => m.openid === openid)) return fail('你已在队伍中');
  if ((t.applicants || []).some((a) => a.openid === openid)) return fail('已申请，等待队长审批');
  await db.collection('teams').doc(p.teamId).update({
    data: { applicants: _.push([{ openid, name: (u && u.name) || '匿名', time: stamp() }]) }
  });
  return ok();
}

async function teamAct(openid, p) {
  const u = await getUser(openid);
  const tq = await db.collection('teams').where({ _id: p.teamId }).limit(1).get();
  if (!tq.data.length) return fail('队伍不存在');
  const t = tq.data[0];
  if (t.captainId !== openid && t.viceId !== openid) return fail('只有队长/副队长可以操作');
  if (p.op === 'approve') {
    const ap = (t.applicants || []).find((a) => a.openid === p.target);
    if (!ap) return fail('申请不存在');
    await db.collection('teams').doc(p.teamId).update({
      data: {
        applicants: (t.applicants || []).filter((a) => a.openid !== p.target),
        members: _.push([{ openid: ap.openid, name: ap.name, role: 'member' }])
      }
    });
    const tu = await getUser(p.target);
    if (tu) await db.collection('users').doc(tu._id).update({ data: { teamId: p.teamId } });
  } else if (p.op === 'rejectApply') {
    await db.collection('teams').doc(p.teamId).update({
      data: { applicants: (t.applicants || []).filter((a) => a.openid !== p.target) }
    });
  } else if (p.op === 'remove') {
    await db.collection('teams').doc(p.teamId).update({
      data: { members: (t.members || []).filter((m) => m.openid !== p.target) }
    });
    const tu = await getUser(p.target);
    if (tu) await db.collection('users').doc(tu._id).update({ data: { teamId: '', role: 'student' } });
  } else if (p.op === 'setVice') {
    await db.collection('teams').doc(p.teamId).update({ data: { viceId: p.target, viceName: p.targetName } });
    const tu = await getUser(p.target);
    if (tu) await db.collection('users').doc(tu._id).update({ data: { role: 'vicecaptain' } });
  } else if (p.op === 'unsetVice') {
    await db.collection('teams').doc(p.teamId).update({ data: { viceId: '', viceName: '' } });
    const tu = await getUser(p.target);
    if (tu) await db.collection('users').doc(tu._id).update({ data: { role: 'student' } });
  } else if (p.op === 'addLog') {
    await db.collection('teams').doc(p.teamId).update({
      data: { logs: _.push([{ openid, name: u.name, content: p.content, time: stamp() }]) }
    });
  } else if (p.op === 'addPost') {
    await db.collection('teams').doc(p.teamId).update({
      data: { posts: _.push([{ openid, name: u.name, content: p.content, image: p.image || '', time: stamp() }]) }
    });
  } else if (p.op === 'addFile') {
    await db.collection('teams').doc(p.teamId).update({
      data: { files: _.push([{ openid, name: u.name, fileName: p.fileName, fileID: p.fileID || '', folder: p.folder || '默认', time: stamp() }]) }
    });
  } else {
    return fail('未知操作');
  }
  await addLog(openid, '队伍操作', p.op);
  return ok();
}

/* ================= 课表 ================= */
async function saveSchedule(openid, p) {
  const u = await getUser(openid);
  if (!p || !p.semester) return fail('请选择学期');
  const exist = await db.collection('schedules').where({ openid, semester: p.semester }).limit(1).get();
  const data = {
    openid, name: (u && u.name) || '匿名',
    college: (u && u.college) || '', major: (u && u.major) || '',
    semester: p.semester, courses: p.courses || [],
    source: p.source || 'manual', fileID: p.fileID || '',
    updatedAt: stamp(), ts: Date.now()
  };
  if (exist.data.length) {
    await db.collection('schedules').doc(exist.data[0]._id).update({ data });
  } else {
    await db.collection('schedules').add({ data: Object.assign({ createdAt: stamp() }, data) });
  }
  await addLog(openid, '保存课表', `${p.semester} · ${data.courses.length} 门课`);
  return ok();
}

/** 空闲学生查询：按 星期 + 小节 检查所有课表 */
async function freeStudents(openid, p) {
  const u = await getUser(openid);
  if (!u || ['teacher', 'counselor', 'admin', 'leader'].indexOf(u.role) === -1) {
    return fail('只有教师/辅导员可以查询空闲学生');
  }
  const weekday = Number(p.weekday); // 1-7
  const slots = p.slots || [];       // [1,2,...] 小节号
  const all = await db.collection('schedules').where({ semester: p.semester || '' }).limit(500).get();
  let list = all.data;
  if (!p.semester) {
    const all2 = await db.collection('schedules').limit(500).get();
    list = all2.data;
  }
  const free = [];
  const busy = [];
  list.forEach((sch) => {
    const occupied = (sch.courses || []).some((c) =>
      Number(c.weekday) === weekday && (c.slots || []).some((s) => slots.indexOf(Number(s)) > -1)
    );
    (occupied ? busy : free).push({ name: sch.name, college: sch.college, major: sch.major });
  });
  return ok({ free, busy, total: list.length });
}

/* ================= 新闻 ================= */
async function publishNews(openid, p) {
  const u = await getUser(openid);
  const canPost = ['teacher', 'counselor', 'leader', 'secretary', 'dept', 'vicedean', 'dean', 'admin'];
  if (!u || canPost.indexOf(u.role) === -1) return fail('当前角色不能发布新闻');
  if (!p || !p.title || !p.content) return fail('请填写标题和内容');
  const doc = {
    type: 'news',
    openid,
    applicantName: u.name,
    title: p.title,
    newsType: p.newsType || '赛事动态',
    content: p.content,
    publishAt: p.publishAt || '',       // 定时发布时间（管理员审核通过 + 到点后自动放出）
    visible: !p.publishAt,              // 定时发布：到点前对师生隐藏，由定时触发器自动放出
    topped: false,
    status: 'approving', version: 1, currentNode: 1,
    urgeCount: 0, escalated: false,
    flowKey: 'news', nodes: buildNodes(FLOWS.news),
    createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('news').add({ data: doc });
  doc._id = r._id;
  await addLog(openid, '提交新闻', p.title);
  return ok({ news: doc });
}

/* ================= 经费 ================= */
async function submitExpense(openid, p) {
  const u = await getUser(openid);
  if (!p || !p.title || !p.amount) return fail('请填写完整信息');
  const doc = {
    type: 'expense',
    openid,
    applicantName: (u && u.name) || '匿名',
    title: p.title,
    amount: Number(p.amount) || 0,
    purpose: p.purpose || '',
    status: 'approving', version: 1, currentNode: 1,
    urgeCount: 0, escalated: false,
    flowKey: 'expense', nodes: buildNodes(FLOWS.expense),
    createdAt: stamp(), ts: Date.now()
  };
  const r = await db.collection('expenses').add({ data: doc });
  doc._id = r._id;
  await addLog(openid, '经费申请', `${p.title} · ¥${p.amount}`);
  return ok({ expense: doc });
}

/* ================= 统计 ================= */
async function stats(openid) {
  const u = await getUser(openid);
  const [regs, comps, users, checkins] = await Promise.all([
    db.collection('registrations').limit(500).get(),
    db.collection('competitions').limit(200).get(),
    db.collection('users').limit(500).get(),
    db.collection('checkin_records').limit(500).get()
  ]);
  const myRegs = regs.data.filter((r) => r.openid === openid);
  const perComp = comps.data.map((c) => ({
    title: c.title,
    count: regs.data.filter((r) => r.compId === c._id).length
  }));
  return ok({
    my: {
      total: myRegs.length,
      passed: myRegs.filter((r) => r.status === 'passed').length,
      approving: myRegs.filter((r) => r.status === 'approving').length,
      checkins: checkins.data.filter((c) => c.openid === openid).length
    },
    all: {
      users: users.data.length,
      regs: regs.data.length,
      passed: regs.data.filter((r) => r.status === 'passed').length,
      perComp
    },
    isManager: u && ['admin', 'dean', 'vicedean', 'secretary', 'dept', 'teacher', 'counselor'].indexOf(u.role) > -1
  });
}

/* ================= 管理员 ================= */
async function adminUsers(openid, p) {
  const u = await getUser(openid);
  if (!u || u.role !== 'admin') return fail('仅管理员可操作');
  if (p.op === 'list') {
    const r = await db.collection('users').limit(200).get();
    return ok({ users: r.data });
  }
  if (p.op === 'setRole') {
    await db.collection('users').doc(p.userId).update({ data: { role: p.role } });
    await addLog(openid, '调整角色', `${p.userName} → ${p.role}`);
    return ok();
  }
  if (p.op === 'toggle') {
    await db.collection('users').doc(p.userId).update({ data: { disabled: !!p.disabled } });
    await addLog(openid, p.disabled ? '禁用账号' : '启用账号', p.userName);
    return ok();
  }
  return fail('未知操作');
}

async function adminProduct(openid, p) {
  const u = await getUser(openid);
  if (!u || u.role !== 'admin') return fail('仅管理员可操作');
  if (p.op === 'add') {
    await db.collection('point_exchange_products').add({
      data: { name: p.name, price: Number(p.price) || 0, stock: Number(p.stock) || 0, off: false, createdAt: stamp() }
    });
    return ok();
  }
  if (p.op === 'toggle') {
    await db.collection('point_exchange_products').doc(p.id).update({ data: { off: !!p.off } });
    return ok();
  }
  if (p.op === 'stock') {
    await db.collection('point_exchange_products').doc(p.id).update({ data: { stock: Number(p.stock) || 0 } });
    return ok();
  }
  return fail('未知操作');
}

/* ================= Excel：真 .xlsx 导出 + 经费自动归档 ================= */
// 可导出数据的角色：教师/管理/学院领导；辅导员视同教师
const MANAGER_ROLES = ['teacher', 'counselor', 'leader', 'secretary', 'dept', 'vicedean', 'dean', 'admin'];
// 全院数据角色（不受指导范围限制）
const FULL_ROLES = ['admin', 'dean', 'vicedean', 'secretary', 'dept', 'leader'];
const STATUS_TXT = { approving: '审批中', passed: '已通过', rejected: '已驳回', withdrawn: '已撤回', scheduled: '待放出' };

/** 教师角色：返回限定条件 { teacherName: u.name }；管理员级返回空对象（不限） */
async function teacherFilter(u) {
  if (FULL_ROLES.indexOf(u.role) > -1) return {};
  if (u.role === 'teacher' || u.role === 'counselor') return { teacherName: u.name };
  return {};
}

async function newSheet(wb, name, headers) {
  const ws = wb.addWorksheet(name);
  ws.columns = headers;
  ws.getRow(1).font = { bold: true };
  return ws;
}

async function uploadXlsx(wb, cloudPath) {
  const buf = await wb.xlsx.writeBuffer();
  const up = await cloud.uploadFile({ cloudPath, fileContent: buf });
  const u = await cloud.getTempFileURL({ fileList: [up.fileID] });
  return { fileID: up.fileID, tempUrl: u.fileList[0] && u.fileList[0].tempFileURL };
}

/** 经费终审通过 → 追加进当月归档 Excel（云存储 archives/ 目录） */
async function archiveExpense(doc) {
  if (!ExcelJS) return;
  const ym = stamp().slice(0, 7);
  const cloudPath = `archives/经费归档_${ym}.xlsx`;
  const { ENV } = cloud.getWXContext();
  const wb = new ExcelJS.Workbook();
  let ws = null;
  try {
    const f = await cloud.downloadFile({ fileID: `cloud://${ENV}/${cloudPath}` });
    await wb.xlsx.load(f.fileContent);
    ws = wb.getWorksheet('经费台账');
  } catch (e) { /* 归档文件尚不存在，新建 */ }
  if (!ws) {
    ws = await newSheet(wb, '经费台账', [
      { header: '归档时间', key: 'time', width: 18 },
      { header: '申请人', key: 'applicant', width: 12 },
      { header: '事项', key: 'title', width: 32 },
      { header: '金额(元)', key: 'amount', width: 12 },
      { header: '用途说明', key: 'purpose', width: 36 },
      { header: '终审时间', key: 'passTime', width: 18 }
    ]);
  }
  ws.addRow({ time: stamp(), applicant: doc.applicantName || '', title: doc.title || '', amount: doc.amount || 0, purpose: doc.purpose || '', passTime: stamp() });
  await cloud.uploadFile({ cloudPath, fileContent: await wb.xlsx.writeBuffer() });
}

/** 一键导出真 Excel：kind = regs / expenses / schedules / free */
async function exportXlsx(openid, event) {
  if (!ExcelJS) return fail('Excel 组件未安装：请在云函数 api 上点「上传并部署：云端安装依赖」');
  const u = await getUser(openid);
  if (!u || MANAGER_ROLES.indexOf(u.role) === -1) return fail('仅教师/管理角色可导出数据');
  const kind = event.kind;
  const wb = new ExcelJS.Workbook();
  const dateTag = stamp().slice(0, 10);
  let fileName = '';
  const scope = await teacherFilter(u);  // 教师角色会自动限定到本人指导范围

  if (kind === 'regs') {
    // 教师：仅本人指导范围；管理员级：全院
    const conds = Object.assign({}, scope);
    if (event.compId) conds.compId = event.compId;
    if (event.status) conds.status = event.status;
    const r = await db.collection('registrations').where(conds).limit(1000).get();
    const ws = await newSheet(wb, '报名名单', [
      { header: '报名单号', key: 'no', width: 22 }, { header: '竞赛', key: 'comp', width: 32 },
      { header: '形式', key: 'mode', width: 8 }, { header: '队名', key: 'team', width: 16 },
      { header: '申请人', key: 'who', width: 12 }, { header: '指导教师', key: 'teacher', width: 12 },
      { header: '状态', key: 'st', width: 10 }, { header: '提交时间', key: 'time', width: 18 }
    ]);
    r.data.forEach((d) => ws.addRow({
      no: d.regNo || '', comp: d.compTitle || '', mode: d.mode === 'solo' ? '个人' : '组队',
      team: d.teamName || '—', who: d.applicantName || '', teacher: d.teacherName || '—',
      st: STATUS_TXT[d.status] || d.status, time: d.createdAt || ''
    }));
    fileName = `报名名单_${dateTag}.xlsx`;
  } else if (kind === 'oneCompRegs') {
    // 单个竞赛明细（含队员 / 指导教师 / 全部审批节点）
    const compId = event.compId;
    if (!compId) return fail('请提供 compId');
    const cr = await db.collection('competitions').doc(compId).get().catch(() => null);
    const compTitle = cr && cr.data ? cr.data.title : '';
    const conds = Object.assign({ compId }, scope);
    const r = await db.collection('registrations').where(conds).limit(500).get();
    const ws = await newSheet(wb, compTitle || '竞赛明细', [
      { header: '报名单号', key: 'no', width: 22 }, { header: '队名', key: 'team', width: 18 },
      { header: '申请人', key: 'who', width: 12 }, { header: '学号', key: 'sid', width: 14 },
      { header: '指导教师', key: 'teacher', width: 12 }, { header: '当前节点', key: 'node', width: 18 },
      { header: '状态', key: 'st', width: 10 }, { header: '队员', key: 'members', width: 40 },
      { header: '项目简介', key: 'intro', width: 50 }
    ]);
    r.data.forEach((d) => {
      const nodeNow = (d.nodes || []).find(n => n.status === 'waiting');
      ws.addRow({
        no: d.regNo || '', team: d.teamName || '—',
        who: d.applicantName || '', sid: d.studentId || '',
        teacher: d.teacherName || '—', node: nodeNow ? nodeNow.name : '已完成',
        st: STATUS_TXT[d.status] || d.status,
        members: (d.members || []).map(m => `${m.name || ''}${m.studentId ? '·' + m.studentId : ''}`).join('；') || '—',
        intro: (d.intro || '').slice(0, 200)
      });
    });
    fileName = `${compTitle || '竞赛'}_明细_${dateTag}.xlsx`;
  } else if (kind === 'myAdvisees') {
    // 教师指导学生：按 teacherName 聚合报名单得到学生列表
    const teacherName = event.teacherName || (u.role === 'teacher' || u.role === 'counselor' ? u.name : '');
    if (!teacherName) return fail('请提供 teacherName 或使用教师身份登录');
    const r = await db.collection('registrations').where({ teacherName }).limit(1000).get();
    // 聚合：按 applicantName 去重，统计报名/通过次数
    const map = {};
    r.data.forEach((d) => {
      const k = d.applicantName || '';
      if (!map[k]) map[k] = { who: k, sid: d.studentId || '', teacher: teacherName, total: 0, passed: 0, comps: [] };
      map[k].total++;
      if (d.status === 'passed') map[k].passed++;
      if (d.compTitle && map[k].comps.indexOf(d.compTitle) === -1) map[k].comps.push(d.compTitle);
    });
    const ws = await newSheet(wb, '指导学生', [
      { header: '姓名', key: 'who', width: 12 }, { header: '学号', key: 'sid', width: 14 },
      { header: '指导教师', key: 'teacher', width: 12 }, { header: '报名总数', key: 'total', width: 10 },
      { header: '已通过', key: 'passed', width: 10 }, { header: '参赛项目', key: 'comps', width: 50 }
    ]);
    Object.values(map).forEach((row) => ws.addRow(row));
    fileName = `${teacherName}_指导学生_${dateTag}.xlsx`;
  } else if (kind === 'studentAwards') {
    // 学生获奖名单（已通过审核）
    const conds = { status: 'passed' };
    if (event.award) conds.award = event.award;
    const r = await db.collection('certificates').where(conds).limit(1000).get();
    const ws = await newSheet(wb, '获奖名单', [
      { header: '学生', key: 'who', width: 12 }, { header: '竞赛', key: 'comp', width: 32 },
      { header: '奖项', key: 'award', width: 16 }, { header: '年份', key: 'year', width: 8 },
      { header: '审核时间', key: 'time', width: 18 }
    ]);
    r.data.forEach((d) => ws.addRow({
      who: d.studentName || '', comp: d.compTitle || '',
      award: d.award || '', year: d.year || '', time: d.reviewedAt || d.time || ''
    }));
    fileName = `学生获奖名单_${dateTag}.xlsx`;
  } else if (kind === 'trainingSignups') {
    // 培训记录
    const conds = {};
    if (event.trainingId) conds.trainingId = event.trainingId;
    const r = await db.collection('training_signups').where(conds).limit(1000).get();
    // 关联培训名
    const ts = await db.collection('trainings').limit(200).get();
    const tn = {}; ts.data.forEach(t => { tn[t._id] = t.title; });
    const ws = await newSheet(wb, '培训记录', [
      { header: '申请人', key: 'who', width: 12 }, { header: '培训', key: 'title', width: 32 },
      { header: '主讲', key: 'lecturer', width: 14 }, { header: '状态', key: 'st', width: 10 },
      { header: '报名时间', key: 'time', width: 18 }
    ]);
    r.data.forEach((d) => ws.addRow({
      who: d.applicantName || '',
      title: tn[d.trainingId] || d.trainingTitle || '—',
      lecturer: d.lecturer || '',
      st: STATUS_TXT[d.status] || d.status,
      time: d.createdAt || ''
    }));
    fileName = `培训记录_${dateTag}.xlsx`;
  } else if (kind === 'expenses') {
    const conds = {};
    if (event.status) conds.status = event.status;
    const r = await db.collection('expenses').where(conds).limit(1000).get();
    const ws = await newSheet(wb, '经费台账', [
      { header: '申请人', key: 'who', width: 12 }, { header: '事项', key: 'title', width: 32 },
      { header: '金额(元)', key: 'amount', width: 12 }, { header: '用途', key: 'purpose', width: 36 },
      { header: '状态', key: 'st', width: 10 }, { header: '申请时间', key: 'time', width: 18 }
    ]);
    r.data.forEach((d) => ws.addRow({
      who: d.applicantName || '', title: d.title || '', amount: d.amount || 0,
      purpose: d.purpose || '', st: STATUS_TXT[d.status] || d.status, time: d.createdAt || ''
    }));
    fileName = `经费台账_${dateTag}.xlsx`;
  } else if (kind === 'schedules') {
    const conds = {};
    if (event.semester) conds.semester = event.semester;
    const r = await db.collection('schedules').where(conds).limit(1000).get();
    const ws = await newSheet(wb, '课表明细', [
      { header: '姓名', key: 'who', width: 12 }, { header: '学院', key: 'college', width: 18 },
      { header: '学期', key: 'sem', width: 16 }, { header: '课程', key: 'course', width: 24 },
      { header: '星期', key: 'wd', width: 8 }, { header: '小节', key: 'slots', width: 10 },
      { header: '地点', key: 'place', width: 16 }
    ]);
    r.data.forEach((s) => (s.courses || []).forEach((c) => ws.addRow({
      who: s.name || '', college: s.college || '', sem: s.semester || '',
      course: c.name || c.course || '', wd: c.weekday || '', slots: (c.slots || []).join(','), place: c.place || ''
    })));
    fileName = `课表明细_${dateTag}.xlsx`;
  } else if (kind === 'free') {
    // 空闲学生名单：与 freeStudents 同口径，服务端重算后导出
    const weekday = Number(event.weekday);
    const slots = event.slots || [];
    const all = event.semester
      ? await db.collection('schedules').where({ semester: event.semester }).limit(500).get()
      : await db.collection('schedules').limit(500).get();
    const ws = await newSheet(wb, '空闲学生', [
      { header: '姓名', key: 'who', width: 12 }, { header: '学院', key: 'college', width: 18 },
      { header: '专业', key: 'major', width: 18 }
    ]);
    all.data.forEach((sch) => {
      const occupied = (sch.courses || []).some((c) =>
        Number(c.weekday) === weekday && (c.slots || []).some((s) => slots.indexOf(Number(s)) > -1));
      if (!occupied) ws.addRow({ who: sch.name || '', college: sch.college || '', major: sch.major || '' });
    });
    fileName = `空闲学生_周${weekday}第${slots.join('-')}节_${dateTag}.xlsx`;
  } else {
    return fail('未知导出类型: ' + kind);
  }

  // 文件名追加角色范围标记
  const scopeTag = (u.role === 'teacher' || u.role === 'counselor') ? '本人指导范围_' : '';
  const res = await uploadXlsx(wb, 'exports/' + (scopeTag ? scopeTag + fileName : fileName));
  await addLog(openid, '导出Excel', (scopeTag ? '[本人指导范围] ' : '') + fileName);
  return ok(res);
}

/* ================= 定时触发器：到点自动放出定时新闻 ================= */
async function publishDueNews() {
  const now = stamp(); // 'YYYY-MM-DD HH:mm' 字符串可直接比较
  const r = await db.collection('news')
    .where({ visible: false, status: 'passed', publishAt: _.lte(now) })
    .limit(50).get();
  for (const n of r.data) {
    await db.collection('news').doc(n._id).update({ data: { visible: true } });
  }
  if (r.data.length) await addLog('system', '定时发布新闻', `放出 ${r.data.length} 条`);
  return r.data.length;
}

/* ================= 路由入口 ================= */
exports.main = async (event) => {
  // 定时触发器调用（每 5 分钟）：无用户上下文，只放出到点的定时新闻
  if (event.Type === 'timer' || event.TriggerName) {
    try {
      const n = await publishDueNews();
      return { ok: true, published: n };
    } catch (e) {
      console.error('[api] 定时触发器异常', e);
      return { ok: false, msg: String(e.message || e) };
    }
  }
  const { OPENID } = cloud.getWXContext();
  const a = event.action;
  try {
    switch (a) {
      case 'login':          return await login(OPENID, event);
      case 'updateProfile':  return await updateProfile(OPENID, event);
      case 'me':             return await me(OPENID);
      case 'todoList':       return await todoList(OPENID);

      case 'submit':         return await submitReg(OPENID, event.payload);
      case 'submitLeave':    return await submitLeave(OPENID, event.payload);
      case 'submitExpense':  return await submitExpense(OPENID, event.payload);
      case 'publishNews':    return await publishNews(OPENID, event.payload);

      case 'act':            return await genericAct(OPENID, COLL_OF[event.targetType] || 'registrations', event.id, event.op, event.note, event.signature);
      case 'resubmit':       return await genericResubmit(OPENID, COLL_OF[event.targetType] || 'registrations', event.id);
      case 'withdraw':       return await genericWithdraw(OPENID, COLL_OF[event.targetType] || 'registrations', event.id);
      case 'urge':           return await genericUrge(OPENID, COLL_OF[event.targetType] || 'registrations', event.id);

      case 'publishTraining': return await publishTraining(OPENID, event.payload);
      case 'signupTraining':  return await signupTraining(OPENID, event.payload);
      case 'cancelSignup':    return await cancelSignup(OPENID, event.id);

      case 'checkin':        return await checkin(OPENID, event.payload);
      case 'pointsRank':     return await pointsRank();
      case 'parseSchedule':  return await parseSchedule(OPENID, event.fileID);
      case 'publishVideo':   return await publishVideo(OPENID, event.payload);
      case 'deleteVideo':    return await deleteVideo(OPENID, event.id);
      case 'recordWatch':    return await recordWatch(OPENID, event);
      case 'submitCert':     return await submitCert(OPENID, event.payload);
      case 'adminCert':      return await adminCert(OPENID, event.payload || event);
      case 'exchange':       return await exchange(OPENID, event.payload);

      case 'publishKnowledge': return await publishKnowledge(OPENID, event.payload);
      case 'likeKnowledge':    return await likeKnowledge(OPENID, event);
      case 'commentKnowledge': return await commentKnowledge(OPENID, event);
      case 'topKnowledge':     return await topKnowledge(OPENID, event);
      case 'featureKnowledge': return await featureKnowledge(OPENID, event);

      case 'createTeam':     return await createTeam(OPENID, event.payload);
      case 'applyTeam':      return await applyTeam(OPENID, event);
      case 'teamAct':        return await teamAct(OPENID, event);

      case 'saveSchedule':   return await saveSchedule(OPENID, event.payload);
      case 'freeStudents':   return await freeStudents(OPENID, event);

      case 'stats':          return await stats(OPENID);
      case 'adminUsers':     return await adminUsers(OPENID, event);
      case 'adminProduct':   return await adminProduct(OPENID, event);
      case 'exportXlsx':     return await exportXlsx(OPENID, event);

      default:               return fail('未知 action: ' + a);
    }
  } catch (e) {
    console.error('[api]', a, e);
    return fail('云端异常：' + (e.message || e));
  }
};
