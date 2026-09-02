// pages/profile/profile.js —— S7 我的（档案柜版式）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    user: null,
    regs: [],
    stats: { total: 0, active: 0, awards: 0 },
    favCount: 0
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },

  onShow() {
    const user = app.globalData.user || data.mockUser();
    const regs = data.getMyRegistrations().map(r => ({
      _id: r._id, compTitle: r.compTitle, teamName: r.teamName,
      version: r.version, status: r.status, deadline: r.deadline,
      trackFlags: r.nodes.map(n => n.status === 'pass')
    }));
    const favs = wx.getStorageSync('js_favs') || [];
    this.setData({
      user,
      regs,
      favCount: favs.length,
      stats: {
        total: regs.length,
        active: regs.filter(r => r.status === 'approving').length,
        awards: 1   // 演示：历史获奖 1 项
      }
    });
  },

  goApproval(e) {
    app.globalData.currentReg = { _id: e.currentTarget.dataset.id };
    wx.switchTab({ url: '/pages/approval/approval' });
  },

  goHall() { wx.switchTab({ url: '/pages/hall/hall' }); },

  showLogs() {
    const logs = data.getLogs().slice(0, 5);
    if (!logs.length) { wx.showToast({ title: '暂无操作记录', icon: 'none' }); return; }
    wx.showModal({
      title: '操作记录',
      content: logs.map(l => `${l.time} · ${l.action} · ${l.detail}`).join('\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  },

  editName() {
    wx.showToast({ title: '档案编辑将在 V1.1 开放', icon: 'none' });
  },

  settings() { wx.showToast({ title: '账号设置将在 V1.1 开放', icon: 'none' }); },

  resetDemo() {
    wx.showModal({
      title: '重置演示数据',
      content: '将清空本地报名单、操作记录，恢复初始 3 条演示报名与 6 个竞赛。',
      confirmText: '重置',
      confirmColor: '#C8442A',
      success: (res) => {
        if (!res.confirm) return;
        data.resetDemo();
        wx.showToast({ title: '已恢复初始数据', icon: 'none' });
        setTimeout(() => { wx.reLaunch({ url: '/pages/home/home' }); }, 900);
      }
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '本地演示数据将保留，重新登录后可继续。',
      confirmText: '退出',
      success: (res) => {
        if (!res.confirm) return;
        app.logout();
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});
