// utils/data.js —— V2.0 数据层（云开发优先 + 本地演示兜底）
//
// 工作原理（给初学者的说明）：
//   1. 页面显示前调用 await data.ready()，一次性把云端数据拉进内存缓存；
//   2. getXxx() 读取方法从内存同步返回，页面写法简单；
//   3. 写操作全部异步（返回 Promise），先写云端再刷新缓存；
//   4. 云开发没配好时自动回退本地 Storage 演示模式，界面照常可点。

const CFG = require('./config');

const K = {
  USER: 'user',
  COMPS: 'js_comps',
  TEACHERS: 'js_teachers',
  NEWS: 'js_news',
  TRAININGS: 'js_trainings',
  KNOWLEDGE: 'js_knowledge',
  COMMENTS: 'js_comments',
  PRODUCTS: 'js_products',
  ORGS: 'js_orgs',
  REGS: 'js_regs',
  LEAVES: 'js_leaves',
  SIGNUPS: 'js_signups',
  CHECKINS: 'js_checkins',
  POINTS: 'js_points',
  TEAM: 'js_team',
  SCHEDULES: 'js_schedules',
  LOGS: 'js_logs',
  LECTURERS: 'js_lecturers',
  VCOURSES: 'js_vcourses',
  VIDEOS: 'js_videos',
  WATCH: 'js_watch',
  CERTS: 'js_certs_pub',
  EXPENSES: 'js_expenses'
};

/* ================= 种子数据 V2.1（统一来源 utils/seeddata.js，JS 后定义覆盖上方旧演示数据） ================= */
const SEED = require('./seeddata');
function seedCompetitions() { return SEED.seedCompetitions(); }
function seedTeachers() { return SEED.seedTeachers(); }
function seedNews() { return SEED.seedNews(); }
function seedTrainings() { return SEED.seedTrainings(); }
function seedKnowledge() { return SEED.seedKnowledge(); }
function seedComments() { return SEED.seedComments(); }
function seedProducts() { return SEED.seedProducts(); }
function seedOrgs() { return SEED.seedOrgs(); }
function seedRegs() { return SEED.seedRegs(); }
function mockUser(role, school) { return SEED.mockUser(role, school); }
function seedLecturers() { return SEED.seedLecturers(); }
function seedVideoCourses() { return SEED.seedVideoCourses(); }
function seedVideos() { return SEED.seedVideos(); }
function seedCertificates() { return SEED.seedCertificates(); }
function seedSignups() { return []; }
function seedExpenses() { return []; }
function seedSchedules() { return []; }

/* 演示模式排行榜（开通云开发后会替换为全院真实数据） */
function demoRank() {
  const names = [
    ['王梓涵', '计算机科学与技术（本科）', 186], ['李雨桐', '计算机科学与技术（本科）', 152],
    ['张一诺', '软件工程（本科）', 141], ['刘思远', '数据科学与大数据技术（本科）', 128],
    ['陈嘉琪', '物联网工程（本科）', 117], ['杨浩然', '软件工程（本科）', 104],
    ['赵欣怡', '计算机科学与技术（本科）', 96], ['黄志强', '电子信息工程（本科）', 88],
    ['周雅静', '大数据管理与应用（本科）', 79], ['吴俊杰', '计算机应用技术（专科）', 71],
    ['郑凯文', '人工智能（本科）', 64], ['孙梦洁', '计算机网络技术（专科）', 55],
    ['马天宇', '软件工程（本科）', 47], ['朱晓萌', '物联网工程（本科）', 38],
    ['胡文博', '计算机科学与技术（本科）', 26]
  ];
  return names.map((n, i) => ({ rank: i + 1, name: n[0], major: n[1], school: '燕京理工学院', total: n[2] }));
}

/* ================= 本地 Storage 工具（演示模式用） ================= */
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

/* ================= 云缓存与初始化 ================= */
let cache = {};
let readyPromise = null;
let cloudOn = false;

function callApi(action, payload) {
  return wx.cloud.callFunction({ name: 'api', data: Object.assign({ action }, payload) })
    .then((r) => {
      const res = r.result || {};
      if (res.ok === false) throw new Error(res.msg || '云端处理失败');
      return res;
    });
}

// 客户端直读的公开集合（权限：所有用户可读，仅管理端可写）
const PUBLIC_COLLECTIONS = [
  ['competitions', 'comps'],
  ['teachers', 'teachers'],
  ['news', 'news'],
  ['trainings', 'trainings'],
  ['learning_knowledge', 'knowledge'],
  ['knowledge_comments', 'comments'],
  ['point_exchange_products', 'products'],
  ['organizations', 'orgs'],
  ['lecturers', 'lecturers'],
  ['video_courses', 'vcourses'],
  ['videos', 'videos'],
  ['certificates', 'pubCerts']
];

// 演示数据版本号：种子数据结构升级时 +1，旧缓存会自动作废重灌
const DATA_VERSION = 3;

function loadLocal() {
  const ver = wx.getStorageSync('js_data_version');
  if (ver !== DATA_VERSION) {
    Object.keys(K).forEach((k) => { try { wx.removeStorageSync(K[k]); } catch (e) {} });
    wx.setStorageSync('js_data_version', DATA_VERSION);
  }
  cache.comps = read(K.COMPS, seedCompetitions);
  cache.teachers = read(K.TEACHERS, seedTeachers);
  cache.news = read(K.NEWS, seedNews);
  cache.trainings = read(K.TRAININGS, seedTrainings);
  cache.knowledge = read(K.KNOWLEDGE, seedKnowledge);
  cache.comments = read(K.COMMENTS, seedComments);
  cache.products = read(K.PRODUCTS, seedProducts);
  cache.orgs = read(K.ORGS, seedOrgs);
  cache.lecturers = read(K.LECTURERS, seedLecturers);
  cache.vcourses = read(K.VCOURSES, seedVideoCourses);
  cache.videos = read(K.VIDEOS, seedVideos);
  cache.pubCerts = read(K.CERTS, seedCertificates);
  cache.watch = wx.getStorageSync(K.WATCH) || {};
  cache.regs = read(K.REGS, seedRegs);
  cache.leaves = wx.getStorageSync(K.LEAVES) || [];
  cache.signups = wx.getStorageSync(K.SIGNUPS) || [];
  cache.checkins = wx.getStorageSync(K.CHECKINS) || [];
  cache.points = wx.getStorageSync(K.POINTS) || { total: 0, used: 0 };
  cache.team = wx.getStorageSync(K.TEAM) || null;
  cache.schedules = wx.getStorageSync(K.SCHEDULES) || [];
  cache.todos = cache.regs;   // 演示模式：审批页复用同一份数据
  cache.history = [];
  cache.logs = wx.getStorageSync(K.LOGS) || [];
}

