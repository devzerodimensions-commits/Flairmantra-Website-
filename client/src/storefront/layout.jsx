import React, {useEffect, useMemo, useState} from 'react';
import {Search, UserRound, Heart, ShoppingBag, Menu, X, ChevronDown, ChevronRight, Home, LayoutGrid, Truck, Trash2, Minus, Plus, Instagram, Facebook, Youtube, ArrowRight, ShieldCheck, RotateCcw, Mail, Phone, MapPin} from 'lucide-react';
import {useStore, API, money, pid, productUrl, collections, inCollection, groupOf, slugify} from './store';
import {Link, QuickView} from './components';

function useMenu() {
  const {content} = useStore();
  return useMemo(() => {
    const saved = content['header-menu'];
    const items = saved?.length ? saved.filter(x => x.active !== false).map(x => ({label: x.label, to: x.url || '/'})) : [{label: 'Shop All', to: '/shop'}, ...collections.map(c => ({label: c.name, to: `/category/${c.slug}`}))];
    return items.filter(x => !['/about', '/contact'].includes(x.to));
  }, [content]);
}

function MegaPanel({slug, close}) {
  const {products, categories} = useStore();
  const items = products.filter(p => inCollection(p, slug));
  const groups = [...new Set(items.map(groupOf))];
  const cat = categories.find(c => (c.id || slugify(c.name)) === slug);
  const featured = items.slice(0, 2);
  if (!items.length) return null;
  return <div className="sf-mega" onMouseLeave={close}>
    <div className="sf-mega-inner">
      <div className="sf-mega-col">
        <h4>Shop by type</h4>
        <Link to={`/category/${slug}`} onClick={close}>View all</Link>
        {groups.map(g => <Link key={g} to={`/category/${slug}?type=${encodeURIComponent(g)}`}>{g}</Link>)}
      </div>
      <div className="sf-mega-col">
        <h4>Popular</h4>
        <Link to="/category/new-arrivals">New arrivals</Link>
        <Link to="/shop?max=60">Under $60</Link>
        <Link to="/category/festive-edit">Festive &amp; wedding</Link>
        <Link to="/track-order">Track an order</Link>
      </div>
      <div className="sf-mega-feature">
        {featured.map(p => <Link key={pid(p)} to={productUrl(p)} className="sf-mega-card"><img src={p.image} alt=""/><span>{p.name}</span><b>{money(p.price)}</b></Link>)}
        {cat?.image && !featured.length && <img src={cat.image} alt=""/>}
      </div>
    </div>
  </div>;
}

function SearchBox({onDone, autoFocus}) {
  const {products, go} = useStore();
  const [q, setQ] = useState(new URLSearchParams(location.search).get('q') || '');
  const [open, setOpen] = useState(false);
  const term = q.trim().toLowerCase();
  const hits = term ? products.filter(p => [p.name, p.category, p.subcategory, p.fabric, ...(p.colors || [])].join(' ').toLowerCase().includes(term)).slice(0, 6) : [];
  const submit = e => { e.preventDefault(); if (!term) return; setOpen(false); onDone?.(); go(`/search?q=${encodeURIComponent(q.trim())}`); };
  const popular = ['Saree', 'Lehenga', 'Kurta', 'Sherwani', 'Jewelry'];
  return <form className="sf-search" onSubmit={submit} role="search" onFocus={() => setOpen(true)} onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
    <Search aria-hidden/>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search sarees, lehengas, kurtas…" aria-label="Search products" autoFocus={autoFocus}/>
    {q && <button type="button" className="sf-search-clear" onClick={() => setQ('')} aria-label="Clear search"><X/></button>}
    {open && <div className="sf-suggest">
      {!term && <><p>Popular searches</p><div className="sf-chips">{popular.map(t => <button type="button" key={t} onClick={() => { onDone?.(); setOpen(false); go(`/search?q=${t}`); }}>{t}</button>)}</div></>}
      {term && !hits.length && <p>No matches for “{q}”. Try another word.</p>}
      {hits.map(p => <button type="button" key={pid(p)} className="sf-suggest-row" onClick={() => { setOpen(false); onDone?.(); go(productUrl(p)); }}><img src={p.image} alt=""/><span><b>{p.name}</b><small>{p.subcategory || p.category}</small></span><em>{money(p.price)}</em></button>)}
      {hits.length > 0 && <button type="submit" className="sf-suggest-all">See all results for “{q}” <ArrowRight/></button>}
    </div>}
  </form>;
}

