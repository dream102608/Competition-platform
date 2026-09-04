// pages/team/team.js —— S9 我的队伍（队伍空间：队员/日志/资料/讨论墙）
const app = getApp();
const data = require('../../utils/data');

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    team: null,
    sub: 'members',          // members | logs | files | posts
    subTabs: [
      { key: 'members', name: '队员管理' },
      { key: 'logs',    name: '学习日志' },
      { key: 'files',   name: '资料共享' },
      { key: 'posts',   name: '讨论墙' }
    ],
    myOpenid: '',
    isCaptain: false,
    stats: { points: 0, checkins: 0, knowledge: 0 },
    // 创建队伍
    createShow: false, createName: '', createIntro: '',
    // 发布
    inputShow: false, inputText: '', inputKind: ''
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const team = data.getTeam();
    const user = data.getUser() || app.globalData.user || {};
    const myOpenid = user.openid || '';
    const isCaptain = team && (team.captainId === myOpenid || team.viceId === myOpenid || user.role === 'captain');
    this.setData({
      team,
      myOpenid,
      isCaptain: !!isCaptain,
      stats: {
        points: team ? (team.points || 0) : 0,
        checkins: data.getMyCheckins().length,
        knowledge: data.getKnowledge().filter(k => team && k.teamName === team.name).length
      }
    });
  },

  switchSub(e) { this.setData({ sub: e.currentTarget.dataset.k }); },

  /* ---- 创建队伍 ---- */
  openCreate() { this.setData({ createShow: true }); },
  closeCreate() { this.setData({ createShow: false }); },
  onCreateName(e) { this.setData({ createName: e.detail.value }); },
  onCreateIntro(e) { this.setData({ createIntro: e.detail.value }); },
  doCreate() {
    if (!this.data.createName.trim()) { wx.showToast({ title: '请填写队伍名称', icon: 'none' }); return; }
    data.createTeam({ name: this.data.createName.trim(), intro: this.data.createIntro.trim() })
      .then(() => {
        this.setData({ createShow: false });
        this.refresh();
        wx.showToast({ title: '队伍创建成功，你已成为队长', icon: 'none', duration: 2000 });
      })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /* ---- 队员管理（队长专属） ---- */
  approve(e) { this.teamOp('approve', e.currentTarget.dataset.oid); },
  rejectApply(e) { this.teamOp('rejectApply', e.currentTarget.dataset.oid); },
  removeMember(e) {
    const oid = e.currentTarget.dataset.oid;
    wx.showModal({
      title: '移除队员', content: '确认将该队员移出队伍？', confirmText: '移除', confirmColor: '#E85440',
      success: (res) => { if (res.confirm) this.teamOp('remove', oid); }
    });
  },
  setVice(e) { this.teamOp('setVice', e.currentTarget.dataset.oid, e.currentTarget.dataset.name); },
  unsetVice(e) { this.teamOp('unsetVice', e.currentTarget.dataset.oid); },

  teamOp(op, target, targetName) {
    const team = this.data.team;
    if (!team) return;
    data.teamAct({ teamId: team._id, op, target, targetName })
      .then(() => { this.refresh(); wx.showToast({ title: '已完成', icon: 'success' }); })
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /* ---- 发布（日志/讨论墙/资料） ---- */
  openInput(e) { this.setData({ inputShow: true, inputKind: e.currentTarget.dataset.kind, inputText: '' }); },
  closeInput() { this.setData({ inputShow: false }); },
  onInput(e) { this.setData({ inputText: e.detail.value }); },
  submitInput() {
    const c = (this.data.inputText || '').trim();
    if (!c) { wx.showToast({ title: '内容不能为空', icon: 'none' }); return; }
    const team = this.data.team;
    const kind = this.data.inputKind;
    const op = kind === 'logs' ? 'addLog' : kind === 'files' ? 'addFile' : 'addPost';
    const payload = { teamId: team._id, op, content: c, fileName: c };
    data.teamAct(payload).then(() => {
      this.setData({ inputShow: false });
      this.refresh();
      wx.showToast({ title: '已发布', icon: 'success' });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  goCheckin() { wx.navigateTo({ url: '/pages/checkin/checkin' }); }
});
