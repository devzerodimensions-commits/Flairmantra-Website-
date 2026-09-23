import React, {useEffect, useState} from 'react';
import {UserRound, Package, Heart, MapPin, LogOut, Eye, EyeOff, CheckCircle2, Truck, Search, PackageCheck, ChevronRight} from 'lucide-react';
import {useStore, API, money, readJSON} from '../store';
import {Breadcrumbs, Empty, Link, ProductGrid} from '../components';

const stages = ['Processing', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
const fmtDate = d => new Date(d).toLocaleDateString('en-CA', {year: 'numeric', month: 'short', day: 'numeric'});

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return <span className="sf-pass"><input type={show ? 'text' : 'password'} {...props}/><button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff/> : <Eye/>}</button></span>;
}

function AuthForms() {
  const {auth, route, go} = useStore();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = new URLSearchParams(route.split('?')[1] || '').get('next');
  const submit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setError('');
    if (mode === 'register' && f.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (mode === 'register' && f.password !== f.confirm) { setError('Passwords don’t match.'); return; }
    setBusy(true);
    try {
      await (mode === 'login' ? auth.login(f) : auth.register(f));
      if (next?.startsWith('/')) go(next);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="sf-auth">
    <div className="sf-auth-card">
      <div className="sf-auth-tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
        <button role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
      </div>
      <form onSubmit={submit} key={mode}>
        <h1>{mode === 'login' ? 'Welcome back' : 'Join FlairMantra'}</h1>
        <p className="sf-muted">{mode === 'login' ? 'Sign in to track orders and see your wishlist.' : 'Save your details for faster checkout and follow every order.'}</p>
        {mode === 'register' && <label className="sf-field"><span>Full name</span><input name="name" autoComplete="name" required/></label>}
        <label className="sf-field"><span>Email</span><input name="email" type="email" autoComplete="email" required/></label>
        {mode === 'register' && <label className="sf-field"><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel"/></label>}
        <label className="sf-field"><span>Password</span><PasswordInput name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined}/></label>
        {mode === 'register' && <label className="sf-field"><span>Confirm password</span><PasswordInput name="confirm" autoComplete="new-password" required/></label>}
        {error && <p className="sf-error sf-form-error">{error}</p>}
        <button className="sf-btn sf-btn-block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="sf-muted sf-small sf-center">{mode === 'login' ? <>New here? <button type="button" className="sf-text-btn" onClick={() => setMode('register')}>Create an account</button></> : <>Already have an account? <button type="button" className="sf-text-btn" onClick={() => setMode('login')}>Sign in</button></>}</p>
      </form>
    </div>
    <div className="sf-auth-perks">
      <img src="/social/flairmantra-white-navratri.jpeg" alt=""/>
      <div><h2>Members get more</h2><ul><li><CheckCircle2/> All your orders in one place</li><li><CheckCircle2/> Live order tracking</li><li><CheckCircle2/> Faster checkout with a saved address</li></ul></div>
    </div>
  </div>;
}

function useMyOrders() {
  const {user} = useStore();
  const [orders, setOrders] = useState(() => readJSON('fm-orders', []).filter(o => String(o.email).toLowerCase() === user.email.toLowerCase()));
  useEffect(() => {
    if (!user.token) return;
    fetch(`${API}/customers/orders`, {headers: {Authorization: `Bearer ${user.token}`}}).then(r => (r.ok ? r.json() : [])).then(list => {
      if (!Array.isArray(list)) return;
      setOrders(cur => {
        const merged = [...cur];
        list.forEach(o => { const id = o.orderNumber || o.id; if (!merged.some(x => x.id === id)) merged.push({...o, id, date: o.createdAt}); });
        return merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      });
    }).catch(() => {});
  }, [user.token]);
  return orders;
}

function OrdersTab() {
  const orders = useMyOrders();
  if (!orders.length) return <Empty icon={Package} title="No orders yet" text="When you place an order, it will appear here with live tracking." action="Start shopping" to="/shop"/>;
  return <div className="sf-orders">{orders.map(o => {
    const step = stages.indexOf(o.status);
    return <article className="sf-order" key={o.id}>
      <header><div><b>Order #{o.id}</b><small>Placed {fmtDate(o.date)} · {o.items?.length || 0} {o.items?.length === 1 ? 'item' : 'items'} · {money(o.total)}</small></div><span className={`sf-status s-${String(o.status).toLowerCase().replace(/\s+/g, '-')}`}>{o.status}</span></header>
      <div className="sf-order-items">{(o.items || []).slice(0, 4).map(i => <img key={i.cartKey || i.id} src={i.image} alt={i.name} title={i.name}/>)}</div>
      {o.status !== 'Cancelled' && <div className="sf-order-bar"><i style={{width: `${Math.max(0, step) / (stages.length - 1) * 100}%`}}/></div>}
      <Link to={`/track-order?id=${o.id}`} className="sf-link-arrow">Track order <ChevronRight/></Link>
    </article>;
  })}</div>;
}

function ProfileTab() {
  const {user, auth, notify} = useStore();
  const a = user.address || {};
  const save = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    auth.updateProfile({name: f.name, phone: f.phone, address: {line1: f.line1, line2: f.line2, city: f.city, province: f.province, postal: f.postal}});
    notify('Details saved');
  };
  return <form className="sf-profile" onSubmit={save}>
    <h3>Personal details</h3>
    <div className="sf-field-row">
      <label className="sf-field"><span>Full name</span><input name="name" defaultValue={user.name} required/></label>
      <label className="sf-field"><span>Phone</span><input name="phone" type="tel" defaultValue={user.phone || ''}/></label>
    </div>
    <label className="sf-field"><span>Email</span><input value={user.email} disabled/></label>
    <h3>Default shipping address</h3>
    <label className="sf-field"><span>Street address</span><input name="line1" defaultValue={a.line1 || ''}/></label>
    <label className="sf-field"><span>Apartment, suite</span><input name="line2" defaultValue={a.line2 || ''}/></label>
    <div className="sf-field-row sf-field-row-3">
      <label className="sf-field"><span>City</span><input name="city" defaultValue={a.city || ''}/></label>
      <label className="sf-field"><span>Province</span><input name="province" defaultValue={a.province || 'Ontario'}/></label>
      <label className="sf-field"><span>Postal code</span><input name="postal" defaultValue={a.postal || ''}/></label>
    </div>
    <button className="sf-btn">Save changes</button>
  </form>;
}

export function AccountPage() {
  const {user, auth, wishlist, route, go} = useStore();
  const tab = new URLSearchParams(route.split('?')[1] || '').get('tab') || 'orders';
  useEffect(() => { document.title = 'My account | FlairMantra'; }, []);
  if (!user) return <div className="sf-wrap"><Breadcrumbs items={[['Home', '/'], ['Account']]}/><AuthForms/></div>;
  const tabs = [['orders', Package, 'My orders'], ['profile', MapPin, 'Profile & address']];
  return <div className="sf-wrap sf-account">
    <Breadcrumbs items={[['Home', '/'], ['My account']]}/>
    <div className="sf-account-grid">
      <aside className="sf-account-nav">
        <div className="sf-account-hello"><span className="sf-avatar">{user.name?.[0]?.toUpperCase() || <UserRound/>}</span><div><b>{user.name}</b><small>{user.email}</small></div></div>
        {tabs.map(([k, I, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(`/account?tab=${k}`)}><I/>{l}</button>)}
        <button onClick={() => go('/wishlist')}><Heart/>Wishlist <small>{wishlist.length}</small></button>
        <button onClick={() => { auth.logout(); go('/account'); }}><LogOut/>Sign out</button>
      </aside>
      <section className="sf-account-body">
        <h1>{tabs.find(t => t[0] === tab)?.[2] || 'My orders'}</h1>
        {user.local && <p className="sf-callout">You’re signed in on this device. Orders placed with <b>{user.email}</b> appear here.</p>}
        {tab === 'profile' ? <ProfileTab/> : <OrdersTab/>}
      </section>
    </div>
  </div>;
}

export function WishlistPage() {
  const {wishlist, findProduct} = useStore();
  const items = wishlist.map(findProduct).filter(Boolean);
  useEffect(() => { document.title = 'Wishlist | FlairMantra'; }, []);
  return <div className="sf-wrap sf-wishlist">
    <Breadcrumbs items={[['Home', '/'], ['Wishlist']]}/>
    <h1>Wishlist <small>({items.length})</small></h1>
    {items.length ? <ProductGrid items={items}/> : <Empty icon={Heart} title="Your wishlist is empty" text="Tap the heart on any style to save it here for later." action="Discover styles" to="/shop"/>}
  </div>;
}

export function TrackOrderPage() {
  const {route} = useStore();
  const initial = new URLSearchParams(route.split('?')[1] || '').get('id') || '';
  const [q, setQ] = useState(initial);
  const [order, setOrder] = useState(undefined);
  const find = id => { const key = String(id).trim().replace(/^#/, '').toUpperCase(); setOrder(readJSON('fm-orders', []).find(o => String(o.id).toUpperCase() === key) || null); };
  useEffect(() => { document.title = 'Track order | FlairMantra'; if (initial) find(initial); }, [initial]);
  const current = order ? stages.indexOf(order.status) : -1;
  return <div className="sf-wrap sf-track">
    <Breadcrumbs items={[['Home', '/'], ['Track order']]}/>
    <div className="sf-track-hero">
      <Truck/>
      <h1>Track your order</h1>
      <p className="sf-muted">Enter the order number from your confirmation, e.g. FM12345678.</p>
      <form onSubmit={e => { e.preventDefault(); find(q); }} className="sf-inline-form"><Search/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Order number" required aria-label="Order number"/><button className="sf-btn">Track</button></form>
    </div>
    {order === null && <Empty icon={PackageCheck} title="We couldn’t find that order" text="Check the order number and try again, or contact us and we’ll help right away." action="Contact us" to="/contact"/>}
    {order && <div className="sf-track-card">
      <header><div><small>Order</small><h2>#{order.id}</h2><p className="sf-muted">Placed {fmtDate(order.date)} · {money(order.total)}</p></div><span className={`sf-status s-${String(order.status).toLowerCase().replace(/\s+/g, '-')}`}>{order.status}</span></header>
      <div className="sf-track-update"><b>{order.customerMessage}</b><small><MapPin/> {order.location}{order.courier && ` · ${order.courier}`}{order.trackingNumber && ` · #${order.trackingNumber}`}</small>{order.expectedDelivery && <small>Expected {new Date(order.expectedDelivery + 'T12:00:00').toLocaleDateString('en-CA', {weekday: 'long', month: 'long', day: 'numeric'})}</small>}</div>
      {order.status !== 'Cancelled' && <ol className="sf-timeline">{stages.map((s, i) => <li key={s} className={i <= current ? 'done' : ''}><i>{i < current ? <CheckCircle2/> : i + 1}</i><span>{s}</span></li>)}</ol>}
      <h3>History</h3>
      <ul className="sf-history">{(order.trackingHistory || []).slice().reverse().map((h, i) => <li key={i}><b>{h.status}</b><span>{h.message}</span><small>{h.location} · {new Date(h.date).toLocaleString('en-CA')}</small></li>)}</ul>
    </div>}
  </div>;
}
