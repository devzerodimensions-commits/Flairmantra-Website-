import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {clientCatalog} from '../clientCatalog';

export const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

export const money = n => new Intl.NumberFormat('en-CA', {style: 'currency', currency: 'CAD'}).format(Number(n) || 0);
export const pid = p => String(p?.id || p?._id || '');
export const slugify = s => String(s || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const readJSON = (key, fallback, storage = 'local') => {
  try { const v = JSON.parse(window[`${storage}Storage`].getItem(key) || 'null'); return v ?? fallback; } catch { return fallback; }
};
export const writeJSON = (key, value, storage = 'local') => {
  try { window[`${storage}Storage`].setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

export const FREE_SHIPPING = 75;
export const SHIPPING_FEE = 12;

export const siteDefaults = {
  logoUrl: '/flairmantra-logo-cropped.png',
  announcement: 'FREE DOMESTIC SHIPPING OVER $75 • 15-DAY RETURNS',
  footerTagline: 'Contemporary Indian ethnic wear, rooted in cultural storytelling and crafted for modern celebration.',
  email: 'Pratixa13584@gmail.com', phone1: '416-884-0125', phone2: '647-466-9484',
  address: 'Near 1955 Audley Road North\nAjax, ON L1Z 0L2\nCanada', hours: 'Open 24/7',
  instagram: 'https://www.instagram.com/flairmantra/', facebook: 'https://www.facebook.com/pratixa.patel.5030', youtube: ''
};

export const collections = [
  {slug: 'new-arrivals', name: 'New Arrivals'},
  {slug: 'women', name: 'Women'},
  {slug: 'men', name: 'Men'},
  {slug: 'festive-edit', name: 'Festive Edit'},
  {slug: 'fusion-wear', name: 'Fusion Wear'},
  {slug: 'accessories', name: 'Accessories'},
  {slug: 'sale', name: 'Sale'}
];

export const productUrl = p => `/product/${pid(p)}`;
export const colorsOf = p => p?.colors || p?.attributes?.colors || [];
export const sizesOf = p => (p?.sizes?.length ? p.sizes : p?.attributes?.sizes || []);
export const groupOf = p => p?.subcategory || p?.category || 'Other';
export const isNew = p => String(p?.badge || '').toLowerCase().includes('new');
export const comparePriceOf = p => Number(p?.comparePrice || p?.regularPrice || 0);
export const discountOf = p => { const c = comparePriceOf(p); return c > p.price ? Math.round((1 - p.price / c) * 100) : 0; };
export const inCollection = (p, slug) => {
  if (!slug) return true;
  if (slug === 'new-arrivals') return isNew(p);
  if (slug === 'sale') return discountOf(p) > 0;
  const name = collections.find(c => c.slug === slug)?.name || slug;
  return [...(p.collections || []), p.category].some(c => slugify(c) === slug || String(c).toLowerCase() === name.toLowerCase());
};

const swatches = {'royal blue': '#244a9b', 'pastel pink': '#e8b7bd', 'deep red': '#831e2b', 'deep green': '#174f37', 'sky blue': '#87ceeb', 'off-white': '#f3efe5', 'midnight blue': '#101a40', 'antique gold': '#b08d57', 'as shown': '#8a8175', forest: '#215c3d', mustard: '#d9a21b', rust: '#b7472a', ivory: '#f4efe1', blush: '#e9c3bd', sage: '#a3b18a', indigo: '#33407a', charcoal: '#3a3a3a', emerald: '#1f7a55', maroon: '#6d1a28', wine: '#5e1a2c', peach: '#f3b393', lavender: '#b9a6d6', mint: '#a8dcc2', coral: '#f07e62', lemon: '#f2e46b', beige: '#dccbad', olive: '#6b6b2e', burgundy: '#6c1d2f', magenta: '#b0206e', multi: 'linear-gradient(135deg,#bd3347 0 33%,#dfb84a 33% 66%,#286f61 66%)'};
export const swatchColor = c => swatches[String(c).toLowerCase()] || String(c).toLowerCase().replace(/\s+/g, '');

// Only colours that have their own photograph are selectable on the product page.
export const photographedColor = p => {
  const path = String(p?.image || '').toLowerCase(), name = String(p?.name || '').toLowerCase();
  const map = [['mustard-kurta', 'Mustard'], ['blue-banarasi', 'Royal Blue'], ['blush-chanderi', 'Pastel Pink'], ['ivory-sage', 'Ivory'], ['indigo-fusion', 'Indigo'], ['white-navratri', 'Ivory'], ['ivory-kurta', 'Ivory'], ['grey-navratri', 'Charcoal'], ['tradition-orange', 'Orange'], ['orange-full', 'Orange'], ['navratri-chaniya', 'Orange'], ['wedding-bridal', 'Deep Red'], ['emerald-sherwani', 'Emerald'], ['kundan', 'Emerald'], ['pearl-jhumka', 'Gold'], ['gold-sandal', 'Gold'], ['burgundy', 'Burgundy'], ['potli', 'Maroon'], ['bridal-clutch', 'Black'], ['silk-scarf', 'Emerald']];
  if (name.includes('blue') && !path.includes('mustard')) return 'Royal Blue';
  return map.find(([k]) => path.includes(k))?.[1] || colorsOf(p)[0] || 'As Shown';
};

export const couponDiscount = (coupon, cart, subtotal) => {
  if (!coupon || coupon.active === false) return 0;
  const today = new Date().toISOString().slice(0, 10);
  if (coupon.expiry && coupon.expiry < today) return 0;
  if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.used || 0) >= Number(coupon.usageLimit)) return 0;
  if (Number(coupon.minimumSpend || 0) > subtotal) return 0;
  if (Number(coupon.maximumSpend || 0) > 0 && subtotal > Number(coupon.maximumSpend)) return 0;
  const list = v => (v || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowed = list(coupon.productIds), excluded = list(coupon.excludeProductIds), cats = list(coupon.categories).map(x => x.toLowerCase());
  const eligible = cart.filter(i => (!allowed.length || allowed.includes(pid(i))) && !excluded.includes(pid(i)) && (!cats.length || cats.includes(String(i.category || '').toLowerCase())));
  const total = eligible.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  if (!total) return 0;
  return Math.min(total, coupon.type === 'percent' ? total * Number(coupon.amount || 0) / 100 : Number(coupon.amount || 0));
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Returns null when the account API is unreachable or has no database (demo mode).
async function serverAuth(action, body) {
  let r;
  try { r = await fetch(`${API}/customers/${action}`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(8000)}); } catch { return null; }
  if (r.status === 503 || r.status === 404) return null;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'Something went wrong. Please try again.');
  return d;
}

const CONTENT_KEYS = ['products', 'categories', 'site-settings', 'banners', 'home-sections', 'header-menu', 'social', 'pages', 'store-settings', 'page-layouts'];

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({children}) {
  const [route, setRoute] = useState(location.pathname + location.search);
  const [content, setContent] = useState(() => readJSON('fm-store-cache', null));
  const [loaded, setLoaded] = useState(() => !!readJSON('fm-store-cache', null));
  const products = content?.products?.length ? content.products : clientCatalog.products;
  const categories = content?.categories?.length ? content.categories : clientCatalog.categories;
  const settings = useMemo(() => {
    const s = {...siteDefaults, ...(content?.['site-settings'] || {})};
    // The stock logos carry lots of transparent padding; use the tightly cropped version instead.
    if (!s.logoUrl || /^\/flairmantra-logo(-official|-transparent)?\.png$/.test(s.logoUrl)) s.logoUrl = siteDefaults.logoUrl;
    return s;
  }, [content]);
  const freeShipping = Number(content?.['store-settings']?.freeShipping) || FREE_SHIPPING;
  const [cart, setCart] = useState(() => readJSON('fm-cart', []));
  const [wishlist, setWishlist] = useState(() => readJSON('fm-wishlist', []));
  const [recent, setRecent] = useState(() => readJSON('fm-recently-viewed', []));
  const [user, setUser] = useState(() => readJSON('fm-customer', null));
  const [cartOpen, setCartOpen] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => writeJSON('fm-cart', cart), [cart]);
  // Keep the bag in step with the latest prices and drop items the store has removed or hidden.
  useEffect(() => {
    if (!loaded) return;
    setCart(c => {
      const next = c.flatMap(i => {
        const p = products.find(x => pid(x) === String(i.id));
        return p && (p.status || 'active') === 'active' ? [{...i, name: p.name, price: Number(p.price)}] : [];
      });
      return JSON.stringify(next) === JSON.stringify(c) ? c : next;
    });
  }, [loaded, products]);
  useEffect(() => writeJSON('fm-wishlist', wishlist), [wishlist]);
  useEffect(() => writeJSON('fm-recently-viewed', recent), [recent]);
  useEffect(() => { user ? writeJSON('fm-customer', user) : localStorage.removeItem('fm-customer'); }, [user]);

  // Store content comes from the server (edited in the admin panel). A cached copy renders instantly on
  // repeat visits; without a database (local development) the admin's browser data is used instead.
  useEffect(() => {
    const local = () => Object.fromEntries(CONTENT_KEYS.map(k => [k, readJSON(`fm-${k}`, null)]));
    fetch(`${API}/store`, {signal: AbortSignal.timeout(10000)}).then(r => (r.ok ? r.json() : Promise.reject())).then(d => {
      if (d.database) { setContent(d); writeJSON('fm-store-cache', d); } else setContent(local());
    }).catch(() => setContent(c => c || local())).finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(location.pathname + location.search);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const go = useCallback(to => {
    if (/^https?:\/\//i.test(to)) { window.open(to, '_blank', 'noopener,noreferrer'); return; }
    if (to.startsWith('/admin')) { location.assign(to); return; }
    history.pushState({}, '', to);
    setRoute(to);
    setCartOpen(false);
    setQuickView(null);
    scrollTo({top: 0});
  }, []);

  const notify = useCallback((text, action) => {
    setToast({text, action, id: Date.now()});
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t); }, [toast]);

  const liveProducts = useMemo(() => products.filter(p => (p.status || 'active') === 'active'), [products]);
  const findProduct = useCallback(id => products.find(p => pid(p) === String(id)), [products]);

  const addToCart = useCallback((p, {size, color, qty = 1, image} = {}) => {
    const key = `${pid(p)}-${size || ''}-${color || ''}`;
    setCart(c => {
      const found = c.find(i => i.cartKey === key);
      if (found) return c.map(i => (i.cartKey === key ? {...i, qty: i.qty + qty} : i));
      return [...c, {id: pid(p), name: p.name, brand: p.brand, category: p.category, image: image || p.image, price: Number(p.price), cartKey: key, qty, size, selectedColor: color}];
    });
    setQuickView(null);
    setCartOpen(true);
  }, []);
  const updateQty = (key, qty) => setCart(c => c.map(i => (i.cartKey === key ? {...i, qty: Math.max(1, qty)} : i)));
  const removeFromCart = key => setCart(c => c.filter(i => i.cartKey !== key));

  const toggleWish = useCallback(p => {
    const id = pid(p), has = wishlist.includes(id);
    setWishlist(w => (has ? w.filter(x => x !== id) : [...w, id]));
    notify(has ? 'Removed from wishlist' : 'Saved to wishlist', has ? null : {label: 'View', to: '/wishlist'});
  }, [wishlist, notify]);

  const trackView = useCallback(p => setRecent(r => [pid(p), ...r.filter(x => x !== pid(p))].slice(0, 12)), []);

  // Customer accounts: server first; if the API or database is offline, fall back
  // to a browser-only account so the storefront still works in demo mode.
  const auth = useMemo(() => ({
    async register({name, email, password, phone}) {
      email = email.trim().toLowerCase();
      const d = await serverAuth('register', {name, email, password, phone});
      if (d) { setUser({...d.customer, token: d.token}); return; }
      const local = readJSON('fm-local-customers', []);
      if (local.some(c => c.email === email)) throw new Error('An account with this email already exists');
      const customer = {id: 'local-' + Date.now(), name, email, phone, createdAt: new Date().toISOString()};
      writeJSON('fm-local-customers', [...local, {...customer, hash: await sha256(email + ':' + password)}]);
      setUser({...customer, local: true});
    },
    async login({email, password}) {
      email = email.trim().toLowerCase();
      const d = await serverAuth('login', {email, password});
      if (d) { setUser({...d.customer, token: d.token}); return; }
      const hash = await sha256(email + ':' + password);
      const found = readJSON('fm-local-customers', []).find(c => c.email === email && c.hash === hash);
      if (!found) throw new Error('Incorrect email or password');
      const {hash: _h, ...customer} = found;
      setUser({...customer, local: true});
    },
    logout() { setUser(null); },
    updateProfile(patch) {
      setUser(u => ({...u, ...patch}));
      if (user?.token) fetch(`${API}/customers/me`, {method: 'PUT', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${user.token}`}, body: JSON.stringify(patch)}).catch(() => {});
      if (user?.local) writeJSON('fm-local-customers', readJSON('fm-local-customers', []).map(c => (c.email === user.email ? {...c, ...patch} : c)));
    }
  }), [user]);

  const value = {
    route, go, products: liveProducts, allProducts: products, categories, settings, findProduct, content: content || {}, loaded, freeShipping,
    cart, setCart, addToCart, updateQty, removeFromCart, cartOpen, setCartOpen,
    cartCount: cart.reduce((a, i) => a + i.qty, 0), subtotal: cart.reduce((a, i) => a + Number(i.price) * i.qty, 0),
    wishlist, toggleWish, recent, trackView, quickView, setQuickView, toast, notify, user, auth
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
