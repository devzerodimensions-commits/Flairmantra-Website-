// Store-management screens for the admin: sales overview, orders with details and
// printable documents, customers, and inventory. They read and write the same
// data as the rest of the admin (fm-orders, products state).
import React, {useMemo, useState} from 'react';
import './commerce.css';
import {X, Printer, FileText, Mail, Phone, MapPin, Search, ChevronRight, AlertTriangle, TrendingUp, ShoppingCart, Users, PackageX, Minus, Plus, StickyNote, Truck} from 'lucide-react';

export const ORDER_STATUSES = {
  Processing: ['Order received', 'Your order has been received and is being prepared.'],
  Confirmed: ['FlairMantra studio', 'Your order is confirmed. Our team is preparing it with care.'],
  Packed: ['Dispatch centre', 'Your order has been packed and is ready for dispatch.'],
  Shipped: ['In transit', 'Your order has been shipped and is on the way. Track its journey here.'],
  'Out for Delivery': ['Local delivery facility', 'Your order is out for delivery and should reach you today.'],
  Delivered: ['Delivered', 'Your order has been delivered. Thank you for shopping with FlairMantra.'],
  Cancelled: ['Order cancelled', 'This order has been cancelled. Please contact us if you need help.']
};
const OPEN_STATUSES = ['Processing', 'Confirmed', 'Packed'];
const LOW_STOCK = 5;

