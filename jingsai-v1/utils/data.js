// utils/data.js —— V1.5 数据层
// 策略：优先云开发（app.globalData.db）；环境未就绪时回退本地 Storage，
// 保证演示/教学场景零配置可跑。集合结构与云开发一致，切换无成本。

const K = {
  USER: 'user',
  COMPS: 'js_comps',
  REGS: 'js_regs',
  TEACHERS: 'js_teachers',
  LOGS: 'js_logs',
  MSGS: 'js_msgs',
  PREFS: 'js_prefs',
  PLAZA: 'js_plaza',   // V1.5：知识广场互动状态（点赞/收藏）
  POSTS: 'js_posts'    // V1.5：我的投稿（审核流）
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
  const out = [
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
  // V1.3：种子注册即加封（预置 prevHash + hash），供防伪校验演示
  out.forEach(sealReg);
  return out;
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
      // V1.5：与 msg-002 同属 reg-0817，构成「同报名单聚合时间线」演示素材
      _id: 'msg-005', type: 'approval',
      title: '审批动态 · 驳回',
      body: '「夜航西飞」v1 被 系级审核（王建国）驳回：项目书第 3 节技术路线不清晰，已重写后重交。',
      time: '08.30 12:00', read: true, regId: 'reg-0817'
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

/* ================= V1.3：签名防伪 · 哈希加封链 ================= */
/** 可复现哈希（djb2 变体，32 位），用于审批节点指纹。
 *  注意：客户端哈希为演示级防篡改；正式环境应换服务端私钥签名。 */
function hashStr(str) {
  let h = 5381;
  const s = String(str == null ? '' : str);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return '0x' + h.toString(16).padStart(8, '0');
}

/** 节点指纹：参与字段 + 前驱哈希，保证链式绑定——单点改动即断链 */
function fingerprint(node) {
  const sig = node.signature ? node.signature.length + ':' + hashStr(node.signature) : '';
  return hashStr([node.name, node.approver, node.status, node.time, node.note, node.prevHash, sig].join('|'));
}

/** 加封整条链：逐节点写入 prevHash + hash */
function sealReg(reg) {
  let prev = 'root';
  (reg.nodes || []).forEach(n => {
    n.prevHash = prev;
    n.hash = fingerprint(n);
    prev = n.hash;
  });
  return reg;
}

/* ================= V1.4：知识广场内容源（只读静态） ================= */
function seedPlazaPosts() {
  return [
    {
      _id: 'post-001', comp: '全国大学生数学建模竞赛', track: '学科竞赛',
      author: '沈知夏', from: '2025 数模国赛 · 国家一等奖（白泽队队长）',
      title: '72 小时行军：数模国赛的节奏管理',
      views: '3.2k', likes: 186, date: '2026-08-12',
      brief: '真正拉开差距的往往不是模型多高级，而是第 55 小时你手里还有没有一张能交的论文。',
      body: [
        '我们队把 72 小时切成四段：头半天只做一件事——读题和查文献，三个人各写一页“这题能用的模型池”；第 12 到 36 小时主攻建模与求解，谁想到的模型谁主笔，另一个人负责挑刺，第三个人开始搭论文框架。',
        '第 36 到 55 小时是论文黄金期。很多人把论文留到最后一天，结果通宵抄结果、图表重排三遍。我们反着来：模型跑通立刻写方法部分，哪怕后面推翻重写，也比对着空白页发慌强。',
        '最后 17 小时只做三件事：把摘要改到第 5 稿、把图表字号统一、把附录代码里的注释清一遍。摘要五句法——背景一句、问题一句、模型一句、结果一句、价值一句——我们练了整整一个学期。',
        '另外两个纪律：全程不熬夜赶工导致第 60 小时后脑壳空白，所以第 48 小时强制睡 6 小时；任何队员发现模型有问题，可以在第 54 小时前“一键回滚”到备选方案，前提是每阶段都留了可复现的中间结果。'
      ]
    },
    {
      _id: 'post-002', comp: '中国国际大学生创新大赛', track: '创新创业',
      author: '顾川', from: '2025 大创省赛 · 省级金奖（项目负责人）',
      title: '把「痛点调研」写进申报书的 4 个证据',
      views: '2.7k', likes: 143, date: '2026-08-18',
      brief: '评委最怕看到“市场广阔、前景无限”八个字。痛点要用证据链说话。',
      body: [
        '证据一：一手访谈。至少 5 份真实访谈记录，写清对象身份、访谈时间、原话引用。我们写“社区医生 X 主任说：每周要手动誊抄 200 份档案”，比任何市场报告都有力。',
        '证据二：现场观察或跟岗记录。讲清楚你是在哪个场景发现流程断点的，最好附照片编号。评委一眼就能看出这是真下过现场的队伍。',
        '证据三：小样本问卷。放上问卷回收量、有效率、关键题目统计，哪怕只有 120 份，也比“覆盖全国”的二手数据可信。',
        '证据四：对照实验或试用反馈。把解决方案做成最小原型，给 3-5 个目标用户试用，记录“从 X 分钟缩短到 Y 分钟”。这一条是拉开金银奖差距的地方。'
      ]
    },
    {
      _id: 'post-003', comp: '省大学生电子设计竞赛', track: '学科竞赛',
      author: '周砚', from: '2025 电设省赛 · 省级一等奖',
      title: '电子设计：从搭板子到写报告的 21 天清单',
      views: '1.9k', likes: 97, date: '2026-08-25',
      brief: '电设比的从来不只是焊工，是“会做、会测、会写”三项都及格。',
      body: [
        '第 1-7 天：吃透赛题方向，把往年优秀作品原理图逐块拆开。我们列了一张“模块清单”：电源、主控、传感器、执行、显示，每个模块对应一份数据手册的必读页码。',
        '第 8-14 天：搭最小系统并留测试点。焊完每一级电路立刻测电压电流波形，边做边在报告里记数据——最后写报告时你会发现，所有截图都是“当时顺手存的”，而不是赛前补的。',
        '第 15-18 天：整机联调 + 稳定性测试。连续跑 8 小时看温漂，这步能淘汰一半的“能亮但不敢通电”作品。',
        '第 19-21 天：报告冲刺。设计报告占分常在 30% 以上，按“方案论证—电路设计—测试数据—误差分析”四章写，测试数据用表格 + 波形图，误差分析必须写原因而不是一句“符合要求”。'
      ]
    },
    {
      _id: 'post-004', comp: '「挑战杯」课外学术科技作品竞赛', track: '创新创业',
      author: '许念', from: '2025 挑战杯校选 · 省级推荐',
      title: '挑战杯申报书：别让评委在第三页劝退你',
      views: '2.1k', likes: 118, date: '2026-08-30',
      brief: '申报书的前三页决定评委带着好感还是怀疑读你的作品。',
      body: [
        '第一页拼题目：主标题给判断、副标题给边界。比如“面向社区慢病随访的语音病历夹——基于端侧大模型的结构化记录方案”，比“智能医疗助手”具体十倍。',
        '第二页拼一句话价值：在“作品简介”栏用一段话说清——为谁、解决什么、凭什么有效、现在做到哪一步。不要放流程图，评委没时间猜。',
        '第三页拼创新点：列 2-3 个，每个都必须能回答“和已有方案比，你新在哪”。写“首次”“率先”时，附上你查过的对比文献标题，查重和真实性都经得起问。',
        '硬指标别踩线：查重率控制在 15% 以内（很多校赛卡 20%），参考文献按 GB/T 7714 规范，作品若有实物或软件一定附截图、录屏链接或可演示说明。'
      ]
    },
    {
      _id: 'post-005', comp: '校英语演讲比赛', track: '学科竞赛',
      author: '林小满', from: '2025 校英语演讲 · 一等奖',
      title: '英语演讲比赛的 90 秒开场公式',
      views: '1.2k', likes: 64, date: '2026-09-01',
      brief: '评委在 90 秒内决定你的上限，开场三件套：故事、冲突、指向主题的钩子。',
      body: [
        '公式：30 秒个人故事 + 30 秒把故事拧成普遍问题 + 30 秒亮出你的立场。切忌开场“Good morning, today I want to talk about…”——那是四六级口语，不是演讲。',
        '故事要小、要真、要有画面词。讲“我在医院陪外婆时，护士用三种系统抄了三遍药单”就比“医疗系统效率低下”动人。',
        '冲突处放慢语速、压低音量，这是唯一的“表演时刻”；亮立场时回到正常音量，配合一次手势定格，评委的记忆点就留下了。',
        '备赛纪律：写稿只写关键词提纲，绝不逐字背稿（忘词会连锁崩溃）；每天对着手机录一遍，回看自己的眼神和尾音；赛前把前 90 秒单独练 20 遍，形成肌肉记忆。'
      ]
    },
    {
      _id: 'post-006', comp: '通用 · 答辩路演', track: '创新创业',
      author: '顾川', from: '2025 大创省赛 · 路演 5 分钟',
      title: '答辩 PPT：一页只讲一个判断',
      views: '2.4k', likes: 132, date: '2026-09-03',
      brief: '评委提问基本围绕“你没讲清的那一页”。页数越少，讲得越清。',
      body: [
        '结构用 1-10-1：第 1 页是钩子（一张图 + 一句判断，回答“为什么是我们”），中间 10 页每页只讲一个判断——痛点、方案、验证、壁垒、商业画布各 2 页，最后一页放记忆点（一个数字或一句 slogan）。',
        '每页标题写成判断句而不是名词：写“已有 3 家医院愿意试用”而不是“市场前景”，写“准确率 94.2% 优于基线 12 个点”而不是“性能对比”。',
        '图表的规矩：柱状图标注单位与数据来源，折线图最多两条线，照片必须配一句说明。评委提问时，你要能在 3 秒内翻到证据页——所以页码和章节色条必须有。',
        '路演前做两轮模拟：第一轮队友扮演“最刁钻评委”只问数据；第二轮只问商业模式和竞品。答不上来的问题当场补进备注页，答辩比路演更值钱。'
      ]
    }
  ];
}

function seedWinnerGroups() {
  return [
    {
      _id: 'win-001', season: '2025 赛季', comp: '全国大学生数学建模竞赛',
      rows: [
        { grade: 'gold', prize: '国家一等奖', team: '白泽队', members: '沈知夏 · 顾川 · 周砚', teacher: '陈默' },
        { grade: 'silver', prize: '国家二等奖', team: '惊蛰队', members: '赵明哲 · 韩思远 · 苏晚', teacher: '陈默' },
        { grade: 'bronze', prize: '省级一等奖', team: '沧浪队', members: '江野 · 陆晨 · 许诺', teacher: '林一舟' }
      ]
    },
    {
      _id: 'win-002', season: '2025 赛季', comp: '中国国际大学生创新大赛（省赛）',
      rows: [
        { grade: 'gold', prize: '省级金奖', team: '声纹病历夹', members: '顾川 · 沈知夏 · 韩思远 等 8 人', teacher: '陈默' },
        { grade: 'silver', prize: '省级银奖', team: '农废酵素 · 生物转化', members: '江野 · 苏晚 等 6 人', teacher: '许知远' }
      ]
    },
    {
      _id: 'win-003', season: '2025 赛季', comp: '校英语演讲比赛',
      rows: [
        { grade: 'gold', prize: '一等奖', team: '林小满', members: '外国语学院 2024 级', teacher: '许知远' },
        { grade: 'silver', prize: '二等奖', team: '陈屿', members: '外国语学院 2025 级', teacher: '许知远' }
      ]
    }
  ];
}

function seedTemplates() {
  return [
    {
      _id: 'tpl-001', name: '数学建模论文写作骨架', tag: '数模国赛',
      desc: '摘要五句法 · 问题重述 · 模型假设与检验 · 附录代码规范',
      copyText: '【数学建模论文骨架】\n一、摘要（五句法，一页内）：背景一句；问题一句；模型一句（含方法名）；结果一句（含关键数值）；价值一句。\n二、问题重述：用自己的话压缩 300 字内，附一张“问题-变量-约束”对照表。\n三、模型假设：每条假设注明理由与不满足时的补救。\n四、符号说明：表格化，变量名与论文正文完全一致。\n五、模型建立：先给建模思路图，再给数学表达式（编号 (1)(2)…）。\n六、模型求解：算法伪代码 + 运行环境 + 关键代码段（不要整段贴）。\n七、模型检验：灵敏度分析 / 误差表 / 与真实数据对比至少各一处。\n八、模型评价：优点写 2 条，缺点写 1 条并给改进方向。\n九、附录：代码注释完整，数据表按正文出现顺序编号。\n排版纪律：全文图表统一字号线宽；公式用编号交叉引用；目录自动生成。'
    },
    {
      _id: 'tpl-002', name: '大创申报书九段结构', tag: '创新大赛',
      desc: '问题—方案—验证—商业画布四段主线，附证据链写法',
      copyText: '【大创/互联网+ 申报书九段结构】\n1. 项目名称：主标题给判断，副标题给边界。\n2. 痛点与背景：一手访谈 ≥5 份（对象/时间/原话），现场观察附编号。\n3. 解决方案：功能架构图 + 核心创新点 2-3 个，每个回答“新在哪”。\n4. 技术路线：分阶段里程碑 + 已实现进度截图。\n5. 验证与数据：小样本问卷（回收量/有效率/关键统计）+ 原型试用反馈（X→Y 分钟）。\n6. 商业模式：价值主张—目标客户—收入来源—成本结构四格画布。\n7. 团队与分工：成员特长与承担模块一一对应，勿堆头衔。\n8. 风险与对策：技术/市场/合规三类风险各写一条应对。\n9. 预算与进度：经费明细表 + 甘特图。\n硬指标：查重率 <15%（校赛常卡 20%）；参考文献 GB/T 7714；有实物必附演示截图。'
    },
    {
      _id: 'tpl-003', name: '挑战杯学术作品申报要点', tag: '挑战杯',
      desc: '选题边界 · 创新点表述 · 查重红线 · 附件清单',
      copyText: '【挑战杯课外学术科技作品 申报要点】\n一、选题：主标题给判断（如“面向社区慢病随访的语音病历夹”），副标题给边界（基于端侧大模型的结构化记录方案）。\n二、一句话价值（作品简介）：为谁—解决什么—凭什么有效—做到哪一步，不放流程图。\n三、创新点：2-3 个，每个必须与已查文献对比，注明对比文献标题。\n四、查重红线：全文查重率 ≤15%；引用他人图表须注明并获授权。\n五、附件清单：作品实物照 / 软件录屏链接 / 数据表 / 程序源代码（可选）/ 获奖或试用证明。\n六、格式：按 GB/T 7714 引注；封面、目录、正文页码完整；团队人数 ≤8。\n七、时间：提前两周完成全文，留一周给指导教师逐字审读、一周改版定稿。'
    },
    {
      _id: 'tpl-004', name: '答辩路演 PPT 结构', tag: '通用路演',
      desc: '1-10-1 结构 · 判断句标题 · 证据页编号 · 双轮模拟答辩',
      copyText: '【答辩路演 PPT 结构（1-10-1）】\n第 1 页 · 钩子：一张图 + 一句判断（回答“为什么是我们”）。\n第 2-3 页 · 痛点：证据链——访谈原话 / 观察编号 / 问卷统计，各配来源标注。\n第 4-5 页 · 方案：功能架构图 + 核心创新点对比表（与已有方案）。\n第 6-7 页 · 验证：实验数据 / 试用反馈（X→Y 量化）。\n第 8-9 页 · 壁垒与模式：四格商业画布 + 竞品分析矩阵。\n第 10 页 · 团队与进度：分工表 + 甘特图。\n第 11 页 · 记忆点：一个数字或一句 slogan，让评委带走。\n标题纪律：每页标题是判断句不是名词（“已有 3 家医院试用”而非“市场前景”）。\n图表纪律：柱状图标单位与来源，折线最多两条，照片配一句说明。\n演练纪律：一轮“刁钻评委”只问数据；一轮只问商业模式；答不上的补进备注页。'
    }
  ];
}

/* ================= 对外 API ================= */
module.exports = {
  K, chainFor, CHAIN_NAMES, mockUser, APPROVER_ROLES,

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
    sealReg(reg);            // V1.3：提交即加封
    reg.sealedAt = stamp();
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
    sealReg(reg);            // V1.3：重提后整链重新加封
    reg.sealedAt = stamp();
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
      if (signature) {
        node.signature = signature;
        node.signTime = stamp().slice(5, 16);   // V1.3：签署时间戳
      }
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
    sealReg(reg);            // V1.3：签批即重新加封，链上留痕
    reg.sealedAt = stamp();
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
  /* ========== V1.5：消息精细管理 ========== */
  /** 单条标为已读 */
  markMsgRead(id) {
    const msgs = this.getMessages().map(m =>
      m._id === id ? Object.assign({}, m, { read: true }) : m);
    write(K.MSGS, msgs);
  },
  /** 删除单条 */
  removeMsg(id) {
    const msgs = this.getMessages().filter(m => m._id !== id);
    write(K.MSGS, msgs);
  },
  /** 批量删除 */
  removeMsgs(ids) {
    const set = ids || [];
    const msgs = this.getMessages().filter(m => set.indexOf(m._id) === -1);
    write(K.MSGS, msgs);
  },
  /** 报名单简报（消息聚合卡头 / 跳转用） */
  regBrief(regId) {
    if (!regId) return null;
    const reg = this.getMyRegistrations().find(r => r._id === regId);
    if (!reg) return null;
    return {
      _id: reg._id, regNo: reg.regNo, compTitle: reg.compTitle,
      teamName: reg.teamName, status: reg.status
    };
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
    const def = { approval: true, urge: true, notice: true, subscribe: false }; // V1.3：微信服务通知订阅默认关
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

  /** 报名汇总 CSV（教师导出用）
   *  V1.5：支持状态 + 赛项双维过滤；status/comp 传 'all' 或空 = 该维不过滤 */
  exportCSV(status, comp) {
    const stMap = { approving: '审批中', rejected: '已驳回', passed: '已通过', withdrawn: '已撤回' };
    let regs = this.getMyRegistrations();
    if (status && status !== 'all') {
      regs = regs.filter(r => r.status === status);
    }
    if (comp && comp !== 'all') {
      regs = regs.filter(r => r.compTitle === comp);
    }
    const esc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const rows = [['报名单号', '竞赛', '队伍', '版本', '状态', '指导教师', '截止日', '队长', '人数']];
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

  /** V1.3：防伪校验——按当前字段重算整链，逐节点核验 prevHash 衔接与自身哈希 */
  verifyChain(regId) {
    const regs = this.getMyRegistrations();
    const reg = regs.find(r => r._id === regId);
    if (!reg) return null;
    // 旧版本卷宗没有哈希字段 → 先补封再核验（幂等）
    const legacy = !reg.nodes.length || !reg.nodes[0].hash;
    if (legacy) {
      sealReg(reg);
      reg.sealedAt = reg.sealedAt || stamp();
      write(K.REGS, regs);
    }
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
  },

  /** V1.3：报表聚合（统计报表中心数据源）
   *  V1.5：支持按赛项过滤——传 compTitle（或 'all'/空 = 全量），联动全部维度 */
  reportStats(comp) {
    let regs = this.getMyRegistrations();
    if (comp && comp !== 'all') {
      regs = regs.filter(r => r.compTitle === comp);
    }
    const stMap = { approving: '审批中', rejected: '已驳回', passed: '已通过', withdrawn: '已撤回' };
    const byComp = {};
    const byTrack = {};
    const byTeacher = {};
    const byStatus = { approving: 0, rejected: 0, passed: 0, withdrawn: 0 };
    const approver = {};   // V1.4：审批人绩效（按节点 approver 聚合）
    let memberSum = 0;
    regs.forEach(r => {
      byComp[r.compTitle] = (byComp[r.compTitle] || 0) + 1;
      byTrack[r.track] = (byTrack[r.track] || 0) + 1;
      byTeacher[r.teacherName] = (byTeacher[r.teacherName] || 0) + 1;
      if (byStatus[r.status] != null) byStatus[r.status] += 1;
      memberSum += (r.members || []).length;
      (r.nodes || []).forEach(n => {
        const a = n.approver;
        if (!a || a === '—' || a === '待定') return;
        const o = approver[a] || (approver[a] = { name: a, pass: 0, reject: 0, pending: 0 });
        if (n.status === 'waiting') o.pending += 1;        // 在办负荷
        else if (n.status === 'pass') o.pass += 1;
        else if (n.status === 'reject') o.reject += 1;
      });
    });
    const toArr = (o) => Object.keys(o)
      .map(k => ({ k, v: o[k] }))
      .sort((a, b) => b.v - a.v);
    const total = regs.length;
    const approverStats = Object.keys(approver)
      .map(k => {
        const o = approver[k];
        const done = o.pass + o.reject;
        return {
          name: o.name,
          done, pass: o.pass, reject: o.reject, pending: o.pending,
          rate: done ? Math.round(o.pass / done * 100) : null
        };
      })
      .sort((a, b) => (b.done + b.pending) - (a.done + a.pending));
    return {
      total,
      approving: byStatus.approving, rejected: byStatus.rejected,
      passed: byStatus.passed, withdrawn: byStatus.withdrawn,
      passRate: total ? Math.round(byStatus.passed / total * 100) : 0,
      members: memberSum,
      avgTeam: total ? +(memberSum / total).toFixed(1) : 0,
      byComp: toArr(byComp),
      byTrack: toArr(byTrack),
      byTeacher: toArr(byTeacher),
      approverStats,   // V1.4：评审绩效
      statusSeq: ['approving', 'rejected', 'passed', 'withdrawn']
        .map(k => ({ k, label: stMap[k], v: byStatus[k] }))
    };
  },

  /* ================= V1.4：知识广场（只读内容源，供 plaza 页渲染） ================= */
  getPlazaPosts() { return seedPlazaPosts(); },
  getWinnerGroups() { return seedWinnerGroups(); },
  getTemplates() { return seedTemplates(); },

  /* ========== V1.5：知识广场互动（点赞/收藏，本地持久化） ========== */
  getPlazaState() {
    const def = { liked: [], faved: [] };
    return Object.assign(def, wx.getStorageSync(K.PLAZA) || {});
  },
  togglePlazaLike(id) {
    const st = this.getPlazaState();
    const i = st.liked.indexOf(id);
    if (i > -1) st.liked.splice(i, 1); else st.liked.push(id);
    write(K.PLAZA, st);
    return st;
  },
  togglePlazaFav(id) {
    const st = this.getPlazaState();
    const i = st.faved.indexOf(id);
    if (i > -1) st.faved.splice(i, 1); else st.faved.push(id);
    write(K.PLAZA, st);
    return st;
  },

  /* ========== V1.5：我的投稿（我要发帖 · 审核流演示） ========== */
  /** 投稿入待审池：写入 K.POSTS（status:'pending'）并向消息中心投递「投稿动态」 */
  submitPost(p) {
    const app = getApp();
    const user = (app && app.globalData.user) || mockUser('student');
    const now = stamp();
    const body = String(p.body || '').split('\n').filter(s => s.trim());
    const brief = (String(p.body || '').replace(/\s+/g, ' ')).slice(0, 58) + '…';
    const post = {
      _id: 'mine-' + Date.now(), kind: 'mine', mine: true, status: 'pending',
      author: user.name, from: (user.college || '在校学生') + ' · 投稿',
      title: String(p.title || '').trim(), comp: p.comp,
      track: '经验分享', views: '0', likes: 0,
      date: now.slice(5, 10), brief, body,
      submittedAt: now
    };
    const posts = this.getMyPosts();
    posts.unshift(post);
    write(K.POSTS, posts);
    this.log('投稿', `《${post.title}》进入审核`);
    this.pushMsg('notice', '投稿动态 · 已收到',
      `你的投稿《${post.title}》已进入审核队列，通过后将展示在知识广场「经验帖」栏目。`, '');
    return post;
  },
  /** 我的投稿列表（空时为 []，不做种子） */
  getMyPosts() {
    let v = wx.getStorageSync(K.POSTS);
    if (!v || !v.length) { v = []; write(K.POSTS, v); }
    return v;
  },
  /** 撤回待审稿（仅 pending 可撤回；撤回后状态置 withdrawn 留档） */
  withdrawPost(id) {
    const posts = this.getMyPosts().map(p => {
      if (p._id === id && p.status === 'pending') {
        p.status = 'withdrawn';
        p.withdrawnAt = stamp();
        this.log('撤回投稿', `《${p.title}》`);
        this.pushMsg('notice', '投稿动态 · 已撤回',
          `《${p.title}》已撤回，不再进入审核。可以重新编辑后再投。`, '');
      }
      return p;
    });
    write(K.POSTS, posts);
    return posts;
  },

  /** V1.5：某审批人的逐单明细（报表绩效下钻用）
   *  遍历报名单，凡节点 approver 为该人：done=已终结动作（pass/reject），pending=在办 */
  approverDetail(name) {
    const regs = this.getMyRegistrations();
    const rows = [];
    regs.forEach(r => {
      (r.nodes || []).forEach(n => {
        if (!n.approver || n.approver !== name) return;
        if (n.status === 'waiting') {
          rows.push({ _id: r._id, regNo: r.regNo, compTitle: r.compTitle,
            teamName: r.teamName, version: r.version, act: '待审', time: '—', note: '' });
        } else if (n.status === 'pass' || n.status === 'reject') {
          rows.push({ _id: r._id, regNo: r.regNo, compTitle: r.compTitle,
            teamName: r.teamName, version: r.version,
            act: n.status === 'pass' ? '通过' : '驳回',
            time: n.time, note: n.note || '' });
        }
      });
    });
    return rows;
  },

  /** 重置演示数据 */
  resetDemo() {
    [K.COMPS, K.REGS, K.TEACHERS, K.LOGS, K.MSGS, K.PREFS, K.PLAZA, K.POSTS]
      .forEach(k => wx.removeStorageSync(k));
  }
};
