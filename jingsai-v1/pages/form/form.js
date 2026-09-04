// pages/form/form.js —— S5 报名表单（个人/组队 + 自动带入 + 指导教师选择 + 附件 + 防重复提交）
const app = getApp();
const data = require('../../utils/data');

Page({
  data: {
    sbh: 24,
    comp: null,
    mode: 'team',            // solo | team
    teamName: '',
    members: [],
    memberInput: '',
    advisors: [],            // 指导教师 + 辅导员 合并列表
    advisorIdx: -1,
    intro: '', github: '', awards: '',
    planFile: '', planFileID: '',
    uploading: false,
    submitting: false,
    profile: null
  },

  onLoad(options) {
    data.ready().then(() => {
      const comp = data.getCompetition(options.id);
      if (!comp) { wx.navigateBack(); return; }
      const user = app.globalData.user || data.getUser() || data.mockUser();
      const advisors = data.getTeachers();
      this.setData({
        sbh: app.globalData.sbh,
        comp,
        profile: user,
        advisors,
        members: [{ name: user.name, lead: true }]
      });
    });
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.m;
    this.setData({ mode });
  },

  onTeamName(e) { this.setData({ teamName: e.detail.value }); },
  onIntro(e) { this.setData({ intro: e.detail.value }); },
  onGithub(e) { this.setData({ github: e.detail.value }); },
  onAwards(e) { this.setData({ awards: e.detail.value }); },
  onMemberInput(e) { this.setData({ memberInput: e.detail.value }); },

  pickAdvisor(e) { this.setData({ advisorIdx: Number(e.detail.value) }); },

  addMember() {
    const { members, comp, memberInput } = this.data;
    const name = (memberInput || '').trim();
    if (!name) { wx.showToast({ title: '请输入队员姓名', icon: 'none' }); return; }
    if (members.length >= comp.teamMax) { wx.showToast({ title: `最多 ${comp.teamMax} 人`, icon: 'none' }); return; }
    if (members.some(m => m.name === name)) { wx.showToast({ title: '该队员已在名单中', icon: 'none' }); return; }
    this.setData({ members: members.concat([{ name, lead: false }]), memberInput: '' });
  },

  removeMember(e) {
    const idx = e.currentTarget.dataset.idx;
    if (this.data.members[idx].lead) { wx.showToast({ title: '队长不可移除', icon: 'none' }); return; }
    const members = this.data.members.slice();
    members.splice(idx, 1);
    this.setData({ members });
  },

  upload() {
    if (this.data.uploading) return;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      success: (res) => {
        const f = res.tempFiles[0];
        if (f.size > 10 * 1024 * 1024) { wx.showToast({ title: '文件不能超过 10MB', icon: 'none' }); return; }
        this.setData({ uploading: true });
        wx.showLoading({ title: '上传中…' });
        if (data.isCloud()) {
          wx.cloud.uploadFile({
            cloudPath: `plans/${Date.now()}_${f.name}`,
            filePath: f.path,
            success: (r) => {
              wx.hideLoading();
              this.setData({ uploading: false, planFile: f.name, planFileID: r.fileID });
            },
            fail: () => {
              wx.hideLoading();
              this.setData({ uploading: false, planFile: f.name + '（云端未就绪，本地记录）' });
            }
          });
        } else {
          setTimeout(() => {
            wx.hideLoading();
            this.setData({ uploading: false, planFile: f.name + '（演示模式）' });
          }, 600);
        }
      },
      fail: () => { /* 用户取消选择 */ }
    });
  },

  submit() {
    if (this.data.submitting) return;  // 防重复点击
    const { comp, mode, teamName, members, advisorIdx, advisors, intro, github, awards, planFile, planFileID } = this.data;
    const advisor = advisors[advisorIdx];
    if (mode === 'team' && !teamName.trim()) { this.err('队伍名称还没填'); return; }
    if (members.length < comp.teamMin) { this.err(`至少 ${comp.teamMin} 人成队`); return; }
    if (!advisor && comp.track !== 'teacher') { this.err('请选择指导教师或辅导员（第1级审批人）'); return; }

    wx.showModal({
      title: '提交确认',
      content: `${comp.title}\n${mode === 'team' ? teamName + '队 · ' + members.length + ' 人' : '个人报名'}\n审批人：${advisor ? advisor.name : '教学秘书'}\n提交后锁定为 v1，进入审批流。`,
      confirmText: '提交报名', cancelText: '再改改',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({ submitting: true });
        wx.showLoading({ title: '提交中…', mask: true });
        data.submitRegistration({
          compId: comp._id, mode,
          teamName: mode === 'team' ? teamName.trim() : '',
          members,
          teacherId: advisor ? advisor._id : '',
          teacherName: advisor ? advisor.name : '',
          intro, github, awards,
          planFile: planFile || '（后补）', planFileID
        }).then((reg) => {
          wx.hideLoading();
          app.globalData.currentReg = reg;
          wx.showModal({
            title: '已受理',
            content: `受理编号：${reg.regNo} · v1\n${advisor ? advisor.name : '教学秘书'} 将收到待审提醒`,
            showCancel: false, confirmText: '查看进度',
            success: () => wx.switchTab({ url: '/pages/profile/profile' })
          });
        }).catch((e) => {
          wx.hideLoading();
          this.setData({ submitting: false });
          wx.showToast({ title: e.message || '提交失败，请重试', icon: 'none', duration: 2000 });
        });
      }
    });
  },

  err(msg) { wx.showToast({ title: msg, icon: 'none', duration: 1800 }); },
  back() { wx.navigateBack(); }
});
