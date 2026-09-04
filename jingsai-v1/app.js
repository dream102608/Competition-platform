// app.js —— 竞赛一体化管理平台 V1.0（墨纸编辑部版）
App({
  globalData: {
    user: null,          // 当前登录用户
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
    // DYNAMIC_CURRENT_ENV = 自动使用当前 AppID 开通的默认云环境，无需填写环境 ID
    if (wx.cloud) {
      try {
        wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: true });
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

  /** 登录：云模式下调用云函数换取真实 openid 用户档案；演示模式用 mock 用户。school 为所选学校名，profile 为注册表单字段 */
  login(role, school, profile) {
    const data = require('./utils/data');
    const p = profile || {};
    return new Promise((resolve) => {
      const finish = (user) => {
        if (school && user && !user.school) user.school = school;
        // 注册表单里的姓名/学号/手机号补进档案（云端老用户未填时）
        ['name', 'studentId', 'phone'].forEach((k) => {
          if (p[k] && user && !user[k]) user[k] = p[k];
        });
        this.globalData.user = user;
        wx.setStorageSync('user', user);
        resolve(user);
      };
      if (this.globalData.cloudReady) {
        wx.cloud.callFunction({
          name: 'api',
          data: { action: 'login', role: role || 'student', school: school || '', name: p.name || '', studentId: p.studentId || '', phone: p.phone || '' }
        })
          .then((r) => {
            if (r.result && r.result.ok && r.result.user) finish(r.result.user);
            else finish(Object.assign(data.mockUser(role, school), p));
          })
          .catch(() => finish(Object.assign(data.mockUser(role, school), p)));
        return;
      }
      wx.login({
        success: () => finish(Object.assign(data.mockUser(role, school), p)),
        fail: () => finish(Object.assign(data.mockUser(role, school), p))
      });
    });
  },

  logout() {
    this.globalData.user = null;
    wx.removeStorageSync('user');
  }
});