export function Header() {
  const {settings, cartCount, wishlist, user, setCartOpen, route} = useStore();
  const menu = useMenu();
  const [mega, setMega] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const on = () => setScrolled(scrollY > 40); addEventListener('scroll', on, {passive: true}); return () => removeEventListener('scroll', on); }, []);
  useEffect(() => { setDrawer(false); setMega(null); setMobileSearch(false); }, [route]);
  useEffect(() => { document.body.classList.toggle('sf-lock', drawer); }, [drawer]);
  const path = route.split('?')[0];
  return <>
    <div className="sf-topbar">
      <div className="sf-wrap">
        <span className="sf-topbar-left"><Phone/> {settings.phone1}</span>
        <span className="sf-topbar-msg">{settings.announcement}</span>
        <span className="sf-topbar-right"><Link to="/track-order">Track order</Link><Link to="/contact">Help</Link></span>
      </div>
    </div>
    <header className={`sf-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="sf-header-main">
      <div className="sf-wrap sf-header-row">
        <button className="sf-icon-btn sf-only-mobile" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu/></button>
        <Link to="/" className="sf-logo" aria-label="FlairMantra home"><img src={settings.logoUrl} alt="FlairMantra"/></Link>
        <div className="sf-only-desktop sf-header-search"><SearchBox/></div>
        <div className="sf-header-actions">
          <button className="sf-icon-btn sf-only-mobile" onClick={() => setMobileSearch(s => !s)} aria-label="Search"><Search/></button>
          <Link to="/account" className="sf-action sf-only-desktop"><UserRound/><span>{user ? user.name?.split(' ')[0] || 'Account' : 'Sign in'}</span></Link>
          <Link to="/wishlist" className="sf-action"><Heart/><span className="sf-only-desktop">Wishlist</span>{wishlist.length > 0 && <b>{wishlist.length}</b>}</Link>
          <button className="sf-action" onClick={() => setCartOpen(true)} aria-label={`Bag, ${cartCount} items`}><ShoppingBag/><span className="sf-only-desktop">Bag</span>{cartCount > 0 && <b>{cartCount}</b>}</button>
        </div>
      </div>
      {mobileSearch && <div className="sf-wrap sf-only-mobile sf-mobile-search"><SearchBox autoFocus onDone={() => setMobileSearch(false)}/></div>}
      </div>
      <nav className="sf-nav sf-only-desktop" aria-label="Main">
        <div className="sf-wrap">
          {menu.map(item => {
            const slug = item.to.startsWith('/category/') ? item.to.split('/')[2] : null;
            const hasMega = slug && !['sale', 'new-arrivals'].includes(slug);
            return <div key={item.label} className={`sf-nav-item ${path === item.to ? 'active' : ''} ${slug === 'sale' ? 'sale' : ''}`} onMouseEnter={() => setMega(hasMega ? slug : null)}>
              <Link to={item.to}>{item.label}{hasMega && <ChevronDown aria-hidden/>}</Link>
            </div>;
          })}
          <div className="sf-nav-item" onMouseEnter={() => setMega(null)}><Link to="/about">Our Story</Link></div>
        </div>
        {mega && <MegaPanel slug={mega} close={() => setMega(null)}/>}
      </nav>
    </header>
    {drawer && <>
      <div className="sf-overlay" onClick={() => setDrawer(false)}/>
      <aside className="sf-drawer sf-drawer-left" aria-label="Menu">
        <div className="sf-drawer-head">
          <img src={settings.logoUrl} alt="FlairMantra" className="sf-drawer-logo"/>
          <button className="sf-icon-btn" onClick={() => setDrawer(false)} aria-label="Close menu"><X/></button>
        </div>
        <Link to="/account" className="sf-drawer-account"><UserRound/><span>{user ? <>Hi, <b>{user.name}</b></> : <>Sign in <small>or create an account</small></>}</span><ChevronRight/></Link>
        <div className="sf-drawer-links">
          {menu.map(item => <Link key={item.label} to={item.to}>{item.label}<ChevronRight/></Link>)}
        </div>
        <div className="sf-drawer-links sf-drawer-secondary">
          <Link to="/wishlist">Wishlist</Link><Link to="/track-order">Track order</Link><Link to="/about">Our story</Link><Link to="/contact">Contact us</Link><Link to="/shipping-returns">Shipping &amp; returns</Link>
        </div>
      </aside>
    </>}
  </>;
}

export function CartDrawer() {
  const {cart, cartOpen, setCartOpen, updateQty, removeFromCart, subtotal, cartCount, go, freeShipping} = useStore();
  useEffect(() => { document.body.classList.toggle('sf-lock', cartOpen); const k = e => e.key === 'Escape' && setCartOpen(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [cartOpen]);
  if (!cartOpen) return null;
  const left = Math.max(0, freeShipping - subtotal);
  return <>
    <div className="sf-overlay" onClick={() => setCartOpen(false)}/>
    <aside className="sf-drawer sf-drawer-right" aria-label="Shopping bag">
      <div className="sf-drawer-head"><h2>Your bag <small>({cartCount})</small></h2><button className="sf-icon-btn" onClick={() => setCartOpen(false)} aria-label="Close bag"><X/></button></div>
      {!cart.length ? <div className="sf-empty sf-empty-sm"><div className="sf-empty-icon"><ShoppingBag/></div><h2>Your bag is empty</h2><p>Let’s find something you’ll love.</p><button className="sf-btn" onClick={() => go('/shop')}>Start shopping</button></div> : <>
        <div className="sf-ship-meter">
          <p>{left > 0 ? <>You’re <b>{money(left)}</b> away from free shipping</> : <><Truck/> You’ve unlocked <b>free shipping</b></>}</p>
          <div><i style={{width: `${Math.min(100, subtotal / freeShipping * 100)}%`}}/></div>
        </div>
        <div className="sf-drawer-items">
          {cart.map(i => <div className="sf-line" key={i.cartKey}>
            <Link to={`/product/${i.id}`}><img src={i.image} alt=""/></Link>
            <div className="sf-line-info">
              <Link to={`/product/${i.id}`} className="sf-line-name">{i.name}</Link>
              <small>{[i.selectedColor, i.size && i.size !== 'One Size' && `Size ${i.size}`].filter(Boolean).join(' · ')}</small>
              <div className="sf-line-foot">
                <div className="sf-qty"><button onClick={() => updateQty(i.cartKey, i.qty - 1)} aria-label="Decrease quantity" disabled={i.qty <= 1}><Minus/></button><span>{i.qty}</span><button onClick={() => updateQty(i.cartKey, i.qty + 1)} aria-label="Increase quantity"><Plus/></button></div>
                <b>{money(i.price * i.qty)}</b>
              </div>
            </div>
            <button className="sf-line-remove" onClick={() => removeFromCart(i.cartKey)} aria-label={`Remove ${i.name}`}><Trash2/></button>
          </div>)}
        </div>
        <div className="sf-drawer-foot">
          <div className="sf-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <small className="sf-muted">Shipping and coupons are applied at checkout.</small>
          <button className="sf-btn sf-btn-block" onClick={() => go('/checkout')}>Checkout <ArrowRight/></button>
          <button className="sf-btn sf-btn-ghost sf-btn-block" onClick={() => go('/cart')}>View bag</button>
        </div>
      </>}
    </aside>
  </>;
}

export function MobileTabBar() {
  const {route, wishlist, user} = useStore();
  const path = route.split('?')[0];
  const tabs = [['/', Home, 'Home'], ['/shop', LayoutGrid, 'Shop'], ['/wishlist', Heart, 'Wishlist', wishlist.length], ['/account', UserRound, user ? 'Me' : 'Account']];
  return <nav className="sf-tabbar sf-only-mobile" aria-label="Quick navigation">
    {tabs.map(([to, Icon, label, n]) => <Link key={to} to={to} className={path === to ? 'on' : ''}><Icon/>{n > 0 && <b>{n}</b>}<span>{label}</span></Link>)}
  </nav>;
}

export function Toast() {
  const {toast, go} = useStore();
  if (!toast) return null;
  return <div className="sf-toast" role="status" key={toast.id}>{toast.text}{toast.action && <button onClick={() => go(toast.action.to)}>{toast.action.label}</button>}</div>;
}

function Newsletter() {
  const [done, setDone] = useState(false);
  const submit = e => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    fetch(`${API}/newsletter`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email})}).catch(() => {});
    setDone(true);
  };
  return <section className="sf-newsletter">
    <div className="sf-wrap">
      <div><p className="sf-eyebrow">The FlairMantra Circle</p><h2>First look at new drops &amp; private sales</h2></div>
      {done ? <p className="sf-newsletter-done">Thank you — you’re on the list.</p> : <form onSubmit={submit}><input type="email" name="email" required placeholder="Your email address" aria-label="Email address"/><button className="sf-btn sf-btn-gold">Subscribe</button></form>}
    </div>
  </section>;
}

export function Footer() {
  const {settings, freeShipping} = useStore();
  const tel = n => `tel:${String(n).replace(/\D/g, '')}`;
  return <>
    <section className="sf-promises">
      <div className="sf-wrap">
        {[[Truck, 'Free shipping', `On Canadian orders over ${money(freeShipping)}`], [RotateCcw, '15-day returns', 'Easy returns & first size exchange free'], [ShieldCheck, 'Secure checkout', 'Your details are always protected'], [Phone, 'Stylist on call', `${settings.hours} · ${settings.phone1}`]].map(([I, t, s]) => <div key={t}><I/><span><b>{t}</b><small>{s}</small></span></div>)}
      </div>
    </section>
    <Newsletter/>
    <footer className="sf-footer">
      <div className="sf-wrap sf-footer-grid">
        <div className="sf-footer-brand">
          <img src={settings.logoUrl} alt="FlairMantra"/>
          <p>{settings.footerTagline}</p>
          <div className="sf-social">
            {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a>}
            {settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook/></a>}
            {settings.youtube && <a href={settings.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"><Youtube/></a>}
          </div>
        </div>
        <div><h4>Shop</h4><Link to="/shop">Shop all</Link>{collections.map(c => <Link key={c.slug} to={`/category/${c.slug}`}>{c.name}</Link>)}</div>
        <div><h4>Help</h4><Link to="/account">My account</Link><Link to="/track-order">Track order</Link><Link to="/shipping-returns">Shipping &amp; returns</Link><Link to="/contact">Contact us</Link><Link to="/about">Our story</Link></div>
        <div className="sf-footer-contact"><h4>Get in touch</h4>
          <a href={`mailto:${settings.email}`}><Mail/> {settings.email}</a>
          <a href={tel(settings.phone1)}><Phone/> {settings.phone1}</a>
          {settings.phone2 && <a href={tel(settings.phone2)}><Phone/> {settings.phone2}</a>}
          <p><MapPin/> <span>{settings.address.split('\n').map((l, i) => <React.Fragment key={i}>{l}<br/></React.Fragment>)}</span></p>
        </div>
      </div>
      <div className="sf-wrap sf-footer-bottom"><span>© {new Date().getFullYear()} FlairMantra. All rights reserved.</span><span className="sf-pay">Cash on delivery · Online payment</span></div>
    </footer>
  </>;
}

export function Shell({children}) {
  const {loaded} = useStore();
  return <div className="sf">
    <Header/>
    <main className="sf-main">{loaded ? children : <div className="sf-loading" role="status" aria-label="Loading"><span/></div>}</main>
    <Footer/>
    <CartDrawer/>
    <QuickView/>
    <MobileTabBar/>
    <Toast/>
  </div>;
}
