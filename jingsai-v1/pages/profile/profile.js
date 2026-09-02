// pages/profile/profile.js —— S7 我的（档案柜版式 · V1.2 支持全部评审角色）
const app = getApp();
const data = require('../../utils/data');

const ROLE_LABEL = {
  teacher: '指导教师', dept: '系级评审', college: '院级评审', school: '校级终审',
  admin: '教务管理员', student: '在校学生'
};

Page({
  data: {
    sbh: 24,
    user: null,
    regs: [],
    isApprover: false,
    roleLabel: '',
    stats: { total: 0, active: 0, awards: 0 },
    statsLabels: ['累计报名', '进行中', '历史获奖'],
    favCount: 0,
    unread: 0
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },

  onShow() {
    const user = app.globalData.user || data.mockUser();
    const favs = wx.getStorageSync('js_favs') || [];
    const isApprover = !!(user && data.APPROVER_ROLES.indexOf(user.role) > -1);

    if (isApprover) {
      // 审批人档案：统计改为审批数据
      const q = data.getTeacherQueue(user.name);
      this.setData({
        user,
        regs: [],
        isApprover: true,
        roleLabel: ROLE_LABEL[user.role] || user.role,
        unread: data.unreadCount(),
        favCount: favs.length,
        stats: {
          total: q.processed.length,            // 累计审批
          active: q.pending.length,             // 待我审批
          awards: 6                             // 已带赛届数（演示）
        },
        statsLabels: ['累计审批', '待我审批', '已带赛届']
      });
      return;
    }

    const regs = data.getMyRegistrations().map(r => ({
      _id: r._id, compTitle: r.compTitle, teamName: r.teamName,
      version: r.version, status: r.status, deadline: r.deadline,
      trackFlags: r.nodes.map(n => n.status === 'pass')
    }));
    this.setData({
      user,
      regs,
      isApprover: false,
      roleLabel: ROLE_LABEL[user.role] || '在校学生',
      unread: data.unreadCount(),
      favCount: favs.length,
      stats: {
        total: regs.length,
        active: regs.filter(r => r.status === 'approving').length,
        awards: 1   // 演示：历史获奖 1 项
      },
      statsLabels: ['累计报名', '进行中', '历史获奖']
    });
  },

  goApproval(e) {
    app.globalData.currentReg = { _id: e.currentTarget.dataset.id };
    wx.switchTab({ url: '/pages/approval/approval' });
  },

  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },

  goHall() { wx.switchTab({ url: '/pages/hall/hall' }); },

  showLogs() {
    const logs = data.getLogs().slice(0, 5);
    if (!logs.length) { wx.showToast({ title: '暂无操作记录', icon: 'none' }); return; }
    wx.showModal({
      title: '操作记录',
      content: logs.map(l => `${l.time} · ${l.action} · ${l.detail}`).join('\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  },

  editName() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  settings() { wx.navigateTo({ url: '/pages/settings/settings' }); },

  resetDemo() {
    wx.showModal({
      title: '重置演示数据',
      content: '将清空本地报名单、操作记录，恢复初始 3 条演示报名与 6 个竞赛。',
      confirmText: '重置',
      confirmColor: '#C8442A',
      success: (res) => {
        if (!res.confirm) return;
        data.resetDemo();
        wx.showToast({ title: '已恢复初始数据', icon: 'none' });
        setTimeout(() => { wx.reLaunch({ url: '/pages/home/home' }); }, 900);
      }
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '本地演示数据将保留，重新登录后可继续。',
      confirmText: '退出',
      success: (res) => {
        if (!res.confirm) return;
        app.logout();
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});
