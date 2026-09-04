// pages/watchtower/watchtower.js —— 科创瞭望台（视频课程 + 管理员上传 + 观看统计）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

// 演示模式用的示例视频（真实环境使用云存储 fileID，无需合法域名）
const DEMO_VIDEO = 'https://www.w3school.com.cn/example/html5/mov_bbb.mp4';

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    kw: '',
    courseGroups: [],
    courses: [],
    lecturers: [],
    stats: { videoCount: 0, totalViews: 0, watchedCount: 0, finishRate: 0 },
    canUpload: false, canManage: false, roleName: '',
    // 播放
    playShow: false, playing: {}, playSrc: '',
    // 上传
    upShow: false, upCourseIdx: 0, upLecIdx: 0,
    up: { title: '', intro: '', sort: '', fileName: '', filePath: '', duration: '' }
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const user = data.getUser() || app.globalData.user || {};
    const role = user.role || 'student';
    this.setData({
      roleName: CFG.ROLE_NAMES[role] || '学生',
      canUpload: ['admin', 'secretary'].indexOf(role) > -1,
      canManage: ['admin', 'secretary', 'dean', 'vicedean'].indexOf(role) > -1,
      courses: data.getVideoCourses(),
      lecturers: data.getLecturers(),
      stats: data.getWatchStats()
    });
    this.buildGroups();
  },

  buildGroups() {
    const kw = this.data.kw.trim();
    const watch = data.getWatchMap();
    const lecMap = {};
    this.data.lecturers.forEach(l => { lecMap[l._id] = l; });
    const videos = data.getVideos(this.data.canManage).map(v => {
      const w = watch[v._id];
      const lec = lecMap[v.lecturerId] || {};
      const durSec = parseDur(v.duration);
      return Object.assign({}, v, {
        lecturerName: lec.name || '—',
        watch: w,
        watchPct: w && durSec ? Math.min(100, Math.round(w.seconds / durSec * 100)) : (w && w.finished ? 100 : 0)
      });
    }).filter(v => !kw || v.title.indexOf(kw) > -1);
    const groups = this.data.courses
      .slice().sort((a, b) => (b.sort || 0) - (a.sort || 0))
      .map(c => {
        const lec = lecMap[c.lecturerId] || {};
        return Object.assign({}, c, {
          lecturerName: lec.name || '', lecturerTitle: lec.title || '',
          videos: videos.filter(v => v.courseId === c._id).sort((a, b) => (b.sort || 0) - (a.sort || 0))
        });
      })
      .filter(g => !kw || g.videos.length);
    this.setData({ courseGroups: groups });
  },

  onKw(e) { this.setData({ kw: e.detail.value }); this.buildGroups(); },

  /* ---------- 播放 ---------- */
  play(e) {
    const id = e.currentTarget.dataset.id;
    let v = null;
    this.data.courseGroups.forEach(g => g.videos.forEach(x => { if (x._id === id) v = x; }));
    if (!v) return;
    this._durSec = parseDur(v.duration);
    this._lastSent = 0;
    this.setData({
      playShow: true, playing: v,
      playSrc: v.fileID || DEMO_VIDEO
    });
  },
  closePlayer() { this.setData({ playShow: false, playSrc: '' }); this.refresh(); },
  onTime(e) {
    const cur = e.detail.currentTime;
    // 每 5 秒记录一次观看进度
    if (cur - this._lastSent >= 5) {
      this._lastSent = cur;
      const dur = e.detail.duration || this._durSec;
      data.recordWatch(this.data.playing._id, cur, dur);
    }
  },
  onEnded(e) {
    const dur = e.detail.duration || this._durSec;
    data.recordWatch(this.data.playing._id, dur, dur);
    wx.showToast({ title: '已完播，计入统计', icon: 'none' });
  },
  onVideoErr() {
    wx.showModal({
      title: '视频无法播放',
      content: data.isCloud()
        ? '该视频可能已删除或文件损坏。'
        : '当前是演示模式，示例视频加载失败（网络原因）。真实环境使用云存储视频，无此问题。',
      showCancel: false
    });
  },

  /* ---------- 上传（管理员/教学秘书） ---------- */
  openUpload() {
    if (!this.data.canUpload) { wx.showToast({ title: '仅管理员/教学秘书可上传', icon: 'none' }); return; }
    this.setData({ upShow: true, up: { title: '', intro: '', sort: '', fileName: '', filePath: '', duration: '' } });
  },
  closeUpload() { this.setData({ upShow: false }); },
  onUpField(e) { this.setData({ ['up.' + e.currentTarget.dataset.k]: e.detail.value }); },
  onUpCourse(e) { this.setData({ upCourseIdx: Number(e.detail.value) }); },
  onUpLec(e) { this.setData({ upLecIdx: Number(e.detail.value) }); },

  pickVideo() {
    wx.chooseMedia({
      count: 1, mediaType: ['video'], sourceType: ['album', 'camera'], maxDuration: 7200,
      success: (r) => {
        const f = r.tempFiles[0];
        this.setData({
          'up.fileName': (f.tempFilePath || '').split('/').pop() || '已选择视频',
          'up.filePath': f.tempFilePath,
          'up.duration': f.duration ? fmtDur(f.duration) : ''
        });
      },
      fail: () => {}
    });
  },

  confirmUpload() {
    const up = this.data.up;
    if (!up.title.trim()) { wx.showToast({ title: '请填写视频标题', icon: 'none' }); return; }
    if (!up.filePath) { wx.showToast({ title: '请选择视频文件', icon: 'none' }); return; }
    const payload = {
      title: up.title.trim(),
      courseId: (this.data.courses[this.data.upCourseIdx] || {})._id || '',
      lecturerId: (this.data.lecturers[this.data.upLecIdx] || {})._id || '',
      intro: up.intro.trim(), sort: up.sort || 0, duration: up.duration || ''
    };
    if (!data.isCloud()) {
      // 演示模式：本地记录，无法真实播放
      data.publishVideo(Object.assign({}, payload, { fileID: '' })).then(() => {
        this.setData({ upShow: false });
        this.refresh();
        wx.showModal({ title: '已记录（演示模式）', content: '演示模式下视频不会真实上传。开通云开发后，此处会把视频存入云存储并全员可见。', showCancel: false });
      });
      return;
    }
    wx.showLoading({ title: '上传视频中…', mask: true });
    wx.cloud.uploadFile({
      cloudPath: `watchtower/${Date.now()}_${up.fileName}`, filePath: up.filePath,
      success: (res) => {
        payload.fileID = res.fileID;
        data.publishVideo(payload).then(() => {
          wx.hideLoading();
          this.setData({ upShow: false });
          this.refresh();
          wx.showToast({ title: '视频已发布', icon: 'success' });
        }).catch((err) => { wx.hideLoading(); wx.showToast({ title: err.message, icon: 'none' }); });
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '视频上传失败', icon: 'none' }); }
    });
  },

  delVideo(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除视频', content: '确认删除该视频？观看记录会保留。', confirmText: '删除', confirmColor: '#E85440',
      success: (r) => {
        if (!r.confirm) return;
        data.deleteVideo(id).then(() => {
          this.refresh();
          wx.showToast({ title: '已删除', icon: 'none' });
        }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
      }
    });
  }
});

function parseDur(s) {
  const m = String(s || '').match(/(\d+):(\d+)/);
  return m ? (+m[1]) * 60 + (+m[2]) : 0;
}
function fmtDur(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
