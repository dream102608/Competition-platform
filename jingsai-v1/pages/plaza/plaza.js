// pages/plaza/plaza.js —— V1.4 知识广场（报纸副刊版式）
// 三档栏目：经验帖 / 获奖名单 / 模板库；内容源来自 data.js 静态 seed（只读，未来可云化）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    tab: 'posts',
    tabs: [
      { key: 'posts', label: '经验帖', en: 'POSTS' },
      { key: 'winners', label: '获奖名单', en: 'WALL' },
      { key: 'templates', label: '模板库', en: 'LIB' }
    ],
    posts: [],
    winners: [],
    templates: [],
    counts: { posts: 0, winners: 0, templates: 0 },
    // 全文弹层
    post: null,
    postShow: false
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { this.refresh(); },

  refresh() {
    const posts = data.getPlazaPosts();
    const winners = data.getWinnerGroups();
    const templates = data.getTemplates();
    this.setData({
      posts,
      winners,
      templates,
      counts: { posts: posts.length, winners: winners.length, templates: templates.length }
    });
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, post: null, postShow: false });
  },

  /* ---- 经验帖全文弹层 ---- */
  openPost(e) {
    const id = e.currentTarget.dataset.id;
    const p = this.data.posts.find(x => x._id === id);
    if (p) this.setData({ post: p, postShow: true });
  },
  closePost() { this.setData({ postShow: false }); },
  noop() {},

  /* ---- 模板库：复制模板要点到剪贴板（沙盒内导出闭环） ---- */
  copyTpl(e) {
    const id = e.currentTarget.dataset.id;
    const t = this.data.templates.find(x => x._id === id);
    if (!t) return;
    wx.setClipboardData({
      data: t.copyText,
      success: () => {
        wx.showModal({
          title: '模板已复制',
          content: `「${t.name}」要点（${t.copyText.length} 字）已复制到剪贴板，可直接粘贴到文档中使用。`,
          showCancel: false,
          confirmText: '好'
        });
      }
    });
  },

  back() { wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/home' }) }); },
  goHome() { wx.switchTab({ url: '/pages/home/home' }); }
});
