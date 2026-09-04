// utils/seeddata.js —— 全部种子数据（单一数据源）
// 本地演示模式和云端 seed/*.jsonl 都从这里来，改数据只改这一个文件。
// 重新生成云端导入文件：在 jingsai-v1 目录运行  node ../tools/gen_seed.js
// 注意：本文件不能引用 wx API（要能被 node 直接运行）。

function stamp() {
  const d = new Date();
  const p = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const COLLEGE = '信息科学与技术学院';
const COLLEGE_FULL = '燕京理工学院 · 信息科学与技术学院';
const COVER = (n) => `/assets/covers/${n}.png`;

/* ================= 竞赛（8 项 · 与学院专业匹配的真实赛事） ================= */
function seedCompetitions() {
  return [
    {
      _id: 'comp-001', no: '001', title: '全国大学生数学建模竞赛（CUMCM）',
      track: 'student', category: '数学建模', level: 'A', levelName: '国家级',
      teamMin: 3, teamMax: 3, deadline: '2026-09-15', signupCount: 36,
      host: '中国工业与应用数学学会',
      cover: COVER('mcm'),
      desc: '全国高校规模最大的基础性学科竞赛。三人一队，72 小时内完成建模、求解与论文写作。我院 2025 年获国家一等奖 1 项、二等奖 2 项。',
      isEduList: true, awardDept: '教育部高等教育司',
      timeline: [
        { name: '校内报名', range: '09.01 — 09.15', now: true },
        { name: '全国竞赛', range: '09 月中旬 · 72 小时', now: false },
        { name: '成绩公布', range: '11 月', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-002', no: '002', title: '蓝桥杯全国软件和信息技术专业人才大赛',
      track: 'student', category: '程序设计', level: 'B', levelName: '省级',
      teamMin: 1, teamMax: 1, deadline: '2026-10-20', signupCount: 88,
      host: '工业和信息化部人才交流中心',
      cover: COVER('lqb'),
      desc: '个人赛，设 C/C++、Java、Python、Web 开发等组别。省赛一等奖晋级国赛。适合计算机科学与技术、软件工程、数据科学等专业同学。',
      isEduList: true, awardDept: '工信部人才交流中心',
      timeline: [
        { name: '校内报名', range: '09.05 — 10.20', now: true },
        { name: '省赛', range: '次年 4 月', now: false },
        { name: '国赛', range: '次年 6 月', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-003', no: '003', title: '中国"互联网+"大学生创新创业大赛',
      track: 'student', category: '创新创业', level: 'A', levelName: '国家级',
      teamMin: 3, teamMax: 8, deadline: '2026-09-30', signupCount: 21,
      host: '教育部等十二部委',
      cover: COVER('ic'),
      desc: '国内影响力最大的双创赛事，设高教主赛道、红旅赛道等。需提交商业计划书与路演 PPT，学院提供一对一打磨辅导。',
      isEduList: true, awardDept: '教育部',
      timeline: [
        { name: '校赛选拔', range: '09 月', now: true },
        { name: '省赛', range: '10 — 11 月', now: false },
        { name: '国赛', range: '次年 10 月', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-004', no: '004', title: '全国大学生电子设计竞赛',
      track: 'student', category: '电子设计', level: 'A', levelName: '国家级',
      teamMin: 3, teamMax: 3, deadline: '2026-09-30', signupCount: 15,
      host: '教育部高等教育司 · 工信部人事教育司',
      cover: COVER('elec'),
      desc: '电子信息工程、通信工程、物联网工程专业的核心赛事。四天三夜完成作品设计制作与报告，学院开放实验室全天候支持。',
      isEduList: true, awardDept: '教育部高等教育司',
      timeline: [
        { name: '校内报名', range: '09.01 — 09.30', now: true },
        { name: '竞赛实施', range: '10 月 · 四天三夜', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-005', no: '005', title: '团体程序设计天梯赛（GPLT）',
      track: 'student', category: '程序设计', level: 'B', levelName: '省级',
      teamMin: 10, teamMax: 10, deadline: '2026-10-15', signupCount: 30,
      host: '全国高等学校计算机教育研究会',
      cover: COVER('acm'),
      desc: '10 人团队赛，拼的是学院整体编程实力。我院 2025 年获省级团队三等奖，今年目标冲国赛。',
      isEduList: true, awardDept: '全国高等学校计算机教育研究会',
      timeline: [
        { name: '校内选拔', range: '09.20 — 10.15', now: true },
        { name: '全国决赛', range: '次年 4 月', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-006', no: '006', title: 'CTF 网络安全竞赛 · 华北赛区',
      track: 'student', category: '网络安全', level: 'B', levelName: '省级',
      teamMin: 1, teamMax: 4, deadline: '2026-10-08', signupCount: 19,
      host: '省网络安全协会',
      cover: COVER('ctf'),
      desc: '夺旗赛赛制，覆盖 Web、逆向、密码学、杂项四大方向。零基础可先参加学院 CTF 集训营。',
      isEduList: false, awardDept: '省网络安全协会',
      timeline: [
        { name: '报名', range: '09.10 — 10.08', now: true },
        { name: '线上初赛', range: '10 月下旬', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-007', no: '007', title: '"挑战杯"全国大学生课外学术科技作品竞赛',
      track: 'student', category: '创新创业', level: 'A', levelName: '国家级',
      teamMin: 1, teamMax: 6, deadline: '2026-11-05', signupCount: 12,
      host: '共青团中央 · 中国科协 · 教育部',
      cover: COVER('ctb'),
      desc: '"大挑"重学术科技作品，需提交论文或实物作品 + 研究报告。建议大二以上同学组队，跨专业组合更有优势。',
      isEduList: true, awardDept: '共青团中央',
      timeline: [
        { name: '校内申报', range: '09.15 — 11.05', now: true },
        { name: '省赛', range: '次年 5 月', now: false }
      ],
      closed: false
    },
    {
      _id: 'comp-008', no: '008', title: '全国高校教师教学创新大赛（教师赛道）',
      track: 'teacher', category: '教学竞赛', level: 'A', levelName: '国家级',
      teamMin: 1, teamMax: 1, deadline: '2026-10-15', signupCount: 4,
      host: '中国高等教育学会', needExpert: true,
      cover: COVER('ai'),
      desc: '面向全院专任教师。需提交课程教学创新成果报告与课堂实录，学院组织专家评审（学术评审环节）。',
      isEduList: false, awardDept: '中国高等教育学会',
      timeline: [
        { name: '院内报名', range: '09.01 — 10.15', now: true },
        { name: '校内遴选', range: '10 月下旬', now: false }
      ],
      closed: false
    }
  ];
}

/* ================= 教师 / 辅导员（全部来自信息科学与技术学院） ================= */
function seedTeachers() {
  return [
    { _id: 'tea-1', name: '陈建国', title: '教授', org: COLLEGE + ' · 计算机科学与技术系', exp: '带赛 10 届 · 数学建模总教练', kind: 'teacher' },
    { _id: 'tea-2', name: '林晓峰', title: '副教授', org: COLLEGE + ' · 软件工程系', exp: 'ACM/蓝桥杯教练 · 带赛 6 届', kind: 'teacher' },
    { _id: 'tea-3', name: '赵慧敏', title: '副教授', org: COLLEGE + ' · 电子信息工程系', exp: '电子设计竞赛教练 · 省级优秀指导教师', kind: 'teacher' },
    { _id: 'tea-4', name: '王志强', title: '讲师', org: COLLEGE + ' · 数据科学与大数据技术系', exp: 'CTF/网络安全方向 · 带赛 3 届', kind: 'teacher' },
    { _id: 'tea-5', name: '刘思远', title: '讲师', org: COLLEGE + ' · 人工智能系', exp: '互联网+/挑战杯 双创导师', kind: 'teacher' },
    { _id: 'cou-1', name: '周敏', title: '辅导员', org: COLLEGE, exp: '负责 2023 级本科', kind: 'counselor' },
    { _id: 'cou-2', name: '吴桐', title: '辅导员', org: COLLEGE, exp: '负责 2024 级本科', kind: 'counselor' },
    { _id: 'cou-3', name: '郑雅文', title: '辅导员', org: COLLEGE, exp: '负责 2025 级及专科', kind: 'counselor' }
  ];
}

/* ================= 新闻 ================= */
function seedNews() {
  const today = stamp().slice(0, 10);
  return [
    { _id: 'news-1', title: '喜报：我院学子获全国大学生数学建模竞赛国家一等奖', newsType: '获奖喜报', content: '在刚刚结束的全国大学生数学建模竞赛中，我院陈建国教授指导的参赛队伍获国家一等奖，另有两支队伍获国家二等奖，创我院历史最好成绩。获奖同学将获得学院竞赛积分奖励与推免加分认定。', applicantName: '陈建国', status: 'passed', topped: true, createdAt: today + ' 08:00', ts: Date.now() },
    { _id: 'news-2', title: '蓝桥杯大赛校内报名通道今日开启', newsType: '赛事动态', content: '第十七届蓝桥杯全国软件和信息技术专业人才大赛校内报名已开启，截止 10 月 20 日。设 C/C++、Java、Python、Web 开发四个组别，个人参赛。请同学们在「竞赛大厅」完成报名。', applicantName: '林晓峰', status: 'passed', topped: true, createdAt: today + ' 09:00', ts: Date.now() - 3600e3 },
    { _id: 'news-3', title: '平台上线公告：竞赛一体化管理平台试运行', newsType: '平台公告', content: '我院竞赛一体化管理平台即日起试运行，覆盖竞赛报名、多级审批、请假、培训、签到积分、知识广场、课表查询全流程。使用中遇到问题请联系教学秘书或辅导员反馈。', applicantName: '管理员', status: 'passed', topped: false, createdAt: '2026-09-01 10:00', ts: Date.now() - 86400e3 },
    { _id: 'news-4', title: 'CTF 网络安全集训营下周开营', newsType: '赛事动态', content: '备战 CTF 华北赛区比赛，学院将于下周二起在实验楼 B205 开设集训营，王志强老师主讲 Web 安全方向，含靶场实操。已报名同学请准时参加并完成签到。', applicantName: '王志强', status: 'passed', topped: false, createdAt: '2026-08-30 15:00', ts: Date.now() - 3 * 86400e3 },
    { _id: 'news-5', title: '全国高校教师教学创新大赛院内选拔通知', newsType: '赛事动态', content: '请有意参赛的教师于 10 月 15 日前在平台完成报名（教师赛道），需上传课程教学创新成果报告。学院将组织评审专家进行学术评审后择优推荐。', applicantName: '教学秘书', status: 'passed', topped: false, createdAt: '2026-08-28 09:00', ts: Date.now() - 5 * 86400e3 },
    { _id: 'news-6', title: '关于规范竞赛经费报销流程的通知', newsType: '平台公告', content: '自本月起，竞赛相关经费（差旅、耗材、报名费）统一在平台「经费申请」入口提交，经教学秘书、教研室主任、教学副院长、院长四级审批通过后，系统自动归档。纸质单据仍按财务处要求提交。', applicantName: '教学秘书', status: 'passed', topped: false, createdAt: '2026-08-25 14:00', ts: Date.now() - 7 * 86400e3 }
  ];
}

/* ================= 培训 ================= */
function seedTrainings() {
  return [
    { _id: 'tr-1', title: '数学建模国赛冲刺集训营', lecturer: '陈建国', mode: '线下', startTime: '2026-09-10 19:00', endTime: '2026-09-12 21:00', place: '实验楼 A301', intro: '国赛真题精讲 + 论文写作特训 + 模拟赛点评。三天集训，建议已报名国赛的队伍全员参加。', cover: COVER('tr1'), signupCount: 32, publisher: '陈建国', createdAt: '2026-09-01 10:00' },
    { _id: 'tr-2', title: 'CTF 入门到实战（Web 方向）', lecturer: '王志强', mode: '线上', startTime: '2026-09-15 19:00', endTime: '2026-09-15 21:00', place: '腾讯会议（报名后群内发链接）', intro: 'SQL 注入、XSS、文件上传三大高频考点讲解，含在线靶场实操环节，零基础可听。', cover: COVER('tr2'), signupCount: 58, publisher: '王志强', createdAt: '2026-09-02 10:00' },
    { _id: 'tr-3', title: '蓝桥杯算法刷题方法讲座', lecturer: '林晓峰', mode: '线下', startTime: '2026-09-20 19:00', endTime: '2026-09-20 21:00', place: '教学楼 B102', intro: '历年真题考点分布分析，动态规划与图论高频题型串讲，附赠刷题清单。', cover: COVER('tr3'), signupCount: 76, publisher: '林晓峰', createdAt: '2026-09-03 10:00' },
    { _id: 'tr-4', title: '电子设计竞赛焊接工艺基础（已结束）', lecturer: '赵慧敏', mode: '线下', startTime: '2026-08-20 14:00', endTime: '2026-08-20 17:00', place: '工程训练中心', intro: '贴片元件焊接、洞洞板布局布线规范。本场已结束，录播资料见队伍资料区。', cover: COVER('tr4'), signupCount: 45, publisher: '赵慧敏', createdAt: '2026-08-10 10:00' }
  ];
}

/* ================= 知识广场（完整全文 + 延伸阅读链接） ================= */
function seedKnowledge() {
  return [
    {
      _id: 'kn-1', title: '数学建模论文写作模板与常见坑（国奖学长总结）',
      content: '【摘要三段式】\n第一段：问题重述（一句话说清赛题要你干什么）+ 你用的方法；第二段：针对每个问题分别写了什么模型、得到什么关键结果（带数字）；第三段：灵敏度分析结论 + 模型优缺点一句话。摘要是评委第一眼看的，写完正文后最后改摘要。\n\n【正文结构】\n1 问题重述 → 2 问题分析 → 3 模型假设（3-5 条即可，别写太多）→ 4 符号说明（表格）→ 5 模型建立与求解（每个问题一节）→ 6 灵敏度分析 → 7 模型评价与推广。\n\n【常见坑】\n① 灵敏度分析不要省，这是区分国一国二的关键；② 图表编号全文统一，图在下、表在上；③ 参考文献至少 8 篇，格式用 GB/T 7714；④ 页眉别忘写队号，正文不能出现学校和个人信息；⑤ 最后 3 小时一定要留给排版和摘要打磨。',
      tags: ['其他'], author: '李雨桐', authorRole: 'student', teamName: '夜航西飞',
      sourceName: 'CSDN 延伸阅读：数学建模论文写作', sourceUrl: 'https://so.csdn.net/so/search?q=%E6%95%B0%E5%AD%A6%E5%BB%BA%E6%A8%A1%E8%AE%BA%E6%96%87%E5%86%99%E4%BD%9C',
      likes: 45, favs: 23, commentCount: 2, topped: true, featured: true, createdAt: '2026-09-01 20:00', ts: Date.now() - 86400e3
    },
    {
      _id: 'kn-2', title: '动态规划入门：从 01 背包讲起（附模板）',
      content: '【为什么是背包】\n01 背包是动态规划最经典的模型，蓝桥杯、天梯赛几乎年年考变种。\n\n【状态转移方程】\ndp[i][j] = max(dp[i-1][j], dp[i-1][j-w[i]] + v[i])\n含义：前 i 件物品、容量 j 时的最大价值 = max(不装第 i 件, 装第 i 件)。\n\n【滚动数组优化（必背模板）】\nfor (int i = 1; i <= n; i++)\n  for (int j = V; j >= w[i]; j--)\n    dp[j] = max(dp[j], dp[j - w[i]] + v[i]);\n注意内层循环必须倒序，否则就变成完全背包了。\n\n【进阶路线】\n01 背包 → 完全背包 → 多重背包 → 分组背包 → 树形 DP。建议配套刷"背包九讲"和洛谷 P1048/P1060。',
      tags: ['算法', '数据结构'], author: '王一飞', authorRole: 'student', teamName: '夜航西飞',
      sourceName: 'CSDN 延伸阅读：背包九讲', sourceUrl: 'https://so.csdn.net/so/search?q=%E8%83%8C%E5%8C%85%E4%B9%9D%E8%AE%B2',
      likes: 38, favs: 19, commentCount: 1, topped: false, featured: true, createdAt: '2026-09-02 12:00', ts: Date.now() - 3600e3
    },
    {
      _id: 'kn-3', title: 'CTF Web 方向三大高频漏洞速查表',
      content: '【SQL 注入】\n判断：参数后加单引号报错即可能存在。联合注入流程：order by 判断列数 → union select 找回显位 → 查库名表名列名。sqlmap 一把梭：sqlmap -u "url" --dbs。\n\n【XSS 跨站脚本】\n反射型最常考。常用 payload：<script>alert(1)</script>、<img src=x onerror=alert(1)>。注意过滤绕过：大小写混合、双写关键字。\n\n【文件上传】\n绕过姿势：改 Content-Type、双扩展名、%00 截断、图片马。拿到 shell 后找 flag 一般在根目录或数据库。\n\n【练习平台】\n攻防世界（新手友好）、BUUCTF、CTFHub。集训营每周二实验楼 B205。',
      tags: ['网络'], author: '沈星回', authorRole: 'student', teamName: '无线充球队',
      sourceName: 'CSDN 延伸阅读：CTF Web 入门', sourceUrl: 'https://so.csdn.net/so/search?q=CTF%20Web%20%E5%85%A5%E9%97%A8',
      likes: 27, favs: 12, commentCount: 0, topped: false, featured: false, createdAt: '2026-08-30 18:00', ts: Date.now() - 2 * 86400e3
    },
    {
      _id: 'kn-4', title: '电路仿真软件怎么选：Multisim / LTspice / Proteus',
      content: '【Multisim】模电实验最顺手，虚拟仪器（示波器、波特图仪）和实物操作一致，适合课设与电赛前期验证。缺点：体积大、正版贵。\n\n【LTspice】完全免费、仿真速度极快，电源电路（开关电源、LDO）首选。缺点：界面朴素、元件库要自己导入。\n\n【Proteus】单片机 + 外围电路联合仿真独一档，51/STM32 程序可以直接在原理图里跑。电赛控制类题目必备。\n\n【建议】电赛备赛：Multisim 验模拟部分 + Proteus 验单片机部分；日常课设按老师要求来。',
      tags: ['电路'], author: '赵慧敏', authorRole: 'teacher', teamName: '',
      sourceName: 'CSDN 延伸阅读：电路仿真软件对比', sourceUrl: 'https://so.csdn.net/so/search?q=%E7%94%B5%E8%B7%AF%E4%BB%BF%E7%9C%9F%E8%BD%AF%E4%BB%B6%E5%AF%B9%E6%AF%94',
      likes: 19, favs: 8, commentCount: 0, topped: false, featured: false, createdAt: '2026-08-28 10:00', ts: Date.now() - 4 * 86400e3
    },
    {
      _id: 'kn-5', title: '蓝桥杯省赛 30 天冲刺计划（Python 组）',
      content: '【第 1 周：基础题型】\n日期处理、字符串、模拟题每天 3 道（历年真题前 3 题），目标：填空题不丢分。\n\n【第 2 周：核心算法】\nDFS/BFS、二分、前缀和、差分。每天 2 道 + 周末复盘错题。\n\n【第 3 周：动态规划】\n线性 DP、背包、区间 DP。Python 组 DP 题分值高，务必拿下前两问。\n\n【第 4 周：全真模拟】\n按考试时间（4 小时）完整刷近 3 年真题，训练时间分配：填空 40 分钟、编程题按分值从低到高。\n\n【提醒】Python 组注意大数运算不用取模是优势，但递归深度要 sys.setrecursionlimit。',
      tags: ['算法', '编程'], author: '林晓峰', authorRole: 'teacher', teamName: '',
      sourceName: 'CSDN 延伸阅读：蓝桥杯备考', sourceUrl: 'https://so.csdn.net/so/search?q=%E8%93%9D%E6%A1%A5%E6%9D%AF%E5%A4%87%E8%B5%9B',
      likes: 52, favs: 31, commentCount: 0, topped: false, featured: true, createdAt: '2026-09-03 09:00', ts: Date.now() - 1800e3
    },
    {
      _id: 'kn-6', title: '互联网+ 商业计划书框架（评委视角）',
      content: '【评委 90 秒看什么】\n痛点是否真实（有数据）、方案是否成立（有验证）、团队是否靠谱（有分工）。\n\n【标准框架】\n1 项目概述（1 页讲清楚）→ 2 痛点与市场规模（引用权威数据）→ 3 产品与解决方案（截图/实物图）→ 4 商业模式（怎么赚钱）→ 5 竞争分析（表格对比，别写"没有竞品"）→ 6 运营数据（试点数据最有说服力）→ 7 团队介绍 → 8 财务与融资 → 9 风险与对策。\n\n【避坑】\n① 市场规模别只会写"千亿级"；② 财务预测别拍脑袋，写明假设；③ PPT 一页一个观点，字少图多。',
      tags: ['其他'], author: '刘思远', authorRole: 'teacher', teamName: '',
      sourceName: 'CSDN 延伸阅读：互联网+ 计划书', sourceUrl: 'https://so.csdn.net/so/search?q=%E4%BA%92%E8%81%94%E7%BD%91%2B%20%E5%95%86%E4%B8%9A%E8%AE%A1%E5%88%92%E4%B9%A6',
      likes: 23, favs: 14, commentCount: 0, topped: false, featured: false, createdAt: '2026-09-02 16:00', ts: Date.now() - 7200e3
    },
    {
      _id: 'kn-7', title: 'Git 团队协作风暴急救包（组队参赛必看）',
      content: '【最小工作流】\n每人一个分支：git checkout -b feature/你的名字；写完 git add . → git commit -m "做了什么" → git push origin 分支名；然后在 GitHub 上发 Pull Request 让队长合并。\n\n【冲突了怎么办】\ngit pull 提示冲突别慌：打开冲突文件，找到 <<<<<<< 和 >>>>>>> 标记，手动保留正确内容删掉标记，再 add + commit。\n\n【后悔药】\n改错了没提交：git checkout -- 文件名；提交错了想撤销：git reset --soft HEAD~1（改动还在）；千万别对公共分支用 git push -f。\n\n【建议】比赛项目 main 分支设保护，只允许 PR 合并。',
      tags: ['编程'], author: '高鸣', authorRole: 'student', teamName: '白鹭队',
      sourceName: 'CSDN 延伸阅读：Git 团队协作', sourceUrl: 'https://so.csdn.net/so/search?q=Git%20%E5%9B%A2%E9%98%9F%E5%8D%8F%E4%BD%9C',
      likes: 31, favs: 17, commentCount: 0, topped: false, featured: false, createdAt: '2026-09-01 14:00', ts: Date.now() - 10800e3
    },
    {
      _id: 'kn-8', title: '物联网工程专业竞赛路线图（大一到大四）',
      content: '【大一】打基础：C 语言 + 单片机入门（51/Arduino），参加校 ACM 新生赛练手。\n\n【大二】上强度：蓝桥杯单片机组/嵌入式组 + 电子设计竞赛校选，开始学 STM32 和 PCB 画板（立创 EDA 免费）。\n\n【大三】出成绩：全国大学生电子设计竞赛 + 物联网设计竞赛 + 挑战杯，这年的奖对推免/就业含金量最高。\n\n【大四】收成果：用竞赛作品打磨毕设，简历按"项目-职责-成果"写。\n\n【学院资源】实验楼 4 楼创新实验室常年开放，烙铁示波器随便用，找辅导员办门禁。',
      tags: ['其他', '电路'], author: '赵慧敏', authorRole: 'teacher', teamName: '',
      sourceName: 'CSDN 延伸阅读：物联网竞赛', sourceUrl: 'https://so.csdn.net/so/search?q=%E7%89%A9%E8%81%94%E7%BD%91%E5%B7%A5%E7%A8%8B%20%E7%AB%9E%E8%B5%9B',
      likes: 41, favs: 26, commentCount: 0, topped: false, featured: true, createdAt: '2026-08-29 11:00', ts: Date.now() - 4 * 86400e3
    }
  ];
}

/* ================= 评论 ================= */
function seedComments() {
  return [
    { _id: 'cm-1', knowledgeId: 'kn-1', author: '高鸣', content: '摘要模板太实用了，已收藏！', createdAt: '2026-09-02 09:00', ts: Date.now() - 7200e3 },
    { _id: 'cm-2', knowledgeId: 'kn-1', author: '陈建国', content: '补充：参考文献格式用 GB/T 7714，每年都有队伍在这丢分。', createdAt: '2026-09-02 10:00', ts: Date.now() - 7000e3 },
    { _id: 'cm-3', knowledgeId: 'kn-2', author: '赵野', content: '背包九讲原文也值得读，洛谷配套题单刷起来。', createdAt: '2026-09-02 13:00', ts: Date.now() - 3600e3 },
    { _id: 'cm-4', knowledgeId: 'kn-5', author: '王一飞', content: '林老师，求 Python 组历年真题打包！', createdAt: '2026-09-03 10:00', ts: Date.now() - 1800e3 }
  ];
}

/* ================= 积分商城 ================= */
function seedProducts() {
  return [
    { _id: 'pd-1', name: '信息学院定制帆布包', price: 50, stock: 20, off: false },
    { _id: 'pd-2', name: '竞赛纪念徽章套装', price: 30, stock: 50, off: false },
    { _id: 'pd-3', name: '机械键盘（青轴）', price: 300, stock: 3, off: false },
    { _id: 'pd-4', name: '实验室优先预约券（一周）', price: 80, stock: 10, off: false },
    { _id: 'pd-5', name: '32G U盘', price: 60, stock: 15, off: false },
    { _id: 'pd-6', name: 'CSDN 会员月卡', price: 120, stock: 8, off: false }
  ];
}

/* ================= 学院组织（唯一） ================= */
function seedOrgs() {
  return [{
    _id: 'org-1', college: COLLEGE_FULL,
    majors: ['计算机科学与技术', '软件工程', '电子信息工程', '通信工程', '物联网工程', '数据科学与大数据技术', '人工智能', '计算机应用技术', '电子信息工程技术'],
    majorsBen: ['计算机科学与技术', '软件工程', '电子信息工程', '通信工程', '物联网工程', '数据科学与大数据技术', '人工智能'],
    majorsZhuan: ['计算机应用技术', '电子信息工程技术']
  }];
}

/* ================= 我的报名（演示） ================= */
function seedRegs() {
  const now = stamp();
  return [
    {
      _id: 'reg-0817', type: 'reg', regNo: 'NO.2026-001-0817',
      compId: 'comp-001', compTitle: '全国大学生数学建模竞赛（CUMCM）',
      title: '全国大学生数学建模竞赛 · 夜航西飞',
      applicantName: '李雨桐', openid: 'demo-openid-0001',
      teamName: '夜航西飞', mode: 'team',
      members: [{ name: '李雨桐', lead: true }, { name: '王一飞' }, { name: '沈星回' }],
      teacherName: '陈建国', planFile: '夜航西飞_计划书_v2.pdf',
      status: 'approving', version: 2, currentNode: 2, urgeCount: 0,
      deadline: '2026-09-15',
      nodes: [
        { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: '09.01 09:12', note: '表单完整性校验通过' },
        { key: 'teacher', name: '指导教师 · 陈建国', approver: '陈建国', status: 'pass', time: '09.01 10:41', note: '选题不错，注意查重' },
        { key: 'secretary', name: '教学秘书', approver: '待定', status: 'reject', time: '09.01 14:30', note: '项目书第 3 节技术路线不清晰，请重写后再交。' },
        { key: 'dept', name: '教研室主任', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { key: 'vicedean', name: '教学副院长', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { key: 'dean', name: '院长（终审）', approver: '待定', status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: now
    },
    {
      _id: 'reg-0042', type: 'reg', regNo: 'NO.2026-002-0042',
      compId: 'comp-002', compTitle: '蓝桥杯全国软件和信息技术专业人才大赛',
      title: '蓝桥杯 · 李雨桐（个人赛）',
      applicantName: '李雨桐', openid: 'demo-openid-0001',
      teamName: '', mode: 'solo',
      members: [{ name: '李雨桐', lead: true }],
      teacherName: '林晓峰', planFile: '李雨桐_报名表.pdf',
      status: 'approving', version: 1, currentNode: 1, urgeCount: 0,
      deadline: '2026-10-20',
      nodes: [
        { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: '09.03 09:00', note: '表单完整性校验通过' },
        { key: 'teacher', name: '指导教师 · 林晓峰', approver: '林晓峰', status: 'waiting', time: '—', note: '等待' },
        { key: 'secretary', name: '教学秘书', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { key: 'dept', name: '教研室主任', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { key: 'vicedean', name: '教学副院长', approver: '待定', status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: now
    },
    {
      _id: 'reg-0913', type: 'reg', regNo: 'NO.2026-004-0913',
      compId: 'comp-004', compTitle: '全国大学生电子设计竞赛',
      title: '电子设计竞赛 · 无线充球队',
      applicantName: '李雨桐', openid: 'demo-openid-0001',
      teamName: '无线充球队', mode: 'team',
      members: [{ name: '李雨桐', lead: true }, { name: '赵野' }],
      teacherName: '赵慧敏', planFile: '无线充球队_设计报告.pdf',
      status: 'rejected', version: 1, currentNode: 1, urgeCount: 0,
      deadline: '2026-09-30',
      nodes: [
        { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: '08.20 09:00', note: '通过' },
        { key: 'teacher', name: '指导教师 · 赵慧敏', approver: '赵慧敏', status: 'reject', time: '08.28 11:05', note: '作品说明书中缺少电路原理图，补齐后重报。' },
        { key: 'secretary', name: '教学秘书', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { key: 'dept', name: '教研室主任', approver: '待定', status: 'waiting', time: '—', note: '等待' },
        { key: 'vicedean', name: '教学副院长', approver: '待定', status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: now
    }
  ];
}

function mockUser(role, school) {
  return {
    openid: 'demo-openid-0001',
    name: '李雨桐',
    studentId: '2305010123',
    school: school || '燕京理工学院',
    college: COLLEGE_FULL,
    major: '计算机科学与技术（本科）',
    phone: '138****0000', email: '',
    role: role || 'student',
    avatar: '/assets/covers/avatar.png',
    tagline: '白鹭队 · 队长 · 参赛 4 次'
  };
}

/* ================= 科创瞭望台：主讲人 / 课程 / 视频 ================= */
function seedLecturers() {
  return [
    { _id: 'lec-1', name: '陈建国', title: '教授 · 硕士生导师', intro: '主要研究方向：数学建模与智能优化算法。指导学生获全国大学生数学建模竞赛国家一等奖 2 项。' },
    { _id: 'lec-2', name: '赵慧敏', title: '副教授 · 电子设计竞赛负责人', intro: '主讲嵌入式系统与电子设计，连续五年带队参加全国大学生电子设计竞赛。' },
    { _id: 'lec-3', name: '刘志强', title: '高级工程师 · 企业导师', intro: '来自合作企业的一线架构师，主讲工程实践与项目管理实战。' }
  ];
}

function seedVideoCourses() {
  return [
    { _id: 'vc-1', name: '竞赛入门必修课', category: '竞赛通识', coverText: '入门', intro: '面向零基础同学的竞赛通识课程，讲清赛制、组队与备赛节奏。', lecturerId: 'lec-1', sort: 100 },
    { _id: 'vc-2', name: '数学建模专题训练营', category: '数学建模', coverText: '建模', intro: '从建模思路、论文写作到代码实现的全流程训练。', lecturerId: 'lec-1', sort: 90 },
    { _id: 'vc-3', name: '电子设计实战', category: '电子设计', coverText: '电设', intro: '以真题为线索的硬件设计与调试实战课。', lecturerId: 'lec-2', sort: 80 },
    { _id: 'vc-4', name: '学院风采宣传片', category: '学院宣传', coverText: '宣传', intro: '学院竞赛成果与师生风采展示，供领导视察与对外宣传使用。', lecturerId: 'lec-3', sort: 70 }
  ];
}

function seedVideos() {
  const now = stamp();
  return [
    { _id: 'vid-1', courseId: 'vc-1', title: '第一课：竞赛是什么？为什么要参加竞赛', duration: '18:32', lecturerId: 'lec-1', status: 'published', sort: 100, views: 326, fileID: '', intro: '竞赛分类、级别认定与学分激励政策一次讲透。', createdAt: now },
    { _id: 'vid-2', courseId: 'vc-1', title: '第二课：如何组队与选择赛道', duration: '22:10', lecturerId: 'lec-1', status: 'published', sort: 90, views: 254, fileID: '', intro: '个人赛与团队赛的选择策略，队友从哪找。', createdAt: now },
    { _id: 'vid-3', courseId: 'vc-2', title: '建模第一课：从题目到假设', duration: '35:47', lecturerId: 'lec-1', status: 'published', sort: 100, views: 189, fileID: '', intro: '以 2024 年国赛 A 题为例拆解审题与建模假设。', createdAt: now },
    { _id: 'vid-4', courseId: 'vc-2', title: '建模第二课：论文写作框架', duration: '41:05', lecturerId: 'lec-1', status: 'published', sort: 90, views: 173, fileID: '', intro: '摘要、模型评价与灵敏度分析的写法模板。', createdAt: now },
    { _id: 'vid-5', courseId: 'vc-3', title: '电设实战：最小系统搭建', duration: '28:16', lecturerId: 'lec-2', status: 'published', sort: 100, views: 142, fileID: '', intro: '单片机最小系统与电源设计要点。', createdAt: now },
    { _id: 'vid-6', courseId: 'vc-4', title: '学院竞赛风采年度宣传片', duration: '06:58', lecturerId: 'lec-3', status: 'published', sort: 100, views: 521, fileID: '', intro: '一分钟了解学院竞赛实力，欢迎领导与企业观看。', createdAt: now }
  ];
}

/* ================= 获奖证书（首页轮播，审核通过后展示） ================= */
function seedCertificates() {
  return [
    { _id: 'cert-1', studentName: '白鹭队 · 李雨桐等', compTitle: '全国大学生数学建模竞赛', award: '国家一等奖', year: '2025', status: 'passed', fileID: '', createdAt: '2026-08-30 10:00' },
    { _id: 'cert-2', studentName: '逐梦队 · 王梓涵等', compTitle: '蓝桥杯全国软件设计大赛', award: '国家二等奖', year: '2025', status: 'passed', fileID: '', createdAt: '2026-08-28 15:00' },
    { _id: 'cert-3', studentName: '星火队 · 张一诺等', compTitle: '中国大学生计算机设计大赛', award: '省一等奖', year: '2025', status: 'passed', fileID: '', createdAt: '2026-08-20 09:00' }
  ];
}

module.exports = {
  seedCompetitions, seedTeachers, seedNews, seedTrainings,
  seedKnowledge, seedComments, seedProducts, seedOrgs, seedRegs, mockUser,
  seedLecturers, seedVideoCourses, seedVideos, seedCertificates
};
