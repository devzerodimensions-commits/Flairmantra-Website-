// Connects the admin panel to the server. The admin keeps reading and writing
// localStorage as before; this module loads the server's data into localStorage
// before the admin opens, then sends every change back to the database.
import {API} from '../storefront/store';

const KV_KEYS = ['products', 'categories', 'site-settings', 'banners', 'home-sections', 'header-menu', 'social', 'pages', 'store-settings', 'coupons', 'users', 'media', 'page-layouts'];
const COLLECTIONS = {'fm-orders': 'orders', 'fm-inquiries': 'inquiries'};
const TRACKED = new Set([...KV_KEYS.map(k => `fm-${k}`), ...Object.keys(COLLECTIONS)]);

const rawSet = Storage.prototype.setItem;
const token = () => sessionStorage.getItem('fm-admin-token');
const parse = (text, fallback) => { try { return JSON.parse(text) ?? fallback; } catch { return fallback; } };
const byId = list => new Map((Array.isArray(list) ? list : []).filter(x => x?.id).map(x => [String(x.id), JSON.stringify(x)]));

const snapshots = {};
const timers = {};
const pending = new Set();
let failed = false;
let badge;

function status(text, tone) {
  if (!badge) {
    badge = document.createElement('div');
    badge.setAttribute('role', 'status');
    Object.assign(badge.style, {position: 'fixed', right: '16px', bottom: '16px', zIndex: 9999, padding: '8px 14px', borderRadius: '999px', font: '500 13px system-ui, sans-serif', boxShadow: '0 6px 20px rgba(0,0,0,.15)', transition: 'opacity .3s', pointerEvents: 'none'});
    document.body.appendChild(badge);
  }
  const tones = {busy: ['#fff7e0', '#6b4e00'], ok: ['#e6f4ea', '#1e6b3a'], error: ['#fdecea', '#a61b1b']};
  [badge.style.background, badge.style.color] = tones[tone];
  badge.textContent = text;
  badge.style.opacity = '1';
  clearTimeout(badge.hide);
  if (tone === 'ok') badge.hide = setTimeout(() => { badge.style.opacity = '0'; }, 2500);
}

async function api(path, method, body) {
  const r = await fetch(`${API}${path}`, {method, headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token()}`}, body: body && JSON.stringify(body)});
  if (r.status === 401) { sessionStorage.removeItem('fm-admin-token'); sessionStorage.removeItem('fm-admin'); status('Signed out — please sign in again', 'error'); throw new Error('unauthorized'); }
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || `Save failed (${r.status})`);
  return r.json();
}

async function push(key) {
  const text = localStorage.getItem(key);
  if (COLLECTIONS[key]) {
    const prev = snapshots[key] || new Map(), next = byId(parse(text, []));
    const upsert = [...next].filter(([id, json]) => prev.get(id) !== json).map(([, json]) => JSON.parse(json));
    const remove = [...prev.keys()].filter(id => !next.has(id));
    if (upsert.length || remove.length) await api(`/admin/${COLLECTIONS[key]}`, 'PUT', {upsert, remove});
    snapshots[key] = next;
  } else {
    if (text === snapshots[key]) return;
    await api(`/admin/kv/${key.slice(3)}`, 'PUT', {value: parse(text, null)});
    snapshots[key] = text;
  }
}

function schedule(key, delay = 700) {
  pending.add(key);
  status('Saving…', 'busy');
  clearTimeout(timers[key]);
  timers[key] = setTimeout(async () => {
    try {
      await push(key);
      pending.delete(key);
      if (!pending.size) { failed = false; status('All changes saved', 'ok'); }
    } catch (e) {
      if (e.message === 'unauthorized') return;
      failed = true;
      status(`Not saved: ${e.message}. Retrying…`, 'error');
      schedule(key, 5000);
    }
  }, delay);
}

// Returns 'ready' when the admin can open with server data, or 'login' when a sign-in is needed.
export async function bootstrap() {
  if (!token()) return 'login';
  let data;
  try { data = await api('/admin/sync', 'GET'); } catch (e) {
    if (e.message === 'unauthorized') return 'login';
    status('Can’t reach the server — changes are not being saved', 'error');
    return 'ready';
  }
  const toPush = [];
  for (const k of KV_KEYS) {
    const key = `fm-${k}`, server = data.kv?.[k];
    if (server !== undefined && server !== null) {
      const text = JSON.stringify(server);
      rawSet.call(localStorage, key, text);
      snapshots[key] = text;
    } else if (localStorage.getItem(key) !== null) toPush.push(key); // first sign-in: copy this browser's data up
  }
  for (const [key, name] of Object.entries(COLLECTIONS)) {
    const server = Array.isArray(data[name]) ? data[name] : [];
    const serverIds = new Set(server.map(x => String(x.id)));
    const localOnly = parse(localStorage.getItem(key), []).filter(x => x?.id && !serverIds.has(String(x.id)));
    snapshots[key] = byId(server);
    rawSet.call(localStorage, key, JSON.stringify([...server, ...localOnly]));
    if (localOnly.length) toPush.push(key);
  }
  Storage.prototype.setItem = function (key, value) {
    rawSet.call(this, key, value);
    if (this === localStorage && TRACKED.has(key)) schedule(key);
  };
  addEventListener('beforeunload', e => { if (pending.size || failed) { e.preventDefault(); e.returnValue = ''; } });
  toPush.forEach(key => schedule(key, 300));
  return 'ready';
}
