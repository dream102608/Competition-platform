// pages/approval/approval.js —— S6 审批中心
// V1.2：手写签名 / 评审角色 / 队伍管理 / 导出；V1.3：哈希加封 + 防伪校验 + 报表入口
// 学生 = 我发起的（含队伍管理）；审批人（教师/系级/院级/校级）= 待我审批 / 我处理过的
const app = getApp();
const data = require('../../utils/data');

// 驳回批语模板
const REJECT_TPL = [
  '材料缺项，补齐后重报。',
  '理由不清晰，重新阐述技术路线。',
  '格式不符要求，参照模板修改。',
  '超期未交，联系管理员处理。'
];

// 可参与审批的角色（V1.2 起：教师/系级/院级/校级）—— 常量提升至 data.js 统一维护
const APPROVER_ROLES = data.APPROVER_ROLES;
const ROLE_LABEL = { teacher: '指导教师', dept: '系级评审', college: '院级评审', school: '校级终审' };

// 队员邀请池（演示）
const CLASSMATES = [
  { name: '王一飞', avatar: 'https://picsum.photos/seed/js-a2/80/80' },
  { name: '沈星回', avatar: 'https://picsum.photos/seed/js-a3/80/80' },
  { name: '高鸣',   avatar: 'https://picsum.photos/seed/js-a4/80/80' },
  { name: '赵野',   avatar: 'https://picsum.photos/seed/js-a5/80/80' },
  { name: '叶栖迟', avatar: 'https://picsum.photos/seed/js-a6/80/80' }
];

