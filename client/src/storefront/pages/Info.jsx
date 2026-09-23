import React, {useEffect, useState} from 'react';
import {Mail, Phone, MapPin, Clock, Instagram, Facebook, CheckCircle2, Truck, RotateCcw, Repeat, HelpCircle, ArrowRight, FileQuestion} from 'lucide-react';
import {useStore, API, readJSON, writeJSON, money} from '../store';
import {Breadcrumbs, Empty, Link} from '../components';

const useTitle = t => useEffect(() => { document.title = `${t} | FlairMantra`; }, [t]);

export function AboutPage() {
  useTitle('Our story');
  return <div className="sf-info">
    <section className="sf-about-hero">
      <img src="/social/flairmantra-grey-navratri.jpeg" alt="FlairMantra festive look"/>
      <div className="sf-wrap"><p className="sf-eyebrow">Our story</p><h1>Tradition. Elegance. You.</h1><p>FlairMantra celebrates Indian occasion wear through expressive colour, timeless silhouettes and thoughtful craftsmanship — created to help you feel confidently yourself at every celebration.</p><Link to="/shop" className="sf-btn sf-btn-gold">Discover the collection <ArrowRight/></Link></div>
    </section>
    <section className="sf-wrap sf-values">
      {[['01', 'Rooted in tradition', 'Indian artistry and festive stories inspire every collection.'], ['02', 'Made for every you', 'Inclusive sizing and styles that celebrate individuality, confidence and joy.'], ['03', 'Chosen with care', 'Considered fabrics, detailed finishes and quality you can feel.']].map(([n, t, d]) => <article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}
    </section>
  </div>;
}

export function ContactPage() {
  const {settings} = useStore();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Contact us');
  const submit = async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {...Object.fromEntries(new FormData(form)), id: Math.random().toString(36).slice(2), date: new Date().toISOString()};
    setError(''); setBusy(true);
    try {
      const r = await fetch(`${API}/contact`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data), signal: AbortSignal.timeout(10000)});
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message);
    } catch (err) {
      if (!import.meta.env.DEV) { setError(err.message || `We couldn’t send your message. Please email us at ${settings.email}.`); setBusy(false); return; }
      writeJSON('fm-inquiries', [data, ...readJSON('fm-inquiries', [])]); // local development without a server
    }
    setBusy(false); setSent(true); form.reset();
  };
  const tel = n => `tel:${String(n).replace(/\D/g, '')}`;
  return <div className="sf-wrap sf-contact">
    <Breadcrumbs items={[['Home', '/'], ['Contact us']]}/>
    <div className="sf-contact-grid">
      <section>
        <p className="sf-eyebrow">We’re here to help</p>
        <h1>Talk to a stylist</h1>
        <p className="sf-muted">Sizing questions, order help or styling advice for your next celebration — reach us any time.</p>
        <div className="sf-contact-cards">
          <a href={`mailto:${settings.email}`}><Mail/><span><b>Email</b>{settings.email}</span></a>
          <a href={tel(settings.phone1)}><Phone/><span><b>Call</b>{settings.phone1}{settings.phone2 && ` · ${settings.phone2}`}</span></a>
          <div><MapPin/><span><b>Location</b>{settings.address.replace(/\n/g, ', ')}</span></div>
          <div><Clock/><span><b>Hours</b>{settings.hours}</span></div>
        </div>
        <div className="sf-social">
          {settings.instagram && <a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a>}
          {settings.facebook && <a href={settings.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook/></a>}
        </div>
      </section>
      <form className="sf-card-panel" onSubmit={submit}>
        <h2>Send a message</h2>
        <div className="sf-field-row">
          <label className="sf-field"><span>Name</span><input name="name" autoComplete="name" required/></label>
          <label className="sf-field"><span>Email</span><input name="email" type="email" autoComplete="email" required/></label>
        </div>
        <label className="sf-field"><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel"/></label>
        <label className="sf-field"><span>Topic</span><select name="subject"><option>Product &amp; styling advice</option><option>Order support</option><option>Returns &amp; exchange</option><option>Wholesale enquiry</option><option>Other</option></select></label>
        <label className="sf-field"><span>Message</span><textarea name="message" rows="5" required/></label>
        {error && <p className="sf-error sf-form-error">{error}</p>}
        <button className="sf-btn sf-btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
        {sent && <p className="sf-success"><CheckCircle2/> Thank you — we’ve received your message and will reply soon.</p>}
      </form>
    </div>
  </div>;
}

export function ShippingPage() {
  const {settings, freeShipping} = useStore();
  useTitle('Shipping & returns');
  const items = [
    [Truck, 'Shipping', <>Shipping within Canada is free on orders over <b>{money(freeShipping)}</b>. We also ship to the USA, UK and Australia at flat rates confirmed with your order. Tracking details are shared once your order ships.</>],
    [RotateCcw, '15-day returns', <>Returns are accepted within <b>15 days of delivery</b>. Items must be unworn, unwashed, unaltered and returned with original tags and packaging.</>],
    [Repeat, 'First size exchange is free', <>Your first size exchange on an eligible item is complimentary, subject to the new size being in stock.</>],
    [HelpCircle, 'Need help?', <>Contact us with your order number at <a href={`mailto:${settings.email}`}>{settings.email}</a> or <a href={`tel:${settings.phone1.replace(/\D/g, '')}`}>{settings.phone1}</a>. We’re available {settings.hours.toLowerCase()}.</>]
  ];
  return <div className="sf-wrap sf-policy">
    <Breadcrumbs items={[['Home', '/'], ['Shipping & returns']]}/>
    <h1>Shipping &amp; returns</h1>
    <p className="sf-muted">Clear, considered service from checkout to delivery.</p>
    <div className="sf-policy-grid">{items.map(([I, t, body]) => <article key={t}><I/><h2>{t}</h2><p>{body}</p></article>)}</div>
  </div>;
}

export function CmsPage({slug}) {
  const page = (useStore().content.pages || []).find(p => p.slug === slug && p.status !== 'Draft');
  useTitle(page?.metaTitle || page?.name || 'Page not found');
  if (!page) return <div className="sf-wrap"><Empty icon={FileQuestion} title="Page not found" text="The page you’re looking for doesn’t exist or has moved." action="Back to home" to="/"/></div>;
  return <div className="sf-wrap sf-policy">
    <Breadcrumbs items={[['Home', '/'], [page.name]]}/>
    <h1>{page.name}</h1>
    <div className="sf-prose">{String(page.content || '').split('\n').map((l, i) => (l ? <p key={i}>{l}</p> : <br key={i}/>))}</div>
  </div>;
}
