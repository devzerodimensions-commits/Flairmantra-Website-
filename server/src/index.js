import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
dotenv.config();
const {pool, q, migrate, getKv, setKv} = await import('./db.js');

const app = express();
app.use(cors({origin: process.env.CLIENT_URL || true}));
app.use(express.json({limit: '25mb'}));
app.use(morgan('dev'));

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const STORE_EMAIL = process.env.STORE_EMAIL || 'Pratixa13584@gmail.com';
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = process.env.NODE_ENV === 'production' ? crypto.randomBytes(32).toString('hex') : 'dev-secret';
  if (process.env.NODE_ENV === 'production') console.warn('JWT_SECRET is not set: sign-ins will reset whenever the server restarts.');
}

// Store content the admin panel edits. Public keys are sent to every shopper; private ones only to the admin.
const PUBLIC_KEYS = ['products', 'categories', 'site-settings', 'banners', 'home-sections', 'header-menu', 'social', 'pages', 'store-settings', 'page-layouts'];
const PRIVATE_KEYS = ['coupons', 'users', 'media'];
const ADMIN_KEYS = [...PUBLIC_KEYS, ...PRIVATE_KEYS];

let fallbackCatalog = {products: [], categories: []};
try {
  const file = ['../../client/src/clientCatalog.js', '../../frontend/src/clientCatalog.js'].map(p => path.resolve(serverDir, p)).find(p => fs.existsSync(p));
  if (file) fallbackCatalog = (await import(`file://${file.replace(/\\/g, '/')}`)).clientCatalog;
} catch (e) { console.warn('Could not load starter catalog:', e.message); }

let dbReady = false;
if (!pool) console.warn('DATABASE_URL is not set — running without a database (demo mode).');
else {
  try {
    await migrate();
    dbReady = true;
    console.log('Postgres connected');
    await seedOwner();
  } catch (e) { console.error('Database unavailable — running in demo mode:', e.message); }
}

// The owner account comes from ADMIN_EMAIL / ADMIN_PASSWORD so the password never lives in the code.
async function seedOwner() {
  const email = String(process.env.ADMIN_EMAIL || 'admin@flairmantra.in').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const {rows} = await q('SELECT count(*)::int AS n FROM admins');
    if (!rows[0].n) console.warn('No admin account yet: set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) and restart.');
    return;
  }
  const {rows} = await q('SELECT password_hash FROM admins WHERE email = $1', [email]);
  if (rows[0] && await bcrypt.compare(password, rows[0].password_hash)) return;
  const hash = await bcrypt.hash(password, 10);
  await q(`INSERT INTO admins (name, email, password_hash, role) VALUES ('FlairMantra Owner', $1, $2, 'owner')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`, [email, hash]);
  console.log(`Admin account ready: ${email}`);
}

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const needDb = (req, res, next) => (dbReady ? next() : res.status(503).json({message: 'The store database is temporarily unavailable. Please try again shortly.'}));
const bearer = req => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const adminAuth = (req, res, next) => {
  try { const t = jwt.verify(bearer(req), JWT_SECRET); if (t.kind !== 'admin') throw 0; req.admin = t; next(); } catch { res.status(401).json({message: 'Please sign in again'}); }
};
const customerAuth = (req, res, next) => {
  try { const t = jwt.verify(bearer(req), JWT_SECRET); if (t.kind !== 'customer') throw 0; req.customerId = t.cid; next(); } catch { res.status(401).json({message: 'Please sign in again'}); }
};

// Basic brute-force protection for the sign-in endpoints.
const attempts = new Map();
const limitLogins = (req, res, next) => {
  const key = `${req.ip}:${req.path}`, now = Date.now();
  const a = attempts.get(key) || {n: 0, reset: now + 15 * 60 * 1000};
  if (now > a.reset) { a.n = 0; a.reset = now + 15 * 60 * 1000; }
  if (++a.n > 10) return res.status(429).json({message: 'Too many attempts. Please wait 15 minutes and try again.'});
  attempts.set(key, a);
  next();
};

const mailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
  auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASS}
}) : null;
const notify = (subject, text, replyTo) => mailer?.sendMail({from: process.env.SMTP_FROM || process.env.SMTP_USER, to: STORE_EMAIL, replyTo, subject, text}).catch(e => console.warn('Email failed:', e.message));

const money = n => `$${Number(n || 0).toFixed(2)}`;
const pid = p => String(p?.id || p?._id || '');

function couponDiscount(coupon, items, subtotal, used) {
  if (!coupon || coupon.active === false) return 0;
  const today = new Date().toISOString().slice(0, 10);
  if (coupon.expiry && coupon.expiry < today) return 0;
  if (Number(coupon.usageLimit || 0) > 0 && used >= Number(coupon.usageLimit)) return 0;
  if (Number(coupon.minimumSpend || 0) > subtotal) return 0;
  if (Number(coupon.maximumSpend || 0) > 0 && subtotal > Number(coupon.maximumSpend)) return 0;
  const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowed = list(coupon.productIds), excluded = list(coupon.excludeProductIds), cats = list(coupon.categories).map(x => x.toLowerCase());
  const total = items.filter(i => (!allowed.length || allowed.includes(i.id)) && !excluded.includes(i.id) && (!cats.length || cats.includes(String(i.category || '').toLowerCase())))
    .reduce((s, i) => s + i.price * i.qty, 0);
  if (!total) return 0;
  return Math.round(Math.min(total, coupon.type === 'percent' ? total * Number(coupon.amount || 0) / 100 : Number(coupon.amount || 0)) * 100) / 100;
}

async function storeData() {
  const kv = dbReady ? await getKv([...PUBLIC_KEYS, 'coupons', 'coupon-usage']) : {};
  return {kv, products: kv.products?.length ? kv.products : fallbackCatalog.products};
}

// Prices, discounts and shipping are always recalculated here; the browser's numbers are never trusted.
async function priceCart(rawItems, couponCode, email) {
  const {kv, products} = await storeData();
  const items = [];
  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const p = products.find(x => pid(x) === String(raw.id));
    const qty = Math.max(1, Math.min(99, Math.floor(Number(raw.qty) || 1)));
    if (!p || (p.status || 'active') !== 'active') throw Object.assign(new Error(`“${raw.name || 'An item'}” is no longer available. Please remove it from your bag.`), {status: 400});
    const photos = [p.image, ...(p.variationImages || []).map(v => v?.image), ...(p.galleryImages || []), ...(p.images || [])];
    items.push({id: pid(p), name: p.name, brand: p.brand, category: p.category, image: photos.includes(raw.image) ? raw.image : p.image, price: Number(p.price), qty,
      size: raw.size ? String(raw.size) : undefined, selectedColor: raw.selectedColor ? String(raw.selectedColor) : undefined, cartKey: raw.cartKey});
  }
  if (!items.length) throw Object.assign(new Error('Your bag is empty.'), {status: 400});
  const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  let coupon = null, discount = 0;
  if (couponCode) {
    coupon = (kv.coupons || []).find(c => String(c.code).toUpperCase() === String(couponCode).trim().toUpperCase());
    const used = Number(kv['coupon-usage']?.[coupon?.code] || 0);
    discount = couponDiscount(coupon, items, subtotal, used);
    if (coupon && discount && coupon.usagePerUser && email && dbReady) {
      const {rows} = await q(`SELECT count(*)::int AS n FROM orders WHERE lower(email) = lower($1) AND data->>'couponCode' = $2`, [email, coupon.code]);
      if (rows[0].n >= Number(coupon.usagePerUser)) throw Object.assign(new Error('This email has already used this coupon the maximum number of times.'), {status: 400});
    }
    if (!discount) coupon = null;
  }
  const freeOver = Number(kv['store-settings']?.freeShipping || 75);
  const shipping = coupon?.freeShipping || subtotal >= freeOver ? 0 : 12;
  return {items, subtotal, discount, shipping, total: Math.round((Math.max(0, subtotal - discount) + shipping) * 100) / 100, coupon};
}

const newId = () => 'FM' + String(Date.now()).slice(-6) + String(crypto.randomInt(10, 99));
const orderRow = o => [o.id, o.email || null, o.customerId || null, o.status || 'Processing', Number(o.total || 0), JSON.stringify(o)];

