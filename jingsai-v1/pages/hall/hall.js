// pages/hall/hall.js —— S3 竞赛大厅（分类广告版式）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    track: 'subject',        // subject | innov
    trackTabs: [
      { key: 'subject', name: '学科竞赛' },
      { key: 'innov', name: '创新创业' }
    ],
    keyword: '',
    filter: '全部',
    filters: ['全部', '可报名', '国家级', '已截止'],
    promo: null,
    comps: []
  },

  onLoad() {
    this.setData({ sbh: app.globalData.sbh });
  },

  onShow() { this.refresh(); },

  refresh() {
    const all = data.getCompetitions().filter(c => c.track === this.data.track);
    const promo = all.find(c => !c.closed && c.level === 'A');
    let list = all.filter(c => c._id !== (promo && promo._id));
    // 筛选
    const f = this.data.filter;
    if (f === '可报名') list = list.filter(c => !c.closed);
    if (f === '国家级') list = list.filter(c => c.level === 'A');
    if (f === '已截止') list = list.filter(c => c.closed);
    // 搜索
    const kw = this.data.keyword.trim();
    if (kw) {
      const k = kw.toLowerCase();
      list = all.filter(c =>
        (c.title || '').toLowerCase().indexOf(k) > -1 ||
        (c.no || '').toLowerCase().indexOf(k) > -1 ||
        (c.org || '').toLowerCase().indexOf(k) > -1
      );
      this.setData({ promo: null, comps: list });
      return;
    }
    this.setData({ promo: promo || null, comps: list });
  },

  switchTrack(e) {
    this.setData({ track: e.currentTarget.dataset.key });
    this.refresh();
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }); this.refresh(); },
  setFilter(e) { this.setData({ filter: e.currentTarget.dataset.f }); this.refresh(); },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  }
});
