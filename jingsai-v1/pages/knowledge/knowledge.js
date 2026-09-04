// pages/knowledge/knowledge.js —— S8 知识广场（全员可见 + 发布 + 互动 + 置顶/精选）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    keyword: '',
    tag: '全部',
    tags: ['全部'].concat(CFG.KNOWLEDGE_TAGS),
    sort: 'hot',            // recommend | new | hot
    list: [],
    // 发布
    pubShow: false, pubTitle: '', pubContent: '', pubTags: [],
    // 评论
    cmShow: false, cmId: '', cmList: [], cmInput: '',
    // 文章详情
    dtShow: false, dtItem: null,
    canPost: true,
    isAdmin: false,
    canTop: false
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const user = data.getUser() || app.globalData.user || {};
    let list = data.getKnowledge().slice();
    const kw = this.data.keyword.trim().toLowerCase();
    if (kw) list = list.filter(k => (k.title + (k.content || '')).toLowerCase().indexOf(kw) > -1);
    if (this.data.tag !== '全部') list = list.filter(k => (k.tags || []).indexOf(this.data.tag) > -1);
    // 置顶优先，然后按排序方式
    const heat = (k) => (k.likes || 0) + (k.favs || 0) * 2 + (k.commentCount || 0);
    list.sort((a, b) => {
      if (a.topped !== b.topped) return a.topped ? -1 : 1;
      if (this.data.sort === 'new') return (b.ts || 0) - (a.ts || 0);
      return heat(b) - heat(a);
    });
    this.setData({
      list,
      canPost: user.role !== 'expert',
      isAdmin: user.role === 'admin',
      canTop: ['captain', 'teacher', 'admin'].indexOf(user.role) > -1
    });
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }); this.refresh(); },
  setTag(e) { this.setData({ tag: e.currentTarget.dataset.t }); this.refresh(); },
  setSort(e) { this.setData({ sort: e.currentTarget.dataset.s }); this.refresh(); },

  like(e) {
    const id = e.currentTarget.dataset.id;
    data.likeKnowledge(id).then(() => this.refresh());
  },

  openComments(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ cmShow: true, cmId: id, cmList: data.getComments(id), cmInput: '' });
  },
  closeComments() { this.setData({ cmShow: false }); },

  /* ---- 文章详情（全文 + 延伸阅读链接） ---- */
  openDetail(e) {
    const id = e.currentTarget.dataset.id;
    const item = (this.data.list || []).find(k => k._id === id) || data.getKnowledge().find(k => k._id === id);
    if (!item) return;
    this.setData({ dtShow: true, dtItem: item, cmId: id, cmList: data.getComments(id), cmInput: '' });
  },
  closeDetail() { this.setData({ dtShow: false, dtItem: null }); },
  copySource() {
    const it = this.data.dtItem;
    if (!it || !it.sourceUrl) return;
    wx.setClipboardData({
      data: it.sourceUrl,
      success: () => wx.showModal({
        title: '链接已复制',
        content: '小程序内不能直接打开外部网站（腾讯规定，需企业认证+域名备案）。链接已复制，到浏览器粘贴打开即可阅读 CSDN 同类好文。',
        showCancel: false, confirmText: '知道了'
      })
    });
  },
  onCmInput(e) { this.setData({ cmInput: e.detail.value }); },
  sendComment() {
    const c = (this.data.cmInput || '').trim();
    if (!c) return;
    data.commentKnowledge(this.data.cmId, c).then(() => {
      this.setData({ cmList: data.getComments(this.data.cmId), cmInput: '' });
      this.refresh();
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  toggleTop(e) {
    const { id, on } = e.currentTarget.dataset;
    data.topKnowledge(id, !on).then(() => this.refresh())
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },
  toggleFeature(e) {
    const { id, on } = e.currentTarget.dataset;
    data.featureKnowledge(id, !on).then(() => this.refresh())
      .catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /* ---- 发布 ---- */
  openPub() {
    if (!this.data.canPost) { wx.showToast({ title: '评审专家仅可查看', icon: 'none' }); return; }
    this.setData({ pubShow: true });
  },
  closePub() { this.setData({ pubShow: false }); },
  onPubTitle(e) { this.setData({ pubTitle: e.detail.value }); },
  onPubContent(e) { this.setData({ pubContent: e.detail.value }); },
  togglePubTag(e) {
    const t = e.currentTarget.dataset.t;
    let tags = this.data.pubTags.slice();
    const i = tags.indexOf(t);
    if (i > -1) tags.splice(i, 1); else tags.push(t);
    this.setData({ pubTags: tags });
  },
  submitPub() {
    const { pubTitle, pubContent, pubTags } = this.data;
    if (!pubTitle.trim() || !pubContent.trim()) { wx.showToast({ title: '标题和内容都要填', icon: 'none' }); return; }
    if (!pubTags.length) { wx.showToast({ title: '至少选一个分类标签', icon: 'none' }); return; }
    wx.showLoading({ title: '发布中…', mask: true });
    const team = data.getTeam();
    data.publishKnowledge({ title: pubTitle.trim(), content: pubContent.trim(), tags: pubTags, teamName: team ? team.name : '' })
      .then(() => {
        wx.hideLoading();
        this.setData({ pubShow: false, pubTitle: '', pubContent: '', pubTags: [] });
        this.refresh();
        wx.showToast({ title: '发布成功', icon: 'success' });
      })
      .catch((err) => { wx.hideLoading(); wx.showToast({ title: err.message, icon: 'none' }); });
  }
});
