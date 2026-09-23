import React, {useEffect, useState} from 'react';
import {ShoppingBag, Trash2, Minus, Plus, Tag, ShieldCheck, Lock, Truck, CheckCircle2, ArrowRight, Heart, Package} from 'lucide-react';
import {useStore, API, money, readJSON, writeJSON, couponDiscount, FREE_SHIPPING, SHIPPING_FEE} from '../store';
import {Breadcrumbs, Empty, Link, ProductRail} from '../components';

const provinces = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'];

function useCoupon() {
  const {cart, subtotal} = useStore();
  const [coupon, setCoupon] = useState(() => readJSON('fm-applied-coupon', null, 'session'));
  const [msg, setMsg] = useState(null);
  const discount = couponDiscount(coupon, cart, subtotal);
  const apply = code => {
    const found = readJSON('fm-coupons', []).find(c => c.code === code.trim().toUpperCase());
    if (!found || !couponDiscount(found, cart, subtotal)) { setMsg({error: true, text: 'This code is invalid, expired, or doesn’t apply to your bag.'}); return; }
    setCoupon(found); writeJSON('fm-applied-coupon', found, 'session'); setMsg({text: `Code ${found.code} applied.`});
  };
  const remove = () => { setCoupon(null); sessionStorage.removeItem('fm-applied-coupon'); setMsg(null); };
  const shipping = coupon?.freeShipping || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  return {coupon, discount, apply, remove, msg, shipping, total: Math.max(0, subtotal - discount) + shipping};
}

function CouponBox({c}) {
  const [code, setCode] = useState('');
  if (c.coupon && c.discount) return <div className="sf-coupon-on"><Tag/><span><b>{c.coupon.code}</b> applied — you save {money(c.discount)}</span><button className="sf-text-btn" onClick={c.remove}>Remove</button></div>;
  return <div className="sf-coupon">
    <form onSubmit={e => { e.preventDefault(); if (code.trim()) c.apply(code); }}><input value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" aria-label="Coupon code"/><button className="sf-btn sf-btn-ghost">Apply</button></form>
    {c.msg && <small className={c.msg.error ? 'sf-error' : 'sf-success'}>{c.msg.text}</small>}
  </div>;
}

function Totals({c}) {
  const {subtotal} = useStore();
  return <div className="sf-totals">
    <div className="sf-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
    {c.discount > 0 && <div className="sf-row sf-success"><span>Discount ({c.coupon.code})</span><span>−{money(c.discount)}</span></div>}
    <div className="sf-row"><span>Shipping</span><span>{c.shipping ? money(c.shipping) : 'Free'}</span></div>
    {c.shipping > 0 && <small className="sf-muted">Add {money(FREE_SHIPPING - subtotal)} more for free shipping.</small>}
    <div className="sf-row sf-total"><span>Total</span><span><small>CAD</small> {money(c.total)}</span></div>
  </div>;
}

export function CartPage() {
  const {cart, updateQty, removeFromCart, toggleWish, findProduct, cartCount, go, products} = useStore();
  const c = useCoupon();
  useEffect(() => { document.title = 'Your bag | FlairMantra'; }, []);
  if (!cart.length) return <div className="sf-wrap"><Empty icon={ShoppingBag} title="Your bag is empty" text="Browse our latest arrivals and find something made for your next celebration." action="Start shopping" to="/shop"/><ProductRail eyebrow="Trending now" title="You might like" items={products.slice(0, 8)}/></div>;
  const moveToWishlist = i => { const p = findProduct(i.id); if (p) toggleWish(p); removeFromCart(i.cartKey); };
  return <div className="sf-wrap sf-cart-page">
    <Breadcrumbs items={[['Home', '/'], ['Shopping bag']]}/>
    <h1>Shopping bag <small>({cartCount} {cartCount === 1 ? 'item' : 'items'})</small></h1>
    <div className="sf-cart-grid">
      <section className="sf-cart-lines">
        {cart.map(i => <article className="sf-cart-line" key={i.cartKey}>
          <Link to={`/product/${i.id}`} className="sf-cart-img"><img src={i.image} alt=""/></Link>
          <div className="sf-cart-info">
            <Link to={`/product/${i.id}`} className="sf-line-name">{i.name}</Link>
            <small>{[i.selectedColor && `Colour: ${i.selectedColor}`, i.size && i.size !== 'One Size' && `Size: ${i.size}`].filter(Boolean).join(' · ')}</small>
            <b className="sf-cart-unit">{money(i.price)}</b>
            <div className="sf-cart-actions">
              <div className="sf-qty"><button onClick={() => updateQty(i.cartKey, i.qty - 1)} disabled={i.qty <= 1} aria-label="Decrease quantity"><Minus/></button><span>{i.qty}</span><button onClick={() => updateQty(i.cartKey, i.qty + 1)} aria-label="Increase quantity"><Plus/></button></div>
              <button className="sf-text-btn" onClick={() => moveToWishlist(i)}><Heart/> Save for later</button>
              <button className="sf-text-btn" onClick={() => removeFromCart(i.cartKey)}><Trash2/> Remove</button>
            </div>
          </div>
          <b className="sf-cart-line-total">{money(i.price * i.qty)}</b>
        </article>)}
        <Link to="/shop" className="sf-link-arrow">Continue shopping <ArrowRight/></Link>
      </section>
      <aside className="sf-summary">
        <h2>Order summary</h2>
        <CouponBox c={c}/>
        <Totals c={c}/>
        <button className="sf-btn sf-btn-block" onClick={() => go('/checkout')}><Lock/> Secure checkout</button>
        <div className="sf-assure"><span><ShieldCheck/> Secure checkout</span><span><Truck/> Ships across Canada</span></div>
      </aside>
    </div>
  </div>;
}