const money = n => new Intl.NumberFormat('en-CA', {style: 'currency', currency: 'CAD'}).format(Number(n) || 0);
const dateText = d => (d ? new Date(d).toLocaleDateString('en-CA', {year: 'numeric', month: 'short', day: 'numeric'}) : '—');
const readJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? f; } catch { return f; } };
const statusClass = s => `fm-status s-${String(s || '').toLowerCase().replace(/\s+/g, '-')}`;
const localDay = d => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in the viewer's time zone
const pid = p => String(p?.id || p?._id || '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// Orders live in localStorage like the rest of the admin; every update keeps a tracking history.
export function useOrders() {
  const [orders, setOrders] = useState(() => readJSON('fm-orders', []));
  const save = next => { setOrders(next); localStorage.setItem('fm-orders', JSON.stringify(next)); };
  const update = (id, data) => {
    const now = new Date().toISOString();
    save(orders.map(o => {
      if (o.id !== id) return o;
      const changed = ['status', 'location', 'customerMessage'].some(k => k in data && data[k] !== o[k]);
      const history = o.trackingHistory || [{status: o.status || 'Processing', location: 'Order received', message: 'Order placed successfully.', date: o.date}];
      return {...o, ...data, trackingHistory: changed ? [...history, {status: data.status ?? o.status, location: data.location ?? o.location, message: data.customerMessage ?? o.customerMessage, date: now}] : history};
    }));
  };
  return {orders, update, save};
}

/* ---------- Dashboard: sales overview ---------- */

function DailySalesChart({orders}) {
  const [hover, setHover] = useState(null);
  const days = useMemo(() => {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = localDay(d);
      const dayOrders = orders.filter(o => o.status !== 'Cancelled' && o.date && localDay(new Date(o.date)) === key);
      out.push({key, date: d, total: dayOrders.reduce((s, o) => s + Number(o.total || 0), 0), count: dayOrders.length});
    }
    return out;
  }, [orders]);
  const max = Math.max(...days.map(d => d.total), 1);
  const W = 600, H = 180, pad = {l: 44, r: 8, t: 12, b: 24}, bw = (W - pad.l - pad.r) / days.length;
  const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];
  return <div className="fm-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sales per day for the last 30 days" onMouseLeave={() => setHover(null)}>
      {ticks.map(t => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="fm-grid"/><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fm-axis">{t >= 1000 ? `$${Math.round(t / 100) / 10}k` : `$${Math.round(t)}`}</text></g>)}
      {days.map((d, i) => {
        const x = pad.l + i * bw + 1, h = H - pad.b - y(d.total);
        return <g key={d.key} onMouseEnter={() => setHover(i)}>
          <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent"/>
          {d.total > 0 && <path className={`fm-bar ${hover === i ? 'on' : ''}`} d={`M${x},${H - pad.b} v${-Math.max(h - 4, 0)} q0,-4 4,-4 h${Math.max(bw - 10, 1)} q4,0 4,4 v${Math.max(h - 4, 0)} z`}/>}
        </g>;
      })}
      {[0, 14, 29].map(i => <text key={i} x={pad.l + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="fm-axis">{days[i].date.toLocaleDateString('en-CA', {month: 'short', day: 'numeric'})}</text>)}
    </svg>
    {hover !== null && <div className="fm-tip" style={{left: `${(pad.l + hover * bw + bw / 2) / W * 100}%`}}>
      <b>{days[hover].date.toLocaleDateString('en-CA', {weekday: 'short', month: 'short', day: 'numeric'})}</b>
      <span>{money(days[hover].total)} · {days[hover].count} {days[hover].count === 1 ? 'order' : 'orders'}</span>
    </div>}
  </div>;
}

function RankedBars({rows, format = v => v, empty}) {
  if (!rows.length) return <p className="fm-empty">{empty}</p>;
  const max = Math.max(...rows.map(r => r.value), 1);
  return <ul className="fm-ranked">{rows.map(r => <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
    <span className="fm-ranked-label">{r.label}</span>
    <span className="fm-ranked-track"><i style={{width: `${r.value / max * 100}%`}}/></span>
    <b>{format(r.value)}</b>
  </li>)}</ul>;
}

export function SalesOverview({products, setTab}) {
  const orders = readJSON('fm-orders', []);
  const since = Date.now() - 30 * 864e5;
  const recent = orders.filter(o => o.status !== 'Cancelled' && new Date(o.date).getTime() >= since);
  const revenue = recent.reduce((s, o) => s + Number(o.total || 0), 0);
  const toShip = orders.filter(o => OPEN_STATUSES.includes(o.status || 'Processing')).length;
  const customers = new Set(orders.map(o => String(o.email || '').toLowerCase()).filter(Boolean)).size;
  const units = {};
  orders.filter(o => o.status !== 'Cancelled').forEach(o => (o.items || []).forEach(i => { units[i.name] = (units[i.name] || 0) + Number(i.qty || 1); }));
  const top = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({label, value}));
  const byStatus = Object.keys(ORDER_STATUSES).map(s => ({label: s, value: orders.filter(o => (o.status || 'Processing') === s).length})).filter(r => r.value);
  const low = products.filter(p => Number(p.stock ?? 0) <= LOW_STOCK).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));

  return <section className="fm-overview">
    <div className="fm-kpis">
      <article><TrendingUp/><div><small>Sales · last 30 days</small><strong>{money(revenue)}</strong></div></article>
      <article><ShoppingCart/><div><small>Orders · last 30 days</small><strong>{recent.length}</strong></div></article>
      <article><Truck/><div><small>Waiting to ship</small><strong>{toShip}</strong></div>{toShip > 0 && <button onClick={() => setTab('orders')}>View <ChevronRight/></button>}</article>
      <article><Users/><div><small>Customers</small><strong>{customers}</strong></div><button onClick={() => setTab('customers')}>View <ChevronRight/></button></article>
    </div>
    <div className="fm-overview-grid">
      <div className="fm-box">
        <div className="fm-box-head"><h3>Sales per day</h3><span>Last 30 days · cancelled orders excluded</span></div>
        <DailySalesChart orders={orders}/>
      </div>
      <div className="fm-box">
        <div className="fm-box-head"><h3>Best sellers</h3><span>Units sold</span></div>
        <RankedBars rows={top} empty="No sales yet."/>
      </div>
      <div className="fm-box">
        <div className="fm-box-head"><h3><AlertTriangle/> Stock alerts</h3><span>{low.length ? `${low.length} product${low.length === 1 ? '' : 's'} at ${LOW_STOCK} or fewer` : 'All products are well stocked'}</span>{low.length > 0 && <button onClick={() => setTab('inventory')}>Manage stock <ChevronRight/></button>}</div>
        {low.length > 0 && <ul className="fm-alerts">{low.slice(0, 6).map(p => <li key={pid(p)}><img src={p.image} alt=""/><span>{p.name}</span><em className={Number(p.stock || 0) <= 0 ? 'out' : 'low'}>{Number(p.stock || 0) <= 0 ? 'Out of stock' : `${p.stock} left`}</em></li>)}</ul>}
      </div>
      <div className="fm-box">
        <div className="fm-box-head"><h3>Orders by status</h3></div>
        <RankedBars rows={byStatus} empty="No orders yet."/>
      </div>
    </div>
  </section>;
}

