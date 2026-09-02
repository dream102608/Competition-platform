// pages/login/login.js —— S1 登录与角色路由
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    role: 'student',
    roles: [
      { key: 'student', name: '学生票根', desc: '报名 · 组队 · 查进度', ver: 'V1.0', on: true },
      { key: 'teacher', name: '教师票根', desc: '审批 · 带队 · 数据收集', ver: 'V1.1', on: true },
      { key: 'dept', name: '评审票根', desc: '系级 · 院级 · 校级签批', ver: 'V1.2', on: true },
      { key: 'admin', name: '管理员票根', desc: '系统配置 · 全局监控', ver: 'V3.0', on: false }
    ]
  },

  onLoad() {
    this.setData({ sbh: app.globalData.sbh });
  },

  pick(e) {
    const key = e.currentTarget.dataset.role;
    const r = this.data.roles.find(x => x.key === key);
    if (!r.on) {
      wx.showToast({ title: `该身份将在 ${r.ver} 开放`, icon: 'none' });
      return;
    }
    this.setData({ role: key });
  },

  onLogin() {
    if (this._busy) return;
    this._busy = true;
    app.login(this.data.role).then(() => {
      this._busy = false;
      wx.switchTab({ url: '/pages/home/home' });
    });
  }
});
