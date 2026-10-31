// Card payments through Stripe Checkout (Stripe's hosted payment page).
// Card details never reach this server: we create a checkout session for an order,
// send the shopper to Stripe, and mark the order paid only when Stripe confirms it
// (webhook, or the confirmation check from the order-success page).
import Stripe from 'stripe';

const cents = n => Math.round(Number(n || 0) * 100);

export function createPayments({q, notify, money}) {
  // The secret key comes from the server environment, or from the admin's Payments screen
  // (stored privately in the database, never sent to browsers).
  const clients = new Map();
  const mockHost = process.env.STRIPE_API_HOST ? {host: process.env.STRIPE_API_HOST, port: Number(process.env.STRIPE_API_PORT || 443), protocol: process.env.STRIPE_API_PROTOCOL || 'https'} : {};
  async function settings() {
    const env = {secretKey: process.env.STRIPE_SECRET_KEY || '', webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '', fromEnv: !!process.env.STRIPE_SECRET_KEY};
    if (env.secretKey) return env;
    try {
      const {rows} = await q(`SELECT value FROM kv WHERE key = 'payment-settings'`);
      const v = rows[0]?.value || {};
      return {secretKey: v.secretKey || '', webhookSecret: v.webhookSecret || '', fromEnv: false};
    } catch { return {secretKey: '', webhookSecret: '', fromEnv: false}; }
  }
  const clientFor = key => {
    if (!key) return null;
    if (!clients.has(key)) clients.set(key, new Stripe(key, mockHost));
    return clients.get(key);
  };
  const current = async () => clientFor((await settings()).secretKey);
  if (!process.env.STRIPE_SECRET_KEY) console.log('Stripe key not in the environment: card payments use the key saved in Admin → Settings → Payments, if any.');

  const siteUrl = req => (process.env.SITE_URL || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

  // Shoppers see their items on Stripe's page; the coupon and shipping are added so Stripe's total matches ours exactly.
  async function createCheckout(order, req) {
    const stripe = await current();
    const site = siteUrl(req);
    const image = src => (/^https?:\/\//.test(src || '') ? src : src?.startsWith('/') ? `${site}${src}` : null);
    const line_items = order.items.map(i => ({
      quantity: i.qty,
      price_data: {currency: 'cad', unit_amount: cents(i.price), product_data: {name: i.name, ...(i.size && i.size !== 'One Size' || i.selectedColor ? {description: [i.selectedColor, i.size && i.size !== 'One Size' && `Size ${i.size}`].filter(Boolean).join(' · ')} : {}), ...(image(i.image) ? {images: [image(i.image)]} : {})}}
    }));
    let discounts;
    if (order.discount > 0) {
      const coupon = await stripe.coupons.create({amount_off: cents(order.discount), currency: 'cad', duration: 'once', max_redemptions: 1, name: order.couponCode || 'Discount'});
      discounts = [{coupon: coupon.id}];
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'cad',
      line_items,
      ...(discounts ? {discounts} : {}),
      shipping_options: [{shipping_rate_data: {type: 'fixed_amount', display_name: order.shipping ? 'Standard shipping' : 'Free shipping', fixed_amount: {amount: cents(order.shipping), currency: 'cad'}}}],
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: {orderId: order.id},
      payment_intent_data: {metadata: {orderId: order.id}, description: `FlairMantra order ${order.id}`},
      success_url: `${site}/order-success?id=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/checkout?payment=cancelled&order=${encodeURIComponent(order.id)}`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60
    });
    if (session.amount_total != null && session.amount_total !== cents(order.total)) console.warn(`Stripe total ${session.amount_total} differs from order ${order.id} total ${cents(order.total)}`);
    return session;
  }

  // Runs at most once per order: the WHERE clause makes a second confirmation a no-op.
  async function markPaid(orderId, session) {
    const now = new Date().toISOString();
    const patch = {paymentStatus: 'paid', paidAt: now, status: 'Processing', location: 'Order received', customerMessage: 'Payment received. Your order is being prepared.',
      stripeSessionId: session.id, stripePaymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || '', stripeLivemode: !!session.livemode, amountPaid: (session.amount_total || 0) / 100};
    const step = {status: 'Processing', location: 'Order received', message: 'Payment received. Your order is being prepared.', date: now};
    const {rows} = await q(`UPDATE orders SET status = 'Processing', updated_at = now(),
        data = jsonb_set(data || $2::jsonb, '{trackingHistory}', COALESCE(data->'trackingHistory', '[]'::jsonb) || $3::jsonb)
      WHERE id = $1 AND COALESCE(data->>'paymentStatus', '') <> 'paid' RETURNING data`, [orderId, JSON.stringify(patch), JSON.stringify([step])]);
    const order = rows[0]?.data;
    if (!order) return false;
    if (order.couponCode) {
      await q(`INSERT INTO kv (key, value) VALUES ('coupon-usage', jsonb_build_object($1::text, 1))
        ON CONFLICT (key) DO UPDATE SET value = kv.value || jsonb_build_object($1::text, COALESCE((kv.value->>$1)::int, 0) + 1), updated_at = now()`, [order.couponCode]);
    }
    notify(`Paid order ${order.id} — ${money(order.total)}`,
      `Card payment received through Stripe.\n\nCustomer: ${order.customer}\nEmail: ${order.email}\nPhone: ${order.phone}\nAddress: ${order.address}\n\n` +
      order.items.map(i => `${i.qty} × ${i.name}${i.size ? ` (${i.size})` : ''} — ${money(i.price * i.qty)}`).join('\n') +
      `\n\nTotal paid ${money(order.total)}${order.notes ? `\n\nNotes: ${order.notes}` : ''}`, order.email);
    return true;
  }

  async function markFailed(orderId) {
    const now = new Date().toISOString();
    const step = {status: 'Payment failed', location: 'Payment', message: 'The payment was not completed, so this order was not placed.', date: now};
    await q(`UPDATE orders SET status = 'Payment failed', updated_at = now(),
        data = jsonb_set(data || $2::jsonb, '{trackingHistory}', COALESCE(data->'trackingHistory', '[]'::jsonb) || $3::jsonb)
      WHERE id = $1 AND data->>'paymentStatus' = 'pending'`,
    [orderId, JSON.stringify({paymentStatus: 'failed', status: 'Payment failed', location: 'Payment', customerMessage: step.message}), JSON.stringify([step])]);
  }

  // Stripe calls this after payment. It needs the raw body to verify Stripe's signature.
  async function webhook(req, res) {
    const cfg = await settings(), stripe = clientFor(cfg.secretKey);
    if (!stripe || !cfg.webhookSecret) return res.status(400).send('Webhooks are not configured');
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), cfg.webhookSecret); } catch (e) { return res.status(400).send(`Invalid signature: ${e.message}`); }
    const session = event.data.object;
    const orderId = session.client_reference_id || session.metadata?.orderId;
    try {
      if (orderId && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && session.payment_status === 'paid') await markPaid(orderId, session);
      if (orderId && ['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) await markFailed(orderId);
    } catch (e) { console.error('Stripe webhook error:', e); return res.status(500).send('Error'); }
    res.json({received: true});
  }

  // The order-success page asks this so the shopper sees "paid" even before the webhook arrives.
  async function confirm(orderId, sessionId) {
    const stripe = await current();
    if (!stripe) return 'unknown';
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if ((session.client_reference_id || session.metadata?.orderId) !== orderId) return 'unknown';
    if (session.payment_status === 'paid') { await markPaid(orderId, session); return 'paid'; }
    if (session.status === 'expired') { await markFailed(orderId); return 'failed'; }
    return 'pending';
  }

  // Admin Payments screen: check a key against Stripe before saving it.
  async function saveSettings({secretKey, webhookSecret}) {
    secretKey = String(secretKey || '').trim(); webhookSecret = String(webhookSecret || '').trim();
    if (secretKey && !/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(secretKey)) throw Object.assign(new Error('That doesn’t look like a Stripe secret key. It starts with sk_live_ (or sk_test_ for testing).'), {status: 400});
    if (webhookSecret && !/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) throw Object.assign(new Error('The webhook signing secret starts with whsec_.'), {status: 400});
    if (secretKey) {
      try { await clientFor(secretKey).balance.retrieve(); } catch (e) { clients.delete(secretKey); throw Object.assign(new Error(`Stripe didn’t accept this key: ${e.message}`), {status: 400}); }
    }
    const prev = (await q(`SELECT value FROM kv WHERE key = 'payment-settings'`)).rows[0]?.value || {};
    const next = {secretKey: secretKey || prev.secretKey || '', webhookSecret: webhookSecret || prev.webhookSecret || '', updatedAt: new Date().toISOString()};
    await q(`INSERT INTO kv (key, value) VALUES ('payment-settings', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(next)]);
  }
  async function clearSettings() { await q(`DELETE FROM kv WHERE key = 'payment-settings'`); }
  // What the admin may see: never the key itself, only its type and last 4 characters.
  async function describe() {
    const s = await settings();
    return {enabled: !!s.secretKey, fromEnv: s.fromEnv, mode: s.secretKey.includes('_live_') ? 'live' : s.secretKey ? 'test' : null, last4: s.secretKey ? s.secretKey.slice(-4) : null, webhook: !!s.webhookSecret};
  }

  return {enabled: async () => !!(await settings()).secretKey, createCheckout, markPaid, webhook, confirm, saveSettings, clearSettings, describe};
}