/* ---------- Printable invoice / packing slip ---------- */

function printDocument(order, kind) {
  const s = readJSON('fm-site-settings', {});
  const store = {email: s.email || 'Pratixa13584@gmail.com', phone: s.phone1 || '416-884-0125', address: (s.address || 'Near 1955 Audley Road North\nAjax, ON L1Z 0L2\nCanada').replace(/\n/g, '<br>')};
  const invoice = kind === 'invoice';
  const rows = (order.items || []).map(i => `<tr><td>${esc(i.name)}${i.size && i.size !== 'One Size' ? `<br><small>Size ${esc(i.size)}${i.selectedColor ? ` · ${esc(i.selectedColor)}` : ''}</small>` : i.selectedColor ? `<br><small>${esc(i.selectedColor)}</small>` : ''}</td><td class="c">${Number(i.qty || 1)}</td>${invoice ? `<td class="r">${money(i.price)}</td><td class="r">${money(Number(i.price) * Number(i.qty || 1))}</td>` : '<td class="c">☐</td>'}</tr>`).join('');
  const totals = invoice ? `<table class="totals"><tr><td>Subtotal</td><td>${money(order.subtotal ?? order.total)}</td></tr>${order.discount ? `<tr><td>Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ''}</td><td>−${money(order.discount)}</td></tr>` : ''}<tr><td>Shipping</td><td>${order.shipping ? money(order.shipping) : 'Free'}</td></tr><tr class="grand"><td>Total (CAD)</td><td>${money(order.total)}</td></tr><tr><td>Payment</td><td>${esc(order.payment || '—')}</td></tr></table>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${invoice ? 'Invoice' : 'Packing slip'} #${esc(order.id)}</title><style>
    body{font:14px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;color:#17130f;margin:40px}
    header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #17130f;padding-bottom:16px;margin-bottom:24px}
    h1{font:600 30px Georgia,serif;margin:0}.brand{font:600 22px Georgia,serif;color:#8a1c35}.muted{color:#6f675d}
    .cols{display:flex;gap:40px;margin-bottom:24px}.cols h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6f675d;margin:0 0 6px}
    table{width:100%;border-collapse:collapse}th{text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#6f675d;border-bottom:1px solid #ccc;padding:8px}
    td{padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top}.c{text-align:center}.r{text-align:right}small{color:#6f675d}
    .totals{width:300px;margin:16px 0 0 auto}.totals td{border:0;padding:4px 8px}.totals td:last-child{text-align:right}.grand td{font-weight:700;font-size:16px;border-top:2px solid #17130f;padding-top:8px}
    footer{margin-top:40px;color:#6f675d;font-size:12px}@media print{body{margin:16px}}</style></head><body>
    <header><div><div class="brand">FlairMantra</div><div class="muted">${store.address}<br>${esc(store.email)} · ${esc(store.phone)}</div></div>
    <div style="text-align:right"><h1>${invoice ? 'Invoice' : 'Packing slip'}</h1><div>Order <b>#${esc(order.id)}</b></div><div class="muted">${dateText(order.date)}</div></div></header>
    <div class="cols"><div><h3>${invoice ? 'Bill to' : 'Ship to'}</h3><b>${esc(order.customer)}</b><br>${esc(order.address)}<br>${esc(order.email)}<br>${esc(order.phone)}</div>
    ${order.notes ? `<div><h3>Customer note</h3>${esc(order.notes)}</div>` : ''}</div>
    <table><thead><tr><th>Item</th><th class="c">Qty</th>${invoice ? '<th class="r">Price</th><th class="r">Total</th>' : '<th class="c">Packed</th>'}</tr></thead><tbody>${rows}</tbody></table>
    ${totals}<footer>Thank you for shopping with FlairMantra. Returns accepted within 15 days of delivery for unworn items with tags attached.</footer>
    <script>window.onload=()=>{window.print()}</script></body></html>`;
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) { alert('Please allow pop-ups for this site to print.'); return; }
  w.document.write(html); w.document.close();
}

