// pages/export/export.js —— 数据导出（教师/管理权限，按角色自动过滤）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

const FULL_ROLES = ['admin', 'dean', 'vicedean', 'secretary', 'dept'];
const TEACHER_ROLES = ['teacher', 'counselor'];
const ALLOWED_ROLES = FULL_ROLES.concat(TEACHER_ROLES);

Page({
  data: {
    sbh: 24,
    user: null,
    roleLabel: '',
    canFull: false,
    isTeacher: false,
    permissionNote: '',

    /* 下拉选项 */
    competitions: [],          // [{ _id, title }]
    teacherOpts: [],           // [{ _id, name }]
    trainingOpts: [],          // [{ _id, title }]
    statusOpts: ['全部', '审批中', '已通过', '已驳回', '已撤回'],
    awardOpts: ['全部'].concat(CFG.CERT_AWARDS || []),
    weekdayOpts: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    slotOpts: (CFG.SLOT_MAP || []).map(s => s.label),
    semesterOpts: CFG.SEMESTERS || [],

    /* 当前选中 */
    compIdx: 0, compLabel: '全部竞赛',
    oneCompIdx: 0, oneCompLabel: '选择竞赛',
    statusIdx: 0, statusLabel: '全部状态',
    expenseStatusIdx: 0, expenseStatusLabel: '全部状态',
    awardIdx: 0, awardLabel: '全部等级',
    teacherIdx: 0, teacherLabel: '选择教师',
    trainingIdx: 0, trainingLabel: '全部培训',
    weekdayIdx: 0, weekdayLabel: '周一',
    slotIdx: 0, slotLabel: (CFG.SLOT_MAP || [{}])[0].label || '第1-2节',
    semesterIdx: 0, semesterLabel: (CFG.SEMESTERS || ['当前学期'])[0],

    /* 顶部概览统计 */
    stats: { total: 0, thisMonth: 0, exports: 0, awards: 0, advisees: 0 }
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },

  onShow() {
    data.ready().then(() => this.load());
  },

  load() {
    const user = app.globalData.user || data.getUser() || data.mockUser();
    const role = user.role;
    const authorized = ALLOWED_ROLES.indexOf(role) > -1;
    const canFull = FULL_ROLES.indexOf(role) > -1;
    const isTeacher = TEACHER_ROLES.indexOf(role) > -1;

    // 无权直接展示闸门页，不加载下拉
    if (!authorized) {
      this.setData({ user, authorized: false, roleLabel: '' });
      return;
    }

    const competitions = data.getCompetitions().map(c => ({ _id: c._id, title: c.title }));
    const trainings = data.getTrainings().map(t => ({ _id: t._id, title: t.title }));
    const teachers = data.getTeachers().map(t => ({ _id: t._id, name: t.name }));

    const exportLogs = data.getLogs().filter(l => l.action === '导出Excel');
    const thisMonthTag = new Date().toISOString().slice(0, 7); // YYYY-MM
    const myRegs = data.getMyRegistrations();
    const monthNew = myRegs.filter(r => (r.createdAt || '').indexOf(thisMonthTag) === 0).length;

    const awards = data.getPubCerts().length;
    const advisees = this._countAdvisees(user);

    let permissionNote = '';
    if (canFull) {
      permissionNote = '管理员 / 学院领导，可导出全院数据。';
    } else {
      permissionNote = '教师身份，导出范围已自动限定为你指导的学生。';
    }

    this.setData({
      user, authorized: true, canFull, isTeacher,
      roleLabel: CFG.ROLE_NAMES[role] || '用户',
      permissionNote,
      competitions, trainings, teacherOpts: teachers,
      stats: {
        total: myRegs.length,
        thisMonth: monthNew,
        exports: exportLogs.length,
        awards,
        advisees
      }
    });
  },

  /** 估算指导学生数（演示模式从报名单的 teacherName 字段聚合） */
  _countAdvisees(user) {
    const myName = user && user.name;
    if (!myName) return 0;
    const seen = new Set();
    data.getMyRegistrations().forEach(r => { if (r.teacherName === myName) seen.add(r.applicantName); });
    // 演示模式只有本人报名；估算值仅做 UI 提示
    return seen.size || (this.data.isTeacher ? 1 : 0);
  },

  /* ---------- 筛选 ---------- */
  onCompPick(e) {
    const i = Number(e.detail.value);
    this.setData({ compIdx: i, compLabel: i === 0 ? '全部竞赛' : this.data.competitions[i - 1].title });
  },
  onOneCompPick(e) {
    const i = Number(e.detail.value);
    this.setData({ oneCompIdx: i, oneCompLabel: i === 0 ? '选择竞赛' : this.data.competitions[i - 1].title });
  },
  onStatusPick(e) {
    const i = Number(e.detail.value);
    this.setData({ statusIdx: i, statusLabel: this.data.statusOpts[i] });
  },
  onExpenseStatusPick(e) {
    const i = Number(e.detail.value);
    this.setData({ expenseStatusIdx: i, expenseStatusLabel: this.data.statusOpts[i] });
  },
  onAwardPick(e) {
    const i = Number(e.detail.value);
    this.setData({ awardIdx: i, awardLabel: this.data.awardOpts[i] });
  },
  onTeacherPick(e) {
    const i = Number(e.detail.value);
    this.setData({ teacherIdx: i, teacherLabel: i === 0 ? '选择教师' : this.data.teacherOpts[i - 1].name });
  },
  onTrainingPick(e) {
    const i = Number(e.detail.value);
    this.setData({ trainingIdx: i, trainingLabel: i === 0 ? '全部培训' : this.data.trainingOpts[i - 1].title });
  },
  onWeekdayPick(e) {
    const i = Number(e.detail.value);
    this.setData({ weekdayIdx: i, weekdayLabel: this.data.weekdayOpts[i] });
  },
  onSlotPick(e) {
    const i = Number(e.detail.value);
    this.setData({ slotIdx: i, slotLabel: this.data.slotOpts[i] });
  },
  onSemesterPick(e) {
    const i = Number(e.detail.value);
    this.setData({ semesterIdx: i, semesterLabel: this.data.semesterOpts[i] });
  },

  /* ---------- 导出动作 ---------- */
  _do(kind, extra, label) {
    if (this._busy) return;
    this._busy = true;
    wx.showLoading({ title: `生成 ${label}…`, mask: true });
    data.exportXlsx(kind, extra).then((res) => {
      this._busy = false;
      wx.hideLoading();
      // 演示模式：fileID 是本地 .xlsx 路径，直接 openDocument 打开
      if (res && res.__demo) {
        return data.openXlsx(res.fileID).catch((err) => {
          // xlsx 写失败了 → 回退 CSV 预览
          return this._showDemoPreview({
            csv: res.csv,
            rowCount: res.rowCount,
            scope: res.scope,
            headers: res.headers,
            fileName: res.fileName
          }, label);
        });
      }
      return data.openXlsx(res.fileID);
    }).then(() => {
      data.getLogs();
      wx.showToast({ title: '已生成 · 可保存或转发', icon: 'success', duration: 2200 });
      this.load();
    }).catch((err) => {
      this._busy = false;
      wx.hideLoading();
      const msg = (err && (err.message || err.errMsg)) || String(err);
      wx.showModal({ title: `${label} 导出失败`, content: msg, showCancel: false });
    });
  },

  _showDemoPreview(res, label) {
    this._demoShown = true;
    // 预览：header + 前 8 行
    const previewLines = (res.csv || '').split('\n').slice(0, 9).join('\n');
    const moreText = res.rowCount > 8 ? `\n… 共 ${res.rowCount} 行（复制后查看完整数据）` : '';
    // xlsxErr 放在最前面：用户最容易看的位置
    const errTip = res.xlsxErr
      ? `\n⚠️ xlsx 写盘失败：${res.xlsxErr.slice(0, 140)}\n（已自动回退为 CSV 预览 + 复制；开发者工具 Console 有详细日志）`
      : '';
    const content = `${errTip}\n已按【${res.scope}】过滤 ${res.rowCount} 条。\n\n列：${(res.headers || []).join(' / ')}\n\n${previewLines}${moreText}\n\n点击「复制 CSV」复制后，到 Excel/WPS 粘贴即可。\n\n部署云函数后将自动升级为真 .xlsx 文件。`;
    return new Promise((resolve) => {
      wx.showModal({
        title: `${label}（演示模式）`,
        content,
        confirmText: '复制 CSV',
        cancelText: '关闭',
        success: (r) => {
          if (r.confirm) {
            wx.setClipboardData({ data: res.csv }).then(() => {
              wx.showToast({ title: '已复制，去 Excel 粘贴', icon: 'success' });
            });
          }
          this.load(); // 刷新"累计导出"
          resolve();
        },
        fail: () => resolve()
      });
    });
  },

  exportRegs() {
    const comp = this.data.compIdx === 0 ? '' : this.data.competitions[this.data.compIdx - 1]._id;
    const status = this.data.statusIdx === 0 ? '' : this._statusKey(this.data.statusIdx);
    this._do('regs', { compId: comp, status }, '报名名单');
  },

  exportOneComp() {
    if (this.data.oneCompIdx === 0) {
      wx.showToast({ title: '请先选择一个竞赛', icon: 'none' });
      return;
    }
    const comp = this.data.competitions[this.data.oneCompIdx - 1];
    this._do('oneCompRegs', { compId: comp._id }, comp.title + ' 明细');
  },

  exportAwards() {
    const award = this.data.awardIdx === 0 ? '' : this.data.awardOpts[this.data.awardIdx];
    this._do('studentAwards', { award }, '获奖名单');
  },

  exportAdvisees() {
    if (this.data.isTeacher) {
      this._do('myAdvisees', {}, '指导学生');
    } else if (this.data.canFull) {
      if (this.data.teacherIdx === 0) {
        wx.showToast({ title: '请先选择一位教师', icon: 'none' });
        return;
      }
      const t = this.data.teacherOpts[this.data.teacherIdx - 1];
      this._do('myAdvisees', { teacherName: t.name }, t.name + ' 指导学生');
    }
  },

  exportTrainings() {
    const trainingId = this.data.trainingIdx === 0 ? '' : this.data.trainingOpts[this.data.trainingIdx - 1]._id;
    this._do('trainingSignups', { trainingId }, '培训记录');
  },

  exportFree() {
    const weekday = this.data.weekdayIdx + 1; // 1-7
    const slotLabel = this.data.slotOpts[this.data.slotIdx];
    const slot = (CFG.SLOT_MAP || []).find(s => s.label === slotLabel);
    this._do('free', { weekday, slots: slot ? slot.slots : [1, 2], semester: this.data.semesterLabel }, '空闲学生');
  },

  exportExpenses() {
    const status = this.data.expenseStatusIdx === 0 ? '' : this._statusKey(this.data.expenseStatusIdx);
    this._do('expenses', { status }, '经费台账');
  },

  exportSchedules() {
    this._do('schedules', { semester: this.data.semesterLabel }, '课表明细');
  },

  /** 「全部 / 审批中 / 已通过 / ...」下标 → 后端 status key */
  _statusKey(idx) {
    return ['', 'approving', 'passed', 'rejected', 'withdrawn'][idx] || '';
  }
});