// utils/config.js —— 全局配置常量（前端用）
// 注意：审批流 FLOWS 与云函数 cloudfunctions/api/index.js 中的保持一致，改动需同步。

/* ================= 9 种角色（V3.0：学生与队长合并，队长为队伍内动态身份） ================= */
const ROLES = [
  { key: 'student',     name: '学生',       desc: '报名竞赛 · 创建/加入队伍（自动任队长）· 签到打卡 · 发布知识点 · 上传课表/证书/作品', auto: true },
  { key: 'teacher',     name: '教师',       desc: '指导学生 · 发布培训 · 审批学习培训 · 查看请假（只读）', auto: true },
  { key: 'counselor',   name: '辅导员',     desc: '审批请假二级（手签字）· 查看培训（只读）', auto: true },
  { key: 'secretary',   name: '教学秘书',   desc: '发布双赛道竞赛 · 数据汇总 · 教师竞赛初审 · Excel归档 · 人员/课表导入', auto: false, note: '学院指定' },
  { key: 'dept',        name: '教研室主任', desc: '学生竞赛第3级 · 教师竞赛第2级审批', auto: false, note: '学院指定' },
  { key: 'vicedean',    name: '教学副院长', desc: '学生竞赛第4级 · 教师竞赛第3级审批 · 本院数据完整权限', auto: false, note: '学院指定' },
  { key: 'dean',        name: '院长',       desc: '终极审批 · 经费终审', auto: false, note: '学院指定' },
  { key: 'expert',      name: '评审专家',   desc: '教师竞赛学术评审（可跳过）· 知识广场只读', auto: false, note: '管理员邀请' },
  { key: 'admin',       name: '管理员',     desc: '系统管理 · 新闻审核发布 · 证书审核 · 科创瞭望台视频管理', auto: false, note: '系统内置' }
];
// 兼容：队长/副队长/学赛负责人不再独立存在（队长为队伍内动态身份，学赛负责人职责并入教学秘书）
const ROLE_NAMES = { captain: '队长', vicecaptain: '副队长', leader: '学赛负责人' };
ROLES.forEach(r => { ROLE_NAMES[r.key] = r.name; });

/* ================= 6 条审批流 ================= */
// 每个节点：key=角色键, name=显示名, sign=是否需要手签字
const FLOWS = {
  // 学生竞赛报名（按竞赛级别裁剪：C校级3级 / B省级4级 / A国家级5级；学赛负责人职责并入教学秘书）
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
  // 教师竞赛报名（专家评审可跳过，由竞赛 needExpert 决定）
  teacher_comp: [
    { key: 'secretary', name: '教学秘书（初审）' },
    { key: 'dept',      name: '教研室主任' },
    { key: 'vicedean',  name: '教学副院长' },
    { key: 'dean',      name: '院长（终审）' },
    { key: 'expert',    name: '评审专家（学术评审）' }
  ],
  // 请假（两级手签字；队长是申请人时队长自批）
  leave: [
    { key: 'captain',   name: '队长审批', sign: true },
    { key: 'counselor', name: '辅导员审批', sign: true }
  ],
  // 学习培训报名（一级手签字）
  training: [
    { key: 'teacher', name: '教师审批', sign: true }
  ],
  // 经费（无论金额多少必须到院长；第1级由学赛负责人改为教学秘书）
  expense: [
    { key: 'secretary', name: '教学秘书' },
    { key: 'dept',     name: '教研室主任' },
    { key: 'vicedean', name: '教学副院长' },
    { key: 'dean',     name: '院长（终审）' }
  ],
  // 新闻发布审核
  news: [
    { key: 'admin', name: '管理员审核' }
  ]
};

/** 学生竞赛按级别取审批链 */
function studentCompFlow(level) {
  if (level === 'A') return FLOWS.student_comp_A;
  if (level === 'B') return FLOWS.student_comp_B;
  return FLOWS.student_comp_C;
}

/* ================= 课表：一天 12 小节常量 ================= */
const PERIODS = [
  { no: 1,  start: '08:20', end: '09:05', big: 1 },
  { no: 2,  start: '09:10', end: '09:55', big: 1 },
  { no: 3,  start: '10:15', end: '11:00', big: 2 },
  { no: 4,  start: '11:05', end: '11:50', big: 2 },
  { no: 5,  start: '13:30', end: '14:15', big: 3 },
  { no: 6,  start: '14:20', end: '15:05', big: 3 },
  { no: 7,  start: '15:25', end: '16:10', big: 4 },
  { no: 8,  start: '16:15', end: '17:00', big: 4 },
  { no: 9,  start: '18:00', end: '18:45', big: 5 },
  { no: 10, start: '18:50', end: '19:35', big: 5 },
  { no: 11, start: '19:50', end: '20:35', big: 6 },
  { no: 12, start: '20:40', end: '21:25', big: 6 }
];

