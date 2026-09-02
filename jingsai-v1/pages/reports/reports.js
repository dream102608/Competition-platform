// pages/reports/reports.js —— V1.3 统计报表中心（评审台数据洞察）
// V1.4：新增评审绩效小节（审批人已办/通过率/在办负荷）
// 纯前端实时聚合 + 纸墨风 CSS 图表 + 状态筛选导出；仅审批角色（教师/系级/院级/校级）可看
const app = getApp();
const data = require('../../utils/data');

const STATUS_META = [
  { key: 'approving', label: '审批中', color: '#3D5A80' },
  { key: 'rejected', label: '已驳回', color: '#C8442A' },
  { key: 'passed', label: '已通过', color: '#3E6B4F' },
  { key: 'withdrawn', label: '已撤回', color: '#8A8172' }
];
const FILTER_LABEL = {
  all: '全部报名', approving: '审批中', rejected: '已驳回',
  passed: '已通过', withdrawn: '已撤回'
};

Page({
  data: {
    sbh: 24,
    guard: false,
    total: 0, approving: 0, rejected: 0, passed: 0, withdrawn: 0,
    passRate: 0, members: 0, avgTeam: '0',
    compBars: [], teacherBars: [], trackBars: [],
    stack: [],
    perf: [],
    filters: [],
    filter: 'all',
    exportHint: '全部报名',
    version: 'V1.4.0'
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { this.refresh(); },

  refresh() {
    const user = app.globalData.user;
    const isApprover = !!(user && data.APPROVER_ROLES.indexOf(user.role) > -1);
    if (!isApprover) { this.setData({ guard: true }); return; }

    const s = data.reportStats();
    const mk = (arr, max) => arr.map(x => ({
      k: x.k, v: x.v, w: Math.max(6, Math.round(x.v / max * 100))
    }));
    const maxComp = Math.max(1, ...s.byComp.map(x => x.v));
    const maxTea = Math.max(1, ...s.byTeacher.map(x => x.v));
    const maxTrack = Math.max(1, ...s.byTrack.map(x => x.v));
    const total = Math.max(1, s.total);
    const statusByKey = {};
    s.statusSeq.forEach(x => { statusByKey[x.k] = x; });
    // V1.4：评审绩效——按审批人已办量归一，条内 pass/reject 分色，rate=— 表示暂无已办
    const maxPerf = Math.max(1, ...s.approverStats.map(a => a.done));
    const perf = s.approverStats.map(a => ({
      name: a.name, done: a.done, pending: a.pending,
      rateTxt: a.rate == null ? '—' : a.rate + '%',
      w: a.done ? Math.max(6, Math.round(a.done / maxPerf * 100)) : 0,
      passW: a.done ? Math.round(a.pass / a.done * 100) : 0,
      rejectW: a.done ? 100 - Math.round(a.pass / a.done * 100) : 0
    }));

    this.setData({
      guard: false,
      total: s.total, approving: s.approving, rejected: s.rejected,
      passed: s.passed, withdrawn: s.withdrawn,
      passRate: s.passRate, members: s.members, avgTeam: String(s.avgTeam),
      compBars: mk(s.byComp, maxComp),
      teacherBars: mk(s.byTeacher, maxTea),
      trackBars: mk(s.byTrack, maxTrack),
      perf,
      stack: STATUS_META.map(m => ({
        key: m.key, label: m.label, color: m.color,
        v: statusByKey[m.key].v,
        pct: Math.round(statusByKey[m.key].v / total * 100)
      })).filter(x => x.v > 0),
      filters: [{ key: 'all', label: '全部', v: s.total }]
        .concat(STATUS_META.map(m => ({
          key: m.key, label: m.label, v: statusByKey[m.key].v
        }))),
      exportHint: FILTER_LABEL[this.data.filter] || '全部报名'
    });
  },

  setFilter(e) {
    const f = e.currentTarget.dataset.f;
    this.setData({ filter: f, exportHint: FILTER_LABEL[f] || '全部报名' });
  },

  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  goHome() { wx.switchTab({ url: '/pages/home/home' }); },

  /* 按当前筛选导出 CSV（复用数据层 exportCSV(statusFilter)） */
  exportCSV() {
    const f = this.data.filter;
    const csv = data.exportCSV(f);
    const fs = wx.getFileSystemManager();
    const path = `${wx.env.USER_DATA_PATH}/registrations.csv`;
    fs.writeFile({
      filePath: path,
      data: csv,
      encoding: 'utf8',
      success: () => {
        const count = csv.split('\n').length - 1;
        wx.showModal({
          title: '筛选导出完成',
          content: `筛选「${this.data.exportHint}」共 ${count} 条，已写入：\n${path}\n\n点「复制」粘进表格软件查看。`,
          confirmText: '复制 CSV',
          cancelText: '关闭',
          success: (res) => {
            if (res.confirm) wx.setClipboardData({ data: csv });
          }
        });
      },
      fail: () => wx.showToast({ title: '导出失败', icon: 'none' })
    });
  }
});
