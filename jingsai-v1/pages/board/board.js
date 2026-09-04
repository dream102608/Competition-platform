// pages/board/board.js —— 数据大屏：学院 2026 上半年竞赛真实数据可视化
const AW = require('../../utils/awarddata').AWARDS;

/** 对象 → 排序数组（带百分比条宽） */
function toBars(obj, color) {
  const arr = Object.keys(obj).map(name => ({ name, count: obj[name] }));
  arr.sort((a, b) => b.count - a.count);
  const max = arr.length ? arr[0].count : 1;
  return arr.map(it => Object.assign({}, it, { pct: Math.max(4, Math.round(it.count / max * 100)), color }));
}

Page({
  data: {
    sbh: 24,
    total: AW.totalAwards,
    national: AW.nationalCount,
    province: AW.provinceCount,
    compCount: AW.compCount,
    compBars: [],      // 竞赛获奖排行
    majorBars: [],     // 专业分布
    monthBars: [],     // 月份趋势
    nationalList: []   // 国家级获奖明细
  },

  onLoad() {
    this.setData({ sbh: getApp().globalData.sbh });
    // 竞赛排行（数组结构，含国家级数）
    const compMax = AW.byComp.length ? AW.byComp[0].count : 1;
    const compBars = AW.byComp.map(c => ({
      name: c.name, count: c.count, national: c.national,
      pct: Math.max(4, Math.round(c.count / compMax * 100))
    }));
    // 月份按时间顺序排
    const monthOrder = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const monthObj = {};
    monthOrder.forEach(m => { if (AW.byMonth[m]) monthObj[m] = AW.byMonth[m]; });
    this.setData({
      compBars,
      majorBars: toBars(AW.byMajor),
      monthBars: toBars(monthObj),
      nationalList: AW.national
    });
  }
});
