// pages/training/training.js —— S11 培训中心（列表/报名/发布/签到）
const app = getApp();
const data = require('../../utils/data');

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    tab: 'all',
    tabs: [
      { key: 'all', name: '全部' },
      { key: 'doing', name: '进行中' },
      { key: 'done', name: '已结束' },
      { key: 'mine', name: '我的报名' }
    ],
    list: [],
    mySignupIds: [],
    canPublish: false,
    // 详情
    detailShow: false, detail: null,
    // 发布
    pubShow: false,
    pub: { title: '', lecturer: '', mode: '线下', startTime: '', endTime: '', place: '', intro: '' }
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const user = data.getUser() || app.globalData.user || {};
    const now = Date.now();
    const all = data.getTrainings().map(t => {
      const end = new Date((t.endTime || '').replace(/-/g, '/')).getTime();
      const start = new Date((t.startTime || '').replace(/-/g, '/')).getTime();
      return Object.assign({}, t, {
        state: end && end < now ? 'done' : (start && start > now ? 'todo' : 'doing'),
        stateText: end && end < now ? '已结束' : (start && start > now ? '未开始' : '进行中')
      });
    });
    const mine = data.getMySignups().filter(s => s.status !== 'withdrawn');
    let list = all;
    if (this.data.tab === 'doing') list = all.filter(t => t.state === 'doing');
    if (this.data.tab === 'done') list = all.filter(t => t.state === 'done');
    if (this.data.tab === 'mine') list = all.filter(t => mine.some(m => m.trainingId === t._id));
    this.setData({
      list,
      mySignupIds: mine.map(m => m.trainingId),
      canPublish: ['teacher', 'counselor', 'secretary', 'admin'].indexOf(user.role) > -1
    });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.k }); this.refresh(); },

  openDetail(e) {
    const t = this.data.list.find(x => x._id === e.currentTarget.dataset.id);
    this.setData({ detailShow: true, detail: t });
  },
  closeDetail() { this.setData({ detailShow: false }); },

  signup(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '报名确认',
      content: '培训报名需教师审批（手签字），确认报名？',
      confirmText: '报名',
      success: (res) => {
        if (!res.confirm) return;
        data.signupTraining(id).then(() => {
          this.setData({ detailShow: false });
          this.refresh();
          wx.showToast({ title: '已报名，待教师审批', icon: 'none', duration: 2000 });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  },

  cancel(e) {
    const tid = e.currentTarget.dataset.id;
    const mine = data.getMySignups().find(s => s.trainingId === tid && s.status !== 'withdrawn');
    if (!mine) return;
    data.cancelSignup(mine._id).then(() => {
      this.refresh();
      wx.showToast({ title: '已取消报名', icon: 'none' });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  goCheckin() { wx.navigateTo({ url: '/pages/checkin/checkin?scene=training' }); },

  /* ---- 教师发布培训 ---- */
  openPub() {
    if (!this.data.canPublish) { wx.showToast({ title: '只有教师/辅导员/负责人可以发布', icon: 'none' }); return; }
    this.setData({ pubShow: true });
  },
  closePub() { this.setData({ pubShow: false }); },
  onPubField(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ ['pub.' + k]: e.detail.value });
  },
  onPubDate(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ ['pub.' + k]: e.detail.value + ' 19:00' });
  },
  submitPub() {
    const p = this.data.pub;
    if (!p.title.trim() || !p.startTime) { wx.showToast({ title: '标题和开始时间必填', icon: 'none' }); return; }
    wx.showLoading({ title: '发布中…', mask: true });
    data.publishTraining(p).then(() => {
      wx.hideLoading();
      this.setData({ pubShow: false, pub: { title: '', lecturer: '', mode: '线下', startTime: '', endTime: '', place: '', intro: '' } });
      this.refresh();
      wx.showToast({ title: '培训已发布', icon: 'success' });
    }).catch((err) => { wx.hideLoading(); wx.showToast({ title: err.message, icon: 'none' }); });
  }
});
