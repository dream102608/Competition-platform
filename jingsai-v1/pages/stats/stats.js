// pages/stats/stats.js —— S15 统计分析（个人统计 + 竞赛统计 + 获奖率）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    my: null,
    all: null,
    isManager: false,
    winRate: 0
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() {
    data.ready().then(() => {
      data.getStats().then((s) => {
        const winRate = s.my.total ? Math.round(s.my.passed / s.my.total * 100) : 0;
        const max = Math.max.apply(null, (s.all.perComp || []).map(p => p.count).concat([1]));
        const perComp = (s.all.perComp || []).map(p => Object.assign({}, p, {
          pct: Math.round(p.count / max * 100)
        }));
        this.setData({ my: s.my, all: Object.assign({}, s.all, { perComp }), isManager: s.isManager, winRate });
      });
    });
  },

  exportTip() {
    wx.showModal({
      title: 'Excel 导出',
      content: '管理角色可直接点下方按钮导出真 Excel；经费终审通过后会自动追加进当月「经费归档」Excel（云存储 archives/ 目录）；教学秘书也可在「云开发控制台 → 数据库 → 导出」取全校原始数据。',
      showCancel: false, confirmText: '知道了'
    });
  },

  exportRegs() { this._doExport('regs', '报名名单'); },
  exportExpenses() { this._doExport('expenses', '经费台账'); },

  _doExport(kind, label) {
    wx.showLoading({ title: '生成 Excel…', mask: true });
    data.exportXlsx(kind).then((res) => {
      wx.hideLoading();
      return data.openXlsx(res.fileID);
    }).catch((err) => {
      wx.hideLoading();
      wx.showModal({ title: label + '导出失败', content: String(err.message || err), showCancel: false });
    });
  }
});
