// pages/leave/leave.js —— S10 请假管理（发起 + 记录；审批在审批中心）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

Page({
  data: {
    sbh: 24,
    types: CFG.LEAVE_TYPES,
    typeIdx: 0,
    startTime: '',
    endTime: '',
    reason: '',
    attachment: '',
    submitting: false,
    leaves: []
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const leaves = data.getMyLeaves().map(l => Object.assign({}, l, {
      statusText: { approving: '待审批', passed: '已通过', rejected: '已驳回', withdrawn: '已撤回' }[l.status] || l.status
    }));
    this.setData({ leaves });
  },

  pickType(e) { this.setData({ typeIdx: Number(e.detail.value) }); },
  onStart(e) { this.setData({ startTime: e.detail.value }); },
  onEnd(e) { this.setData({ endTime: e.detail.value }); },
  onReason(e) { this.setData({ reason: e.detail.value }); },

  upload() {
    wx.chooseMessageFile({
      count: 1, type: 'file',
      success: (res) => {
        const f = res.tempFiles[0];
        if (data.isCloud()) {
          wx.showLoading({ title: '上传中…' });
          wx.cloud.uploadFile({
            cloudPath: `leaves/${Date.now()}_${f.name}`,
            filePath: f.path,
            success: (r) => { wx.hideLoading(); this.setData({ attachment: f.name, attachmentID: r.fileID }); },
            fail: () => { wx.hideLoading(); this.setData({ attachment: f.name }); }
          });
        } else {
          this.setData({ attachment: f.name + '（演示）' });
        }
      },
      fail: () => {}
    });
  },

  submit() {
    if (this.data.submitting) return;
    const { types, typeIdx, startTime, endTime, reason, attachment, attachmentID } = this.data;
    if (!startTime || !endTime) { wx.showToast({ title: '请选择请假起止时间', icon: 'none' }); return; }
    if (reason.trim().length < 5) { wx.showToast({ title: '事由至少写 5 个字', icon: 'none' }); return; }
    wx.showModal({
      title: '提交请假申请',
      content: `${types[typeIdx]} · ${startTime} 至 ${endTime}\n审批流：队长（手签）→ 辅导员（手签）`,
      confirmText: '提交',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        wx.showLoading({ title: '提交中…', mask: true });
        data.submitLeave({
          leaveType: types[typeIdx], startTime, endTime,
          reason: reason.trim(), attachment, attachmentID: this.data.attachmentID || ''
        }).then(() => {
          wx.hideLoading();
          this.setData({ submitting: false, reason: '', attachment: '' });
          this.refresh();
          wx.showToast({ title: '请假申请已提交', icon: 'success' });
        }).catch((err) => {
          wx.hideLoading();
          this.setData({ submitting: false });
          wx.showToast({ title: err.message, icon: 'none' });
        });
      }
    });
  },

  goApproval() { wx.navigateTo({ url: '/pages/approval/approval' }); }
});
