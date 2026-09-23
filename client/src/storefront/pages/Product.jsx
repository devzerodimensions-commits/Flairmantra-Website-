import React, {useEffect, useState} from 'react';
import {ShoppingBag, Zap, Truck, RotateCcw, ShieldCheck, ChevronDown, Ruler, X, Minus, Plus, Share2, PackageSearch} from 'lucide-react';
import {useStore, pid, money, groupOf} from '../store';
import {Breadcrumbs, Price, Badges, WishButton, ColorPicker, SizePicker, useVariants, ProductRail, Empty} from '../components';

const sizeChart = [['XS', '32', '26', '35'], ['S', '34', '28', '37'], ['M', '36', '30', '39'], ['L', '38', '32', '41'], ['XL', '40', '34', '43'], ['2XL', '42', '36', '45'], ['3XL', '44', '38', '47'], ['4XL', '46', '40', '49']];

function Accordion({title, children, open: initial}) {
  const [open, setOpen] = useState(!!initial);
  return <div className={`sf-acc ${open ? 'open' : ''}`}>
    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}>{title}<ChevronDown/></button>
    {open && <div className="sf-acc-body">{children}</div>}
  </div>;
}

function SizeGuide({close}) {
  return <div className="sf-modal-wrap" onClick={close}>
    <div className="sf-modal sf-size-guide" role="dialog" aria-modal="true" aria-label="Size guide" onClick={e => e.stopPropagation()}>
      <button className="sf-modal-x" onClick={close} aria-label="Close"><X/></button>
      <h2>Size guide</h2>
      <p className="sf-muted">Body measurements in inches. If you’re between sizes, choose the larger size — your first size exchange is free.</p>
      <table><thead><tr><th>Size</th><th>Bust</th><th>Waist</th><th>Hip</th></tr></thead><tbody>{sizeChart.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table>
    </div>
  </div>;
}

export default function Product({id}) {
  const {findProduct, products, addToCart, trackView, recent, go, notify, freeShipping} = useStore();
  const p = findProduct(id);
  useEffect(() => { if (p) { trackView(p); document.title = `${p.metaTitle || p.name} | FlairMantra`; } }, [id]);
  if (!p) return <div className="sf-wrap"><Empty icon={PackageSearch} title="This style isn’t available" text="It may have sold out or been removed." action="Browse all styles" to="/shop"/></div>;
  return <ProductView p={p} key={pid(p)} freeShipping={freeShipping} products={products} addToCart={addToCart} recent={recent} findProduct={findProduct} go={go} notify={notify}/>;
}

function ProductView({p, freeShipping, products, addToCart, recent, findProduct, go, notify}) {
  const v = useVariants(p);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState(false);
  const [guide, setGuide] = useState(false);
  const [zoom, setZoom] = useState(null);
  const gallery = [...new Set([v.image, p.image, ...(p.variationImages || []).map(x => x.image), ...(p.galleryImages || []), ...(p.images || [])].filter(Boolean))];
  const [shot, setShot] = useState(gallery[0]);
  useEffect(() => setShot(v.image), [v.image]);
  const stock = Number(p.stock ?? 25), soldOut = stock <= 0;
  const catSlug = String(p.category || '').toLowerCase().replace(/\s+/g, '-');
  const related = products.filter(x => pid(x) !== pid(p) && (groupOf(x) === groupOf(p) || x.category === p.category)).slice(0, 8);
  const recentItems = recent.filter(r => r !== pid(p)).map(findProduct).filter(Boolean).slice(0, 8);

  const add = buyNow => {
    if (!v.size) { setErr(true); document.querySelector('.sf-pdp-sizes')?.scrollIntoView({behavior: 'smooth', block: 'center'}); return; }
    addToCart(p, {size: v.size, color: v.color, qty, image: v.image});
    if (buyNow) go('/checkout');
  };
  const share = async () => {
    try { if (navigator.share) await navigator.share({title: p.name, url: location.href}); else { await navigator.clipboard.writeText(location.href); notify('Link copied'); } } catch { /* cancelled */ }
  };

  return <div className="sf-wrap sf-pdp-page">
    <Breadcrumbs items={[['Home', '/'], [p.category || 'Shop', p.category ? `/category/${catSlug}` : '/shop'], [p.name]]}/>
    <div className="sf-pdp">
      <section className="sf-pdp-gallery">
        <div className="sf-pdp-thumbs">{gallery.map((g, i) => <button key={g} className={shot === g ? 'on' : ''} onClick={() => setShot(g)} aria-label={`Image ${i + 1}`}><img src={g} alt=""/></button>)}</div>
        <div className="sf-pdp-main" onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setZoom(`${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`); }} onMouseLeave={() => setZoom(null)}>
          <img src={shot} alt={p.name} style={zoom ? {transformOrigin: zoom, transform: 'scale(1.8)'} : undefined}/>
          <Badges p={p}/>
        </div>
      </section>
      <section className="sf-pdp-info">
        <p className="sf-card-cat">{p.brand || 'FlairMantra'} · {p.subcategory || p.category}</p>
        <h1>{p.name}</h1>
        <Price p={p} size="lg"/>
        <p className="sf-muted sf-small">Prices in CAD · Free shipping over {money(freeShipping)}</p>

        <div className="sf-field-label">Colour: <b>{v.color}</b></div>
        <ColorPicker colors={v.colors} value={v.color} onChange={v.setColor}/>

        {v.sizes[0] !== 'One Size' && <>
          <div className="sf-field-label sf-row"><span>Size: <b>{v.size || 'Select a size'}</b></span><button type="button" className="sf-text-btn" onClick={() => setGuide(true)}><Ruler/> Size guide</button></div>
          <div className="sf-pdp-sizes"><SizePicker sizes={v.sizes} value={v.size} onChange={s => { v.setSize(s); setErr(false); }} error={err}/></div>
          {err && <p className="sf-error">Please choose a size to continue.</p>}
        </>}

        <div className="sf-stock">{soldOut ? <span className="out">Sold out</span> : stock <= 5 ? <span className="low">Hurry — only {stock} left</span> : <span className="in">In stock, ready to ship</span>}</div>

        <div className="sf-pdp-buy">
          <div className="sf-qty sf-qty-lg"><button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}><Minus/></button><span>{qty}</span><button onClick={() => setQty(q => Math.min(stock || 1, q + 1))} aria-label="Increase quantity"><Plus/></button></div>
          <button className="sf-btn sf-btn-grow" disabled={soldOut} onClick={() => add(false)}><ShoppingBag/> Add to bag</button>
          <WishButton p={p} className="sf-wish-lg"/>
        </div>
        <button className="sf-btn sf-btn-gold sf-btn-block" disabled={soldOut} onClick={() => add(true)}><Zap/> Buy it now</button>

        <div className="sf-pdp-perks">
          <div><Truck/><span><b>Ships fast</b><small>Dispatched in 2–3 days</small></span></div>
          <div><RotateCcw/><span><b>15-day returns</b><small>First size exchange free</small></span></div>
          <div><ShieldCheck/><span><b>Secure checkout</b><small>Cash on delivery available</small></span></div>
        </div>

        <Accordion title="Product details" open>
          <p>{p.details || p.description || 'A thoughtfully crafted FlairMantra style with refined finishing.'}</p>
          <ul className="sf-specs">
            {p.fabric && <li><span>Fabric</span><b>{p.fabric}</b></li>}
            <li><span>Type</span><b>{groupOf(p)}</b></li>
            {(p.colors || []).length > 0 && <li><span>Also made in</span><b>{p.colors.join(', ')}</b></li>}
            {p.sku && <li><span>SKU</span><b>{p.sku}</b></li>}
          </ul>
        </Accordion>
        <Accordion title="Fabric & care"><p>{p.fabric || 'Premium occasion-wear fabric'}. Dry clean recommended for embellished pieces. Store folded in a breathable garment bag, away from direct sunlight.</p></Accordion>
        <Accordion title="Shipping & returns"><p>Free shipping within Canada on orders over {money(freeShipping)}; otherwise a flat fee applies at checkout. Returns are accepted within 15 days of delivery for unworn items with tags attached. Your first size exchange is free.</p></Accordion>
        <button className="sf-text-btn sf-share" onClick={share}><Share2/> Share this style</button>
      </section>
    </div>

    <ProductRail eyebrow="You may also like" title="Complete the look" items={related}/>
    {recentItems.length > 0 && <ProductRail eyebrow="Pick up where you left off" title="Recently viewed" items={recentItems}/>}

    <div className="sf-sticky-buy sf-only-mobile">
      <div><b>{money(p.price)}</b><small>{v.size ? `Size ${v.size}` : v.sizes[0] === 'One Size' ? v.color : 'Select a size'}</small></div>
      <button className="sf-btn" disabled={soldOut} onClick={() => add(false)}><ShoppingBag/> Add to bag</button>
    </div>
    {guide && <SizeGuide close={() => setGuide(false)}/>}
  </div>;
}