/* ---------- Orders ---------- */

function OrderDrawer({order, onClose, onUpdate}) {
  const [draft, setDraft] = useState({status: order.status || 'Processing', courier: order.courier || '', trackingNumber: order.trackingNumber || '', expectedDelivery: order.expectedDelivery || '', location: order.location || '', customerMessage: order.customerMessage || ''});
  const [note, setNote] = useState('');
  const set = (k, v) => setDraft(d => ({...d, [k]: v}));
  const pickStatus = s => { const [location, customerMessage] = ORDER_STATUSES[s]; setDraft(d => ({...d, status: s, location, customerMessage})); };
  const dirty = Object.keys(draft).some(k => (order[k] || '') !== draft[k]);
  const addNote = () => { if (!note.trim()) return; onUpdate(order.id, {adminNotes: [...(order.adminNotes || []), {text: note.trim(), date: new Date().toISOString()}]}); setNote(''); };
  return <>
    <button className="fm-drawer-backdrop" onClick={onClose} aria-label="Close order"/>
    <aside className="fm-drawer" role="dialog" aria-label={`Order ${order.id}`}>
      <header className="fm-drawer-head">
        <div><h2>Order #{order.id}</h2><small>Placed {dateText(order.date)} · {order.payment || '—'}</small></div>
        <span className={statusClass(order.status)}>{order.status || 'Processing'}</span>
        <button className="fm-icon" onClick={onClose} aria-label="Close"><X/></button>
      </header>
      <div className="fm-drawer-body">
        <div className="fm-doc-actions">
          <button className="fm-secondary" onClick={() => printDocument(order, 'invoice')}><FileText/> Print invoice</button>
          <button className="fm-secondary" onClick={() => printDocument(order, 'slip')}><Printer/> Packing slip</button>
        </div>
        <section className="fm-box">
          <h3>Customer</h3>
          <p><b>{order.customer}</b></p>
          {order.email && <p><Mail/> <a href={`mailto:${order.email}`}>{order.email}</a></p>}
          {order.phone && <p><Phone/> <a href={`tel:${String(order.phone).replace(/[^\d+]/g, '')}`}>{order.phone}</a></p>}
          {order.address && <p><MapPin/> {order.address}</p>}
          {order.notes && <p className="fm-note-customer"><b>Customer note:</b> {order.notes}</p>}
        </section>
        <section className="fm-box">
          <h3>Items</h3>
          <table className="fm-items"><tbody>{(order.items || []).map((i, n) => <tr key={i.cartKey || n}>
            <td><img src={i.image} alt=""/></td>
            <td><b>{i.name}</b><small>{[i.selectedColor, i.size && i.size !== 'One Size' && `Size ${i.size}`].filter(Boolean).join(' · ')}</small></td>
            <td>× {i.qty || 1}</td><td className="r">{money(Number(i.price) * Number(i.qty || 1))}</td>
          </tr>)}</tbody></table>
          <dl className="fm-totals">
            <dt>Subtotal</dt><dd>{money(order.subtotal ?? order.total)}</dd>
            {order.discount > 0 && <><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{money(order.discount)}</dd></>}
            <dt>Shipping</dt><dd>{order.shipping ? money(order.shipping) : 'Free'}</dd>
            <dt className="grand">Total</dt><dd className="grand">{money(order.total)}</dd>
          </dl>
        </section>
        <section className="fm-box">
          <h3>Status &amp; delivery</h3>
          <div className="fm-form">
            <label>Status<select value={draft.status} onChange={e => pickStatus(e.target.value)}>{Object.keys(ORDER_STATUSES).map(s => <option key={s}>{s}</option>)}</select></label>
            <label>Courier<input value={draft.courier} onChange={e => set('courier', e.target.value)} placeholder="Canada Post, UPS…"/></label>
            <label>Tracking number<input value={draft.trackingNumber} onChange={e => set('trackingNumber', e.target.value)}/></label>
            <label>Expected delivery<input type="date" value={draft.expectedDelivery} onChange={e => set('expectedDelivery', e.target.value)}/></label>
            <label className="fm-wide">Current location<input value={draft.location} onChange={e => set('location', e.target.value)}/></label>
            <label className="fm-wide">Message the customer sees<textarea rows="2" value={draft.customerMessage} onChange={e => set('customerMessage', e.target.value)}/></label>
          </div>
          <button className="fm-primary" disabled={!dirty} onClick={() => onUpdate(order.id, draft)}>Update order</button>
        </section>
        <section className="fm-box">
          <h3><StickyNote/> Private notes</h3>
          <p className="fm-help">Only admins see these.</p>
          <ul className="fm-notes">{(order.adminNotes || []).map((n, i) => <li key={i}><p>{n.text}</p><small>{new Date(n.date).toLocaleString('en-CA')}</small></li>)}</ul>
          <div className="fm-note-add"><textarea rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…"/><button className="fm-secondary" onClick={addNote} disabled={!note.trim()}>Add note</button></div>
        </section>
        <section className="fm-box">
          <h3>History</h3>
          <ol className="fm-history">{(order.trackingHistory || []).slice().reverse().map((h, i) => <li key={i}><b>{h.status}</b><span>{h.message}</span><small>{h.location} · {new Date(h.date).toLocaleString('en-CA')}</small></li>)}</ol>
        </section>
      </div>
    </aside>
  </>;
}

