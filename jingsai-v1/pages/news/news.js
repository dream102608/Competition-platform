// pages/news/news.js —— S14 新闻动态（列表 + 教师等角色发布 → 管理员审核）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    list: [],
    canPost: false,
    pubShow: false,
    newsTypes: CFG.NEWS_TYPES,
    pub: { title: '', content: '', typeIdx: 0, publishAt: '' }
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const user = data.getUser() || app.globalData.user || {};
    const list = data.getNews().slice()
      .sort((a, b) => (b.topped ? 1 : 0) - (a.topped ? 1 : 0) || (b.ts || 0) - (a.ts || 0))
      .map(n => Object.assign({}, n, {
        statusText: { approving: '审核中', passed: '已发布', rejected: '已驳回' }[n.status] || n.status
      }));
    this.setData({
      list,
      canPost: ['teacher', 'counselor', 'secretary', 'dept', 'vicedean', 'dean', 'admin'].indexOf(user.role) > -1
    });
  },

  openPub() {
    if (!this.data.canPost) { wx.showToast({ title: '当前角色不能发布新闻', icon: 'none' }); return; }
    this.setData({ pubShow: true });
  },
  closePub() { this.setData({ pubShow: false }); },
  onPubField(e) { this.setData({ ['pub.' + e.currentTarget.dataset.k]: e.detail.value }); },
  onPubType(e) { this.setData({ 'pub.typeIdx': Number(e.detail.value) }); },

  submitPub() {
    const p = this.data.pub;
    if (!p.title.trim() || !p.content.trim()) { wx.showToast({ title: '标题和内容都要填', icon: 'none' }); return; }
    wx.showLoading({ title: '提交审核…', mask: true });
    data.publishNews({
      title: p.title.trim(), content: p.content.trim(),
      newsType: CFG.NEWS_TYPES[p.typeIdx], publishAt: p.publishAt
    }).then(() => {
      wx.hideLoading();
      this.setData({ pubShow: false, pub: { title: '', content: '', typeIdx: 0, publishAt: '' } });
      this.refresh();
      wx.showModal({ title: '已提交', content: '新闻已提交管理员审核，审核通过后正式发布。', showCancel: false });
    }).catch((err) => { wx.hideLoading(); wx.showToast({ title: err.message, icon: 'none' }); });
  }
});
