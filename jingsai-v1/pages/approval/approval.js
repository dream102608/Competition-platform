// pages/approval/approval.js —— S6 审批中心（签批版式）
const app = getApp();
const data = require('../../utils/data');

// 驳回批语模板（教师端常用）
const REJECT_TPL = [
  '材料缺项，补齐后重报。',
  '理由不清晰，重新阐述技术路线。',
  '格式不符要求，参照模板修改。',
  '超期未交，联系管理员处理。'
];

Page({
  data: {
    sbh: 24,
    tab: 'mine',             // mine=我发起的 | todo=待我审批
    regs: [],                // 我发起的
    todos: [],               // 待我审批（演示为系级审核视角）
    activeId: '',            // 展开中的报名单
    badge: 0
  },

  onLoad() {
    this.setData({ sbh: app.globalData.sbh });
    const cur = app.globalData.currentReg;
    if (cur) { this.setData({ activeId: cur._id }); app.globalData.currentReg = null; }
  },

  onShow() { this.refresh(); },

  refresh() {
    const regs = data.getMyRegistrations();
    // 我发起的：附带展示字段
    const mine = regs.map(r => Object.assign({}, r, {
      trackFlags: r.nodes.map(n => n.status === 'pass'),
      overtime: r.status === 'approving' && r.nodes.some(n => n.status === 'waiting')
    }));
    // 待我审批：演示视角 —— 所有在途单中当前 waiting 的节点（跳过指导教师节点，由教师本人处理）
    const todos = [];
    regs.filter(r => r.status === 'approving').forEach(r => {
      const idx = r.nodes.findIndex(n => n.status === 'waiting');
      if (idx > 0 && r.nodes[idx].name.indexOf('指导教师') === -1) {
        todos.push({
          _id: r._id, regNo: r.regNo, compTitle: r.compTitle, teamName: r.teamName,
          version: r.version, nodeIdx: idx, nodeName: r.nodes[idx].name,
          applicant: r.members[0].name,
          trackFlags: r.nodes.map(n => n.status === 'pass')
        });
      }
    });
    this.setData({ regs: mine, todos, badge: todos.length });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },

  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeId: this.data.activeId === id ? '' : id });
  },

  /* ---- 学生侧动作 ---- */
  urge(e) {
    data.urge(e.currentTarget.dataset.id);
    wx.showToast({ title: '已发送催办提醒', icon: 'success' });
  },

  withdraw(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '撤回确认',
      content: '提交后 24h 内可撤回。撤回后本次报名作废，需重新提交。',
      confirmText: '确认撤回',
      cancelText: '算了',
      success: (res) => {
        if (!res.confirm) return;
        data.withdraw(id);
        this.refresh();
        wx.showToast({ title: '已撤回', icon: 'none' });
      }
    });
  },

  resubmit(e) {
    const id = e.currentTarget.dataset.id;
    const reg = data.resubmit(id);
    if (reg) {
      this.refresh();
      wx.showToast({ title: `已重报 · v${reg.version}`, icon: 'success' });
    }
  },

  /* ---- 审批侧动作 ---- */
  pass(e) {
    const { id, idx } = e.currentTarget.dataset;
    wx.showModal({
      title: '通过盖章',
      content: '确认通过该节点？签批记录将写入审批链。',
      confirmText: '通过盖章',
      success: (res) => {
        if (!res.confirm) return;
        data.act(id, 'pass');
        this.refresh();
        wx.showToast({ title: '已盖章通过', icon: 'success' });
      }
    });
  },

  reject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: REJECT_TPL,
      success: (res) => {
        const note = REJECT_TPL[res.tapIndex];
        data.act(id, 'reject', note);
        this.refresh();
        wx.showToast({ title: '已驳回', icon: 'none' });
      },
      fail: () => { /* 用户取消 */ }
    });
  }
});
