// pages/messages/messages.js —— S8 消息与催办中心（来函版式）
// V1.5：长按单条操作 / 批量整理删除 / 同报名单聚合时间线（卷宗折叠卡）
const app = getApp();
const data = require('../../utils/data');

const TYPE_META = {
  notice:  { label: '公告', cls: 't-notice' },
  approval:{ label: '审批', cls: 't-approval' },
  urge:    { label: '催办', cls: 't-urge' }
};
// V1.4：来函分组页签
const TABS = [
  { key: 'all', label: '全部' },
  { key: 'approval', label: '审批' },
  { key: 'urge', label: '催办' },
  { key: 'notice', label: '公告' }
];

Page({
  data: {
    sbh: 24,
    tab: 'all',
    tabs: [],
    unreadTab: { all: 0, approval: 0, urge: 0, notice: 0 },
    rows: [],          // V1.5 渲染模型：{kind:'msg'} 单条 / {kind:'thread'} 聚合
    unread: 0,
    manage: false,     // 整理（多选）模式
    picked: [],        // 已勾选消息 _id 集合
    allChecked: false,
    openThreads: {}    // regId -> 是否展开时间线
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { this.refresh(); },

  refresh() {
    const prefs = data.getPrefs();
    const all = data.getMessages();
    // 按通知偏好过滤（设置页可关闭某类通知）
    const visible = all.filter(m =>
      (m.type === 'approval' && prefs.approval) ||
      (m.type === 'urge' && prefs.urge) ||
      (m.type === 'notice' && prefs.notice));
    const counts = { all: visible.length, approval: 0, urge: 0, notice: 0 };
    const unreadTab = { all: 0, approval: 0, urge: 0, notice: 0 };
    visible.forEach(m => {
      if (counts[m.type] != null) counts[m.type] += 1;
      if (!m.read && unreadTab[m.type] != null) unreadTab[m.type] += 1;
    });
    unreadTab.all = visible.filter(m => !m.read).length;
    // 当前页签过滤
    const tab = this.data.tab || 'all';
    const list = tab === 'all' ? visible : visible.filter(m => m.type === tab);
    const meta = list.map(m => Object.assign({}, m, {
      label: TYPE_META[m.type].label,
      cls: TYPE_META[m.type].cls
    }));
    const rows = this.buildRows(meta);
    const allChecked = !!(this.data.manage && rows.length && rows.every(r => r.checked));
    this.setData({
      tabs: TABS.map(t => ({ key: t.key, label: t.label, n: counts[t.key] })),
      unreadTab,
      rows,
      unread: unreadTab.all,
      allChecked
    });
  },

  /* V1.5：构造渲染模型——同报名单 ≥2 条消息折叠为 thread（聚合时间线），其余单条 */
  buildRows(list) {
    const cnt = {};
    list.forEach(m => { if (m.regId) cnt[m.regId] = (cnt[m.regId] || 0) + 1; });
    const manage = this.data.manage;
    const openMap = this.data.openThreads || {};
    const picked = this.data.picked || [];
    const rows = [];
    const grouped = {};
    list.forEach(m => {
      if (m.regId && cnt[m.regId] > 1) {
        if (!grouped[m.regId]) {
          grouped[m.regId] = {
            kind: 'thread', key: 'th-' + m.regId, regId: m.regId,
            items: [], open: false, checked: false, part: false
          };
          rows.push(grouped[m.regId]);   // 组落在其首条消息的原位置
        }
        grouped[m.regId].items.push(m);
      } else {
        rows.push({ kind: 'msg', key: m._id, m, checked: picked.indexOf(m._id) > -1 });
      }
    });
    Object.keys(grouped).forEach(rid => {
      const th = grouped[rid];
      const ids = th.items.map(x => x._id);
      const hit = ids.filter(id => picked.indexOf(id) > -1).length;
      th.checked = hit > 0 && hit === ids.length;
      th.part = hit > 0 && hit < ids.length;
      th.open = manage ? true : !!openMap[rid];
      const brief = data.regBrief(rid);
      th.brief = brief;
      th.titleText = brief ? brief.teamName + ' · ' + brief.compTitle : '关联报名单';
      th.regNo = brief ? brief.regNo : '';
      th.unreadN = th.items.filter(x => !x.read).length;
    });
    return rows;
  },

  setTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab, manage: false, picked: [] });
    this.refresh();
  },

  markAll() {
    data.markAllRead();
    this.refresh();
    wx.showToast({ title: '全部已读', icon: 'none' });
  },

  /* ---- V1.5：整理（多选批量删除） ---- */
  toggleManage() {
    const manage = !this.data.manage;
    this.setData({ manage, picked: [] });
    this.refresh();
    if (manage) wx.showToast({ title: '勾选后批量删除', icon: 'none' });
  },
  pick(e) {
    const id = e.currentTarget.dataset.id;
    let picked = this.data.picked.slice();
    const i = picked.indexOf(id);
    if (i > -1) picked.splice(i, 1); else picked.push(id);
    this.setData({ picked });
    this.refresh();
  },
  pickThread(e) {
    const rid = e.currentTarget.dataset.regid;
    const th = this.data.rows.find(r => r.kind === 'thread' && r.regId === rid);
    if (!th) return;
    const ids = th.items.map(x => x._id);
    let picked = this.data.picked.slice();
    const allIn = ids.every(id => picked.indexOf(id) > -1);
    ids.forEach(id => {
      const i = picked.indexOf(id);
      if (allIn) { if (i > -1) picked.splice(i, 1); }
      else if (i === -1) picked.push(id);
    });
    this.setData({ picked });
    this.refresh();
  },
  selectAll() {
    const rows = this.data.rows;
    const allIds = [];
    rows.forEach(r => {
      if (r.kind === 'msg') allIds.push(r.m._id);
      else r.items.forEach(x => allIds.push(x._id));
    });
    const allIn = allIds.length && allIds.every(id => this.data.picked.indexOf(id) > -1);
    this.setData({ picked: allIn ? [] : allIds });
    this.refresh();
  },
  delPicked() {
    const n = this.data.picked.length;
    if (!n) { wx.showToast({ title: '请先勾选来函', icon: 'none' }); return; }
    wx.showModal({
      title: '批量删除',
      content: `将删除已勾选的 ${n} 封来函，删除后不可恢复。`,
      confirmText: '删除', confirmColor: '#C8442A',
      success: (res) => {
        if (res.confirm) {
          data.removeMsgs(this.data.picked);
          this.setData({ picked: [] });
          this.refresh();
          wx.showToast({ title: '已删除', icon: 'none' });
        }
      }
    });
  },

  /* 点开消息：整理模式=勾选；否则标已读 + 带报名单跳审批展开 */
  open(e) {
    if (this.data.manage) { this.pick(e); return; }
    const { id, regid } = e.currentTarget.dataset;
    if (id) data.markMsgRead(id);
    this.refresh();
    if (regid) {
      app.globalData.currentReg = { _id: regid };
      wx.switchTab({ url: '/pages/approval/approval' });
    }
  },

  /* V1.5：长按单条 → 标已读 / 查看报名单 / 删除 */
  msgActs(e) {
    if (this.data.manage) return;
    const { id, regid, read } = e.currentTarget.dataset;
    const acts = [];
    if (!read) acts.push('标为已读');
    if (regid) acts.push('查看报名单');
    acts.push('删除该条');
    wx.showActionSheet({
      itemList: acts,
      success: (r) => {
        const act = acts[r.tapIndex];
        if (act === '标为已读') {
          data.markMsgRead(id);
          this.refresh();
        } else if (act === '查看报名单') {
          data.markMsgRead(id);
          app.globalData.currentReg = { _id: regid };
          wx.switchTab({ url: '/pages/approval/approval' });
        } else if (act === '删除该条') {
          wx.showModal({
            title: '删除来函',
            content: '仅删除本条，删除后不可恢复。',
            confirmText: '删除', confirmColor: '#C8442A',
            success: (res) => {
              if (res.confirm) {
                data.removeMsg(id);
                this.refresh();
                wx.showToast({ title: '已删除', icon: 'none' });
              }
            }
          });
        }
      }
    });
  },

  /* ---- V1.5：卷宗卡（同报名单聚合时间线） ---- */
  onThreadHead(e) { if (this.data.manage) return; this.toggleThread(e); },
  toggleThread(e) {
    const rid = e.currentTarget.dataset.regid;
    const openThreads = Object.assign({}, this.data.openThreads);
    openThreads[rid] = !openThreads[rid];
    this.setData({ openThreads });
    this.refresh();
  },
  onThItem(e) {
    if (this.data.manage) return;   // 整理模式以整组为粒度，不单点子项
    this.open(e);
  },

  goHome() { wx.switchTab({ url: '/pages/home/home' }); }
});
