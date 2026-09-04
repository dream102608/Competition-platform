// pages/login/login.js —— 登录页：学校搜索 → 身份选择 → 登录
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');
const SCHOOLS = require('../../utils/schools');

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    role: 'student',
    autoRoles: [],      // 注册即可用
    fixedRoles: [],     // 需学院/系统指定
    schoolKw: '',       // 学校搜索关键词
    school: null,       // 已选学校 {name, province, city, level, type}
    schoolList: [],     // 搜索下拉结果
    schoolSearched: false,
    // 注册表单
    regShow: false,
    roleName: '',
    reg: { name: '', studentId: '' }
  },

  onLoad() {
    this.setData({
      sbh: app.globalData.sbh,
      autoRoles: CFG.ROLES.filter(r => r.auto),
      fixedRoles: CFG.ROLES.filter(r => !r.auto),
      // 默认带出本校（燕京理工学院）
      school: SCHOOLS.searchSchools(SCHOOLS.DEFAULT_SCHOOL, 1)[0] || { name: SCHOOLS.DEFAULT_SCHOOL, province: '', city: '', level: '', type: '' }
    });
  },

  /* ---------- 学校搜索 ---------- */
  onSchoolInput(e) {
    const kw = e.detail.value;
    this.setData({
      schoolKw: kw,
      schoolList: SCHOOLS.searchSchools(kw, 30),
      schoolSearched: !!kw.trim()
    });
  },

  onSearchConfirm() {
    if (this.data.schoolList.length) this.pickSchool({ currentTarget: { dataset: { index: 0 } } });
  },

  pickSchool(e) {
    const item = this.data.schoolList[e.currentTarget.dataset.index];
    if (!item) return;
    this.setData({ school: item, schoolList: [], schoolKw: '', schoolSearched: false });
  },

  /* ---------- 身份选择 ---------- */
  pick(e) {
    this.setData({ role: e.currentTarget.dataset.role });
  },

  locked() {
    wx.showToast({ title: '该角色由学院/管理员指定，登录后在后台分配', icon: 'none', duration: 2000 });
  },

  /* ---------- 登录：弹出注册表单 ---------- */
  onLogin() {
    if (!this.data.school) {
      wx.showToast({ title: '请先选择你的学校', icon: 'none' });
      return;
    }
    const roleName = (CFG.ROLE_NAMES || {})[this.data.role] || '学生';
    this.setData({ regShow: true, roleName });
  },
  closeReg() { this.setData({ regShow: false }); },
  onRegField(e) { this.setData({ ['reg.' + e.currentTarget.dataset.k]: e.detail.value }); },

  /** 一键带出微信昵称作为姓名（用户拒绝授权时静默忽略，可手填） */
  fillWxName() {
    if (!wx.getUserProfile) return;
    wx.getUserProfile({
      desc: '用于完善平台档案姓名',
      success: (res) => {
        const nick = res.userInfo && res.userInfo.nickName;
        if (nick && nick !== '微信用户') this.setData({ 'reg.name': nick });
      },
      fail: () => {}
    });
  },

  confirmReg() {
    if (this._busy) return;
    const r = this.data.reg;
    if (!r.name.trim()) { wx.showToast({ title: '请填写姓名', icon: 'none' }); return; }
    this._busy = true;
    app.login(this.data.role, this.data.school.name, {
      name: r.name.trim(), studentId: r.studentId.trim()
    }).then(() => {
      this._busy = false;
      wx.switchTab({ url: '/pages/home/home' });
    });
  }
});
