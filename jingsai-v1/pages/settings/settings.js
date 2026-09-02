// pages/settings/settings.js —— S9 账号设置（档案室版式）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    name: '',
    tagline: '',
    prefs: { approval: true, urge: true, notice: true },
    version: 'V1.1.0'
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },

  onShow() {
    const user = app.globalData.user || data.mockUser();
    this.setData({
      name: user.name || '',
      tagline: user.tagline || '',
      prefs: data.getPrefs()
    });
  },

  onName(e) { this.setData({ name: e.detail.value }); },
  onTagline(e) { this.setData({ tagline: e.detail.value }); },

  saveProfile() {
    const user = app.globalData.user || data.mockUser();
    const name = (this.data.name || '').trim();
    if (!name) { wx.showToast({ title: '昵称不能为空', icon: 'none' }); return; }
    user.name = name;
    user.tagline = this.data.tagline.trim();
    app.globalData.user = user;
    data.saveUser(user);
    wx.showToast({ title: '档案已更新', icon: 'success' });
  },

  toggle(e) {
    const key = e.currentTarget.dataset.key;
    const prefs = this.data.prefs;
    prefs[key] = !prefs[key];
    this.setData({ prefs });
    data.savePrefs(prefs);
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清空消息、操作记录与收藏，不影响报名数据。',
      confirmText: '清除',
      confirmColor: '#C8442A',
      success: (res) => {
        if (!res.confirm) return;
        data.clearCache();
        wx.showToast({ title: '缓存已清除', icon: 'none' });
      }
    });
  }
});
