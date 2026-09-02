// app.js —— 竞赛一体化管理平台 V1.1（墨纸编辑部版）
App({
  globalData: {
    user: null,          // 当前登录用户（student | teacher | admin）
    sbh: 24,             // 状态栏高度
    db: null,            // 云开发数据库（可用时）
    cloudReady: false,
    currentReg: null     // 跨页传递的报名单
  },

  onLaunch() {
    // 状态栏高度（自绘导航用）
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.globalData.sbh = win.statusBarHeight || 24;
    } catch (e) { /* 保底 24 */ }

    // 尝试接入云开发；失败则回退本地 Storage（演示模式）
    if (wx.cloud) {
      try {
        wx.cloud.init({ traceUser: true });
        this.globalData.db = wx.cloud.database();
        this.globalData.cloudReady = true;
      } catch (e) {
        console.warn('云开发未就绪，使用本地演示数据', e);
      }
    }

    // 恢复登录态
    const user = wx.getStorageSync('user');
    if (user) this.globalData.user = user;
  },

  /** 登录：wx.login 换 code，演示模式下直接绑定 mock 用户 */
  login(role) {
    return new Promise((resolve) => {
      const bind = () => {
        const data = require('./utils/data');
        const user = data.mockUser(role);
        this.globalData.user = user;
        data.saveUser(user);
        resolve(user);
      };
      wx.login({ success: bind, fail: bind });
    });
  },

  logout() {
    this.globalData.user = null;
    wx.removeStorageSync('user');
  }
});