/* ---------- Public storefront API ---------- */

app.get('/api/health', (req, res) => res.json({ok: true, database: dbReady}));

app.get('/api/store', wrap(async (req, res) => {
  const {kv} = await storeData();
  const content = Object.fromEntries(PUBLIC_KEYS.map(k => [k, kv[k] ?? null]));
  // Page-builder drafts stay private until the owner publishes them.
  if (content['page-layouts']) content['page-layouts'] = Object.fromEntries(Object.entries(content['page-layouts']).filter(([, l]) => l?.status !== 'Draft'));
  res.set('Cache-Control', 'no-cache');
  res.json({database: dbReady, ...content, products: kv.products || null, categories: kv.categories || null});
}));

app.post('/api/coupons/validate', wrap(async (req, res) => {
  const {items, code, email} = req.body || {};
  const priced = await priceCart(items, code, email);
  if (!priced.coupon) return res.status(400).json({message: 'This code is invalid, expired, or doesn’t apply to your bag.'});
  res.json({code: priced.coupon.code, discount: priced.discount, freeShipping: !!priced.coupon.freeShipping, shipping: priced.shipping, total: priced.total});
}));

app.post('/api/orders', needDb, wrap(async (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').trim();
  if (!email || !b.customer || !b.address || !b.phone) return res.status(400).json({message: 'Please complete your contact and shipping details.'});
  const priced = await priceCart(b.items, b.couponCode, email);
  let customerId = '';
  try { const t = jwt.verify(bearer(req), JWT_SECRET); if (t.kind === 'customer') customerId = String(t.cid); } catch { /* guest checkout */ }
  const now = new Date().toISOString();
  const order = {
    id: newId(), customer: String(b.customer), email, phone: String(b.phone), address: String(b.address), notes: String(b.notes || ''),
    items: priced.items, subtotal: priced.subtotal, discount: priced.discount, shipping: priced.shipping, total: priced.total,
    couponCode: priced.coupon?.code || '', payment: b.payment === 'Online Payment' ? 'Online Payment' : 'Cash on Delivery',
    status: 'Processing', date: now, customerId, location: 'Order received', customerMessage: 'Your order has been received and is being prepared.',
    trackingHistory: [{status: 'Processing', location: 'Order received', message: 'Your order has been received and is being prepared.', date: now}]
  };
  for (let tries = 0; ; tries++) {
    try { await q('INSERT INTO orders (id, email, customer_id, status, total, data) VALUES ($1,$2,$3,$4,$5,$6)', orderRow(order)); break; } catch (e) { if (e.code !== '23505' || tries > 4) throw e; order.id = newId(); }
  }
  if (order.couponCode) {
    await q(`INSERT INTO kv (key, value) VALUES ('coupon-usage', jsonb_build_object($1::text, 1))
      ON CONFLICT (key) DO UPDATE SET value = kv.value || jsonb_build_object($1::text, COALESCE((kv.value->>$1)::int, 0) + 1), updated_at = now()`, [order.couponCode]);
  }
  notify(`New order ${order.id} — ${money(order.total)}`,
    `Customer: ${order.customer}\nEmail: ${order.email}\nPhone: ${order.phone}\nAddress: ${order.address}\nPayment: ${order.payment}\n\n` +
    order.items.map(i => `${i.qty} × ${i.name}${i.size ? ` (${i.size})` : ''} — ${money(i.price * i.qty)}`).join('\n') +
    `\n\nSubtotal ${money(order.subtotal)}${order.discount ? `\nDiscount −${money(order.discount)}` : ''}\nShipping ${money(order.shipping)}\nTotal ${money(order.total)}${order.notes ? `\n\nNotes: ${order.notes}` : ''}`, order.email);
  res.status(201).json(order);
}));

