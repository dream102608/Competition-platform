// utils/data.js —— V1.0 数据层
// 策略：优先云开发（app.globalData.db）；环境未就绪时回退本地 Storage，
// 保证演示/教学场景零配置可跑。集合结构与云开发一致，切换无成本。

const K = {
  USER: 'user',
  COMPS: 'js_comps',
  REGS: 'js_regs',
  TEACHERS: 'js_teachers',
  LOGS: 'js_logs'
};

/* ================= 审批链引擎 ================= */
// 按赛项级别裁剪链路：
//   A 类（国家级）→ 系统初审 / 指导教师 / 系级 / 院级 / 校级（五级）
//   B 类（省级）  → 系统初审 / 指导教师 / 院级（三级）
//   C 类（校级）  → 系统初审 / 指导教师（一级 + 系统初审）
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

const CHAIN_NAMES = {
  A: '五级审批', B: '三级审批', C: '一级审批'
};

/* ================= 种子数据 ================= */
function seedCompetitions() {
  return [
    {
      _id: 'comp-001', no: '001',
      title: '全国大学生数学建模竞赛',
      track: 'subject', level: 'A', levelName: '国家级 A',
      teamSize: '3 人成队', teamMin: 3, teamMax: 3,
      deadline: '2026-09-15', ddlDays: 15,
      host: '中国工业与应用数学学会 · CUMCM',
      cover: 'https://picsum.photos/seed/js-mcm/440/600',
      desc: '全国高校规模最大的基础性学科竞赛之一，三人一队在 72 小时内完成建模、求解与论文写作。',
      timeline: [
        { name: '校内报名', range: '09.01 — 09.15', now: true },
        { name: '省赛复评', range: '10.10 — 10.25', now: false },
        { name: '全国决赛', range: '11 月 · 集中答辩', now: false }
      ],
      req: [
        { icon: 'team', b: '3 人', s: '必须 3 人成队\n学科不限' },
        { icon: 'medal', b: '指导教师', s: '1 名\n负责一级审批' }
      ],
      closed: false
    },
    {
      _id: 'comp-042', no: '042',
      title: '中国国际大学生创新大赛（原互联网+）',
      track: 'innov', level: 'A', levelName: '国家级 A',
      teamSize: '1-15 人', teamMin: 1, teamMax: 15,
      deadline: '2026-09-20', ddlDays: 20,
      host: '教育部等部委主办',
      cover: 'https://picsum.photos/seed/js-ie/440/600',
      desc: '面向全体大学生的创新创业盛会，高教主赛道要求项目具备真实落地场景与商业化潜力。',
      timeline: [
        { name: '校选拔报名', range: '09.01 — 09.20', now: true },
        { name: '校级路演', range: '09.25 — 09.30', now: false },
        { name: '省赛网评', range: '10 月', now: false }
      ],
      req: [
        { icon: 'team', b: '≤15 人', s: '可跨校组队\n负责人限本校' },
        { icon: 'medal', b: '指导教师', s: '1-2 名\n负责一级审批' }
      ],
      closed: false
    },
    {
      _id: 'comp-002', no: '002',
      title: '省大学生电子设计竞赛',
      track: 'subject', level: 'B', levelName: '省级 B',
      teamSize: '1-2 人', teamMin: 1, teamMax: 2,
      deadline: '2026-09-30', ddlDays: 30,
      host: '省教育厅主办',
      cover: 'https://picsum.photos/seed/js-elec/440/600',
      desc: '以电子电路设计应用为目的的省级竞赛，提交实物与设计报告。',
      timeline: [
        { name: '报名', range: '09.01 — 09.30', now: true },
        { name: '省赛评测', range: '11 月', now: false }
      ],
      req: [
        { icon: 'team', b: '1-2 人', s: '个人或双人\n限同校组队' },
        { icon: 'medal', b: '指导教师', s: '1 名\n附作品说明书' }
      ],
      closed: false
    },
    {
      _id: 'comp-043', no: '043',
      title: '「挑战杯」课外学术科技作品竞赛',
      track: 'innov', level: 'A', levelName: '国家级 A',
      teamSize: '≤8 人', teamMin: 2, teamMax: 8,
      deadline: '2026-09-15', ddlDays: 15,
      host: '共青团中央、中国科协主办',
      cover: 'https://picsum.photos/seed/js-tb/440/600',
      desc: '大学生课外学术科技活动中具有导向性、示范性的竞赛，每两年一届。',
      timeline: [
        { name: '校级申报', range: '09.01 — 09.15', now: true },
        { name: '省赛推荐', range: '10 月', now: false },
        { name: '全国终审', range: '次年 3 月', now: false }
      ],
      req: [
        { icon: 'team', b: '≤8 人', s: '团队申报\n队长本科生' },
        { icon: 'medal', b: '指导教师', s: '1-3 名\n申报书签字' }
      ],
      closed: false
    },
    {
      _id: 'comp-003', no: '003',
      title: '校英语演讲比赛',
      track: 'subject', level: 'C', levelName: '校级 C',
      teamSize: '个人', teamMin: 1, teamMax: 1,
      deadline: '2026-10-08', ddlDays: 38,
      host: '教务处 · 外国语学院',
      cover: 'https://picsum.photos/seed/js-eng/440/600',
      desc: '面向全校学生的英语演讲赛事，个人报名，分初赛与决赛两轮。',
      timeline: [
        { name: '报名', range: '09.20 — 10.08', now: true },
        { name: '决赛', range: '10 月末', now: false }
      ],
      req: [
        { icon: 'team', b: '个人', s: '无需组队' },
        { icon: 'medal', b: '指导教师', s: '1 名\n一级审批' }
      ],
      closed: false
    },
    {
      _id: 'comp-044', no: '044',
      title: '全国大学生广告艺术大赛',
      track: 'innov', level: 'B', levelName: '省级 B',
      teamSize: '1-5 人', teamMin: 1, teamMax: 5,
      deadline: '2026-08-31', ddlDays: 0,
      host: '省教育厅',
      cover: 'https://picsum.photos/seed/js-ad/440/600',
      desc: '本季报名已结束，仅作历史展示。',
      timeline: [{ name: '报名', range: '08.01 — 08.31', now: false }],
      req: [{ icon: 'team', b: '1-5 人', s: '小组创作' }],
      closed: true
    }
  ];
}