export function OrdersManager() {
  const {orders, update} = useOrders();
  const [status, setStatus] = useState('All');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const counts = Object.fromEntries(['All', ...Object.keys(ORDER_STATUSES)].map(s => [s, s === 'All' ? orders.length : orders.filter(o => (o.status || 'Processing') === s).length]));
  const term = q.trim().toLowerCase();
  const shown = orders
    .filter(o => status === 'All' || (o.status || 'Processing') === status)
    .filter(o => !term || [o.id, o.customer, o.email, o.phone].join(' ').toLowerCase().includes(term))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const open = orders.find(o => o.id === openId);
  return <section className="fm-list">
    <ul className="fm-subsubsub">{Object.entries(counts).filter(([s, n]) => s === 'All' || n).map(([s, n]) => <li key={s}><button className={status === s ? 'current' : ''} onClick={() => setStatus(s)}>{s} <span>({n})</span></button></li>)}</ul>
    <div className="fm-tablenav"><label className="fm-search"><Search/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders, customers, email…" aria-label="Search orders"/></label><span>{shown.length} {shown.length === 1 ? 'item' : 'items'}</span></div>
    <table className="fm-table">
      <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Status</th><th>Items</th><th className="r">Total</th></tr></thead>
      <tbody>{shown.length ? shown.map(o => <tr key={o.id} onClick={() => setOpenId(o.id)} className="fm-row-link">
        <td><button className="fm-row-title">#{o.id}</button></td>
        <td>{dateText(o.date)}</td>
        <td><b>{o.customer}</b><small>{o.email}</small></td>
        <td><span className={statusClass(o.status)}>{o.status || 'Processing'}</span></td>
        <td>{(o.items || []).reduce((s, i) => s + Number(i.qty || 1), 0)}</td>
        <td className="r"><b>{money(o.total)}</b></td>
      </tr>) : <tr><td colSpan="6" className="fm-empty">{orders.length ? 'No orders match.' : 'No orders yet. New orders appear here as soon as customers check out.'}</td></tr>}</tbody>
    </table>
    {open && <OrderDrawer key={open.id} order={open} onClose={() => setOpenId(null)} onUpdate={update}/>}
  </section>;
}

/* ---------- Customers ---------- */