export function CheckoutPage() {
  const {cart, setCart, subtotal, go, user} = useStore();
  const c = useCoupon();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [firstName, ...rest] = String(user?.name || '').split(' ');
  const saved = user?.address || {};
  useEffect(() => { document.title = 'Checkout | FlairMantra'; }, []);
  if (!cart.length) return <div className="sf-wrap"><Empty icon={ShoppingBag} title="Your bag is empty" text="Add a style to your bag to check out." action="Explore collections" to="/shop"/></div>;

  const place = async e => {
    e.preventDefault();
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(f.postal.trim())) { setError('Please enter a valid Canadian postal code, e.g. L1Z 0L2.'); return; }
    const orders = readJSON('fm-orders', []);
    if (c.discount && c.coupon?.usagePerUser && orders.filter(o => o.couponCode === c.coupon.code && String(o.email).toLowerCase() === f.email.toLowerCase()).length >= Number(c.coupon.usagePerUser)) { setError('This email has already used this coupon the maximum number of times.'); return; }
    setBusy(true);
    const now = new Date().toISOString();
    const postal = f.postal.trim().toUpperCase().replace(/^(\w{3})\s*-?\s*(\w{3})$/, '$1 $2');
    const order = {
      id: 'FM' + Date.now().toString().slice(-8), customer: `${f.firstName} ${f.lastName}`.trim(), email: f.email.trim(), phone: f.phone,
      address: `${f.address}${f.apt ? ', ' + f.apt : ''}, ${f.city}, ${f.province} ${postal}`,
      items: cart, subtotal, discount: c.discount, shipping: c.shipping, total: c.total, couponCode: c.discount ? c.coupon.code : '', notes: f.notes || '',
      status: 'Processing', payment: f.payment, date: now, customerId: user?.id || '', location: 'Order received',
      customerMessage: 'Your order has been received and is being prepared.',
      trackingHistory: [{status: 'Processing', location: 'Order received', message: 'Your order has been received and is being prepared.', date: now}]
    };
    writeJSON('fm-orders', [order, ...orders]);
    if (c.discount) { writeJSON('fm-coupons', readJSON('fm-coupons', []).map(x => (x.code === c.coupon.code ? {...x, used: Number(x.used || 0) + 1} : x))); sessionStorage.removeItem('fm-applied-coupon'); }
    await fetch(`${API}/orders`, {method: 'POST', headers: {'Content-Type': 'application/json', ...(user?.token ? {Authorization: `Bearer ${user.token}`} : {})}, body: JSON.stringify(order), signal: AbortSignal.timeout(6000)}).catch(() => {});
    setCart([]);
    go(`/order-success?id=${order.id}`);
  };

  return <div className="sf-checkout">
    <div className="sf-wrap">
      <div className="sf-steps"><span className="done">Bag</span><i/><span className="on">Details &amp; payment</span><i/><span>Confirmation</span></div>
      <div className="sf-checkout-grid">
        <form id="checkout" onSubmit={place} className="sf-checkout-form">
          {!user && <div className="sf-callout">Have an account? <Link to="/account?next=/checkout">Sign in</Link> for faster checkout and order history.</div>}
          <fieldset><legend><span>1</span> Contact</legend>
            <label className="sf-field"><span>Email</span><input name="email" type="email" autoComplete="email" required defaultValue={user?.email || ''}/></label>
            <label className="sf-field"><span>Phone</span><input name="phone" type="tel" autoComplete="tel" required defaultValue={user?.phone || ''} placeholder="For delivery updates"/></label>
          </fieldset>
          <fieldset><legend><span>2</span> Shipping address</legend>
            <div className="sf-field-row">
              <label className="sf-field"><span>First name</span><input name="firstName" autoComplete="given-name" required defaultValue={firstName || ''}/></label>
              <label className="sf-field"><span>Last name</span><input name="lastName" autoComplete="family-name" required defaultValue={rest.join(' ')}/></label>
            </div>
            <label className="sf-field"><span>Street address</span><input name="address" autoComplete="address-line1" required defaultValue={saved.line1 || ''}/></label>
            <label className="sf-field"><span>Apartment, suite (optional)</span><input name="apt" autoComplete="address-line2" defaultValue={saved.line2 || ''}/></label>
            <div className="sf-field-row sf-field-row-3">
              <label className="sf-field"><span>City</span><input name="city" autoComplete="address-level2" required defaultValue={saved.city || ''}/></label>
              <label className="sf-field"><span>Province</span><select name="province" autoComplete="address-level1" required defaultValue={saved.province || 'Ontario'}>{provinces.map(p => <option key={p}>{p}</option>)}</select></label>
              <label className="sf-field"><span>Postal code</span><input name="postal" autoComplete="postal-code" required defaultValue={saved.postal || ''} placeholder="A1A 1A1"/></label>
            </div>
            <label className="sf-field"><span>Order notes (optional)</span><textarea name="notes" rows="2" placeholder="Event date, delivery instructions…"/></label>
          </fieldset>
          <fieldset><legend><span>3</span> Payment</legend>
            <label className="sf-pay-opt"><input type="radio" name="payment" value="Cash on Delivery" defaultChecked/><span><b>Cash on delivery</b><small>Pay when your order arrives.</small></span></label>
            <label className="sf-pay-opt"><input type="radio" name="payment" value="Online Payment"/><span><b>Online payment</b><small>Our team will email you a secure payment link to confirm your order.</small></span></label>
          </fieldset>
          {error && <p className="sf-error sf-form-error">{error}</p>}
        </form>
        <aside className="sf-summary sf-checkout-summary">
          <h2>Order summary</h2>
          <div className="sf-summary-items">{cart.map(i => <div className="sf-summary-item" key={i.cartKey}><span className="sf-summary-img"><img src={i.image} alt=""/><b>{i.qty}</b></span><span><b>{i.name}</b><small>{[i.selectedColor, i.size && i.size !== 'One Size' && `Size ${i.size}`].filter(Boolean).join(' · ')}</small></span><em>{money(i.price * i.qty)}</em></div>)}</div>
          <CouponBox c={c}/>
          <Totals c={c}/>
          <button form="checkout" className="sf-btn sf-btn-block" disabled={busy}><Lock/> {busy ? 'Placing order…' : `Place order · ${money(c.total)}`}</button>
          <p className="sf-muted sf-small sf-center"><ShieldCheck/> By placing your order you agree to our <Link to="/shipping-returns">shipping &amp; returns policy</Link>.</p>
        </aside>
      </div>
    </div>
  </div>;
}