// Tracking needs only the order number, so it returns no address, phone or email.
app.get('/api/orders/:id/track', needDb, wrap(async (req, res) => {
  const {rows} = await q('SELECT data FROM orders WHERE upper(id) = upper($1)', [String(req.params.id).replace(/^#/, '').trim()]);
  if (!rows[0]) return res.status(404).json({message: 'Order not found'});
  const o = rows[0].data;
  res.json({id: o.id, status: o.status, date: o.date, total: o.total, location: o.location, customerMessage: o.customerMessage, courier: o.courier, trackingNumber: o.trackingNumber,
    expectedDelivery: o.expectedDelivery, trackingHistory: o.trackingHistory || [], items: (o.items || []).map(i => ({name: i.name, image: i.image, qty: i.qty, size: i.size, cartKey: i.cartKey}))});
}));

app.post('/api/contact', wrap(async (req, res) => {
  const b = req.body || {};
  if (!b.email || !b.message) return res.status(400).json({message: 'Please add your email and a message.'});
  const msg = {id: crypto.randomUUID(), name: String(b.name || ''), email: String(b.email), phone: String(b.phone || ''), subject: String(b.subject || ''), message: String(b.message), date: new Date().toISOString(), status: 'new'};
  if (dbReady) await q('INSERT INTO messages (id, data) VALUES ($1, $2)', [msg.id, JSON.stringify(msg)]);
  notify(`FlairMantra enquiry: ${msg.subject}`, `Name: ${msg.name}\nEmail: ${msg.email}\nPhone: ${msg.phone}\n\n${msg.message}`, msg.email);
  res.status(201).json({ok: true});
}));

app.post('/api/newsletter', needDb, wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({message: 'Please enter a valid email address.'});
  const msg = {id: crypto.randomUUID(), name: '', email, phone: '', subject: 'Newsletter sign-up', message: `${email} joined the FlairMantra Circle mailing list.`, date: new Date().toISOString(), status: 'new'};
  await q('INSERT INTO messages (id, data) VALUES ($1, $2)', [msg.id, JSON.stringify(msg)]);
  res.status(201).json({ok: true});
}));

/* ---------- Customer accounts ---------- */

const customerToken = c => jwt.sign({cid: c.id, kind: 'customer'}, JWT_SECRET, {expiresIn: '30d'});
const customerView = c => ({id: c.id, name: c.name, email: c.email, phone: c.phone, address: c.address, createdAt: c.created_at});

app.post('/api/customers/register', needDb, limitLogins, wrap(async (req, res) => {
  const {name, password, phone} = req.body || {};
  const email = String(req.body?.email || '').toLowerCase().trim();
  if (!name || !email || !password) return res.status(400).json({message: 'Name, email and password are required'});
  if (String(password).length < 8) return res.status(400).json({message: 'Password must be at least 8 characters'});
  const hash = await bcrypt.hash(String(password), 10);
  const {rows} = await q('INSERT INTO customers (name, email, phone, password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING RETURNING *', [name, email, phone || null, hash]);
  if (!rows[0]) return res.status(409).json({message: 'An account with this email already exists'});
  res.status(201).json({token: customerToken(rows[0]), customer: customerView(rows[0])});
}));

app.post('/api/customers/login', needDb, limitLogins, wrap(async (req, res) => {
  const {rows} = await q('SELECT * FROM customers WHERE email = $1', [String(req.body?.email || '').toLowerCase().trim()]);
  if (!rows[0] || !await bcrypt.compare(String(req.body?.password || ''), rows[0].password_hash)) return res.status(401).json({message: 'Incorrect email or password'});
  res.json({token: customerToken(rows[0]), customer: customerView(rows[0])});
}));

app.put('/api/customers/me', needDb, customerAuth, wrap(async (req, res) => {
  const {name, phone, address} = req.body || {};
  const {rows} = await q('UPDATE customers SET name = COALESCE($2, name), phone = $3, address = $4 WHERE id = $1 RETURNING *', [req.customerId, name || null, phone || null, address ? JSON.stringify(address) : null]);
  if (!rows[0]) return res.status(404).json({message: 'Account not found'});
  res.json(customerView(rows[0]));
}));

app.get('/api/customers/orders', needDb, customerAuth, wrap(async (req, res) => {
  const {rows} = await q(`SELECT o.data FROM orders o JOIN customers c ON lower(o.email) = lower(c.email) OR o.customer_id = c.id::text
    WHERE c.id = $1 ORDER BY o.created_at DESC LIMIT 100`, [req.customerId]);
  res.json(rows.map(r => r.data));
}));

/* ---------- Admin API (used by the admin panel to save its data) ---------- */

app.post('/api/auth/login', needDb, limitLogins, wrap(async (req, res) => {
  const {rows} = await q('SELECT * FROM admins WHERE email = $1', [String(req.body?.email || '').toLowerCase().trim()]);
  if (!rows[0]) {
    const {rows: any} = await q('SELECT 1 FROM admins LIMIT 1');
    if (!any.length) return res.status(503).json({message: 'Admin password not set up yet. Add ADMIN_PASSWORD in the Render environment settings.'});
  }
  if (!rows[0] || !await bcrypt.compare(String(req.body?.password || ''), rows[0].password_hash)) return res.status(401).json({message: 'Incorrect email or password'});
  const a = rows[0];
  res.json({token: jwt.sign({id: a.id, role: a.role, kind: 'admin'}, JWT_SECRET, {expiresIn: '7d'}), user: {name: a.name, email: a.email, role: a.role}});
}));

app.get('/api/admin/sync', needDb, adminAuth, wrap(async (req, res) => {
  const kv = await getKv([...ADMIN_KEYS, 'coupon-usage']);
  const usage = kv['coupon-usage'] || {};
  if (Array.isArray(kv.coupons)) kv.coupons = kv.coupons.map(c => ({...c, used: Number(usage[c.code] || 0)}));
  delete kv['coupon-usage'];
  const orders = (await q('SELECT data FROM orders ORDER BY created_at DESC LIMIT 2000')).rows.map(r => r.data);
  const inquiries = (await q('SELECT data FROM messages ORDER BY created_at DESC LIMIT 2000')).rows.map(r => r.data);
  res.json({kv, orders, inquiries});
}));

app.put('/api/admin/kv/:key', needDb, adminAuth, wrap(async (req, res) => {
  const key = req.params.key;
  if (!ADMIN_KEYS.includes(key)) return res.status(400).json({message: 'Unknown setting'});
  let value = req.body?.value;
  if (value === undefined) return res.status(400).json({message: 'Missing value'});
  if (key === 'coupons' && Array.isArray(value)) value = value.map(({used, ...c}) => c); // usage is counted by the server
  await setKv(key, value);
  res.json({ok: true});
}));

// Orders and messages sync as upserts plus explicit removals, so a new order placed while the admin is open is never overwritten.
const syncCollection = (table, toRow) => wrap(async (req, res) => {
  const {upsert = [], remove = []} = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of upsert.filter(x => x?.id)) {
      if (table === 'orders') {
        await client.query(`INSERT INTO orders (id, email, customer_id, status, total, data) VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, status = EXCLUDED.status, total = EXCLUDED.total, data = EXCLUDED.data, updated_at = now()`, toRow(item));
      } else {
        await client.query('INSERT INTO messages (id, data) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data', toRow(item));
      }
    }
    if (remove.length) await client.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [remove.map(String)]);
    await client.query('COMMIT');
    res.json({ok: true});
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
});
app.put('/api/admin/orders', needDb, adminAuth, syncCollection('orders', orderRow));
app.put('/api/admin/inquiries', needDb, adminAuth, syncCollection('messages', m => [String(m.id), JSON.stringify(m)]));

app.get('/api/admin/customers', needDb, adminAuth, wrap(async (req, res) => {
  const {rows} = await q('SELECT id, name, email, phone, created_at FROM customers ORDER BY created_at DESC LIMIT 1000');
  res.json(rows);
}));

/* ---------- Website ---------- */

const clientDist = ['../../client/dist', '../../frontend/dist'].map(p => path.resolve(serverDir, p)).find(p => fs.existsSync(p)) || path.resolve(serverDir, '../../client/dist');
app.use(express.static(clientDist));
app.use('/api', (req, res) => res.status(404).json({message: 'Not found'}));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
app.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({message: err.status ? err.message : 'Something went wrong. Please try again.'});
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`FlairMantra on http://localhost:${port}`));