Page({
  data: {
    sbh: 24,
    isApprover: false,
    roleLabel: '',
    userName: '',
    tab: 'todo',             // approver: todo=待我审批 | done=我处理过的
    regs: [],                // 学生：我发起的
    todos: [],               // 审批人：待我审批
    dones: [],               // 审批人：我处理过的
    activeId: '',            // 展开中的报名单
    badge: 0,
    // 手写签名弹层
    sigShow: false,
    sigRegId: '',
    // 队伍管理弹层
    poolShow: false,
    poolRegId: '',
    poolList: [],
    // 防伪校验弹层（V1.3）
    verifyShow: false,
    vrf: null
  },

  // 弹层遮罩用：阻止滚动穿透（catchtouchmove）
  noop() {},

  onLoad() {
    this.setData({ sbh: app.globalData.sbh });
    const cur = app.globalData.currentReg;
    if (cur) { this.setData({ activeId: cur._id }); app.globalData.currentReg = null; }
  },

  onShow() { this.refresh(); },

  refresh() {
    const user = app.globalData.user;
    const isApprover = !!(user && APPROVER_ROLES.indexOf(user.role) > -1);
    const regs = data.getMyRegistrations();
    // V1.3：节点克隆装饰链上指纹（前 9 位），供轨迹与校验展示
    const decoNode = (n) => Object.assign({}, n, { fp8: (n.hash || '').slice(0, 9) });

    if (isApprover) {
      const q = data.getTeacherQueue(user.name);
      const decorate = (list) => list.map(r => Object.assign({}, r, {
        trackFlags: r.nodes.map(n => n.status === 'pass'),
        nodes: r.nodes.map(decoNode),
        myNode: r.nodes.find(n => n.status === 'waiting' && n.approver === user.name)
          || r.nodes.find(n => n.approver === user.name && n.status !== 'waiting'),
        doneFlags: r.nodes.filter(n => n.approver === user.name)
      }));
      const todos = decorate(q.pending);
      const dones = decorate(q.processed);
      this.setData({
        isApprover, roleLabel: ROLE_LABEL[user.role] || '审批人', userName: user.name,
        todos, dones, regs: [], badge: todos.length
      });
      try {
        if (todos.length > 0) wx.setTabBarBadge({ index: 2, text: String(todos.length) });
        else wx.removeTabBarBadge({ index: 2 });
      } catch (e) { /* ignore */ }
    } else {
      const mine = regs.map(r => Object.assign({}, r, {
        trackFlags: r.nodes.map(n => n.status === 'pass'),
        nodes: r.nodes.map(decoNode),
        overtime: r.status === 'approving' && r.nodes.some(n => n.status === 'waiting')
      }));
      try { wx.removeTabBarBadge({ index: 2 }); } catch (e) { /* ignore */ }
      this.setData({ isApprover, todos: [], dones: [], regs: mine, badge: 0 });
    }
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },

  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeId: this.data.activeId === id ? '' : id });
  },

  /* ---- 学生侧动作 ---- */
  urge(e) {
    data.urge(e.currentTarget.dataset.id);
    this.refresh();
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

  /* ---- 队伍管理（V1.2） ---- */
  showPool(e) {
    const regId = e.currentTarget.dataset.regid;
    const reg = this.data.regs.find(r => r._id === regId);
    if (!reg) return;
    if (reg.members.length >= 8) {
      wx.showToast({ title: '队伍已达 8 人上限', icon: 'none' });
      return;
    }
    const poolList = CLASSMATES.filter(c =>
      !reg.members.some(m => m.name === c.name));
    this.setData({ poolShow: true, poolRegId: regId, poolList });
  },

  addMember(e) {
    const { name, avatar } = e.currentTarget.dataset;
    const regId = this.data.poolRegId;
    const reg = this.data.regs.find(r => r._id === regId);
    if (!reg) return;
    const members = reg.members.concat([{ name, lead: false, avatar }]);
    data.updateTeam(regId, members);
    this.setData({ poolShow: false, poolRegId: '' });
    this.refresh();
    wx.showToast({ title: `${name} 已入队`, icon: 'none' });
  },

  removeMember(e) {
    const { regid, idx } = e.currentTarget.dataset;
    const reg = this.data.regs.find(r => r._id === regid);
    if (!reg) return;
    const target = reg.members[idx];
    if (!target || target.lead) {
      wx.showToast({ title: '队长不能移除', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '移出队员',
      content: `确定把 ${target.name} 移出队伍？`,
      confirmText: '移出',
      success: (res) => {
        if (!res.confirm) return;
        const members = reg.members.filter((_, i) => i !== idx);
        data.updateTeam(regid, members);
        this.refresh();
        wx.showToast({ title: '已移出', icon: 'none' });
      }
    });
  },

  /* ---- 附件预览（V1.2） ---- */
  previewPlan(e) {
    const id = e.currentTarget.dataset.id;
    const reg = data.getMyRegistrations().find(r => r._id === id);
    if (!reg || !reg.planFile) { wx.showToast({ title: '无附件', icon: 'none' }); return; }
    wx.showLoading({ title: '打开附件…' });
    data.previewPlan(reg).then((filePath) => {
      wx.hideLoading();
      wx.openDocument({
        filePath,
        fileType: 'pdf',
        showMenu: true,
        fail: () => wx.showToast({ title: '预览失败', icon: 'none' })
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '演示模式无附件', icon: 'none' });
    });
  },

  /* ---- 导出 CSV（V1.2，审批人） ---- */
  exportCSV() {
    const csv = data.exportCSV();
    const fs = wx.getFileSystemManager();
    const path = `${wx.env.USER_DATA_PATH}/registrations.csv`;
    fs.writeFile({
      filePath: path,
      data: csv,
      encoding: 'utf8',
      success: () => {
        const total = data.getMyRegistrations().length;
        wx.showModal({
          title: '报名汇总已生成',
          content: `共 ${total} 条报名记录，已保存到：\n${path}\n\n点「复制」把 CSV 粘进表格软件查看。`,
          confirmText: '复制 CSV',
          cancelText: '关闭',
          success: (res) => {
            if (res.confirm) {
              wx.setClipboardData({ data: csv });
            }
          }
        });
      },
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
    });
  },

  /* ---- 报表中心（V1.3，审批人数据洞察） ---- */
  goReports() { wx.navigateTo({ url: '/pages/reports/reports' }); },

  /* ---- 防伪校验（V1.3）：重算整链哈希逐节点核验 ---- */
  verify(e) {
    const id = e.currentTarget.dataset.id;
    const vrf = data.verifyChain(id);
    if (!vrf) { wx.showToast({ title: '未找到卷宗', icon: 'none' }); return; }
    this.setData({ verifyShow: true, vrf });
    if (vrf.autoSealed) this.refresh();  // 旧版本卷宗已自动补封：刷新出指纹
  },
  closeVerify() { this.setData({ verifyShow: false, vrf: null }); },

  /* ---- 手写签名板（V1.2） ---- */
  pass(e) {
    // 通过盖章 → 先手写签名
    this.setData({ sigShow: true, sigRegId: e.currentTarget.dataset.id });
    setTimeout(() => this.initSigCanvas(), 120);
  },

  initSigCanvas() {
    wx.createSelectorQuery().in(this)
      .select('#sigCanvas').fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) { this._sig = null; return; }
        const canvas = res[0].node;
        const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio || 2;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#FBF7EC';
        ctx.fillRect(0, 0, res[0].width, res[0].height);
        ctx.strokeStyle = '#1A1815';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._sig = { ctx, canvas, drawing: false, hasInk: false, last: null, w: res[0].width, h: res[0].height };
      });
  },

  sigStart(e) {
    const c = this._sig; if (!c) return;
    const t = e.touches[0];
    c.drawing = true; c.hasInk = true; c.last = { x: t.x, y: t.y };
  },
  sigMove(e) {
    const c = this._sig; if (!c || !c.drawing) return;
    const t = e.touches[0];
    c.ctx.beginPath();
    c.ctx.moveTo(c.last.x, c.last.y);
    c.ctx.lineTo(t.x, t.y);
    c.ctx.stroke();
    c.last = { x: t.x, y: t.y };
  },
  sigEnd() { if (this._sig) this._sig.drawing = false; },

  sigClear() {
    const c = this._sig; if (!c) return;
    c.ctx.fillStyle = '#FBF7EC';
    c.ctx.fillRect(0, 0, c.w, c.h);
    c.hasInk = false;
  },

  sigCancel() {
    this.setData({ sigShow: false, sigRegId: '' });
    this._sig = null;
  },

  cancelPool() { this.setData({ poolShow: false, poolRegId: '' }); },

  sigConfirm() {
    const c = this._sig;
    if (!c) { wx.showToast({ title: '签名板未就绪', icon: 'none' }); return; }
    if (!c.hasInk) { wx.showToast({ title: '请先签名', icon: 'none' }); return; }
    const regId = this.data.sigRegId;
    wx.canvasToTempFilePath({
      canvas: c.canvas,
      success: (res) => {
        const fs = wx.getFileSystemManager();
        fs.readFile({
          filePath: res.tempFilePath,
          encoding: 'base64',
          success: (r) => {
            const sig = 'data:image/png;base64,' + r.data;
            data.act(regId, 'pass', '已通过并手签', sig);
            this.setData({ sigShow: false, sigRegId: '' });
            this._sig = null;
            this.refresh();
            wx.showToast({ title: '已盖章通过', icon: 'success' });
          },
          fail: () => { this.sigCancel(); wx.showToast({ title: '签名读取失败', icon: 'none' }); }
        });
      },
      fail: () => { this.sigCancel(); wx.showToast({ title: '签名生成失败', icon: 'none' }); }
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
