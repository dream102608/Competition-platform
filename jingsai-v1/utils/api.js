// utils/api.js —— V1.6 服务端远程接入层（Node HTTP 后端 · 远程优先 + 本地降级）
// 策略：所有调用走 wx.request；服务不可达 / 超时 / 返回错误时 reject（err.offline=true 标记），
//       页面捕获后可回退到 utils/data.js 的本地 Storage 引擎（离线可演示）。
// 配置：真机预览需 https + 合法域名；微信开发者工具勾选「不校验合法域名」可直连本机服务。
const TOKEN_KEY = 'js_srv_token';
const DFLT_BASE = 'http://127.0.0.1:3000';
let base = DFLT_BASE;
let token = '';

function loadToken() {
  try { token = wx.getStorageSync(TOKEN_KEY) || ''; } catch (e) { token = ''; }
  return token;
}
function saveToken(t) {
  token = t || '';
  try { wx.setStorageSync(TOKEN_KEY, token); } catch (e) { /* ignore */ }
}

function getBase() { return base; }
function setBase(u) { base = String(u || DFLT_BASE).replace(/\/+$/, ''); }

/**
 * 统一请求：resolve(服务端 data)；reject(Error)。offline=true 表示服务不可达（可降级本地）。
 * @param {string} method  GET|POST|DELETE
 * @param {string} path    e.g. /api/registrations
 * @param {object} [body]
 * @param {object} [opt]   { timeout=2500, auth=true }
 */
function request(method, path, body, opt) {
  const o = Object.assign({ timeout: 2500, auth: true }, opt || {});
  return new Promise((resolve, reject) => {
    if (!wx || typeof wx.request !== 'function') {
      const e = new Error('当前环境不支持 wx.request（离线降级）');
      e.offline = true;
      return reject(e);
    }
    const tokenNow = o.auth ? (token || loadToken()) : '';
    wx.request({
      url: base + path,
      method: String(method || 'GET').toUpperCase(),
      data: body || {},
      timeout: o.timeout,
      header: {
        'Content-Type': 'application/json',
        ...(tokenNow ? { Authorization: 'Bearer ' + tokenNow } : {})
      },
      success: (res) => {
        const d = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && d.ok) return resolve(d.data);
        const err = new Error((d && d.error) || ('服务端返回 ' + res.statusCode));
        err.status = res.statusCode;
        reject(err);
      },
      fail: (e) => {
        const err = new Error((e && e.errMsg) || '服务不可达');
        err.offline = true;                 // 网络/超时 → 页面降级本地引擎
        reject(err);
      }
    });
  });
}

/** 演示登录：POST /api/login {role} → 保存 token，返回 user */
function login(role) {
  return request('POST', '/api/login', { role: role || 'student' }, { auth: false })
    .then((data) => { saveToken(data.token); return data.user; });
}
function logout() {
  const p = request('POST', '/api/logout', {}, { auth: !!token }).catch(() => null);
  saveToken('');
  return p;
}
/** 健康检查：在线返回 {version, counts,...}；离线 reject（offline=true） */
function health() { return request('GET', '/api/health', null, { auth: false }); }

/* 快捷方法（供页面在接好线后直接调用，保持与 data.js 同名单方法的迁移手感） */
const api = {
  getBase, setBase, request, login, logout, health, token: () => token || loadToken(),
  registrations: () => request('GET', '/api/registrations'),
  verify: (id) => request('GET', '/api/registrations/' + id + '/verify'),
  messages: () => request('GET', '/api/messages'),
  posts: () => request('GET', '/api/posts'),
  myPosts: () => request('GET', '/api/posts/mine'),
  plazaState: () => request('GET', '/api/plaza/state'),
  reportStats: (comp) => request('GET', '/api/report/stats' + (comp && comp !== 'all' ? '?comp=' + encodeURIComponent(comp) : ''))
};

module.exports = api;
