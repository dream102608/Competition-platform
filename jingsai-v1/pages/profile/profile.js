// pages/profile/profile.js —— S7 我的（档案柜 + 资料编辑 + 全功能入口）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    user: null,
    roleName: '',
    regs: [],
    stats: { total: 0, active: 0, points: 0 },
    favCount: 0,
    entries: [],
    certs: [],
    certShow: false,
    certForm: { compTitle: '', award: '省一等奖', year: '2026', fileName: '' },
    certAwards: CFG.CERT_AWARDS,
    editShow: false,
    majors: CFG.MAJORS,
    majorIdx: 0,
    edit: { name: '', studentId: '', major: '', phone: '', email: '' }
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },

  onShow() {
    data.ready().then(() => this.loadData());
  },

  loadData() {
    const user = app.globalData.user || data.getUser() || data.mockUser();
    const regs = data.getMyRegistrations().map(r => ({
      _id: r._id, compTitle: r.compTitle, teamName: r.teamName,
      version: r.version, status: r.status, deadline: r.deadline,
      statusText: { approving: '审批中', passed: '已通过', rejected: '已驳回', withdrawn: '已撤回' }[r.status] || r.status,
      trackFlags: (r.nodes || []).map(n => n.status === 'pass')
    }));
    const favs = wx.getStorageSync('js_favs') || [];
    const certs = wx.getStorageSync('js_certs') || [];
    const isAdmin = user.role === 'admin';
    const isManager = ['admin', 'dean', 'vicedean', 'secretary', 'dept'].indexOf(user.role) > -1;
    const isTeacher = ['teacher', 'counselor'].indexOf(user.role) > -1;
    const entries = [
      { name: '审批中心', icon: '批', color: '#B8722A', url: '/pages/approval/approval' },
      { name: '我的请假', icon: '假', color: '#A03A5C', url: '/pages/leave/leave' },
      { name: '我的课表', icon: '课', color: '#5A6E3A', url: '/pages/schedule/schedule' },
      { name: '签到打卡', icon: '签', color: '#2B6E8A', url: '/pages/checkin/checkin' },
      { name: '培训中心', icon: '训', color: '#8A5A2B', url: '/pages/training/training' },
      { name: '新闻动态', icon: '闻', color: '#C8442A', url: '/pages/news/news' },
      { name: '统计分析', icon: '统', color: '#3A4F6E', url: '/pages/stats/stats' },
      { name: '数据大屏', icon: '屏', color: '#8A2B2B', url: '/pages/board/board' }
    ];
    // 教师/管理角色可导出数据（教师限定指导范围，管理可导全院）
    if (isTeacher || isManager) {
      entries.push({ name: '数据导出', icon: '导', color: '#1F6E5C', url: '/pages/export/export' });
    }
    if (isAdmin) entries.push({ name: '系统管理', icon: '管', color: '#6E4A8A', url: '/pages/admin/admin', admin: true });
    this.setData({
      user,
      roleName: CFG.ROLE_NAMES[user.role] || '学生',
      regs,
      favCount: favs.length,
      certs,
      entries,
      stats: {
        total: regs.length,
        active: regs.filter(r => r.status === 'approving').length,
        points: (data.getPoints().total || 0) - (data.getPoints().used || 0)
      }
    });
  },

  goApproval(e) {
    app.globalData.currentReg = { _id: e.currentTarget.dataset.id };
    wx.navigateTo({ url: '/pages/approval/approval' });
  },

  goEntry(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },

  /* ---- 我的证书（上传 → 填写信息 → 管理员审核 → 首页轮播） ---- */
  uploadCert() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['pdf', 'jpg', 'jpeg', 'png'],
      success: (res) => {
        const f = res.tempFiles[0];
        this._certFile = f;
        this.setData({
          certShow: true,
          certForm: { compTitle: '', award: '省一等奖', year: '2026', fileName: f.name }
        });
      },
      fail: () => {}
    });
  },
  closeCertForm() { this.setData({ certShow: false }); this._certFile = null; },
  onCertField(e) { this.setData({ ['certForm.' + e.currentTarget.dataset.k]: e.detail.value }); },
  onCertAward(e) { this.setData({ 'certForm.award': CFG.CERT_AWARDS[Number(e.detail.value)] }); },
  onCertYear(e) { this.setData({ 'certForm.year': e.detail.value }); },

  confirmCert() {
    const f = this._certFile;
    const form = this.data.certForm;
    if (!f) { this.setData({ certShow: false }); return; }
    if (!form.compTitle.trim()) { wx.showToast({ title: '请填写竞赛名称', icon: 'none' }); return; }
    wx.showLoading({ title: '上传中…', mask: true });
    const user = this.data.user || {};
    const finish = (fileID) => {
      data.submitCert({
        compTitle: form.compTitle.trim(), award: form.award, year: form.year,
        fileID: fileID || '', path: fileID ? '' : f.path, name: f.name,
        studentName: user.name || '同学'
      }).then(() => {
        wx.hideLoading();
        this.setData({ certShow: false });
        this._certFile = null;
        this.loadData();
        wx.showModal({ title: '已提交审核', content: '管理员审核通过后，证书将进入首页轮播展示。', showCancel: false });
      }).catch((err) => { wx.hideLoading(); wx.showToast({ title: err.message, icon: 'none' }); });
    };
    if (data.isCloud()) {
      wx.cloud.uploadFile({
        cloudPath: `certificates/${Date.now()}_${f.name}`, filePath: f.path,
        success: (up) => finish(up.fileID),
        fail: () => { wx.hideLoading(); wx.showToast({ title: '文件上传失败', icon: 'none' }); }
      });
    } else { finish(''); }
  },

  openCert(e) {
    const c = this.data.certs[e.currentTarget.dataset.i];
    if (!c) return;
    const open = (filePath) => wx.openDocument({
      filePath, showMenu: true,
      fail: () => wx.showToast({ title: '打不开该文件', icon: 'none' })
    });
    if (c.fileID && data.isCloud()) {
      wx.showLoading({ title: '加载中…', mask: true });
      wx.cloud.downloadFile({
        fileID: c.fileID,
        success: (r) => { wx.hideLoading(); open(r.tempFilePath); },
        fail: () => { wx.hideLoading(); wx.showToast({ title: '下载失败', icon: 'none' }); }
      });
    } else if (c.path) {
      open(c.path);
    } else {
      wx.showToast({ title: '演示模式：重启后临时文件已失效，请重新上传', icon: 'none' });
    }
  },

  removeCert(e) {
    const i = e.currentTarget.dataset.i;
    wx.showModal({
      title: '删除证书', content: '确认删除这张证书？', confirmText: '删除', confirmColor: '#E85440',
      success: (res) => {
        if (!res.confirm) return;
        const certs = this.data.certs.slice();
        certs.splice(i, 1);
        wx.setStorageSync('js_certs', certs);
        this.setData({ certs });
      }
    });
  },

  /* ---- 编辑资料 ---- */
  openEdit() {
    const u = this.data.user;
    const curMajor = (u.major || '').replace(/（(本科|专科)）/, '');
    const idx = Math.max(0, CFG.MAJORS.findIndex(m => m.name === curMajor));
    this.setData({
      editShow: true,
      majorIdx: idx,
      edit: { name: u.name || '', studentId: u.studentId || '', major: u.major || '', phone: u.phone || '', email: u.email || '' }
    });
  },
  closeEdit() { this.setData({ editShow: false }); },
  onEditField(e) { this.setData({ ['edit.' + e.currentTarget.dataset.k]: e.detail.value }); },
  onMajorPick(e) {
    const m = CFG.MAJORS[Number(e.detail.value)];
    this.setData({ majorIdx: Number(e.detail.value), 'edit.major': `${m.name}（${m.degree}）` });
  },
  saveEdit() {
    data.updateProfile(this.data.edit).then((u) => {
      this.setData({ editShow: false });
      this.loadData();
      wx.showToast({ title: '资料已保存', icon: 'success' });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /* ---- 演示身份切换：上传证书后切到管理员即可在「系统管理」审核 ---- */
  switchRole() {
    const roles = CFG.ROLES;
    wx.showActionSheet({
      itemList: roles.map(r => r.name),
      success: (res) => {
        const picked = roles[res.tapIndex];
        if (!picked) return;
        const u = Object.assign({}, this.data.user || data.getUser() || data.mockUser(), { role: picked.key });
        app.globalData.user = u;
        wx.setStorageSync('user', u);
        this.loadData();
        wx.showToast({ title: `已切换为${picked.name}`, icon: 'none', duration: 1800 });
      }
    });
  },

  showLogs() {
    const logs = data.getLogs().slice(0, 5);
    if (!logs.length) { wx.showToast({ title: '暂无操作记录', icon: 'none' }); return; }
    wx.showModal({
      title: '操作记录',
      content: logs.map(l => `${l.time} · ${l.action} · ${l.detail}`).join('\n'),
      showCancel: false, confirmText: '知道了'
    });
  },

  resetDemo() {
    wx.showModal({
      title: '重置演示数据',
      content: '本地演示模式下恢复初始数据；云开发模式下重新从云端拉取最新数据。',
      confirmText: '重置', confirmColor: '#3B6FE0',
      success: (res) => {
        if (!res.confirm) return;
        data.resetDemo().then(() => {
          wx.showToast({ title: '已刷新数据', icon: 'none' });
          setTimeout(() => { wx.reLaunch({ url: '/pages/home/home' }); }, 900);
        });
      }
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录', content: '数据会保留，重新登录后可继续。',
      confirmText: '退出',
      success: (res) => {
        if (!res.confirm) return;
        app.logout();
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});
