// pages/home/home.js —— S2 首页（组织切换 + 数据概览 + 新闻 + 快捷入口）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');
const AW = require('../../utils/awarddata').AWARDS; // 学院真实竞赛数据（2026上半年 197 项获奖）

Page({
  data: {
    sbh: 24,
    dateText: '',
    issue: '',
    majors: CFG.MAJORS,
    majorIdx: 0,
    overview: { total: 0, approving: 0, passed: 0, todo: 0 },
    newsList: [],
    hotComps: [],
    regs: [],
    // 荣誉墙：学院 2026 上半年国家级获奖真实数据
    honors: AW.national.slice(0, 7).map(n => ({
      title: n.comp, award: n.award + ' · ' + n.names, year: '2026', grade: 'gold', medal: '金'
    })),
    certs: [],
    watchStats: { videoCount: 0, totalViews: 0, watchedCount: 0 },
    // 顶部大轮播：4 张运营位 banner（参考图风格）
    banners: [
      { key: 'watchtower', cls: 'ink',   kicker: '科创瞭望台', title: '宣 传 片 · 视 频 课 堂', sub: '管理员发布 · 师生共学',     url: '/pages/watchtower/watchtower' },
      { key: 'news',       cls: 'warm',  kicker: '学院新闻',   title: '最 新 头 条  ·  赛 事 动 态', sub: '每日更新 · 置顶优先',  url: '/pages/news/news' },
      { key: 'hall',       cls: 'green', kicker: '竞赛大厅',   title: '学 科 赛 事  ·  招 募 中',   sub: '报名截止提醒',         url: '/pages/hall/hall' },
      { key: 'honor',      cls: 'blue',  kicker: '荣誉墙',     title: '2026 上 半 年  197 项 获 奖', sub: '国家级 · 省部级',      url: '/pages/board/board' }
    ],
    kw: '',
    quicks: [
      { name: '学生竞赛', icon: '竞', url: '/pages/hall/hall?track=student', tab: true, color: '#C8442A', desc: '报名·审批' },
      { name: '教师竞赛', icon: '教', url: '/pages/hall/hall?track=teacher', tab: true, color: '#3A4F6E', desc: '教研·成果' },
      { name: '科创瞭望台', icon: '瞭', url: '/pages/watchtower/watchtower', color: '#3C6E47', desc: '视频·课堂' },
      { name: '培训中心', icon: '训', url: '/pages/training/training', color: '#8A5A2B', desc: '课程·实训' },
      { name: '知识广场', icon: '知', url: '/pages/knowledge/knowledge', tab: true, color: '#6E4A8A', desc: '博客·资料' },
      { name: '我的队伍', icon: '队', url: '/pages/team/team', tab: true, color: '#2B6E8A', desc: '组队·协作' },
      { name: '签到打卡', icon: '签', url: '/pages/checkin/checkin', color: '#A03A5C', desc: '定位·积分' },
      { name: '我的课表', icon: '课', url: '/pages/schedule/schedule', color: '#5A6E3A', desc: '导入·提醒' },
      { name: '审批中心', icon: '批', url: '/pages/approval/approval', color: '#B8722A', desc: '流程·待办' },
      { name: '数据大屏', icon: '据', url: '/pages/board/board', color: '#8A2B2B', desc: '获奖·统计' }
    ]
  },

  onLoad() {
    this.setData({ sbh: app.globalData.sbh });
  },

  onShow() {
    const d = new Date();
    const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    const onejan = new Date(d.getFullYear(), 0, 1);
    const issue = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    this.setData({
      dateText: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 星期${week}`,
      issue: `第 ${d.getFullYear()}-${issue} 期`
    });
    data.ready().then(() => this.refresh());
  },

  refresh() {
    const regs = data.getMyRegistrations().map(r => ({
      _id: r._id, compTitle: r.compTitle, teamName: r.teamName,
      regNo: r.regNo, version: r.version, status: r.status,
      track: (r.nodes || []).map(n => n.status === 'pass')
    }));
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    // 新闻：置顶优先，最新 5 条，今日发布标记「已更新」
    const news = data.getNews()
      .filter(n => n.status === 'passed')
      .slice()
      .sort((a, b) => (b.topped ? 1 : 0) - (a.topped ? 1 : 0) || (b.ts || 0) - (a.ts || 0))
      .slice(0, 5)
      .map(n => Object.assign({}, n, { isToday: (n.createdAt || '').indexOf(todayStr) === 0 }));
    const comps = data.getCompetitions();
    this.setData({
      regs,
      newsList: news,
      certs: data.getPubCerts ? data.getPubCerts().slice(0, 6) : [],
      hotComps: comps.filter(c => !c.closed && c.track === 'student').slice(0, 3),
      watchStats: data.getWatchStats ? data.getWatchStats() : { videoCount: 0, totalViews: 0, watchedCount: 0 },
      overview: {
        total: regs.length,
        approving: regs.filter(r => r.status === 'approving').length,
        passed: regs.filter(r => r.status === 'passed').length,
        todo: data.getTodoItems().length
      }
    });
  },

  switchMajor(e) { this.setData({ majorIdx: Number(e.detail.value) }); },

  goQuick(e) {
    const item = this.data.quicks[e.currentTarget.dataset.i];
    if (item.tab) {
      // tab 页带参数用全局变量传递
      if (item.url.indexOf('track=') > -1) {
        app.globalData.hallTrack = item.url.split('track=')[1];
      }
      wx.switchTab({ url: item.url.split('?')[0] });
    } else {
      wx.navigateTo({ url: item.url });
    }
  },

  goHall() { wx.switchTab({ url: '/pages/hall/hall' }); },
  goWatchtower() { wx.navigateTo({ url: '/pages/watchtower/watchtower' }); },
  goApproval() { wx.navigateTo({ url: '/pages/approval/approval' }); },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id }); },
  goNews() { wx.navigateTo({ url: '/pages/news/news' }); },

  onKw(e) { this.setData({ kw: e.detail.value }); },
  goSearch() {
    // 关键词回传：写入全局，跳到竞赛大厅并预填
    app.globalData.hallKeyword = this.data.kw || '';
    wx.switchTab({ url: '/pages/hall/hall' });
  },
  goBanner(e) {
    const item = this.data.banners[e.currentTarget.dataset.idx];
    if (!item) return;
    const url = item.url;
    if (url.indexOf('/pages/home/') === 0) { wx.switchTab({ url }); return; }
    if (url === '/pages/hall/hall' || url === '/pages/knowledge/knowledge' ||
        url === '/pages/team/team' || url === '/pages/profile/profile') {
      wx.switchTab({ url });
    } else {
      wx.navigateTo({ url });
    }
  }
});
