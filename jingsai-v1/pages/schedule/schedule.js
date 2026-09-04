// pages/schedule/schedule.js —— S13 我的课表（12 小节周视图 + 手动录入 + 空闲查询）
const app = getApp();
const data = require('../../utils/data');
const CFG = require('../../utils/config');

/* ---- CSV 课表本地解析（与云函数口径一致） ---- */
function csvSlotNums(text) {
  const t = String(text || '');
  const range = t.match(/(\d{1,2})\s*[-~—–]\s*(\d{1,2})/);
  let nums = [];
  if (range) { for (let i = +range[1]; i <= +range[2]; i++) nums.push(i); }
  else { (t.match(/\d{1,2}/g) || []).forEach(n => nums.push(+n)); }
  return nums.filter((n, i) => n >= 1 && n <= 12 && nums.indexOf(n) === i);
}
function csvWeekdayNum(text) {
  const t = String(text || '');
  const cn = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
  for (const k in cn) { if (t.indexOf(k) > -1) return cn[k]; }
  const d = t.match(/[1-7]/);
  return d ? +d[0] : 0;
}
function parseCsvSchedule(text) {
  const rows = String(text || '').split(/\r?\n/).filter(l => l.trim()).map(l => l.split(/[,\t]/).map(s => s.trim()));
  let hi = -1, col = {};
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const c = {};
    rows[i].forEach((cell, j) => {
      if (/课程|名称|科目/.test(cell)) c.name = j;
      if (/星期|周几/.test(cell) || cell === '周') c.weekday = j;
      if (/节次|节数|时间/.test(cell) || cell === '节') c.slots = j;
      if (/地点|教室|场所/.test(cell)) c.place = j;
      if (/教师|老师/.test(cell)) c.teacher = j;
    });
    if (c.name !== undefined && c.weekday !== undefined && c.slots !== undefined) { hi = i; col = c; break; }
  }
  if (hi < 0) return [];
  const courses = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[col.name] || '').trim();
    const weekday = csvWeekdayNum(r[col.weekday]);
    const slots = csvSlotNums(r[col.slots]);
    if (!name || !weekday || !slots.length) continue;
    courses.push({
      name,
      teacher: col.teacher !== undefined ? (r[col.teacher] || '').trim() : '',
      place: col.place !== undefined ? (r[col.place] || '').trim() : '',
      weekday, slots,
      slotLabel: slots.length > 1 ? `第${slots[0]}-${slots[slots.length - 1]}节` : `第${slots[0]}节`
    });
  }
  return courses;
}

