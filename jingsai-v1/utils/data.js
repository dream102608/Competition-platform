// utils/data.js —— V1.1 数据层
// 策略：优先云开发（app.globalData.db）；环境未就绪时回退本地 Storage，
// 保证演示/教学场景零配置可跑。集合结构与云开发一致，切换无成本。

const K = {
  USER: 'user',
  COMPS: 'js_comps',
  REGS: 'js_regs',
  TEACHERS: 'js_teachers',
  LOGS: 'js_logs',
  MSGS: 'js_msgs',
  PREFS: 'js_prefs'
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

// V1.2：可参与审批的角色（教师 / 系级 / 院级 / 校级）
const APPROVER_ROLES = ['teacher', 'dept', 'college', 'school'];

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
        { name: '系级审核 · 王建国', approver: '王建国', status: 'waiting', time: '—', note: '等待你处理 · v2 重提' },
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
      teacherId: 'tea-1', teacherName: '陈默',
      planFile: '白鹭队_商业计划书.pdf',
      status: 'approving', version: 1, currentNode: 1,
      deadline: '2026-09-20',
      chain: chainFor('A'),
      nodes: [
        { name: '系统初审', approver: '—', status: 'pass', time: '08.24 09:00', note: '表单完整性校验通过' },
        { name: '指导教师审批 · 陈默', approver: '陈默', status: 'waiting', time: '—', note: '排队中（前序 1 单）' },
        { name: '系级审核', approver: '待定', status: 'waiting', time: '—', note: '等待前序节点完成' },
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
      teacherId: 'tea-1', teacherName: '陈默',
      planFile: '无线充球队_设计报告.pdf',
      status: 'rejected', version: 1, currentNode: 1,
      deadline: '2026-09-30',
      chain: chainFor('B'),
      nodes: [
        { name: '系统初审', approver: '—', status: 'pass', time: '08.20 09:00', note: '通过' },
        { name: '指导教师审批 · 陈默', approver: '陈默', status: 'reject', time: '08.28 11:05', note: '作品说明书中缺少电路原理图，补齐后重报。' }
      ],
      createdAt: now
    }
  ];
}