function seedTeachers() {
  return [
    { _id: 'tea-1', name: '陈默', title: '副教授', org: '数学与统计学院', exp: '已带赛 6 届' },
    { _id: 'tea-2', name: '林一舟', title: '讲师', org: '计算机学院', exp: '首次带赛' },
    { _id: 'tea-3', name: '许知远', title: '教授', org: '外国语学院', exp: '省级优秀指导教师' }
  ];
}

function seedRegistrations() {
  const now = stamp();
  return [
    {
      _id: 'reg-0817', regNo: 'NO.2026-MCM-0817',
      compId: 'comp-001', compTitle: '全国大学生数学建模竞赛',
      teamName: '夜航西飞', track: '学科竞赛',
      members: [
        { name: '李雨桐', lead: true, avatar: 'https://picsum.photos/seed/js-a1/80/80' },
        { name: '王一飞', lead: false, avatar: 'https://picsum.photos/seed/js-a2/80/80' },
        { name: '沈星回', lead: false, avatar: 'https://picsum.photos/seed/js-a3/80/80' }
      ],
      teacherId: 'tea-1', teacherName: '陈默',
      planFile: '夜航西飞_计划书_v1.pdf',
      status: 'approving', version: 2, currentNode: 2,
      deadline: '2026-09-15',
      chain: chainFor('A'),
      nodes: [
        { name: '系统初审', approver: '—', status: 'pass', time: '09.01 09:12', note: '表单完整性校验通过' },
        { name: '指导教师审批 · 陈默', approver: '陈默', status: 'pass', time: '09.01 10:41', note: '选题不错，注意查重' },
        { name: '系级审核 · 王建国', approver: '王建国', status: 'reject', time: '09.01 14:30', note: '项目书第 3 节技术路线不清晰，请重写后再交。' },
        { name: '院级审核', approver: '待定', status: 'waiting', time: '—', note: '等待前序节点完成' },
        { name: '校级终审', approver: '待定', status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: now
    },
    {
      _id: 'reg-0042', regNo: 'NO.2026-IE-0042',
      compId: 'comp-042', compTitle: '互联网+ 校选拔赛',
      teamName: '白鹭队', track: '创新创业',
      members: [
        { name: '李雨桐', lead: true, avatar: 'https://picsum.photos/seed/js-a1/80/80' },
        { name: '高鸣', lead: false, avatar: 'https://picsum.photos/seed/js-a4/80/80' }
      ],
      teacherId: 'tea-2', teacherName: '林一舟',
      planFile: '白鹭队_商业计划书.pdf',
      status: 'approving', version: 1, currentNode: 1,
      deadline: '2026-09-20',
      chain: chainFor('A'),
      nodes: [
        { name: '系统初审', approver: '—', status: 'pass', time: '08.24 09:00', note: '表单完整性校验通过' },
        { name: '指导教师审批 · 林一舟', approver: '林一舟', status: 'pass', time: '08.24 15:12', note: '已通过并手签' },
        { name: '系级审核', approver: '待定', status: 'waiting', time: '—', note: '排队中（前序 2 单）' },
        { name: '院级审核', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { name: '校级终审', approver: '待定', status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: now
    },
    {
      _id: 'reg-0913', regNo: 'NO.2026-ELEC-0913',
      compId: 'comp-002', compTitle: '省大学生电子设计竞赛',
      teamName: '无线充球队', track: '学科竞赛',
      members: [
        { name: '李雨桐', lead: true, avatar: 'https://picsum.photos/seed/js-a1/80/80' },
        { name: '赵野', lead: false, avatar: 'https://picsum.photos/seed/js-a5/80/80' }
      ],
      teacherId: 'tea-2', teacherName: '林一舟',
      planFile: '无线充球队_设计报告.pdf',
      status: 'rejected', version: 1, currentNode: 1,
      deadline: '2026-09-30',
      chain: chainFor('B'),
      nodes: [
        { name: '系统初审', approver: '—', status: 'pass', time: '08.20 09:00', note: '通过' },
        { name: '指导教师审批 · 林一舟', approver: '林一舟', status: 'reject', time: '08.28 11:05', note: '作品说明书中缺少电路原理图，补齐后重报。' }
      ],
      createdAt: now
    }
  ];
}

function mockUser(role) {
  return {
    openid: 'demo-openid-0001',
    name: '李雨桐',
    studentId: 'STU-2023-0817',
    college: '数学与统计学院',
    role: role || 'student',
    avatar: 'https://picsum.photos/seed/js-avatar/160/160',
    tagline: '白鹭队 · 队长 · 参赛 4 次'
  };
}

/* ================= 存取层（Storage 回退实现） ================= */
function read(key, seed) {
  let v = wx.getStorageSync(key);
  if (!v || !v.length) { v = seed(); wx.setStorageSync(key, v); }
  return v;
}
function write(key, v) { wx.setStorageSync(key, v); }

function stamp() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ================= 对外 API ================= */
module.exports = {
  K, chainFor, CHAIN_NAMES, mockUser,

  getCompetitions() { return read(K.COMPS, seedCompetitions); },
  getCompetition(id) { return this.getCompetitions().find(c => c._id === id) || null; },
  getTeachers() { return read(K.TEACHERS, seedTeachers); },

  getMyRegistrations() { return read(K.REGS, seedRegistrations); },

  /** 提交报名：生成 v1 报名单，系统初审自动通过 */
  submitRegistration(payload) {
    const regs = this.getMyRegistrations();
    const comp = this.getCompetition(payload.compId);
    const chain = chainFor(comp.level);
    const seq = 818 + regs.length;
    const reg = {
      _id: 'reg-' + Date.now(),
      regNo: `NO.2026-${comp.no}-${seq}`,
      compId: comp._id, compTitle: comp.title,
      teamName: payload.teamName, track: comp.track === 'subject' ? '学科竞赛' : '创新创业',
      members: payload.members, teacherId: payload.teacherId, teacherName: payload.teacherName,
      planFile: payload.planFile,
      status: 'approving', version: 1, currentNode: 1,
      deadline: comp.deadline, chain,
      nodes: chain.map((n, i) => i === 0
        ? { name: '系统初审', approver: '—', status: 'pass', time: stamp().slice(5, 16), note: '表单完整性校验通过' }
        : { name: n.key === 'teacher' ? `指导教师审批 · ${payload.teacherName}` : n.name, approver: n.key === 'teacher' ? payload.teacherName : '待定', status: 'waiting', time: '—', note: '等待' }),
      createdAt: stamp()
    };
    regs.unshift(reg);
    write(K.REGS, regs);
    this.log('提交报名', reg.compTitle + ' · ' + reg.teamName + ' v1');
    return reg;
  },

  /** 驳回后重新提交：版本号 +1，被驳回节点重置为待审 */
  resubmit(regId) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    if (!reg || reg.status !== 'rejected') return null;
    reg.version += 1;
    reg.status = 'approving';
    const idx = reg.nodes.findIndex(n => n.status === 'reject');
    if (idx > -1) {
      reg.nodes[idx].status = 'waiting';
      reg.nodes[idx].time = '—';
      reg.nodes[idx].note = '重新提交 · v' + reg.version;
      reg.currentNode = idx;
    }
    write(K.REGS, regs);
    this.log('重新提交', reg.compTitle + ' · v' + reg.version);
    return reg;
  },

  /** 撤回（提交后 24h 内允许） */
  withdraw(regId) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    if (!reg) return null;
    reg.status = 'withdrawn';
    write(K.REGS, regs);
    this.log('撤回报名', reg.compTitle + ' · ' + reg.teamName);
    return reg;
  },

  /** 审批动作（教师/系级视角演示）：pass | reject */
  act(regId, action, note) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    if (!reg) return null;
    const idx = reg.nodes.findIndex(n => n.status === 'waiting');
    if (idx < 0) return reg;
    const node = reg.nodes[idx];
    node.time = stamp().slice(5, 16);
    if (action === 'pass') {
      node.status = 'pass';
      node.note = note || '已通过并手签';
      if (idx === reg.nodes.length - 1) {
        reg.status = 'passed';
      } else {
        reg.currentNode = idx + 1;
      }
    } else {
      node.status = 'reject';
      node.note = note || '退回上一级';
      reg.status = 'rejected';
    }
    write(K.REGS, regs);
    this.log(action === 'pass' ? '审批通过' : '审批驳回', `${reg.compTitle} · ${node.name}`);
    return reg;
  },

  /** 催办（模拟发送提醒） */
  urge(regId) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    this.log('发送催办', reg ? reg.compTitle : regId);
    return true;
  },

  /** 操作日志 */
  log(action, detail) {
    const logs = wx.getStorageSync(K.LOGS) || [];
    logs.unshift({ action, detail, time: stamp() });
    write(K.LOGS, logs.slice(0, 100));
  },
  getLogs() { return wx.getStorageSync(K.LOGS) || []; },

  /** 重置演示数据 */
  resetDemo() {
    [K.COMPS, K.REGS, K.TEACHERS, K.LOGS].forEach(k => wx.removeStorageSync(k));
  }
};
