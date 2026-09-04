// pages/detail/detail.js —— S4 竞赛详情（档案袋版式 + 竞赛属性 + 附件 + 报名队伍）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  data: {
    sbh: 24,
    comp: null,
    fav: false,
    flowName: '',
    signedTeams: [],
    myReg: null,
    files: []
  },

  onLoad(options) {
    data.ready().then(() => {
      const comp = data.getCompetition(options.id);
      if (!comp) {
        wx.showToast({ title: '赛项不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 600);
        return;
      }
      const favs = wx.getStorageSync('js_favs') || [];
      const myReg = data.getMyRegistrations().find(r => r.compId === comp._id && r.status !== 'withdrawn') || null;
      // 已报名队伍（云端真实数据 / 演示数据）
      const signed = data.getMyRegistrations().filter(r => r.compId === comp._id);
      // 附件：种子数据里用 timeline 模拟，正式版在 comps.files 字段
      const files = comp.files || [
        { name: comp.title + '·竞赛章程.pdf', size: '1.2MB' },
        { name: '报名表模板.docx', size: '86KB' }
      ];
      this.setData({
        sbh: app.globalData.sbh,
        comp,
        fav: favs.indexOf(comp._id) > -1,
        myReg,
        signedTeams: signed,
        files,
        flowName: comp.track === 'teacher'
          ? (comp.needExpert ? '秘书初审 → 教研室 → 副院长 → 院长 → 专家评审' : '秘书初审 → 教研室 → 副院长 → 院长')
          : data.CHAIN_NAMES[comp.level] || '三级审批'
      });
    });
  },

  toggleFav() {
    const favs = wx.getStorageSync('js_favs') || [];
    const i = favs.indexOf(this.data.comp._id);
    if (i > -1) favs.splice(i, 1); else favs.push(this.data.comp._id);
    wx.setStorageSync('js_favs', favs);
    this.setData({ fav: !this.data.fav });
    wx.showToast({ title: this.data.fav ? '已收藏' : '已取消', icon: 'none', duration: 600 });
  },

  downloadFile(e) {
    const f = this.data.files[e.currentTarget.dataset.i];
    if (f.fileID && data.isCloud()) {
      wx.showLoading({ title: '下载中…' });
      wx.cloud.downloadFile({
        fileID: f.fileID,
        success: (res) => {
          wx.hideLoading();
          wx.openDocument({ filePath: res.tempFilePath, fail: () => wx.showToast({ title: '无法打开该文件', icon: 'none' }) });
        },
        fail: () => { wx.hideLoading(); wx.showToast({ title: '下载失败', icon: 'none' }); }
      });
    } else {
      wx.showToast({ title: '演示模式：附件待管理员上传', icon: 'none' });
    }
  },

  apply() {
    const c = this.data.comp;
    if (c.closed) {
      wx.showModal({ title: '已截止', content: '该赛项报名通道已关闭，去大厅看看别的赛事吧。', showCancel: false, confirmText: '知道了' });
      return;
    }
    const dup = this.data.myReg;
    if (dup) {
      wx.showModal({
        title: '已有报名',
        content: `该赛项已有报名单（${dup.teamName || '个人'} · v${dup.version}），是否前往查看进度？`,
        confirmText: '查看进度', cancelText: '仍要重报',
        success: (res) => {
          if (res.confirm) {
            app.globalData.currentReg = dup;
            wx.switchTab({ url: '/pages/profile/profile' });
          } else {
            wx.navigateTo({ url: '/pages/form/form?id=' + c._id });
          }
        }
      });
      return;
    }
    wx.navigateTo({ url: '/pages/form/form?id=' + c._id });
  },

  back() { wx.navigateBack(); }
});
