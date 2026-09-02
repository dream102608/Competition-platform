// pages/settings/settings.js —— S9 账号设置（档案室版式 · V1.3 服务通知订阅 · V1.6 服务端状态）
const app = getApp();
const data = require('../../utils/data');
const api = require('../../utils/api');

// 演示用模板 ID：正式环境请在「小程序后台 → 订阅消息」申请并替换
const DEMO_TMPL_IDS = ['JINGSAI-DEMO-APPROVAL', 'JINGSAI-DEMO-URGE'];

Page({
  data: {
    sbh: 24,
    name: '',
    tagline: '',
    prefs: { approval: true, urge: true, notice: true, subscribe: false },
    server: { status: 'checking', label: '检测中…', version: '—', counts: null }, // V1.6：服务端状态
    version: 'V1.6.0'
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },

  onShow() {
    const user = app.globalData.user || data.mockUser();
    this.setData({
      name: user.name || '',
      tagline: user.tagline || '',
      prefs: data.getPrefs()
    });
    this.pingServer();
  },

  /* V1.6：服务端健康检查（远程优先；离线不打断任何本地功能） */
  pingServer() {
    this.setData({ server: { status: 'checking', label: '检测中…', version: '—', counts: null } });
    api.health().then((h) => {
      this.setData({
        server: {
          status: 'online', label: '服务端在线',
          version: h.version || '—',
          counts: h.counts || null
        }
      });
    }).catch(() => {
      this.setData({
        server: {
          status: 'offline', label: '离线 · 本地演示模式',
          version: '—', counts: null
        }
      });
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

  /* V1.3：微信服务通知（订阅消息）——开启时请求授权；未配置模板 ID 则诚实降级站内信 */
  onSubscribe(e) {
    const on = e.detail.value;
    const prefs = this.data.prefs;
    prefs.subscribe = on;
    this.setData({ prefs });
    data.savePrefs(prefs);
    if (!on) return;
    if (typeof wx.requestSubscribeMessage !== 'function') {
      wx.showToast({ title: '当前基础库不支持订阅消息', icon: 'none' });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: DEMO_TMPL_IDS,
      success: () => wx.showToast({ title: '已订阅服务通知', icon: 'success' }),
      fail: () => wx.showToast({
        title: '演示环境未配置模板 ID，审批先走站内信',
        icon: 'none'
      })
    });
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
