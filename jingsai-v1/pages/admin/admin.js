// pages/admin/admin.js —— S16 系统管理（仅管理员：用户/角色/审批流）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  data: {
    sbh: 24,
    isAdmin: false,
    tab: 'users',
    tabs: [
      { key: 'users', name: '用户管理' },
      { key: 'certs', name: '证书审核' },
      { key: 'flows', name: '审批流' }
    ],
    users: [],
    certs: [],
    roles: CFG.ROLES,
    rolePickerUser: null,
    flows: [
      { name: '学生竞赛报名', chain: '指导教师/辅导员 → 教学秘书 → 教研室主任（校级起）→ 教学副院长（省级起）→ 院长（国家级终审）' },
      { name: '教师竞赛报名', chain: '教学秘书 → 教研室主任 → 教学副院长 → 院长（终审）→ 评审专家（可跳过）' },
      { name: '请假', chain: '队长（手签）→ 辅导员（手签）；队长申请时自批' },
      { name: '学习培训', chain: '教师（手签）' },
      { name: '经费', chain: '教学秘书 → 教研室主任 → 教学副院长 → 院长（终审）' },
      { name: '新闻发布', chain: '管理员审核 → 正式/定时发布' }
    ]
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const user = data.getUser() || app.globalData.user || {};
    const isAdmin = user.role === 'admin';
    this.setData({ isAdmin });
    if (isAdmin) { this.loadUsers(); this.loadCerts(); }
  },

  /* ---- 证书审核 ---- */
  loadCerts() {
    data.adminCertList().then((certs) => {
      this.setData({ certs: certs.map(c => Object.assign({}, c, {
        statusText: { pending: '待审核', passed: '已通过', rejected: '已驳回' }[c.status] || c.status
      })) });
    }).catch(() => {});
  },

  certApprove(e) {
    const c = this.data.certs[e.currentTarget.dataset.i];
    wx.showModal({
      title: '通过审核', content: `确认「${c.studentName} · ${c.compTitle} ${c.award}」真实有效？通过后进入首页轮播。`,
      confirmText: '通过',
      success: (r) => {
        if (!r.confirm) return;
        data.adminCertAct(c.id || c._id, 'approve').then(() => {
          this.loadCerts();
          wx.showToast({ title: '已通过并入轮播', icon: 'success' });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  },

  certReject(e) {
    const c = this.data.certs[e.currentTarget.dataset.i];
    wx.showModal({
      title: '驳回原因', editable: true, placeholderText: '请填写驳回原因（将通知学生）',
      confirmText: '确认驳回', confirmColor: '#E85440',
      success: (r) => {
        if (!r.confirm) return;
        data.adminCertAct(c.id || c._id, 'reject', r.content || '').then(() => {
          this.loadCerts();
          wx.showToast({ title: '已驳回', icon: 'none' });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  },

  loadUsers() {
    data.adminUsers({ op: 'list' }).then((r) => {
      this.setData({
        users: (r.users || []).map(u => Object.assign({}, u, { roleName: CFG.ROLE_NAMES[u.role] || u.role }))
      });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.k }); },

  /* ---- 用户管理 ---- */
  openRolePicker(e) {
    const u = this.data.users[e.currentTarget.dataset.i];
    const names = CFG.ROLES.map(r => r.name);
    wx.showActionSheet({
      itemList: names,
      success: (res) => {
        const role = CFG.ROLES[res.tapIndex].key;
        data.adminUsers({ op: 'setRole', userId: u._id, role, userName: u.name }).then(() => {
          this.loadUsers();
          wx.showToast({ title: `已设为「${names[res.tapIndex]}」`, icon: 'none' });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  },

  toggleUser(e) {
    const u = this.data.users[e.currentTarget.dataset.i];
    const target = !u.disabled;
    wx.showModal({
      title: target ? '禁用账号' : '启用账号',
      content: `确认${target ? '禁用' : '启用'}「${u.name}」？`,
      confirmText: '确认', confirmColor: target ? '#E85440' : '#22B07D',
      success: (res) => {
        if (!res.confirm) return;
        data.adminUsers({ op: 'toggle', userId: u._id, disabled: target, userName: u.name }).then(() => {
          this.loadUsers();
          wx.showToast({ title: '已完成', icon: 'success' });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  }
});
