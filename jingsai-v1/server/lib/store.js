// server/lib/store.js —— JSON 文件持久化（原子写穿，零外部依赖）
// 数据落在 server/data/db.json；可用环境变量 JS_DB_FILE 覆盖。
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.JS_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = process.env.JS_DB_FILE || path.join(DATA_DIR, 'db.json');

/** 读库：文件不存在或损坏返回 null（由调用方走种子引导） */
function load() {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const db = JSON.parse(raw);
    return db && typeof db === 'object' ? db : null;
  } catch (e) {
    console.warn('[store] 读取 db.json 失败（将重新播种）: ' + e.message);
    return null;
  }
}

/** 原子写穿：先写临时文件再 rename，避免写一半损坏 */
function save(db) {
  if (!db) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE);
  return DB_FILE;
}

module.exports = { load, save, DATA_DIR, DB_FILE };
