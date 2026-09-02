// pages/detail/detail.js —— S4 竞赛详情（档案袋版式）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    comp: null,
    fav: false,
    chainName: ''
  },

  onLoad(options) {
    const comp = data.getCompetition(options.id);
    if (!comp) {
      wx.showToast({ title: '赛项不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 600);
      return;
    }
    const favs = wx.getStorageSync('js_favs') || [];
    this.setData({
      sbh: app.globalData.sbh,
      comp,
      fav: favs.indexOf(comp._id) > -1,
      chainName: data.CHAIN_NAMES[comp.level]
    });
  },

  toggleFav() {
    const favs = wx.getStorageSync('js_favs') || [];
    const i = favs.indexOf(this.data.comp._id);
    if (i > -1) favs.splice(i, 1); else favs.push(this.data.comp._id);
    wx.setStorageSync('js_favs', favs);
    this.setData({ fav: !this.data.fav });
    wx.showToast({ title: this.data.fav ? '已收藏' : '已取消', icon: 'none', duration: 600 });
  },

  apply() {
    const c = this.data.comp;
    if (c.closed) {
      wx.showModal({
        title: '已截止',
        content: '该赛项报名通道已关闭，去大厅看看别的赛事吧。',
        showCancel: false,
        confirmText: '去大厅'
      });
      return;
    }
    // 已有在途报名则提示
    const dup = data.getMyRegistrations().find(r => r.compId === c._id && r.status !== 'withdrawn');
    if (dup) {
      wx.showModal({
        title: '已有报名',
        content: `该赛项已有报名单（${dup.teamName}队 · v${dup.version}），是否前往查看进度？`,
        confirmText: '查看进度',
        cancelText: '仍要重报',
        success: (res) => {
          if (res.confirm) {
            app.globalData.currentReg = dup;
            wx.switchTab({ url: '/pages/approval/approval' });
          } else {
            wx.navigateTo({ url: '/pages/form/form?id=' + c._id });
          }
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/form/form?id=' + c._id });
  },

  back() { wx.navigateBack(); }
});