// 大节 → 小节映射（「01-02节」→ [1,2]）
const SLOT_MAP = [
  { label: '01-02节', slots: [1, 2],  range: '08:20-09:55' },
  { label: '03-04节', slots: [3, 4],  range: '10:15-11:50' },
  { label: '05-06节', slots: [5, 6],  range: '13:30-15:05' },
  { label: '07-08节', slots: [7, 8],  range: '15:25-17:00' },
  { label: '09-10节', slots: [9, 10], range: '18:00-19:35' },
  { label: '11-12节', slots: [11, 12], range: '19:50-21:25' }
];

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const SEMESTERS = ['2025-2026-2', '2026-2027-1', '2026-2027-2'];

/* ================= 竞赛分类 ================= */
const COMP_CATEGORIES = {
  student: ['全部', 'ACM', 'CTF', '电子设计', 'AI', '数学建模', '其他'],
  teacher: ['全部', '教学能力', '课程思政', '辅导员素质', '其他']
};

const LEVEL_NAMES = { A: '国家级', B: '省级', C: '校级' };

/* ================= 请假类型 ================= */
const LEAVE_TYPES = ['事假', '病假', '课程冲突假', '备赛假', '培训假', '其他假'];

/* ================= 签到场景与积分 ================= */
const CHECKIN_SCENES = [
  { key: 'daily',    name: '日常学习', points: 5 },
  { key: 'training', name: '培训',     points: 10 },
  { key: 'comp',     name: '竞赛',     points: 15 },
  { key: 'meeting',  name: '会议',     points: 5 },
  { key: 'self',     name: '自主学习', points: 5 }
];

/* 校内打卡地点（GPS 室内不可靠时的可靠方案：直接选地点） */
const CHECKIN_PLACES = ['实验楼 A301 机房', '实验楼 B205', '教学楼 B 座', '图书馆', '工程训练中心', '创新实验室 4F'];

/* ================= 学校 / 学院 / 专业（本平台仅服务本院） ================= */
const SCHOOL = '燕京理工学院';
const COLLEGE = '信息科学与技术学院';
const COLLEGE_FULL = '燕京理工学院 · 信息科学与技术学院';

// 本科专业 7 个（全部工学学位）+ 专科专业 2 个，共 9 个
const MAJORS_BEN = [
  '计算机科学与技术', '软件工程', '电子信息工程', '通信工程',
  '物联网工程', '数据科学与大数据技术', '人工智能'
];
const MAJORS_ZHUAN = ['计算机应用技术', '电子信息工程技术'];
// 带层次标签的完整列表（picker 用）
const MAJORS = MAJORS_BEN.map(m => ({ name: m, degree: '本科' }))
  .concat(MAJORS_ZHUAN.map(m => ({ name: m, degree: '专科' })));

/* ================= 知识广场分类 ================= */
const KNOWLEDGE_TAGS = ['算法', '数据结构', '编程', '电路', '网络', '其他'];

/* ================= 新闻类型 ================= */
const NEWS_TYPES = ['获奖喜报', '赛事动态', '平台公告'];

/* ================= 获奖等级（证书上传用） ================= */
const CERT_AWARDS = ['国家一等奖', '国家二等奖', '国家三等奖', '省一等奖', '省二等奖', '省三等奖', '校一等奖', '优秀奖'];

/* ================= 荣誉墙（学院竞赛成果展示） ================= */
// medal: gold=国家级 silver=省级 bronze=校级；校领导/企业来访时的门面板块
const HONORS = [
  { title: '全国大学生数学建模竞赛', award: '国家一等奖 ×1 · 国家二等奖 ×2', year: '2025', grade: 'gold', medal: '金' },
  { title: '蓝桥杯全国软件设计大赛', award: '国家二等奖 ×3 · 省一等奖 ×8', year: '2025', grade: 'gold', medal: '金' },
  { title: '中国大学生计算机设计大赛', award: '国家三等奖 ×2 · 省一等奖 ×4', year: '2025', grade: 'silver', medal: '银' },
  { title: '“挑战杯”课外学术科技作品竞赛', award: '省二等奖 ×1 · 省三等奖 ×3', year: '2025', grade: 'silver', medal: '银' },
  { title: '全国大学生电子设计竞赛', award: '省一等奖 ×2 · 省二等奖 ×5', year: '2024', grade: 'silver', medal: '银' },
  { title: '河北省大学生程序设计竞赛', award: '金奖 ×1 · 银奖 ×2', year: '2025', grade: 'bronze', medal: '铜' },
  { title: '校级“信息杯”创新创业大赛', award: '一等奖 ×6 · 参与 300+ 人次', year: '2025', grade: 'bronze', medal: '铜' }
];

module.exports = {
  ROLES, ROLE_NAMES, FLOWS, studentCompFlow,
  PERIODS, SLOT_MAP, WEEKDAYS, SEMESTERS,
  COMP_CATEGORIES, LEVEL_NAMES, LEAVE_TYPES,
  CHECKIN_SCENES, KNOWLEDGE_TAGS, NEWS_TYPES, HONORS, CERT_AWARDS,
  SCHOOL, COLLEGE, COLLEGE_FULL, MAJORS, MAJORS_BEN, MAJORS_ZHUAN,
  CHECKIN_PLACES
};
