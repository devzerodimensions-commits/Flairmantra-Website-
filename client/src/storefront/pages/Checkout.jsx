import React, {useEffect, useState} from 'react';
import {ShoppingBag, Trash2, Minus, Plus, Tag, ShieldCheck, Lock, Truck, CheckCircle2, ArrowRight, Heart, Package} from 'lucide-react';
import {useStore, API, money, readJSON, writeJSON, couponDiscount, SHIPPING_FEE} from '../store';
import {Breadcrumbs, Empty, Link, ProductRail} from '../components';

const provinces = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'];

const cartLines = cart => cart.map(i => ({id: i.id, qty: i.qty, name: i.name, size: i.size, selectedColor: i.selectedColor, image: i.image, cartKey: i.cartKey}));

// Coupons are checked by the server, which knows the real codes and how often each has been used.
async function checkCoupon(code, cart) {
  try {
    const r = await fetch(`${API}/coupons/validate`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code, items: cartLines(cart)}), signal: AbortSignal.timeout(10000)});
    const d = await r.json().catch(() => ({}));
    if (r.ok) return {code: d.code, discount: d.discount, freeShipping: d.freeShipping};
    if (r.status !== 404) throw new Error(d.message || 'This code is invalid, expired, or doesn’t apply to your bag.');
  } catch (e) { if (!(e instanceof TypeError) && e.name !== 'TimeoutError') throw e; }
  if (!import.meta.env.DEV) throw new Error('We couldn’t check this code right now. Please try again.');
  const found = readJSON('fm-coupons', []).find(c => c.code === code.trim().toUpperCase()); // local development without a server
  const subtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discount = couponDiscount(found, cart, subtotal);
  if (!discount) throw new Error('This code is invalid, expired, or doesn’t apply to your bag.');
  return {code: found.code, discount, freeShipping: !!found.freeShipping};
}