async function refreshMe() {
  const [mine, todo] = await Promise.all([callApi('me'), callApi('todoList')]);
  cache.user = mine.user || cache.user;
  cache.regs = mine.regs || [];
  cache.leaves = mine.leaves || [];
  cache.signups = mine.signups || [];
  cache.points = mine.points || { total: 0, used: 0 };
  cache.checkins = mine.checkins || [];
  cache.team = mine.team || null;
  cache.schedules = mine.schedules || [];
  cache.logs = mine.logs || [];
  cache.todos = todo.todos || [];
  cache.history = todo.history || [];
}

async function init() {
  const app = getApp();
  const gd = app && app.globalData ? app.globalData : {};
  cloudOn = !!gd.cloudReady;
  if (!cloudOn) { loadLocal(); return; }
  try {
    await Promise.all(PUBLIC_COLLECTIONS.map(([coll, key]) =>
      gd.db.collection(coll).limit(200).get()
        // 关键：空集合或读取失败都置 null，让 getter 自动回退到种子数据，页面不再是空壳
        .then((r) => { cache[key] = (r.data && r.data.length) ? r.data : null; })
        .catch(() => { cache[key] = null; })
    ));
    // 8 个公开集合全空 → 整体回退本地演示模式
    const anyData = PUBLIC_COLLECTIONS.some(([, key]) => cache[key] && cache[key].length);
    if (!anyData) throw new Error('云端集合为空（请先导入种子数据）');
    await refreshMe().catch(() => {});
    console.log('[data] 云开发模式已启用（缺失集合自动使用演示数据）');
  } catch (e) {
    console.warn('[data] 云端不可用，回退本地演示模式：', e);
    cloudOn = false;
    loadLocal();
  }
}

/** 页面显示前调用：await data.ready()。重复调用不会重复请求。 */
function ready() {
  if (!readyPromise) readyPromise = init();
  return readyPromise;
}

function localLog(action, detail) {
  const logs = wx.getStorageSync(K.LOGS) || [];
  logs.unshift({ action, detail, time: stamp() });
  write(K.LOGS, logs.slice(0, 100));
  cache.logs = logs.slice(0, 100);
}

/* ================= 本地写操作（演示模式） ================= */
function localSubmitReg(payload) {
  const regs = read(K.REGS, seedRegs);
  const comp = getCompetition(payload.compId);
  const flow = comp.track === 'teacher'
    ? CFG.FLOWS.teacher_comp.filter(n => comp.needExpert || n.key !== 'expert')
    : CFG.FLOWS['student_comp_' + (comp.level || 'C')];
  const sys = { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: stamp().slice(5, 16), note: '表单完整性校验通过' };
  const nodes = [sys].concat(flow.map((n) => ({
    key: n.key, name: n.key === 'teacher' && payload.teacherName ? `${n.name} · ${payload.teacherName}` : n.name,
    approver: n.key === 'teacher' ? (payload.teacherName || '待定') : '待定',
    needSign: !!n.sign, status: 'waiting', time: '—', note: '等待', signature: ''
  })));
  const reg = Object.assign({
    _id: 'reg-' + Date.now(), type: 'reg',
    regNo: `NO.2026-${comp.no}-` + (818 + regs.length),
    compId: comp._id, compTitle: comp.title,
    title: comp.title + ' · ' + (payload.teamName || '个人'),
    applicantName: '李雨桐',
    status: 'approving', version: 1, currentNode: 1, urgeCount: 0,
    deadline: comp.deadline, nodes, createdAt: stamp()
  }, payload);
  regs.unshift(reg);
  write(K.REGS, regs);
  localLog('提交报名', reg.compTitle + ' · ' + (reg.teamName || '个人') + ' v1');
  cache.regs = regs; cache.todos = regs;
  return reg;
}

function localAct(list, cacheKey, storageKey, id, op, note) {
  const doc = list.find(r => r._id === id);
  if (!doc) return null;
  const idx = (doc.nodes || []).findIndex(n => n.status === 'waiting');
  if (idx < 0) return doc;
  const node = doc.nodes[idx];
  node.time = stamp().slice(5, 16);
  node.approver = '演示审批人';
  if (op === 'pass') {
    node.status = 'pass';
    node.note = note || '已通过';
    if (idx === doc.nodes.length - 1) { doc.status = 'passed'; } else { doc.currentNode = idx + 1; }
  } else {
    node.status = 'reject';
    node.note = note || '退回修改';
    doc.status = 'rejected';
  }
  write(storageKey, list);
  cache[cacheKey] = list;
  localLog(op === 'pass' ? '审批通过' : '审批驳回', (doc.title || '') + ' · ' + node.name);
  return doc;
}

