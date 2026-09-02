// pages/home/home.js —— S2 首页（早报版式 · V1.2 角色分流：任一评审角色均进入工作台）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    dateText: '',
    issue: '',
    news: '数学建模国赛报名 9 月 15 日截止 —— “互联网+” 校选拔赛名单已公示 —— 挑战杯校选通道已开启 ——',
    isApprover: false,
    roleLabel: '',
    userName: '',
    userEmp: '',
    tPending: 0,
    tDone: 0,
    unread: 0,
    regs: [],
    activeCount: 0
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
    this.refresh();
  },

  refresh() {
    const user = app.globalData.user;
    // V1.2：教师 / 系级 / 院级 / 校级 统一走工作台视图
    const isApprover = !!(user && data.APPROVER_ROLES.indexOf(user.role) > -1);
    const ROLE_LABEL = { teacher: '指导教师', dept: '系级评审', college: '院级评审', school: '校级终审' };

    if (isApprover) {
      const q = data.getTeacherQueue(user.name);
      this.setData({
        isApprover, roleLabel: ROLE_LABEL[user.role] || user.role,
        userName: user.name, userEmp: user.empId || '',
        tPending: q.pending.length, tDone: q.processed.length,
        unread: data.unreadCount(), regs: [], activeCount: 0
      });
      return;
    }

    const regs = data.getMyRegistrations().map(r => {
      const track = r.nodes.map(n => n.status === 'pass');
      return {
        _id: r._id, compTitle: r.compTitle, teamName: r.teamName,
        regNo: r.regNo, version: r.version, status: r.status, track
      };
    });
    this.setData({
      isApprover: false,
      unread: data.unreadCount(),
      regs,
      activeCount: regs.filter(r => r.status === 'approving').length
    });
  },

  goHall() { wx.switchTab({ url: '/pages/hall/hall' }); },
  goApproval() { wx.switchTab({ url: '/pages/approval/approval' }); },
  goProfile() { wx.switchTab({ url: '/pages/profile/profile' }); },
  goMessages() { wx.navigateTo({ url: '/pages/messages/messages' }); },
  goReports() { wx.navigateTo({ url: '/pages/reports/reports' }); },
  soon() { wx.showToast({ title: '知识广场将在 V2.0 上线', icon: 'none' }); }
});
