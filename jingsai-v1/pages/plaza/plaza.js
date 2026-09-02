// pages/plaza/plaza.js —— V1.4 知识广场（报纸副刊版式）
// V1.5：互动化——经验帖 ▲有用/♥收藏 本地持久化；✎ 我要发帖（审核流）+ 我的投稿管理
// 内容源来自 data.js 静态 seed（经验帖/获奖名单/模板库）+ K.POSTS 用户投稿
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
    // 互动状态（V1.5）
    likedIds: [],
    favedIds: [],
    pubTip: 0,             // 审核中投稿数 → 顶部黄条
    myPosts: [],           // 我的投稿
    // 全文弹层
    post: null,
    postShow: false,
    // 我要发帖（V1.5）
    pubShow: false,
    comps: [],
    pubTitle: '',
    pubComp: '',
    pubCompIdx: -1,
    pubBody: '',
    // 我的投稿（V1.5）
    myShow: false
  },

  onLoad() {
    const comps = data.getCompetitions().map(c => c.title);
    this.setData({ sbh: app.globalData.sbh, comps });
  },
  onShow() { this.refresh(); },

  refresh() {
    const st = data.getPlazaState();
    const likedIds = st.liked || [];
    const favedIds = st.faved || [];
    const posts = data.getPlazaPosts().map(p => {
      const liked = likedIds.indexOf(p._id) > -1;
      const faved = favedIds.indexOf(p._id) > -1;
      return Object.assign({}, p, {
        isLiked: liked, isFaved: faved,
        likesN: p.likes + (liked ? 1 : 0)
      });
    });
    const winners = data.getWinnerGroups();
    const templates = data.getTemplates();
    const myPosts = data.getMyPosts();
    this.setData({
      posts, winners, templates, myPosts,
      likedIds, favedIds,
      pubTip: myPosts.filter(p => p.status === 'pending').length,
      counts: { posts: posts.length, winners: winners.length, templates: templates.length }
    });
  },

  setTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, post: null, postShow: false, myShow: false, pubShow: false });
  },

  /* ---- 经验帖全文弹层 ---- */
  openPost(e) {
    const id = e.currentTarget.dataset.id;
    const p = this.data.posts.find(x => x._id === id);
    if (p) this.setData({ post: p, postShow: true });
  },
  closePost() { this.setData({ postShow: false }); },
  noop() {},

  /* ---- V1.5：点赞（有用）与收藏，catchtap 阻止冒泡到全文弹层 ---- */
  likePost(e) {
    const id = e.currentTarget.dataset.id;
    data.togglePlazaLike(id);
    this.refresh();
  },
  favPost(e) {
    const id = e.currentTarget.dataset.id;
    data.togglePlazaFav(id);
    this.refresh();
  },

  /* ---- V1.5：我要发帖（审核流） ---- */
  openPub() {
    this.setData({ pubShow: true, pubTitle: '', pubComp: '', pubCompIdx: -1, pubBody: '' });
  },
  closePub() { this.setData({ pubShow: false }); },
  onTitle(e) { this.setData({ pubTitle: e.detail.value }); },
  onComp(e) {
    const i = Number(e.detail.value);
    this.setData({ pubCompIdx: i, pubComp: this.data.comps[i] || '' });
  },
  onBody(e) { this.setData({ pubBody: e.detail.value }); },
  submitPub() {
    const title = (this.data.pubTitle || '').trim();
    const body = (this.data.pubBody || '').trim();
    if (!title) { wx.showToast({ title: '先给帖子起个标题', icon: 'none' }); return; }
    if (!this.data.pubComp) { wx.showToast({ title: '选择所属赛事', icon: 'none' }); return; }
    if (body.length < 20) { wx.showToast({ title: '正文至少 20 字', icon: 'none' }); return; }
    data.submitPost({ title, comp: this.data.pubComp, body });
    this.setData({ pubShow: false });
    this.refresh();
    wx.showToast({ title: '已提交，等待审核', icon: 'none' });
  },

  /* ---- V1.5：我的投稿（状态 / 撤回待审稿） ---- */
  openMy() { this.setData({ myShow: true }); },
  closeMy() { this.setData({ myShow: false }); },
  withdrawMy(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '撤回投稿',
      content: '撤回后该稿不再进入审核，留档在我的投稿中。',
      confirmText: '撤回', confirmColor: '#C8442A',
      success: (res) => {
        if (res.confirm) { data.withdrawPost(id); this.refresh(); }
      }
    });
  },

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