function mockUser(role) {
  if (role === 'teacher') {
    return {
      openid: 'demo-openid-tea-1',
      name: '陈默',
      empId: 'TEA-2019-0042',
      college: '数学与统计学院',
      role: 'teacher',
      title: '副教授',
      avatar: 'https://picsum.photos/seed/js-tea/160/160',
      tagline: '数学建模 · 已带赛 6 届'
    };
  }
  if (role === 'dept') {
    return {
      openid: 'demo-openid-dept-1',
      name: '王建国',
      empId: 'DEPT-2015-0088',
      college: '数学与统计学院',
      role: 'dept',
      title: '系主任',
      avatar: 'https://picsum.photos/seed/js-dept/160/160',
      tagline: '系级评审 · 五级审批第二关'
    };
  }
  if (role === 'admin') {
    return {
      openid: 'demo-openid-adm-1',
      name: '教务管理员',
      empId: 'ADM-0001',
      college: '教务处',
      role: 'admin',
      avatar: 'https://picsum.photos/seed/js-adm/160/160',
      tagline: '竞赛一体化管理平台 · 系统管理'
    };
  }
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

function seedMessages() {
  return [
    {
      _id: 'msg-001', type: 'notice',
      title: '系统公告',
      body: '「全国大学生数学建模竞赛」报名通道已开启，9 月 15 日截止，A 类赛事实行五级审批。',
      time: '09.01 08:00', read: true, regId: ''
    },
    {
      _id: 'msg-002', type: 'approval',
      title: '审批动态 · 通过',
      body: '「夜航西飞」v2 已通过 指导教师审批（陈默）。当前停留：系级审核。',
      time: '09.01 10:41', read: false, regId: 'reg-0817'
    },
    {
      _id: 'msg-003', type: 'approval',
      title: '审批动态 · 驳回',
      body: '「无线充球队」被驳回：作品说明书中缺少电路原理图，补齐后重报。',
      time: '08.28 11:05', read: false, regId: 'reg-0913'
    },
    {
      _id: 'msg-004', type: 'urge',
      title: '催办提醒',
      body: '陈默老师 提醒你：白鹭队 商业计划书已等待 3 天，请尽快完善后重交。',
      time: '08.27 16:20', read: false, regId: 'reg-0042'
    }
  ];
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
  K, chainFor, CHAIN_NAMES, mockUser, APPROVER_ROLES,

  getCompetitions() { return read(K.COMPS, seedCompetitions); },
  getCompetition(id) { return this.getCompetitions().find(c => c._id === id) || null; },
  getTeachers() { return read(K.TEACHERS, seedTeachers); },

  getMyRegistrations() { return read(K.REGS, seedRegistrations); },

  /* V1.1：消息 / 教师队列 / 设置 */
  getMessages, pushMsg, unreadCount, markAllRead,
  getTeacherQueue, getPrefs, savePrefs, saveUser, clearCache,
  /* V1.2：队伍 / 导出 / 附件 */
  updateTeam, exportCSV, previewPlan,

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
    this.pushMsg('approval', '重新提交成功',
      `「${reg.teamName}」${reg.compTitle} v${reg.version} 已退回审批链，等待${reg.chain[idx].name}处理。`, regId);
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

  /** 审批动作（审批人视角）：pass | reject；signature 为手写签名 base64（V1.2） */
  act(regId, action, note, signature) {
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
      if (signature) node.signature = signature;
      if (idx === reg.nodes.length - 1) {
        reg.status = 'passed';
      } else {
        reg.currentNode = idx + 1;
      }
      this.pushMsg('approval', '审批动态 · 通过',
        `「${reg.teamName}」${reg.compTitle} v${reg.version} 已通过 ${node.name}，当前停留：${idx + 1 < reg.nodes.length ? reg.chain[idx + 1].name : '已全部通过'}。`, regId);
    } else {
      node.status = 'reject';
      node.note = note || '退回上一级';
      reg.status = 'rejected';
      this.pushMsg('approval', '审批动态 · 驳回',
        `「${reg.teamName}」${reg.compTitle} v${reg.version} 被 ${node.name} 驳回：${node.note}`, regId);
    }
    write(K.REGS, regs);
    this.log(action === 'pass' ? '审批通过' : '审批驳回', `${reg.compTitle} · ${node.name}`);
    return reg;
  },

  /** 催办（发送站内信提醒 + 落一条催办消息） */
  urge(regId) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    if (!reg) return false;
    this.log('发送催办', `${reg.compTitle} · 致 ${reg.teacherName}`);
    this.pushMsg('urge', '已发送催办',
      `已向「${reg.teacherName}」发出催办提醒（站内信 + 短信），对方处理后会第一时间通知你。`, regId);
    return true;
  },

  /** 操作日志 */
  log(action, detail) {
    const logs = wx.getStorageSync(K.LOGS) || [];
    logs.unshift({ action, detail, time: stamp() });
    write(K.LOGS, logs.slice(0, 100));
  },
  getLogs() { return wx.getStorageSync(K.LOGS) || []; },

  /* ================= V1.1：消息与催办中心 ================= */
  getMessages() {
    let v = wx.getStorageSync(K.MSGS);
    if (!v || !v.length) { v = seedMessages(); write(K.MSGS, v); }
    return v;
  },
  pushMsg(type, title, body, regId) {
    const msgs = this.getMessages();
    const prefs = this.getPrefs();
    const map = { approval: 'approval', urge: 'urge', notice: 'notice' };
    if (!prefs[map[type] || 'notice']) return; // 该类型通知被用户关闭
    msgs.unshift({
      _id: 'msg-' + Date.now(), type,
      title, body,
      time: stamp().slice(5, 16), read: false, regId: regId || ''
    });
    write(K.MSGS, msgs.slice(0, 50));
  },
  unreadCount() {
    return this.getMessages().filter(m => !m.read).length;
  },
  markAllRead() {
    const msgs = this.getMessages().map(m => (m.read = true, m));
    write(K.MSGS, msgs);
  },

  /* ================= V1.1：教师工作台队列 ================= */
  /** 某审批人：待我审批（waiting 且 approver 是自己）/
   *  我处理过的（自己签过 pass/reject 的节点，含仍在审批链后半段的） */
  getTeacherQueue(teacherName) {
    const regs = this.getMyRegistrations();
    const mine = regs.filter(r => r.nodes.some(n => n.approver === teacherName));
    const hasWaitingMine = (r) =>
      r.status === 'approving' &&
      r.nodes.some(n => n.status === 'waiting' && n.approver === teacherName);
    return {
      pending: mine.filter(hasWaitingMine),
      processed: mine.filter(r =>
        !hasWaitingMine(r) &&
        r.nodes.some(n => n.approver === teacherName && n.status !== 'waiting'))
    };
  },

  /* ================= V1.1：账号设置 ================= */
  getPrefs() {
    const def = { approval: true, urge: true, notice: true };
    return Object.assign(def, wx.getStorageSync(K.PREFS) || {});
  },
  savePrefs(patch) {
    const p = Object.assign(this.getPrefs(), patch);
    write(K.PREFS, p);
    return p;
  },
  saveUser(user) { write(K.USER, user); },
  clearCache() {
    [K.MSGS, K.LOGS, 'js_favs'].forEach(k => wx.removeStorageSync(k));
  },

  /* ================= V1.2：队伍管理 / 导出 / 附件 ================= */
  /** 更新队伍成员（换人/退出/邀请后写回） */
  updateTeam(regId, members) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    if (!reg) return null;
    reg.members = members;
    write(K.REGS, regs);
    this.log('更新队伍', `${reg.compTitle} · ${members.length} 人`);
    return reg;
  },

  /** 报名汇总 CSV（教师导出用） */
  exportCSV() {
    const regs = this.getMyRegistrations();
    const esc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const rows = [['报名单号', '竞赛', '队伍', '版本', '状态', '指导教师', '截止日', '队长', '人数']];
    const stMap = { approving: '审批中', rejected: '已驳回', passed: '已通过', withdrawn: '已撤回' };
    regs.forEach(r => rows.push([
      r.regNo, r.compTitle, r.teamName, 'v' + r.version,
      stMap[r.status] || r.status, r.teacherName, r.deadline,
      (r.members.find(m => m.lead) || r.members[0] || {}).name, r.members.length
    ]));
    return rows.map(row => row.map(esc).join(',')).join('\n');
  },

  /** 附件预览：优先云 fileID 下载，否则用内置 demo PDF（本地复制到用户目录） */
  previewPlan(reg) {
    const app = getApp();
    return new Promise((resolve, reject) => {
      if (reg && reg.planFileId && app && app.globalData.cloudReady && wx.cloud.downloadFile) {
        wx.cloud.downloadFile({
          fileID: reg.planFileId,
          success: (res) => resolve(res.tempFilePath),
          fail: reject
        });
      } else {
        const fs = wx.getFileSystemManager();
        const dest = `${wx.env.USER_DATA_PATH}/demo-plan.pdf`;
        fs.copyFile({
          srcPath: '/assets/demo-plan.pdf',
          destPath: dest,
          success: () => resolve(dest),
          fail: (e) => {
            // 兼容个别环境下无法读项目绝对路径：降级提示
            reject(e);
          }
        });
      }
    });
  },

  /** 重置演示数据 */
  resetDemo() {
    [K.COMPS, K.REGS, K.TEACHERS, K.LOGS, K.MSGS, K.PREFS].forEach(k => wx.removeStorageSync(k));
  }
};