export function CustomersManager() {
  const orders = readJSON('fm-orders', []);
  const [q, setQ] = useState('');
  const [openEmail, setOpenEmail] = useState(null);
  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const email = String(o.email || '').toLowerCase().trim(); if (!email) return;
      const c = map.get(email) || {email, name: o.customer, phone: o.phone, address: o.address, orders: [], spent: 0, last: null};
      c.orders.push(o);
      if (o.status !== 'Cancelled') c.spent += Number(o.total || 0);
      if (!c.last || new Date(o.date) > new Date(c.last)) { c.last = o.date; c.name = o.customer || c.name; c.phone = o.phone || c.phone; c.address = o.address || c.address; }
      map.set(email, c);
    });
    return [...map.values()].sort((a, b) => new Date(b.last) - new Date(a.last));
  }, [orders.length]);
  const term = q.trim().toLowerCase();
  const shown = customers.filter(c => !term || [c.name, c.email, c.phone].join(' ').toLowerCase().includes(term));
  return <section className="fm-list">
    <div className="fm-tablenav"><label className="fm-search"><Search/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search customers…" aria-label="Search customers"/></label><span>{shown.length} {shown.length === 1 ? 'customer' : 'customers'}</span></div>
    <table className="fm-table">
      <thead><tr><th>Name</th><th>Contact</th><th>Orders</th><th className="r">Total spent</th><th>Last order</th></tr></thead>
      <tbody>{shown.length ? shown.map(c => <React.Fragment key={c.email}>
        <tr className="fm-row-link" onClick={() => setOpenEmail(openEmail === c.email ? null : c.email)}>
          <td><button className="fm-row-title">{c.name || '—'}</button><small>{c.address}</small></td>
          <td><a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()}>{c.email}</a><small>{c.phone}</small></td>
          <td>{c.orders.length}</td><td className="r"><b>{money(c.spent)}</b></td><td>{dateText(c.last)}</td>
        </tr>
        {openEmail === c.email && <tr className="fm-subrow"><td colSpan="5"><ul>{c.orders.map(o => <li key={o.id}><b>#{o.id}</b><span>{dateText(o.date)}</span><span className={statusClass(o.status)}>{o.status || 'Processing'}</span><span>{money(o.total)}</span></li>)}</ul></td></tr>}
      </React.Fragment>) : <tr><td colSpan="5" className="fm-empty">{customers.length ? 'No customers match.' : 'Customers appear here after their first order.'}</td></tr>}</tbody>
    </table>
  </section>;
}

/* ---------- Inventory ---------- */

export function InventoryManager({products, setProducts}) {
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');
  const stockOf = p => Number(p.stock ?? 0);
  const groups = {All: () => true, 'Low stock': p => stockOf(p) > 0 && stockOf(p) <= LOW_STOCK, 'Out of stock': p => stockOf(p) <= 0};
  const term = q.trim().toLowerCase();
  const shown = products.filter(groups[filter]).filter(p => !term || [p.name, p.sku, p.category].join(' ').toLowerCase().includes(term));
  const setStock = (p, value) => setProducts(list => list.map(x => (pid(x) === pid(p) ? {...x, stock: Math.max(0, Math.floor(Number(value) || 0))} : x)));
  return <section className="fm-list">
    <ul className="fm-subsubsub">{Object.keys(groups).map(g => <li key={g}><button className={filter === g ? 'current' : ''} onClick={() => setFilter(g)}>{g} <span>({products.filter(groups[g]).length})</span></button></li>)}</ul>
    <div className="fm-tablenav"><label className="fm-search"><Search/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products or SKU…" aria-label="Search products"/></label><span>Changes save automatically</span></div>
    <table className="fm-table">
      <thead><tr><th></th><th>Product</th><th>SKU</th><th>Status</th><th>Stock</th></tr></thead>
      <tbody>{shown.length ? shown.map(p => {
        const s = stockOf(p);
        return <tr key={pid(p)}>
          <td className="fm-thumb"><img src={p.image} alt=""/></td>
          <td><b>{p.name}</b><small>{p.subcategory || p.category}</small></td>
          <td>{p.sku || '—'}</td>
          <td>{s <= 0 ? <span className="fm-stock out"><PackageX/> Out of stock</span> : s <= LOW_STOCK ? <span className="fm-stock low"><AlertTriangle/> Low</span> : <span className="fm-stock in">In stock</span>}</td>
          <td><div className="fm-stepper">
            <button onClick={() => setStock(p, s - 1)} disabled={s <= 0} aria-label={`Decrease stock for ${p.name}`}><Minus/></button>
            <input type="number" min="0" value={s} onChange={e => setStock(p, e.target.value)} aria-label={`Stock for ${p.name}`}/>
            <button onClick={() => setStock(p, s + 1)} aria-label={`Increase stock for ${p.name}`}><Plus/></button>
          </div></td>
        </tr>;
      }) : <tr><td colSpan="5" className="fm-empty">No products here.</td></tr>}</tbody>
    </table>
  </section>;
}