function useCoupon() {
  const {cart, subtotal, freeShipping} = useStore();
  const [coupon, setCoupon] = useState(() => readJSON('fm-applied-coupon', null, 'session'));
  const [msg, setMsg] = useState(null);
  const save = c => { setCoupon(c); c ? writeJSON('fm-applied-coupon', c, 'session') : sessionStorage.removeItem('fm-applied-coupon'); };
  const apply = async code => {
    setMsg(null);
    try { const c = await checkCoupon(code, cart); save(c); setMsg({text: `Code ${c.code} applied.`}); } catch (e) { setMsg({error: true, text: e.message}); }
  };
  // Re-check when the bag changes, since the discount depends on what's in it.
  const cartSig = cart.map(i => `${i.cartKey}:${i.qty}`).join('|');
  useEffect(() => {
    if (!coupon?.code || !cart.length) return;
    checkCoupon(coupon.code, cart).then(save).catch(e => { save(null); setMsg({error: true, text: e.message}); });
  }, [cartSig]);
  const remove = () => { save(null); setMsg(null); };
  const discount = Math.min(subtotal, Number(coupon?.discount || 0));
  const shipping = coupon?.freeShipping || subtotal >= freeShipping ? 0 : SHIPPING_FEE;
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
  const {subtotal, freeShipping} = useStore();
  return <div className="sf-totals">
    <div className="sf-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
    {c.discount > 0 && <div className="sf-row sf-success"><span>Discount ({c.coupon.code})</span><span>−{money(c.discount)}</span></div>}
    <div className="sf-row"><span>Shipping</span><span>{c.shipping ? money(c.shipping) : 'Free'}</span></div>
    {c.shipping > 0 && <small className="sf-muted">Add {money(freeShipping - subtotal)} more for free shipping.</small>}
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
  const {cart, setCart, subtotal, go, user, settings, content, route} = useStore();
  const c = useCoupon();
  const cardEnabled = !!content?.payments?.card;
  const [method, setMethod] = useState(cardEnabled ? 'Card' : 'Cash on Delivery');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cancelled = new URLSearchParams(route.split('?')[1] || '').get('payment') === 'cancelled';
  const [firstName, ...rest] = String(user?.name || '').split(' ');
  const saved = user?.address || {};
  useEffect(() => { document.title = 'Checkout | FlairMantra'; }, []);
  if (!cart.length) return <div className="sf-wrap"><Empty icon={ShoppingBag} title="Your bag is empty" text="Add a style to your bag to check out." action="Explore collections" to="/shop"/></div>;

  const place = async e => {
    e.preventDefault();
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(f.postal.trim())) { setError('Please enter a valid Canadian postal code, e.g. L1Z 0L2.'); return; }
    setBusy(true);
    const postal = f.postal.trim().toUpperCase().replace(/^(\w{3})\s*-?\s*(\w{3})$/, '$1 $2');
    const request = {
      customer: `${f.firstName} ${f.lastName}`.trim(), email: f.email.trim(), phone: f.phone, notes: f.notes || '', payment: f.payment,
      address: `${f.address}${f.apt ? ', ' + f.apt : ''}, ${f.city}, ${f.province} ${postal}`,
      couponCode: c.discount ? c.coupon.code : '', items: cartLines(cart)
    };
    let order;
    try {
      const r = await fetch(`${API}/orders`, {method: 'POST', headers: {'Content-Type': 'application/json', ...(user?.token ? {Authorization: `Bearer ${user.token}`} : {})}, body: JSON.stringify(request), signal: AbortSignal.timeout(20000)});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(d.message || 'We couldn’t place your order.'), {server: r.status !== 503});
      order = d;
    } catch (err) {
      if (err.server || !import.meta.env.DEV) {
        setError(err.server ? err.message : `We couldn’t place your order right now. Please try again, or call us at ${settings.phone1}.`);
        setBusy(false);
        return;
      }
      // Local development without a database: keep the order in this browser so the flow can still be tested.
      const now = new Date().toISOString();
      order = {...request, id: 'FM' + Date.now().toString().slice(-8), items: cart, subtotal, discount: c.discount, shipping: c.shipping, total: c.total, status: 'Processing', date: now, location: 'Order received',
        customerMessage: 'Your order has been received and is being prepared.', trackingHistory: [{status: 'Processing', location: 'Order received', message: 'Your order has been received and is being prepared.', date: now}]};
      writeJSON('fm-orders', [order, ...readJSON('fm-orders', [])]);
    }
    const {checkoutUrl, ...saved} = order;
    writeJSON('fm-my-orders', [saved, ...readJSON('fm-my-orders', []).filter(o => o.id !== saved.id)].slice(0, 50));
    // Card orders go to Stripe's secure page; the bag is emptied only once payment is confirmed.
    if (checkoutUrl) { location.assign(checkoutUrl); return; }
    sessionStorage.removeItem('fm-applied-coupon');
    setCart([]);
    go(`/order-success?id=${order.id}`);
  };

  return <div className="sf-checkout">
    <div className="sf-wrap">
      <div className="sf-steps"><span className="done">Bag</span><i/><span className="on">Details &amp; payment</span><i/><span>Confirmation</span></div>
      <div className="sf-checkout-grid">
        <form id="checkout" onSubmit={place} className="sf-checkout-form">
          {cancelled && <div className="sf-callout sf-callout-warn">Your card payment was cancelled, so nothing was charged. Your bag is still here — you can try again or choose Cash on Delivery.</div>}
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
            {cardEnabled && <label className="sf-pay-opt"><input type="radio" name="payment" value="Card" checked={method === 'Card'} onChange={() => setMethod('Card')}/><span><b>Pay by card</b><small>Visa, Mastercard, Amex, Apple Pay or Google Pay on Stripe’s secure payment page.</small><span className="sf-pay-badges"><Lock/> Secured by Stripe</span></span></label>}
            <label className="sf-pay-opt"><input type="radio" name="payment" value="Cash on Delivery" checked={method === 'Cash on Delivery'} onChange={() => setMethod('Cash on Delivery')}/><span><b>Cash on delivery</b><small>Pay when your order arrives.</small></span></label>
          </fieldset>
          {error && <p className="sf-error sf-form-error">{error}</p>}
        </form>
        <aside className="sf-summary sf-checkout-summary">
          <h2>Order summary</h2>
          <div className="sf-summary-items">{cart.map(i => <div className="sf-summary-item" key={i.cartKey}><span className="sf-summary-img"><img src={i.image} alt=""/><b>{i.qty}</b></span><span><b>{i.name}</b><small>{[i.selectedColor, i.size && i.size !== 'One Size' && `Size ${i.size}`].filter(Boolean).join(' · ')}</small></span><em>{money(i.price * i.qty)}</em></div>)}</div>
          <CouponBox c={c}/>
          <Totals c={c}/>
          <button form="checkout" className="sf-btn sf-btn-block" disabled={busy}><Lock/> {busy ? (method === 'Card' ? 'Opening secure payment…' : 'Placing order…') : method === 'Card' ? `Continue to payment · ${money(c.total)}` : `Place order · ${money(c.total)}`}</button>
          <p className="sf-muted sf-small sf-center"><ShieldCheck/> By placing your order you agree to our <Link to="/shipping-returns">shipping &amp; returns policy</Link>.</p>
        </aside>
      </div>
    </div>
  </div>;
}

