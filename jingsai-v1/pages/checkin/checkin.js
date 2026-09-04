// pages/checkin/checkin.js —— 签到打卡与积分（校内地点 / 地图实时定位 / 拍照 + 全院排行榜）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

const RANK_LABELS = ['壹', '贰', '叁'];

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    scenes: CFG.CHECKIN_SCENES,
    points: { total: 0, used: 0 },
    checkins: [],
    rankList: [],
    // 地图定位确认
    mapShow: false, mapLat: 0, mapLng: 0, mapMarkers: [],
    checking: false
  },

  onLoad(options) {
    this.setData({ sbh: app.globalData.sbh });
    if (options.scene) this._presetScene = options.scene;
  },
  onShow() {
    data.ready().then(() => {
      this.refresh();
      this.loadRank();
    });
  },

  refresh() {
    this.setData({
      points: data.getPoints(),
      checkins: data.getMyCheckins().slice(0, 20)
    });
  },

  /** 全院积分排行榜 */
  loadRank() {
    data.getPointsRank().then((rank) => {
      this.setData({
        rankList: rank.map(r => Object.assign({}, r, { label: r.rank <= 3 ? RANK_LABELS[r.rank - 1] : String(r.rank) }))
      });
    }).catch(() => {});
  },

  /** 签到：校内地点（可靠，推荐）/ 地图实时定位 / 拍照 */
  doCheckin(e) {
    if (this.data.checking) return;
    const scene = this.data.scenes[e.currentTarget.dataset.i];
    this._scene = scene;
    wx.showActionSheet({
      itemList: ['🏫 校内地点打卡（推荐）', '📍 地图实时定位打卡', '📷 拍照打卡'],
      success: (sheet) => {
        // 方式一：选校内地点（不依赖 GPS，室内 100% 可靠）
        if (sheet.tapIndex === 0) {
          wx.showActionSheet({
            itemList: CFG.CHECKIN_PLACES,
            success: (pl) => this.finishCheckin('', '', CFG.CHECKIN_PLACES[pl.tapIndex])
          });
          return;
        }
        // 方式二：GPS 实时定位 → 地图确认后打卡
        if (sheet.tapIndex === 1) {
          wx.showLoading({ title: '正在定位…', mask: true });
          wx.getLocation({
            type: 'gcj02',
            isHighAccuracy: true,
            success: (r) => {
              wx.hideLoading();
              this.setData({
                mapShow: true,
                mapLat: r.latitude,
                mapLng: r.longitude,
                mapMarkers: [{
                  id: 1, latitude: r.latitude, longitude: r.longitude,
                  title: '我的位置', width: 28, height: 28
                }]
              });
            },
            fail: () => {
              wx.hideLoading();
              wx.showModal({
                title: '定位失败',
                content: '请在系统设置中允许微信使用定位，或改用「校内地点打卡」。',
                confirmText: '知道了', showCancel: false
              });
            }
          });
          return;
        }
        // 方式三：拍照
        wx.chooseMedia({
          count: 1, mediaType: ['image'], sourceType: ['camera'],
          success: (r) => {
            const path = r.tempFiles[0].tempFilePath;
            if (data.isCloud()) {
              wx.cloud.uploadFile({
                cloudPath: `checkins/${Date.now()}.jpg`, filePath: path,
                success: (up) => this.finishCheckin('', up.fileID, '📷 已拍照'),
                fail: () => this.finishCheckin('', '', '')
              });
            } else { this.finishCheckin('', 'demo-photo', '📷 已拍照'); }
          },
          fail: () => { /* 用户取消拍照，不打卡 */ }
        });
      }
    });
  },

  /** 地图弹窗：确认 / 取消 */
  confirmMapCheckin() {
    const loc = `${this.data.mapLat.toFixed(4)},${this.data.mapLng.toFixed(4)}`;
    this.setData({ mapShow: false });
    this.finishCheckin(loc, '', '📍 已定位');
  },
  cancelMapCheckin() { this.setData({ mapShow: false }); },

  /** 统一收尾：提交打卡 */
  finishCheckin(location, photoID, place) {
    const scene = this._scene;
    if (!scene || this.data.checking) return;
    this.setData({ checking: true });
    data.checkin({
      scene: scene.key, sceneName: scene.name, points: scene.points,
      location: location || '', photoID: photoID || '', place: place || ''
    }).then((r) => {
      this.setData({ checking: false });
      this.refresh();
      this.loadRank();
      wx.showToast({ title: `打卡成功 +${r.points} 分`, icon: 'success' });
    }).catch((err) => {
      this.setData({ checking: false });
      wx.showToast({ title: err.message, icon: 'none' });
    });
  }
});
