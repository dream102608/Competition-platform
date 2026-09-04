// pages/approval/approval.js —— S6 审批中心（待审批/已审批/我发起的 + 手签字 + 驳回原因）
const app = getApp();
const data = require('../../utils/data');

const TYPE_NAMES = { reg: '竞赛报名', leave: '请假', training: '学习培训', expense: '经费', news: '新闻' };
const REJECT_TPL = ['材料缺项，补齐后重报。', '理由不清晰，重新阐述。', '格式不符要求，参照模板修改。', '超期未交，联系管理员处理。'];

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    tab: 'todo',           // todo 待审批 | done 已审批 | mine 我发起的
    todos: [],
    history: [],
    mine: [],
    activeId: '',
    badge: 0,
    // 驳回弹窗
    rejShow: false, rejId: '', rejType: '', rejNote: '', rejTpls: REJECT_TPL,
    // 手签字弹窗
    signShow: false, signId: '', signType: '', signed: false
  },

  onLoad() {
    this.setData({ sbh: app.globalData.sbh });
    const cur = app.globalData.currentReg;
    if (cur) { this.setData({ activeId: cur._id }); app.globalData.currentReg = null; }
  },

  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const decorate = (r) => Object.assign({}, r, {
      typeName: TYPE_NAMES[r._type || r.type] || '竞赛报名',
      trackFlags: (r.nodes || []).map(n => n.status === 'pass'),
      curNodeName: (() => {
        const i = (r.nodes || []).findIndex(n => n.status === 'waiting');
        return i > -1 ? r.nodes[i].name : '—';
      })(),
      statusText: { approving: '审批中', passed: '已通过', rejected: '已驳回', withdrawn: '已撤回' }[r.status] || r.status
    });
    const mine = data.getMyRegistrations()
      .concat(data.getMyLeaves())
      .concat(data.getMySignups())
      .sort((a, b) => (b.ts || 0) - (a.ts || 0))
      .map(decorate);
    const todos = data.getTodoItems().map(decorate);
    const history = data.getHistoryItems().map(decorate);
    this.setData({ mine, todos, history, badge: todos.length });
  },

  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },

  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeId: this.data.activeId === id ? '' : id });
  },

  /* ---- 审批：通过（如需手签字则先弹出签字板） ---- */
  pass(e) {
    const { id, type } = e.currentTarget.dataset;
    const list = this.data.todos.concat(this.data.mine);
    const doc = list.find(r => r._id === id);
    const idx = doc ? (doc.nodes || []).findIndex(n => n.status === 'waiting') : -1;
    const needSign = doc && idx > -1 && doc.nodes[idx].needSign;
    if (needSign) {
      this.setData({ signShow: true, signId: id, signType: type, signed: false }, () => this.initSignCanvas());
      return;
    }
    wx.showModal({
      title: '通过确认',
      content: '确认通过该节点？签批记录将写入审批链。',
      confirmText: '通过',
      success: (res) => {
        if (!res.confirm) return;
        this.doAct(id, type, 'pass');
      }
    });
  },

  doAct(id, type, op, note, signature) {
    data.actItem(type, id, op, note, signature).then(() => {
      this.refresh();
      wx.showToast({ title: op === 'pass' ? '已通过' : '已驳回', icon: op === 'pass' ? 'success' : 'none' });
    }).catch((err) => {
      wx.showToast({ title: err.message || '操作失败', icon: 'none', duration: 2000 });
    });
  },

  /* ---- 驳回（原因 ≥10 字） ---- */
  openReject(e) {
    this.setData({ rejShow: true, rejId: e.currentTarget.dataset.id, rejType: e.currentTarget.dataset.type, rejNote: '' });
  },
  closeReject() { this.setData({ rejShow: false }); },
  onRejNote(e) { this.setData({ rejNote: e.detail.value }); },
  pickTpl(e) { this.setData({ rejNote: REJECT_TPL[e.currentTarget.dataset.i] }); },
  confirmReject() {
    const note = (this.data.rejNote || '').trim();
    if (note.length < 10) { wx.showToast({ title: '驳回原因至少 10 个字', icon: 'none' }); return; }
    this.setData({ rejShow: false });
    this.doAct(this.data.rejId, this.data.rejType, 'reject', note);
  },

  /* ---- 手签字（Canvas） ---- */
  initSignCanvas() {
    wx.createSelectorQuery().in(this).select('#signCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1A1815';
        this._canvas = canvas;
        this._ctx = ctx;
      });
  },
  signStart(e) {
    if (!this._ctx) return;
    const t = e.touches[0];
    this._ctx.beginPath();
    this._ctx.moveTo(t.x, t.y);
    this._drawing = true;
  },
  signMove(e) {
    if (!this._drawing || !this._ctx) return;
    const t = e.touches[0];
    this._ctx.lineTo(t.x, t.y);
    this._ctx.stroke();
    this.setData({ signed: true });
  },
  signEnd() { this._drawing = false; },
  clearSign() {
    if (this._ctx && this._canvas) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
    this.setData({ signed: false });
  },
  cancelSign() { this.setData({ signShow: false }); },
  confirmSign() {
    if (!this.data.signed) { wx.showToast({ title: '请先手写签名', icon: 'none' }); return; }
    if (!this._canvas) { this.finishSign('signed-demo'); return; }
    wx.canvasToTempFilePath({
      canvas: this._canvas,
      success: (res) => {
        if (data.isCloud()) {
          wx.cloud.uploadFile({
            cloudPath: `signs/${Date.now()}.png`,
            filePath: res.tempFilePath,
            success: (r) => this.finishSign(r.fileID),
            fail: () => this.finishSign('signed-local')
          });
        } else {
          this.finishSign('signed-local');
        }
      },
      fail: () => this.finishSign('signed-local')
    }, this);
  },
  finishSign(signature) {
    const { signId, signType } = this.data;
    this.setData({ signShow: false });
    this.doAct(signId, signType, 'pass', '已手签通过', signature);
  },

  /* ---- 我发起的：催办 / 撤回 / 重报 ---- */
  urge(e) {
    data.urgeItem(e.currentTarget.dataset.type || 'reg', e.currentTarget.dataset.id).then((r) => {
      wx.showToast({ title: r && r.escalated ? '已催办并自动上报' : '已发送催办提醒', icon: 'none' });
    });
  },

  withdraw(e) {
    const { id, type } = e.currentTarget.dataset;
    wx.showModal({
      title: '撤回确认',
      content: '终极审批通过前可撤回。撤回后本次申请作废，需重新提交。',
      confirmText: '确认撤回', cancelText: '算了',
      success: (res) => {
        if (!res.confirm) return;
        data.withdrawItem(type || 'reg', id).then(() => {
          this.refresh();
          wx.showToast({ title: '已撤回', icon: 'none' });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  },

  resubmit(e) {
    const { id, type } = e.currentTarget.dataset;
    data.resubmitItem(type || 'reg', id).then((r) => {
      this.refresh();
      wx.showToast({ title: `已重报 · v${r.version}`, icon: 'success' });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  }
});