export function OrderSuccess() {
  const {route, user, setCart} = useStore();
  const params = new URLSearchParams(route.split('?')[1] || '');
  const id = params.get('id'), sessionId = params.get('session_id');
  const order = [...readJSON('fm-my-orders', []), ...readJSON('fm-orders', [])].find(o => o.id === id);
  // Card orders: ask the server to confirm the payment with Stripe before showing "thank you".
  const [payment, setPayment] = useState(sessionId ? 'checking' : 'done');
  useEffect(() => { document.title = 'Order confirmed | FlairMantra'; }, []);
  useEffect(() => {
    if (!sessionId) return;
    let stop = false;
    (async () => {
      for (let i = 0; i < 8 && !stop; i++) {
        const d = await fetch(`${API}/orders/${encodeURIComponent(id)}/payment?session_id=${encodeURIComponent(sessionId)}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (d?.paymentStatus === 'paid') {
          setPayment('paid'); setCart([]); sessionStorage.removeItem('fm-applied-coupon');
          writeJSON('fm-my-orders', readJSON('fm-my-orders', []).map(o => (o.id === id ? {...o, paymentStatus: 'paid', status: d.status} : o)));
          return;
        }
        if (d?.paymentStatus === 'failed') { setPayment('failed'); return; }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!stop) setPayment('slow');
    })();
    return () => { stop = true; };
  }, [sessionId, id]);

  if (payment === 'checking') return <div className="sf-wrap sf-done"><div className="sf-loading"><span/></div><h1>Confirming your payment…</h1><p>This only takes a few seconds. Please don’t close this page.</p></div>;
  if (payment === 'failed') return <div className="sf-wrap sf-done">
    <p className="sf-eyebrow">Payment not completed</p><h1>Your payment didn’t go through</h1>
    <p>Nothing was charged and order <b>#{id}</b> was not placed. Your bag is still saved.</p>
    <div className="sf-success-actions"><Link to="/checkout" className="sf-btn">Try again</Link><Link to="/contact" className="sf-btn sf-btn-ghost">Contact us</Link></div>
  </div>;
  return <div className="sf-wrap sf-done">
    <div className="sf-success-icon"><CheckCircle2/></div>
    <p className="sf-eyebrow">{payment === 'paid' ? 'Payment received' : 'Order confirmed'}</p>
    <h1>Thank you{order ? `, ${order.customer.split(' ')[0]}` : ''}!</h1>
    {payment === 'slow'
      ? <p>We’ve received order <b>#{id}</b> and are still waiting for the bank to confirm your payment. You can check its status any time on the Track order page.</p>
      : <p>Your order <b>#{id}</b> has been placed{payment === 'paid' ? ' and paid' : ''}. We’ll send updates to {order?.email || 'your email'} as it’s packed and dispatched.</p>}
    {order && <div className="sf-success-card">
      {order.items.map(i => <div className="sf-summary-item" key={i.cartKey}><span className="sf-summary-img"><img src={i.image} alt=""/><b>{i.qty}</b></span><span><b>{i.name}</b><small>{i.size && i.size !== 'One Size' ? `Size ${i.size}` : i.selectedColor}</small></span><em>{money(i.price * i.qty)}</em></div>)}
      <div className="sf-row sf-total"><span>Total · {order.payment === 'Card' ? (payment === 'paid' ? 'Paid by card' : 'Card') : order.payment}</span><span>{money(order.total)}</span></div>
      <p className="sf-muted sf-small">Shipping to {order.address}</p>
    </div>}
    <div className="sf-success-actions">
      <Link to={`/track-order?id=${id}`} className="sf-btn"><Package/> Track this order</Link>
      <Link to={user ? '/account' : '/shop'} className="sf-btn sf-btn-ghost">{user ? 'View my orders' : 'Continue shopping'}</Link>
    </div>
  </div>;
}
