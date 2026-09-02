// server/lib/bootstrap.js —— 首次启动播种：从客户端 utils/data.js 抽取种子数据
// 保证服务端集合与小程序内置种子逐字一致（报名单含 V1.3 封链），后续版本改种子
// 只需删 server/data/db.json 重启即可重播。
'use strict';

const CLIENT_PATH = require('path').join(__dirname, '..', '..', 'utils', 'data.js');
const clone = (v) => JSON.parse(JSON.stringify(v));

/** 以内存 wx mock 方式加载客户端数据层，导出全部静态种子（无副作用） */
function seedFromClient() {
  const store = {};
  const wxMock = {
    getStorageSync: (k) => (k in store ? store[k] : ''),
    setStorageSync: (k, v) => { store[k] = v; },
    removeStorageSync: (k) => { delete store[k]; },
    cloud: undefined,
    env: { USER_DATA_PATH: '/tmp' },
    getFileSystemManager: () => ({ copyFile: () => {}, readFile: () => {}, writeFile: () => {} })
  };
  const prevWx = global.wx;
  const prevGetApp = global.getApp;
  global.wx = wxMock;
  global.getApp = () => ({ globalData: {} });
  try {
    const d = require(CLIENT_PATH);
    return {
      competitions: clone(d.getCompetitions()),
      teachers: clone(d.getTeachers()),
      registrations: clone(d.getMyRegistrations()), // 种子已含 prevHash/hash 封链
      messages: clone(d.getMessages()),
      plazaPosts: clone(d.getPlazaPosts()),         // 已发布经验帖（status: published）
      winnerGroups: clone(d.getWinnerGroups()),
      templates: clone(d.getTemplates())
    };
  } finally {
    global.wx = prevWx;
    global.getApp = prevGetApp;
  }
}

/** 构造全新空库（静态种子 + 空运行时集合） */
function emptyDb() {
  const s = seedFromClient();
  return {
    seededAt: new Date().toISOString(),
    version: '1',
    competitions: s.competitions,
    teachers: s.teachers,
    registrations: s.registrations,
    messages: s.messages,
    plazaPosts: s.plazaPosts,       // 广场已发布内容（只增不改）
    winnerGroups: s.winnerGroups,   // 获奖名单（只读）
    templates: s.templates,         // 模板库（只读）
    posts: [],                      // 用户投稿审核流（status: pending/published/rejected/withdrawn）
    plaza: {},                      // 点赞/收藏状态 { [openid]: { liked:[], faved:[] } }
    prefs: {},                      // 服务端通知偏好（后续接入）
    logs: []
  };
}

module.exports = { emptyDb, seedFromClient };