/* ================= 对外 API ================= */
const api = {
  K, ready, mockUser, CFG,
  FLOWS: CFG.FLOWS, CHAIN_NAMES: { A: '五级审批', B: '四级审批', C: '三级审批' },

  isCloud() { return cloudOn; },

  /* ---------- 同步读取 ---------- */
  getUser() { return cache.user || null; },
  getCompetitions() { return cache.comps || read(K.COMPS, seedCompetitions); },
  getCompetition(id) { return this.getCompetitions().find(c => c._id === id) || null; },
  getTeachers(kind) {
    const t = cache.teachers || read(K.TEACHERS, seedTeachers);
    return kind ? t.filter(x => (x.kind || 'teacher') === kind) : t;
  },
  getNews() { return (cache.news || read(K.NEWS, seedNews)).filter(n => n.visible !== false); },
  getTrainings() { return cache.trainings || read(K.TRAININGS, seedTrainings); },
  getTraining(id) { return this.getTrainings().find(t => t._id === id) || null; },
  getKnowledge() { return cache.knowledge || read(K.KNOWLEDGE, seedKnowledge); },
  getComments(knowledgeId) {
    const all = cache.comments || read(K.COMMENTS, seedComments);
    return knowledgeId ? all.filter(c => c.knowledgeId === knowledgeId) : all;
  },
  getProducts() { return cache.products || read(K.PRODUCTS, seedProducts); },
  getOrgs() { return cache.orgs || read(K.ORGS, seedOrgs); },

  /* ---------- 科创瞭望台 ---------- */
  getLecturers() { return cache.lecturers || read(K.LECTURERS, seedLecturers); },
  getVideoCourses() { return cache.vcourses || read(K.VCOURSES, seedVideoCourses); },
  getVideos(all) {
    const list = cache.videos || read(K.VIDEOS, seedVideos);
    return all ? list : list.filter(v => !v.status || v.status === 'published');
  },
  getWatchMap() { return cache.watch || {}; },
  getPubCerts() {
    const list = cache.pubCerts || read(K.CERTS, seedCertificates);
    return list.filter(c => c.status === 'passed');
  },

  /* 提交证书（状态待审核；管理员通过后进入首页轮播） */
  async submitCert(payload) {
    if (cloudOn) {
      await callApi('submitCert', { payload });
      return true;
    }
    const certs = wx.getStorageSync('js_certs') || [];
    certs.unshift(Object.assign({ id: 'cert-' + Date.now(), status: 'pending', time: stamp() }, payload));
    write('js_certs', certs);
    localLog('上传证书', `${payload.compTitle} · ${payload.award}`);
    return true;
  },

  /* 管理员：待审核证书列表 */
  async adminCertList() {
    if (cloudOn) {
      const res = await callApi('adminCert', { payload: { op: 'list' } });
      return res.certs || [];
    }
    return wx.getStorageSync('js_certs') || [];
  },

  /* 管理员：审核通过/驳回 */
  async adminCertAct(id, op, note) {
    if (cloudOn) {
      await callApi('adminCert', { payload: { op, id, note } });
      return true;
    }
    const certs = wx.getStorageSync('js_certs') || [];
    const c = certs.find(x => x.id === id);
    if (c) {
      c.status = op === 'approve' ? 'passed' : 'rejected';
      c.note = note || '';
      write('js_certs', certs);
      if (c.status === 'passed') {
        const pub = cache.pubCerts || read(K.CERTS, seedCertificates);
        pub.unshift({ _id: c.id, studentName: c.studentName, compTitle: c.compTitle, award: c.award, year: c.year, status: 'passed' });
        write(K.CERTS, pub);
        cache.pubCerts = pub;
      }
    }
    return true;
  },
  /* 观看统计（演示模式在真实观看数据上叠加示例基数） */
  getWatchStats() {
    const videos = this.getVideos();
    const watch = this.getWatchMap();
    const watched = Object.keys(watch).length;
    const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
    const finished = Object.keys(watch).filter(k => watch[k] && watch[k].finished).length;
    return {
      videoCount: videos.length,
      totalViews,
      watchedCount: watched,
      finishRate: watched ? Math.round(finished / watched * 100) : 0
    };
  },
  async publishVideo(payload) {
    if (cloudOn) {
      await callApi('publishVideo', { payload });
      const r = await getApp().globalData.db.collection('videos').limit(200).get();
      cache.videos = r.data;
      return true;
    }
    const list = cache.videos || read(K.VIDEOS, seedVideos);
    list.unshift(Object.assign({ _id: 'vid-' + Date.now(), views: 0, status: 'published', createdAt: stamp() }, payload));
    write(K.VIDEOS, list);
    cache.videos = list;
    localLog('上传视频', payload.title);
    return true;
  },
  async deleteVideo(id) {
    if (cloudOn) {
      await callApi('deleteVideo', { id });
      const r = await getApp().globalData.db.collection('videos').limit(200).get();
      cache.videos = r.data;
      return true;
    }
    const list = (cache.videos || []).filter(v => v._id !== id);
    write(K.VIDEOS, list);
    cache.videos = list;
    return true;
  },
  /* 记录观看进度（seconds=已看秒数, dur=总秒数, ≥90% 计完播） */
  recordWatch(videoId, seconds, dur) {
    const watch = cache.watch || {};
    const prev = watch[videoId] || { seconds: 0, finished: false };
    const sec = Math.max(prev.seconds, Math.floor(seconds));
    watch[videoId] = { seconds: sec, finished: prev.finished || (dur > 0 && sec >= dur * 0.9), lastAt: stamp() };
    cache.watch = watch;
    write(K.WATCH, watch);
    if (cloudOn) callApi('recordWatch', { videoId, seconds: sec, duration: dur }).catch(() => {});
  },
  getMyRegistrations() { return cache.regs || read(K.REGS, seedRegs); },
  getMyLeaves() { return cache.leaves || []; },
  getMySignups() { return cache.signups || []; },
  getPoints() { return cache.points || { total: 0, used: 0 }; },

  /* 全院积分排行榜：云端实时聚合；演示模式返回模拟榜单 */
  async getPointsRank() {
    if (cloudOn) {
      try {
        const res = await callApi('pointsRank');
        return res.rank || [];
      } catch (e) { return demoRank(); }
    }
    return demoRank();
  },
  getMyCheckins() { return cache.checkins || []; },
  getTeam() { return cache.team || null; },
  getSchedules() { return cache.schedules || []; },
  getSchedule(semester) {
    return (cache.schedules || []).find(s => s.semester === semester) || null;
  },

  /* 云端解析课表 Excel（fileID 为云存储文件 ID），返回课程数组 */
  async parseSchedule(fileID) {
    if (!cloudOn) throw new Error('演示模式暂不支持 Excel 解析，请开通云开发后使用（CSV 可直接导入）');
    const res = await callApi('parseSchedule', { fileID });
    return res.courses || [];
  },
  getTodoItems() { return cache.todos || []; },
  getHistoryItems() { return cache.history || []; },
  getLogs() { return cache.logs || []; },

  /* ---------- 登录/资料 ---------- */
  async updateProfile(p) {
    if (cloudOn) {
      const res = await callApi('updateProfile', p);
      cache.user = res.user;
      getApp().globalData.user = res.user;
      wx.setStorageSync('user', res.user);
      return res.user;
    }
    const u = Object.assign(mockUser(), cache.user || {}, p);
    cache.user = u;
    getApp().globalData.user = u;
    wx.setStorageSync('user', u);
    return u;
  },

  /* ---------- 竞赛报名 ---------- */
  async submitRegistration(payload) {
    if (cloudOn) {
      const res = await callApi('submit', { payload });
      await refreshMe();
      return res.reg;
    }
    return localSubmitReg(payload);
  },

  /* ---------- 通用审批动作 ---------- */
  async actItem(targetType, id, op, note, signature) {
    if (cloudOn) {
      await callApi('act', { targetType, id, op, note, signature });
      await refreshMe();
      return true;
    }
    const map = { reg: ['regs', K.REGS], leave: ['leaves', K.LEAVES], training: ['signups', K.SIGNUPS], news: ['news', K.NEWS] };
    const m = map[targetType] || map.reg;
    const list = cache[m[0]] || wx.getStorageSync(m[1]) || [];
    localAct(list, m[0], m[1], id, op, note);
    cache.todos = cache.regs;
    return true;
  },

  async resubmitItem(targetType, id) {
    if (cloudOn) {
      const res = await callApi('resubmit', { targetType, id });
      await refreshMe();
      return res;
    }
    const list = cache.regs;
    const doc = list.find(r => r._id === id);
    if (!doc || doc.status !== 'rejected') return null;
    doc.version += 1;
    doc.status = 'approving';
    const idx = doc.nodes.findIndex(n => n.status === 'reject');
    if (idx > -1) {
      doc.nodes[idx].status = 'waiting';
      doc.nodes[idx].time = '—';
      doc.nodes[idx].note = '重新提交 · v' + doc.version;
      doc.currentNode = idx;
    }
    write(K.REGS, list);
    localLog('重新提交', (doc.title || '') + ' · v' + doc.version);
    return { version: doc.version };
  },

  async withdrawItem(targetType, id) {
    if (cloudOn) {
      await callApi('withdraw', { targetType, id });
      await refreshMe();
      return true;
    }
    const list = cache.regs;
    const doc = list.find(r => r._id === id);
    if (!doc) return null;
    if (doc.status === 'passed') throw new Error('终审已通过，不可撤回');
    doc.status = 'withdrawn';
    write(K.REGS, list);
    localLog('撤回', doc.title || id);
    return true;
  },

  async urgeItem(targetType, id) {
    if (cloudOn) {
      const res = await callApi('urge', { targetType, id });
      await refreshMe();
      return res;
    }
    localLog('发送催办', id);
    return { urgeCount: 1, escalated: false };
  },

  /* ---------- 请假 ---------- */
  async submitLeave(p) {
    if (cloudOn) {
      const res = await callApi('submitLeave', { payload: p });
      await refreshMe();
      return res.leave;
    }
    const leaves = cache.leaves;
    const doc = Object.assign({
      _id: 'leave-' + Date.now(), type: 'leave',
      applicantName: '李雨桐', title: `李雨桐 · ${p.leaveType}`,
      status: 'approving', version: 1, currentNode: 1, urgeCount: 0,
      nodes: [
        { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: stamp().slice(5, 16), note: '表单完整性校验通过' },
        { key: 'captain', name: '队长审批', approver: '待定', needSign: true, status: 'waiting', time: '—', note: '等待' },
        { key: 'counselor', name: '辅导员审批', approver: '待定', needSign: true, status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: stamp()
    }, p);
    leaves.unshift(doc);
    write(K.LEAVES, leaves);
    localLog('发起请假', `${p.leaveType} · ${p.startTime}~${p.endTime}`);
    return doc;
  },

  /* ---------- 经费 ---------- */
  async submitExpense(p) {
    if (cloudOn) {
      const res = await callApi('submitExpense', { payload: p });
      await refreshMe();
      return res.expense;
    }
    localLog('经费申请', `${p.title} · ¥${p.amount}`);
    return { _id: 'exp-' + Date.now() };
  },

  /* ---------- 新闻 ---------- */
  async publishNews(p) {
    if (cloudOn) {
      const res = await callApi('publishNews', { payload: p });
      await refreshMe();
      return res.news;
    }
    const news = cache.news;
    const doc = Object.assign({
      _id: 'news-' + Date.now(), applicantName: '李雨桐',
      status: 'approving', topped: false, visible: !p.publishAt, createdAt: stamp(), ts: Date.now(),
      nodes: [
        { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: stamp().slice(5, 16), note: '通过' },
        { key: 'admin', name: '管理员审核', approver: '待定', status: 'waiting', time: '—', note: '等待' }
      ]
    }, p);
    news.unshift(doc);
    write(K.NEWS, news);
    localLog('提交新闻', p.title);
    return doc;
  },

  /* ---------- 培训 ---------- */
  async publishTraining(p) {
    if (cloudOn) {
      await callApi('publishTraining', { payload: p });
      const t = await getApp().globalData.db.collection('trainings').limit(200).get();
      cache.trainings = t.data;
      return true;
    }
    const list = cache.trainings;
    list.unshift(Object.assign({ _id: 'tr-' + Date.now(), signupCount: 0, publisher: '李雨桐', createdAt: stamp() }, p));
    write(K.TRAININGS, list);
    localLog('发布培训', p.title);
    return true;
  },

  async signupTraining(trainingId) {
    if (cloudOn) {
      const res = await callApi('signupTraining', { payload: { trainingId } });
      await refreshMe();
      return res.signup;
    }
    const t = this.getTraining(trainingId);
    const signups = cache.signups;
    if (signups.some(s => s.trainingId === trainingId && s.status !== 'withdrawn')) throw new Error('你已报名该培训');
    const doc = {
      _id: 'su-' + Date.now(), type: 'training', trainingId,
      title: '培训报名 · ' + (t ? t.title : ''),
      status: 'approving', version: 1, currentNode: 1,
      nodes: [
        { key: 'system', name: '系统初审', approver: '—', status: 'pass', time: stamp().slice(5, 16), note: '通过' },
        { key: 'teacher', name: '教师审批 · ' + (t ? t.lecturer : ''), approver: t ? t.lecturer : '待定', needSign: true, status: 'waiting', time: '—', note: '等待' }
      ],
      createdAt: stamp()
    };
    signups.unshift(doc);
    write(K.SIGNUPS, signups);
    localLog('报名培训', doc.title);
    return doc;
  },

  async cancelSignup(id) {
    if (cloudOn) {
      await callApi('cancelSignup', { id });
      await refreshMe();
      return true;
    }
    const signups = cache.signups;
    const s = signups.find(x => x._id === id);
    if (s) { s.status = 'withdrawn'; write(K.SIGNUPS, signups); }
    return true;
  },

  /* ---------- 签到与积分 ---------- */
  async checkin(p) {
    if (cloudOn) {
      const res = await callApi('checkin', { payload: p });
      await refreshMe();
      return res;
    }
    const today = stamp().slice(0, 10);
    const list = cache.checkins;
    if (list.some(c => c.scene === p.scene && c.day === today)) throw new Error('今天该场景已打过卡');
    list.unshift({ _id: 'ck-' + Date.now(), scene: p.scene, sceneName: p.sceneName, points: p.points, location: p.location || '', place: p.place || '', day: today, createdAt: stamp() });
    write(K.CHECKINS, list);
    cache.points = { total: (cache.points.total || 0) + p.points, used: cache.points.used || 0 };
    write(K.POINTS, cache.points);
    localLog('签到打卡', `${p.sceneName} +${p.points} 分`);
    return { points: p.points };
  },

  async exchange(productId, address) {
    if (cloudOn) {
      await callApi('exchange', { payload: { productId, address } });
      await refreshMe();
      const prods = await getApp().globalData.db.collection('point_exchange_products').limit(200).get();
      cache.products = prods.data;
      return true;
    }
    const prod = cache.products.find(x => x._id === productId);
    if (!prod) throw new Error('商品不存在');
    if (prod.stock <= 0) throw new Error('库存不足');
    const avail = (cache.points.total || 0) - (cache.points.used || 0);
    if (avail < prod.price) throw new Error('积分不足');
    prod.stock -= 1;
    cache.points.used = (cache.points.used || 0) + prod.price;
    write(K.PRODUCTS, cache.products);
    write(K.POINTS, cache.points);
    localLog('积分兑换', `${prod.name} -${prod.price} 分`);
    return true;
  },

  /* ---------- 知识广场 ---------- */
  async publishKnowledge(p) {
    if (cloudOn) {
      await callApi('publishKnowledge', { payload: p });
      const r = await getApp().globalData.db.collection('learning_knowledge').limit(200).get();
      cache.knowledge = r.data;
      return true;
    }
    cache.knowledge.unshift(Object.assign({
      _id: 'kn-' + Date.now(), author: '李雨桐', authorRole: 'student', teamName: '白鹭队',
      likes: 0, favs: 0, commentCount: 0, topped: false, featured: false,
      createdAt: stamp(), ts: Date.now()
    }, p));
    write(K.KNOWLEDGE, cache.knowledge);
    localLog('发布知识点', p.title);
    return true;
  },

  async likeKnowledge(id) {
    if (cloudOn) { await callApi('likeKnowledge', { id }); }
    const k = (cache.knowledge || []).find(x => x._id === id);
    if (k) k.likes = (k.likes || 0) + 1;
    if (!cloudOn) write(K.KNOWLEDGE, cache.knowledge);
    return true;
  },

  async commentKnowledge(id, content) {
    if (cloudOn) {
      await callApi('commentKnowledge', { id, content });
      const r = await getApp().globalData.db.collection('knowledge_comments').limit(200).get();
      cache.comments = r.data;
      const k = (cache.knowledge || []).find(x => x._id === id);
      if (k) k.commentCount = (k.commentCount || 0) + 1;
      return true;
    }
    cache.comments.unshift({ _id: 'cm-' + Date.now(), knowledgeId: id, author: '李雨桐', content, createdAt: stamp() });
    write(K.COMMENTS, cache.comments);
    const k = (cache.knowledge || []).find(x => x._id === id);
    if (k) { k.commentCount = (k.commentCount || 0) + 1; write(K.KNOWLEDGE, cache.knowledge); }
    return true;
  },

  async topKnowledge(id, on) {
    if (cloudOn) await callApi('topKnowledge', { id, on });
    const k = (cache.knowledge || []).find(x => x._id === id);
    if (k) k.topped = on;
    if (!cloudOn) write(K.KNOWLEDGE, cache.knowledge);
    return true;
  },

  async featureKnowledge(id, on) {
    if (cloudOn) await callApi('featureKnowledge', { id, on });
    const k = (cache.knowledge || []).find(x => x._id === id);
    if (k) k.featured = on;
    if (!cloudOn) write(K.KNOWLEDGE, cache.knowledge);
    return true;
  },

  /* ---------- 队伍 ---------- */
  async createTeam(p) {
    if (cloudOn) {
      const res = await callApi('createTeam', { payload: p });
      await refreshMe();
      return res;
    }
    const team = {
      _id: 'team-' + Date.now(), name: p.name, intro: p.intro || '',
      captainName: '李雨桐', viceName: '',
      members: [{ openid: 'demo-openid-0001', name: '李雨桐', role: 'captain' }],
      applicants: [], logs: [], files: [], posts: [], points: 0, createdAt: stamp()
    };
    cache.team = team;
    write(K.TEAM, team);
    localLog('创建队伍', p.name);
    return { teamId: team._id };
  },

  async teamAct(p) {
    if (cloudOn) {
      await callApi('teamAct', p);
      await refreshMe();
      return true;
    }
    const t = cache.team;
    if (!t) throw new Error('你还没有队伍');
    if (p.op === 'addLog') t.logs.unshift({ name: '李雨桐', content: p.content, time: stamp() });
    if (p.op === 'addPost') t.posts.unshift({ name: '李雨桐', content: p.content, image: p.image || '', time: stamp() });
    if (p.op === 'addFile') t.files.unshift({ name: '李雨桐', fileName: p.fileName, folder: p.folder || '默认', time: stamp() });
    write(K.TEAM, t);
    return true;
  },

  /* ---------- 课表 ---------- */
  async saveSchedule(p) {
    if (cloudOn) {
      await callApi('saveSchedule', { payload: p });
      await refreshMe();
      return true;
    }
    const list = cache.schedules.filter(s => s.semester !== p.semester);
    list.unshift(Object.assign({ _id: 'sch-' + Date.now(), name: '李雨桐' }, p));
    cache.schedules = list;
    write(K.SCHEDULES, list);
    localLog('保存课表', `${p.semester} · ${(p.courses || []).length} 门课`);
    return true;
  },

  async freeStudents(p) {
    if (cloudOn) return callApi('freeStudents', p);
    // 演示模式：本地计算
    const free = [];
    const busy = [];
    (cache.schedules || []).forEach((sch) => {
      const occupied = (sch.courses || []).some(c =>
        Number(c.weekday) === Number(p.weekday) && (c.slots || []).some(s => (p.slots || []).indexOf(Number(s)) > -1)
      );
      (occupied ? busy : free).push({ name: sch.name, college: sch.college || '', major: sch.major || '' });
    });
    return { free, busy, total: free.length + busy.length };
  },

  /* ---------- 统计 ---------- */
  async getStats() {
    if (cloudOn) return callApi('stats');
    const regs = cache.regs || [];
    const u = cache.user || {};
    const role = u.role || 'student';
    // 教师/辅导员 也算"管理角色"（可见全院概览 + 导出自己指导范围）
    const isManager = ['admin', 'dean', 'vicedean', 'secretary', 'dept', 'teacher', 'counselor'].indexOf(role) > -1;
    return {
      my: {
        total: regs.length,
        passed: regs.filter(r => r.status === 'passed').length,
        approving: regs.filter(r => r.status === 'approving').length,
        checkins: (cache.checkins || []).length
      },
      all: {
        users: 1, regs: regs.length,
        passed: regs.filter(r => r.status === 'passed').length,
        perComp: this.getCompetitions().map(c => ({ title: c.title, count: regs.filter(r => r.compId === c._id).length }))
      },
      isManager
    };
  },

  /* ---------- 管理员 ---------- */
  async adminUsers(p) { return callApi('adminUsers', p); },
  async adminProduct(p) {
    const res = await callApi('adminProduct', p);
    const prods = await getApp().globalData.db.collection('point_exchange_products').limit(200).get();
    cache.products = prods.data;
    return res;
  },

  /* ---------- Excel 导出（云端生成真 .xlsx；演示模式按角色过滤生成 CSV 兜底） ---------- */
  async exportXlsx(kind, extra) {
    if (cloudOn) return callApi('exportXlsx', Object.assign({ kind }, extra || {}));
    const user = this.getUser() || {};
    return demoExport(kind, extra || {}, user);
  },
  async openXlsx(fileID) {
    console.log('[openXlsx] fileID=', fileID, '· USER_DATA_PATH=', wx.env && wx.env.USER_DATA_PATH);
    // CSV 兜底标记（xlsx 写失败时）
    if (fileID === '__demo_csv__') return Promise.reject(new Error('本地 Excel 文件生成失败，已回退为 CSV 预览'));
    // 演示模式：fileID 是本地绝对路径（wx.env.USER_DATA_PATH/...）
    const isLocal = fileID && (
      fileID.indexOf('user_data') > -1 ||
      fileID.indexOf('/tmp/') === 0 ||
      (wx.env && wx.env.USER_DATA_PATH && fileID.indexOf(wx.env.USER_DATA_PATH) === 0)
    );
    if (fileID && isLocal) {
      wx.showLoading({ title: '打开 Excel…', mask: true });
      try {
        // 主路径：xlsx 让 WeChat 调 Office/WPS 打开
        await wx.openDocument({ filePath: fileID, fileType: 'xlsx', showMenu: true });
        console.log('[openXlsx] openDocument 成功(fileType=xlsx):', fileID);
        return Promise.resolve();
      } catch (e1) {
        // 备选 1：去掉 fileType，让 WeChat 自动识别
        try {
          await wx.openDocument({ filePath: fileID, showMenu: true });
          console.log('[openXlsx] openDocument 成功(无 fileType):', fileID);
          return Promise.resolve();
        } catch (e2) {
          wx.hideLoading();
          console.error('[openXlsx] openDocument 失败:', e1, '|', e2);
          return Promise.reject(new Error(
            'WeChat 无法打开本地 xlsx：' +
            (e1.errMsg || e1.message || e1) +
            ' / ' + (e2.errMsg || e2.message || e2)
          ));
        }
      }
    }
    // 云端：常规下载并打开
    if (fileID === '__demo__') return Promise.resolve();
    wx.showLoading({ title: '打开文件…', mask: true });
    try {
      const f = await wx.cloud.downloadFile({ fileID });
      await wx.openDocument({ filePath: f.tempFilePath, fileType: 'xlsx', showMenu: true });
    } finally {
      wx.hideLoading();
    }
  },

  /* ---------- 重置 ---------- */
  async resetDemo() {
    Object.keys(K).forEach((k) => { try { wx.removeStorageSync(K[k]); } catch (e) {} });
    try { wx.removeStorageSync('js_favs'); } catch (e) {}
    cache = {};
    readyPromise = null;
    await ready();
  }
};

/* ================= 演示模式导出兜底（生成 CSV 字符串，按角色过滤） =================
   - 云函数未部署时返回 { __demo:true, csv, fileName, rowCount, scope }
   - 教学岗（teacher/counselor）的 *_regs / *_advisees 自动用 user.name 当 teacherName 过滤
   - 学生端一般走不到这里（已被 ALLOWED_ROLES 闸门拦截）
*/
const CERTS_KEY = 'certs_pub'; // 预留：与导出页契约保持一致的字段名（暂未使用）

function toCsv(rows) {
  if (!rows || !rows.length) return '';
  const header = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/\r?\n/g, ' ');
    return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [header.join(',')];
  rows.forEach((r) => lines.push(header.map((h) => esc(r[h])).join(',')));
  return lines.join('\n');
}

function statusTxt(s) {
  return ({ approving: '审批中', passed: '已通过', rejected: '已驳回', withdrawn: '已撤回' })[s] || s || '';
}

function teacherScope(user) {
  return ['teacher', 'counselor'].indexOf(user && user.role) > -1;
}

function demoExport(kind, extra, user) {
  const dateTag = stamp().slice(0, 10);
  const me = (user && user.name) || '';
  let title = '';
  let rows = [];
  let scope = '本院全量';

  if (kind === 'regs' || kind === 'oneCompRegs' || kind === 'myAdvisees') {
    let regs = cache.regs || read(K.REGS, seedRegs);
    if (extra.compId) regs = regs.filter((r) => r.compId === extra.compId);
    if (extra.status) regs = regs.filter((r) => r.status === extra.status);
    if (kind === 'myAdvisees') {
      const tn = extra.teacherName || me;
      regs = regs.filter((r) => r.teacherName === tn);
      scope = teacherScope(user) ? ('本人指导范围（' + me + '）') : ('教师【' + tn + '】指导范围');
    } else if (teacherScope(user)) {
      regs = regs.filter((r) => r.teacherName === me);
      scope = '本人指导范围（' + me + '）';
    }
    regs.forEach((r) => rows.push({
      报名单号: r.regNo || '',
      竞赛: r.compTitle || '',
      形式: r.mode === 'solo' ? '个人' : '组队',
      队名: r.teamName || '—',
      申请人: r.applicantName || '',
      指导教师: r.teacherName || '—',
      状态: statusTxt(r.status),
      提交时间: (r.createdAt || '').slice(0, 16)
    }));
    title = kind === 'myAdvisees' ? '指导学生列表' : '报名名单';
    if (teacherScope(user)) title = '[本人指导范围]' + title;
  } else if (kind === 'studentAwards') {
    let certs = read(K.CERTS, seedCertificates);
    if (extra.award) certs = certs.filter((c) => c.award === extra.award);
    if (teacherScope(user)) certs = certs.filter((c) => (c.advisor || '') === me);
    certs.forEach((c) => rows.push({
      学生: c.student || '',
      学院: c.college || '',
      竞赛: c.comp || '',
      奖项: c.award || '',
      等级: c.level || '',
      指导教师: c.advisor || '',
      授予时间: (c.time || '').slice(0, 10)
    }));
    title = '学生获奖名单';
    if (teacherScope(user)) title = '[本人指导范围]' + title;
  } else if (kind === 'trainingSignups') {
    const signups = cache.signups || read(K.SIGNUPS, seedSignups);
    const trainings = api.getTrainings();
    const tid = extra.trainingId;
    const filtered = tid ? signups.filter((s) => s.trainingId === tid) : signups;
    filtered.forEach((s) => {
      const t = trainings.find((x) => x._id === s.trainingId) || {};
      rows.push({
        学员: s.name || '',
        培训主题: t.title || '',
        时间: (t.startTime || '').slice(0, 16),
        状态: s.status || ''
      });
    });
    title = '培训报名记录';
  } else if (kind === 'free') {
    const weekday = Number(extra.weekday) || 1;
    const slots = extra.slots || [];
    const semester = extra.semester || '';
    const schedules = cache.schedules || read(K.SCHEDULES, seedSchedules);
    const filtered = semester ? schedules.filter((s) => s.semester === semester) : schedules;
    filtered.forEach((sch) => {
      const occ = (sch.courses || []).some((c) =>
        Number(c.weekday) === weekday && (c.slots || []).some((sl) => slots.indexOf(Number(sl)) > -1));
      if (!occ) {
        rows.push({ 姓名: sch.name || '', 学院: sch.college || '', 专业: sch.major || '', 学期: sch.semester || '' });
      }
    });
    title = '空闲学生_周' + weekday;
  } else if (kind === 'expenses') {
    const list = cache.expenses || read(K.EXPENSES, seedExpenses);
    const f = extra.status ? list.filter((x) => x.status === extra.status) : list;
    f.forEach((e) => rows.push({
      申请人: e.applicantName || '', 事项: e.title || '', 金额: e.amount || 0,
      用途: e.purpose || '', 状态: statusTxt(e.status), 时间: (e.createdAt || '').slice(0, 16)
    }));
    title = '经费台账';
  } else if (kind === 'schedules') {
    const list = cache.schedules || read(K.SCHEDULES, seedSchedules);
    const sem = extra.semester;
    const f = sem ? list.filter((s) => s.semester === sem) : list;
    f.forEach((s) => (s.courses || []).forEach((c) => rows.push({
      姓名: s.name || '', 学院: s.college || '', 学期: s.semester || '',
      课程: c.name || c.course || '', 星期: c.weekday || '',
      节次: (c.slots || []).join(','), 地点: c.place || ''
    })));
    title = '课表明细' + (sem ? '_' + sem : '');
  } else {
    return Promise.reject(new Error('未知导出类型: ' + kind));
  }

  if (!rows.length) {
    rows.push({ 提示: '演示模式暂无该类数据（请部署云函数后查看全院真实数据）' });
    scope = scope + ' · 当前无数据';
  }

  const csv = toCsv(rows);
  const fileNameXlsx = title + '_' + dateTag + '.xlsx';
  // 同步写一份真 .xlsx 到本地，让 wx.openDocument 直接打开（演示模式也能看表格）
  let xlsxPath = '';
  let xlsxErr = '';
  try {
    const headerRow = rows.length ? Object.keys(rows[0]) : ['提示'];
    const dataRows = rows.map((r) => headerRow.map((k) => r[k]));
    const sheetData = [headerRow].concat(dataRows);
    const bytes = packXlsx(title, sheetData);
    const w = _writeDemoXlsx(fileNameXlsx, bytes);
    xlsxPath = w.path;
    xlsxErr = w.err;
    if (w.path) {
      console.log('[demoExport] xlsx 已写入:', w.path, '· 字节:', bytes.length);
    } else {
      console.warn('[demoExport] xlsx 写盘失败:', w.err);
    }
  } catch (e) {
    xlsxPath = '';
    xlsxErr = (e && (e.message || e.errMsg)) || String(e);
    console.error('[demoExport] 打包失败:', xlsxErr);
  }
  localLog('导出Excel(演示)', fileNameXlsx + ' · ' + rows.length + ' 行 · ' + scope + (xlsxErr ? ' · xlsx失败:' + xlsxErr.slice(0, 60) : ''));
  return Promise.resolve({
    __demo: true,
    fileID: xlsxPath || '__demo_csv__',
    fileName: fileNameXlsx,
    xlsxErr,
    csv,
    rowCount: rows.length,
    scope,
    headers: rows.length ? Object.keys(rows[0]) : []
  });
}

/* ---------- 写 xlsx 到本地：多路径兜底 + statSync 校验（开发者工具 / iOS / Android 三端兼容） ---------- */
function _writeDemoXlsx(fileName, bytes) {
  const fm = wx.getFileSystemManager();
  const ud = wx.env && wx.env.USER_DATA_PATH;
  const list = [];
  if (ud) {
    list.push(ud.replace(/\/+$/, '') + '/' + fileName);          // USER_DATA_PATH/xxx.xlsx
    list.push(ud.replace(/\/+$/, '') + '/tmp/' + fileName);      // USER_DATA_PATH/tmp/xxx.xlsx
  }
  list.push('/tmp/' + fileName);                                  // 兜底：客户端 tmp
  const errs = [];
  for (const p of list) {
    try {
      const dir = p.substring(0, p.lastIndexOf('/'));
      try { fm.mkdirSync(dir, true); } catch (e) {}              // 目录不存在就建
      try { fm.unlinkSync(p); } catch (e) {}                      // 已存在就先删
      fm.writeFileSync(p, _b64encode(bytes), 'base64');          // base64 字符串最稳
      const st = fm.statSync(p);                                 // 立即 stat 校验
      if (st && st.size >= bytes.length - 32) return { path: p, err: '' };
      errs.push(p + ' => 写完为空(stat=' + (st ? st.size : 'null') + ')');
    } catch (e) {
      errs.push(p + ' => ' + ((e && (e.message || e.errMsg)) || String(e)));
    }
  }
  return { path: '', err: errs.join(' || ') };
}

/* ================= 极简 xlsx 写入器（无依赖、单 sheet、inline string） =================
   原理：OOXML 的 .xlsx 是个 zip，里面放 5 个 UTF-8 XML 文件
     [Content_Types].xml  _rels/.rels  xl/workbook.xml  xl/_rels/workbook.xml.rels  xl/worksheets/sheet1.xml
   全部用 STORE（不压缩）+ 手写 CRC32，避免任何外部依赖。
   严格只支持：text string / finite number，其它都转字符串。
*/
const _CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = _CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function _utf8(s) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let c = s.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
    else if (c < 0xD800 || c >= 0xE000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
    else { i++; c = 0x10000 + (((c & 0x3FF) << 10) | (s.charCodeAt(i) & 0x3FF));
      out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)); }
  }
  return new Uint8Array(out);
}
function _colLetter(idx) {
  let s = '';
  for (let i = idx; i >= 0; i = Math.floor(i / 26) - 1) s = String.fromCharCode(65 + (i % 26)) + s;
  return s;
}
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* ---------- base64 编码（手写、无依赖、用于 wx.writeFileSync 写二进制） ---------- */
const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function _b64encode(u8) {
  let out = '';
  for (let i = 0; i < u8.length; i += 3) {
    const b1 = u8[i], b2 = i + 1 < u8.length ? u8[i + 1] : 0, b3 = i + 2 < u8.length ? u8[i + 2] : 0;
    out += _B64[b1 >> 2];
    out += _B64[((b1 & 0x3) << 4) | (b2 >> 4)];
    out += i + 1 < u8.length ? _B64[((b2 & 0xF) << 2) | (b3 >> 6)] : '=';
    out += i + 2 < u8.length ? _B64[b3 & 0x3F] : '=';
  }
  return out;
}
function _sheetXml(rows) {
  const out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'];
  rows.forEach((row, ri) => {
    out.push('<row r="' + (ri + 1) + '">');
    row.forEach((cell, ci) => {
      const ref = _colLetter(ci) + (ri + 1);
      if (typeof cell === 'number' && isFinite(cell)) {
        out.push('<c r="' + ref + '"><v>' + cell + '</v></c>');
      } else {
        out.push('<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + _esc(cell) + '</t></is></c>');
      }
    });
    out.push('</row>');
  });
  out.push('</sheetData></worksheet>');
  return _utf8(out.join(''));
}
function _workbookXml(name) {
  return _utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheets><sheet name="' + _esc(name) + '" sheetId="1" r:id="rId1"/></sheets></workbook>');
}
function packXlsx(sheetName, rows) {
  const sheet = _sheetXml(rows);
  const wb = _workbookXml(sheetName);
  const wbRels = _utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
    + '</Relationships>');
  const rootRels = _utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>');
  const contentTypes = _utf8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '</Types>');

  const files = [
    { path: '[Content_Types].xml', data: contentTypes },
    { path: '_rels/.rels', data: rootRels },
    { path: 'xl/workbook.xml', data: wb },
    { path: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { path: 'xl/worksheets/sheet1.xml', data: sheet }
  ];

  const parts = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const name = _utf8(f.path);
    const crc = crc32(f.data);
    const size = f.data.length;
    const lfh = new Uint8Array(30 + name.length);
    const dv = new DataView(lfh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0, true);
    dv.setUint16(8, 0, true);  // STORE
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, name.length, true);
    dv.setUint16(28, 0, true);
    lfh.set(name, 30);
    parts.push(lfh, f.data);

    const cd = new Uint8Array(46 + name.length);
    const dv2 = new DataView(cd.buffer);
    dv2.setUint32(0, 0x02014b50, true);
    dv2.setUint16(4, 20, true);
    dv2.setUint16(6, 20, true);
    dv2.setUint16(8, 0, true);
    dv2.setUint16(10, 0, true);
    dv2.setUint16(12, 0, true);
    dv2.setUint16(14, 0, true);
    dv2.setUint32(16, crc, true);
    dv2.setUint32(20, size, true);
    dv2.setUint32(24, size, true);
    dv2.setUint16(28, name.length, true);
    dv2.setUint16(30, 0, true);
    dv2.setUint16(32, 0, true);
    dv2.setUint16(34, 0, true);
    dv2.setUint16(36, 0, true);
    dv2.setUint32(38, 0, true);
    dv2.setUint32(42, offset, true);
    cd.set(name, 46);
    central.push(cd);
    offset += lfh.length + f.data.length;
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const dv3 = new DataView(eocd.buffer);
  dv3.setUint32(0, 0x06054b50, true);
  dv3.setUint16(4, 0, true);
  dv3.setUint16(6, 0, true);
  dv3.setUint16(8, files.length, true);
  dv3.setUint16(10, files.length, true);
  dv3.setUint32(12, centralSize, true);
  dv3.setUint32(16, offset, true);
  dv3.setUint16(20, 0, true);

  let total = 22 + centralSize;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const piece of parts) { out.set(piece, p); p += piece.length; }
  for (const c of central) { out.set(c, p); p += c.length; }
  out.set(eocd, p);
  return out;
}

module.exports = api;
