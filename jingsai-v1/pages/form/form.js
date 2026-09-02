// pages/form/form.js —— S5 报名表单（公文纸版式）
const app = getApp();
const data = require('../../utils/data');

// 演示用的同班同学池（正式版从 users 集合按学院检索）
const CLASSMATES = [
  { name: '王一飞', avatar: 'https://picsum.photos/seed/js-a2/80/80' },
  { name: '沈星回', avatar: 'https://picsum.photos/seed/js-a3/80/80' },
  { name: '高鸣',   avatar: 'https://picsum.photos/seed/js-a4/80/80' },
  { name: '赵野',   avatar: 'https://picsum.photos/seed/js-a5/80/80' },
  { name: '叶栖迟', avatar: 'https://picsum.photos/seed/js-a6/80/80' }
];

Page({
  data: {
    sbh: 24,
    comp: null,
    teamName: '',
    members: [],
    teachers: [],
    teacherId: '',
    planFile: '',
    planFileId: '',
    uploading: false,
    pool: []
  },

  onLoad(options) {
    const comp = data.getCompetition(options.id);
    if (!comp) { wx.navigateBack(); return; }
    const user = app.globalData.user || data.mockUser();
    this.setData({
      sbh: app.globalData.sbh,
      comp,
      members: [{ name: user.name, lead: true, avatar: user.avatar }],
      teachers: data.getTeachers(),
      pool: CLASSMATES.slice()
    });
  },

  onTeamName(e) { this.setData({ teamName: e.detail.value }); },

  pickTeacher(e) {
    this.setData({ teacherId: e.currentTarget.dataset.id });
  },

  addMember() {
    const { members, pool, comp } = this.data;
    if (members.length >= comp.teamMax) {
      wx.showToast({ title: `最多 ${comp.teamMax} 人`, icon: 'none' });
      return;
    }
    if (!pool.length) {
      wx.showToast({ title: '同学池已空（演示限制）', icon: 'none' });
      return;
    }
    const m = pool.shift();
    this.setData({
      members: members.concat([m]),
      pool
    });
  },

  removeMember(e) {
    const idx = e.currentTarget.dataset.idx;
    if (this.data.members[idx].lead) {
      wx.showToast({ title: '队长不可移除', icon: 'none' });
      return;
    }
    const members = this.data.members.slice();
    const [m] = members.splice(idx, 1);
    this.setData({ members, pool: this.data.pool.concat([m]) });
  },

  upload() {
    // V1.1：云开发可用时走 wx.chooseMessageFile → wx.cloud.uploadFile；
    // 否则模拟上传（演示模式），保证流程可跑。
    this.setData({ uploading: true });
    if (app.globalData.cloudReady && wx.chooseMessageFile) {
      wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['pdf', 'doc', 'docx', 'zip', 'rar'],
        success: (res) => {
          const f = res.tempFiles[0];
          const cloudPath = `plans/${Date.now()}_${f.name}`;
          wx.showLoading({ title: '上传云端…' });
          wx.cloud.uploadFile({
            cloudPath,
            filePath: f.path,
            success: (up) => {
              wx.hideLoading();
              this.setData({
                uploading: false,
                planFile: `${f.name} · ${(f.size / 1048576).toFixed(1)}MB`,
                planFileId: up.fileID
              });
            },
            fail: () => this.simulate()
          });
        },
        fail: () => { this.setData({ uploading: false }); }
      });
    } else {
      this.simulate();
    }
  },

  simulate() {
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        uploading: false,
        planFile: `${this.data.teamName || '队伍'}_计划书_v1.pdf · 1.2MB`,
        planFileId: ''
      });
    }, 800);
  },

  submit() {
    const { comp, teamName, members, teacherId, planFile } = this.data;
    const teacher = this.data.teachers.find(t => t._id === teacherId);
    if (!teamName.trim()) { this.err('队伍名称还没填'); return; }
    if (members.length < comp.teamMin) { this.err(`至少 ${comp.teamMin} 人成队`); return; }
    if (!teacher) { this.err('还没选定一级审批人（指导教师）'); return; }

    wx.showModal({
      title: '提交确认',
      content: `${comp.title}\n${teamName}队 · ${members.length} 人 · 指导教师 ${teacher.name}\n提交后锁定为 v1，进入${data.CHAIN_NAMES[comp.level]}。`,
      confirmText: '提交报名',
      cancelText: '再改改',
      success: (res) => {
        if (!res.confirm) return;
        const reg = data.submitRegistration({
          compId: comp._id,
          teamName: teamName.trim(),
          members,
          teacherId: teacher._id,
          teacherName: teacher.name,
          planFile: planFile || '（后补）'
        });
        app.globalData.currentReg = reg;
        wx.showModal({
          title: '已受理',
          content: `受理章已盖：${reg.regNo} · v1\n指导教师 ${teacher.name} 将收到待审提醒`,
          showCancel: false,
          confirmText: '查看进度',
          success: () => {
            wx.switchTab({ url: '/pages/approval/approval' });
          }
        });
      }
    });
  },

  err(msg) {
    wx.showToast({ title: msg, icon: 'none', duration: 1800 });
  },

  back() { wx.navigateBack(); }
});
