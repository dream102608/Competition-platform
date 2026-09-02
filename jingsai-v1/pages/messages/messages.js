// pages/messages/messages.js —— S8 消息与催办中心（来函版式）
const app = getApp();
const data = require('../../utils/data');

const TYPE_META = {
  notice:  { label: '公告', cls: 't-notice' },
  approval:{ label: '审批', cls: 't-approval' },
  urge:    { label: '催办', cls: 't-urge' }
};

Page({
  data: {
    sbh: 24,
    msgs: [],
    unread: 0
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { this.refresh(); },

  refresh() {
    const prefs = data.getPrefs();
    const all = data.getMessages();
    // 按通知偏好过滤（设置页可关闭某类通知）
    const visible = all.filter(m =>
      (m.type === 'approval' && prefs.approval) ||
      (m.type === 'urge' && prefs.urge) ||
      (m.type === 'notice' && prefs.notice));
    const msgs = visible.map(m => Object.assign({}, m, {
      label: TYPE_META[m.type].label,
      cls: TYPE_META[m.type].cls
    }));
    this.setData({ msgs, unread: visible.filter(m => !m.read).length });
  },

  markAll() {
    data.markAllRead();
    this.refresh();
    wx.showToast({ title: '全部已读', icon: 'none' });
  },

  open(e) {
    const { id, regid } = e.currentTarget.dataset;
    // 标为已读
    const msgs = data.getMessages().map(m =>
      m._id === id ? Object.assign({}, m, { read: true }) : m);
    wx.setStorageSync(data.K.MSGS, msgs);
    this.refresh();
    // 关联报名单 → 跳审批页展开
    if (regid) {
      app.globalData.currentReg = { _id: regid };
      wx.switchTab({ url: '/pages/approval/approval' });
    }
  },

  goHome() { wx.switchTab({ url: '/pages/home/home' }); }
});