Page({
  noop() {}, // 阻止弹窗点击穿透（勿删）
  data: {
    sbh: 24,
    semesters: CFG.SEMESTERS,
    semesterIdx: 0,
    weekdays: CFG.WEEKDAYS,
    periods: CFG.PERIODS,
    slotMap: CFG.SLOT_MAP,
    grid: [],               // 12 行 × 7 列 的渲染矩阵
    courses: [],
    canQueryFree: false,
    // 手动添加
    addShow: false,
    add: { name: '', teacher: '', place: '', weekday: 1, slotIdx: 0 },
    // Excel/CSV 导入预览
    impShow: false, impCourses: [],
    weekdayNames: CFG.WEEKDAYS,
    // 空闲查询
    queryShow: false,
    qWeekday: 1,
    qSlotIdx: 0,
    freeResult: null
  },

  onLoad() { this.setData({ sbh: app.globalData.sbh }); },
  onShow() { data.ready().then(() => this.refresh()); },

  refresh() {
    const user = data.getUser() || app.globalData.user || {};
    const semester = CFG.SEMESTERS[this.data.semesterIdx];
    const sch = data.getSchedule(semester);
    this.setData({
      courses: sch ? sch.courses : [],
      canQueryFree: ['teacher', 'counselor', 'admin', 'secretary'].indexOf(user.role) > -1
    });
    this.buildGrid();
  },

  /** 构建 12×7 渲染矩阵：每个格子找覆盖它的课程（跨小节只显示在第一节） */
  buildGrid() {
    const courses = this.data.courses || [];
    const grid = [];
    for (let p = 1; p <= 12; p++) {
      const row = { period: CFG.PERIODS[p - 1], cells: [] };
      for (let w = 1; w <= 7; w++) {
        const c = courses.find(c => Number(c.weekday) === w && (c.slots || []).indexOf(p) > -1);
        row.cells.push({
          course: c || null,
          start: c ? (c.slots || [])[0] === p : false
        });
      }
      grid.push(row);
    }
    this.setData({ grid });
  },

  switchSemester(e) { this.setData({ semesterIdx: Number(e.detail.value) }); this.refresh(); },

  /* ---- 上传课表（文件） ---- */
  uploadFile() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['jpg', 'png', 'pdf', 'xls', 'xlsx', 'doc', 'docx'],
      success: (res) => {
        const f = res.tempFiles[0];
        const semester = CFG.SEMESTERS[this.data.semesterIdx];
        const doSave = (fileID) => {
          data.saveSchedule({
            semester,
            courses: this.data.courses,
            source: 'upload', fileID
          }).then(() => {
            wx.showModal({
              title: '课表文件已上传',
              content: 'AI 解析结果需要人工核对：请用下方「手动添加」把课程补录进周视图，系统才能精确计算你的空闲时间。',
              confirmText: '去添加课程', showCancel: false,
              success: () => this.openAdd()
            });
          });
        };
        if (data.isCloud()) {
          wx.showLoading({ title: '上传中…' });
          wx.cloud.uploadFile({
            cloudPath: `schedules/${Date.now()}_${f.name}`, filePath: f.path,
            success: (r) => { wx.hideLoading(); doSave(r.fileID); },
            fail: () => { wx.hideLoading(); doSave(''); }
          });
        } else { doSave(''); }
      },
      fail: () => {}
    });
  },

  /* ---- Excel / CSV 课表导入（自动识别课程名/星期/节次/地点/教师列） ---- */
  importExcel() {
    wx.chooseMessageFile({
      count: 1, type: 'file', extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const f = res.tempFiles[0];
        // CSV：前端本地解析，无需云开发
        if (/\.csv$/i.test(f.name)) {
          wx.getFileSystemManager().readFile({
            filePath: f.path, encoding: 'utf8',
            success: (r) => {
              const courses = parseCsvSchedule(r.data);
              if (!courses.length) {
                wx.showModal({ title: '没有识别到课程', content: '请确保表格有「课程名称 / 星期 / 节次」三列表头。', showCancel: false });
                return;
              }
              this.setData({ impShow: true, impCourses: courses });
            },
            fail: () => wx.showToast({ title: '文件读取失败', icon: 'none' })
          });
          return;
        }
        // xlsx / xls：上传云存储后由云函数解析
        if (!data.isCloud()) {
          wx.showModal({
            title: '需要开通云开发',
            content: 'Excel 解析在云端运行，开通云开发并部署云函数后即可使用。当前可以改用 CSV 文件直接导入，或用「手动添加」。',
            showCancel: false
          });
          return;
        }
        wx.showLoading({ title: '解析中…', mask: true });
        wx.cloud.uploadFile({
          cloudPath: `schedules/import_${Date.now()}_${f.name}`, filePath: f.path,
          success: (up) => {
            data.parseSchedule(up.fileID).then((courses) => {
              wx.hideLoading();
              this.setData({ impShow: true, impCourses: courses });
            }).catch((err) => {
              wx.hideLoading();
              wx.showModal({ title: '解析失败', content: String(err.message || err), showCancel: false });
            });
          },
          fail: () => { wx.hideLoading(); wx.showToast({ title: '上传失败', icon: 'none' }); }
        });
      },
      fail: () => {}
    });
  },

  closeImport() { this.setData({ impShow: false }); },

  confirmImport() {
    const incoming = this.data.impCourses;
    const existing = this.data.courses || [];
    // 跳过与现有课程冲突（同星期同节次）的行
    const merged = existing.slice();
    let skipped = 0;
    incoming.forEach((c) => {
      const clash = merged.some(x => Number(x.weekday) === c.weekday && (x.slots || []).some(s => c.slots.indexOf(s) > -1));
      if (clash) { skipped++; return; }
      merged.push(c);
    });
    const semester = CFG.SEMESTERS[this.data.semesterIdx];
    data.saveSchedule({ semester, courses: merged, source: 'excel' }).then(() => {
      this.setData({ impShow: false, courses: merged });
      this.buildGrid();
      wx.showModal({
        title: '导入完成',
        content: `已导入 ${incoming.length - skipped} 门课${skipped ? `，${skipped} 门因时间冲突被跳过` : ''}。`,
        showCancel: false
      });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  /* ---- 手动添加课程 ---- */
  openAdd() {
    this.setData({ addShow: true, add: { name: '', teacher: '', place: '', weekday: 1, slotIdx: 0 } });
  },
  closeAdd() { this.setData({ addShow: false }); },
  onAddField(e) { this.setData({ ['add.' + e.currentTarget.dataset.k]: e.detail.value }); },
  onAddWeekday(e) { this.setData({ 'add.weekday': Number(e.detail.value) + 1 }); },
  onAddSlot(e) { this.setData({ 'add.slotIdx': Number(e.detail.value) }); },

  saveAdd() {
    const a = this.data.add;
    if (!a.name.trim()) { wx.showToast({ title: '请填写课程名称', icon: 'none' }); return; }
    const slot = CFG.SLOT_MAP[a.slotIdx];
    const course = {
      name: a.name.trim(), teacher: a.teacher.trim(), place: a.place.trim(),
      weekday: a.weekday, slots: slot.slots, slotLabel: slot.label
    };
    // 冲突检测
    const clash = (this.data.courses || []).some(c =>
      Number(c.weekday) === course.weekday && (c.slots || []).some(s => course.slots.indexOf(s) > -1)
    );
    if (clash) { wx.showToast({ title: '该时段已有课程，冲突！', icon: 'none' }); return; }
    const courses = (this.data.courses || []).concat([course]);
    const semester = CFG.SEMESTERS[this.data.semesterIdx];
    data.saveSchedule({ semester, courses, source: 'manual' }).then(() => {
      this.setData({ addShow: false, courses });
      this.buildGrid();
      wx.showToast({ title: '已保存', icon: 'success' });
    }).catch((err) => wx.showToast({ title: err.message, icon: 'none' }));
  },

  removeCourse(e) {
    const idx = e.currentTarget.dataset.i;
    wx.showModal({
      title: '删除课程', content: '确认删除这门课？', confirmText: '删除', confirmColor: '#E85440',
      success: (res) => {
        if (!res.confirm) return;
        const courses = this.data.courses.slice();
        courses.splice(idx, 1);
        const semester = CFG.SEMESTERS[this.data.semesterIdx];
        data.saveSchedule({ semester, courses, source: 'manual' }).then(() => {
          this.setData({ courses });
          this.buildGrid();
        });
      }
    });
  },

  /* ---- 空闲学生查询（教师/辅导员） ---- */
  openQuery() {
    if (!this.data.canQueryFree) { wx.showToast({ title: '仅教师/辅导员可用', icon: 'none' }); return; }
    this.setData({ queryShow: true, freeResult: null });
  },
  closeQuery() { this.setData({ queryShow: false }); },
  onQWeekday(e) { this.setData({ qWeekday: Number(e.detail.value) + 1 }); },
  onQSlot(e) { this.setData({ qSlotIdx: Number(e.detail.value) }); },

  runQuery() {
    const slot = CFG.SLOT_MAP[this.data.qSlotIdx];
    wx.showLoading({ title: '计算中…', mask: true });
    data.freeStudents({
      weekday: this.data.qWeekday,
      slots: slot.slots,
      semester: CFG.SEMESTERS[this.data.semesterIdx]
    }).then((r) => {
      wx.hideLoading();
      this.setData({ freeResult: r });
    }).catch((err) => { wx.hideLoading(); wx.showToast({ title: err.message, icon: 'none' }); });
  },

  exportFree() {
    const r = this.data.freeResult;
    if (!r) return;
    // 云端模式：服务端生成真 Excel 并直接打开
    if (data.isCloud()) {
      wx.showLoading({ title: '生成 Excel…', mask: true });
      data.exportXlsx('free', {
        weekday: this.data.qWeekday,
        slots: CFG.SLOT_MAP[this.data.qSlotIdx].slots,
        semester: CFG.SEMESTERS[this.data.semesterIdx]
      }).then((res) => {
        wx.hideLoading();
        return data.openXlsx(res.fileID);
      }).catch((err) => {
        wx.hideLoading();
        wx.showModal({ title: '导出失败', content: String(err.message || err), showCancel: false });
      });
      return;
    }
    // 演示模式：复制 CSV 到剪贴板
    const csv = '姓名,学院,专业\n' + r.free.map(s => `${s.name},${s.college},${s.major}`).join('\n');
    wx.setClipboardData({
      data: csv,
      success: () => wx.showModal({
        title: '已复制 CSV 名单',
        content: '当前是演示模式，名单已复制到剪贴板，可粘贴到 Excel/WPS。开通云开发后此按钮会直接生成并打开真 Excel 文件。',
        showCancel: false
      })
    });
  }
});