export function OrderSuccess() {
  const {route, user} = useStore();
  const id = new URLSearchParams(route.split('?')[1] || '').get('id');
  const order = readJSON('fm-orders', []).find(o => o.id === id);
  useEffect(() => { document.title = 'Order confirmed | FlairMantra'; }, []);
  return <div className="sf-wrap sf-done">
    <div className="sf-success-icon"><CheckCircle2/></div>
    <p className="sf-eyebrow">Order confirmed</p>
    <h1>Thank you{order ? `, ${order.customer.split(' ')[0]}` : ''}!</h1>
    <p>Your order <b>#{id}</b> has been placed. We’ll send updates to {order?.email || 'your email'} as it’s packed and dispatched.</p>
    {order && <div className="sf-success-card">
      {order.items.map(i => <div className="sf-summary-item" key={i.cartKey}><span className="sf-summary-img"><img src={i.image} alt=""/><b>{i.qty}</b></span><span><b>{i.name}</b><small>{i.size && i.size !== 'One Size' ? `Size ${i.size}` : i.selectedColor}</small></span><em>{money(i.price * i.qty)}</em></div>)}
      <div className="sf-row sf-total"><span>Total · {order.payment}</span><span>{money(order.total)}</span></div>
      <p className="sf-muted sf-small">Shipping to {order.address}</p>
    </div>}
    <div className="sf-success-actions">
      <Link to={`/track-order?id=${id}`} className="sf-btn"><Package/> Track this order</Link>
      <Link to={user ? '/account' : '/shop'} className="sf-btn sf-btn-ghost">{user ? 'View my orders' : 'Continue shopping'}</Link>
    </div>
  </div>;
}
