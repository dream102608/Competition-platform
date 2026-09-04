// pages/hall/hall.js —— S3 竞赛大厅（学生/教师双赛道 + 分类筛选 + 搜索）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  data: {
    sbh: 24,
    track: 'student',        // student | teacher
    trackTabs: [
      { key: 'student', name: '学生竞赛' },
      { key: 'teacher', name: '教师竞赛' }
    ],
    keyword: '',
    filter: '全部',
    filters: [],
    comps: [],
    todayStr: ''
  },

  onLoad() {
    const t = app.globalData.hallTrack;
    app.globalData.hallTrack = null;
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    this.setData({
      sbh: app.globalData.sbh,
      track: t === 'teacher' ? 'teacher' : 'student',
      todayStr: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    });
  },

  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const all = data.getCompetitions()
      .filter(c => (c.track || 'student') === this.data.track)
      .map(c => Object.assign({}, c, {
        ddlDays: this.ddl(c),
        statusText: c.closed ? '已结束' : '报名中'
      }));
    let list = all;
    const f = this.data.filter;
    if (f !== '全部') list = list.filter(c => c.category === f);
    const kw = this.data.keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(c =>
        (c.title || '').toLowerCase().indexOf(kw) > -1 ||
        (c.no || '').toLowerCase().indexOf(kw) > -1 ||
        (c.host || '').toLowerCase().indexOf(kw) > -1
      );
    }
    this.setData({
      filters: CFG.COMP_CATEGORIES[this.data.track],
      comps: list
    });
  },

  ddl(c) {
    if (c.closed) return '—';
    const end = new Date(c.deadline + 'T23:59:59');
    const diff = Math.ceil((end - Date.now()) / 86400000);
    return diff < 0 ? '已过期' : diff + ' 天';
  },

  switchTrack(e) {
    this.setData({ track: e.currentTarget.dataset.key, filter: '全部' });
    this.refresh();
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }); this.refresh(); },
  setFilter(e) { this.setData({ filter: e.currentTarget.dataset.f }); this.refresh(); },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id });
  }
});
