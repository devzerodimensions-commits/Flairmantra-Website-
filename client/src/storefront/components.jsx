import React, {useEffect, useRef, useState} from 'react';
import {Heart, X, ShoppingBag, ChevronLeft, ChevronRight, ArrowRight, Eye} from 'lucide-react';
import {useStore, money, pid, productUrl, discountOf, comparePriceOf, isNew, sizesOf, colorsOf, swatchColor, photographedColor} from './store';

export function Link({to, children, onClick, ...rest}) {
  const {go} = useStore();
  return <a href={to} {...rest} onClick={e => { onClick?.(e); if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); go(to); }}>{children}</a>;
}

export function Price({p, size = 'md'}) {
  const compare = comparePriceOf(p), off = discountOf(p);
  return <div className={`sf-price sf-price-${size}`}>
    <strong>{money(p.price)}</strong>
    {off > 0 && <><del>{money(compare)}</del><span className="sf-off">{off}% off</span></>}
  </div>;
}

export function Badges({p}) {
  const off = discountOf(p), stock = Number(p.stock ?? 25);
  return <div className="sf-badges">
    {isNew(p) && <span className="sf-badge new">New</span>}
    {off > 0 && <span className="sf-badge sale">-{off}%</span>}
    {p.badge && !isNew(p) && <span className="sf-badge">{p.badge}</span>}
    {stock > 0 && stock <= 5 && <span className="sf-badge low">Only {stock} left</span>}
  </div>;
}

export function WishButton({p, className = ''}) {
  const {wishlist, toggleWish} = useStore();
  const on = wishlist.includes(pid(p));
  return <button type="button" className={`sf-wish ${on ? 'on' : ''} ${className}`} aria-pressed={on} aria-label={on ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`} onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWish(p); }}><Heart/></button>;
}

export function ProductCard({p}) {
  const {setQuickView} = useStore();
  const colors = colorsOf(p);
  const gallery = [...new Set([p.image, ...(p.variationImages || []).map(v => v.image), ...(p.galleryImages || [])].filter(Boolean))];
  const soldOut = Number(p.stock ?? 25) <= 0;
  return <article className={`sf-card ${soldOut ? 'soldout' : ''}`}>
    <div className="sf-card-top">
    <Link to={productUrl(p)} className="sf-card-media" aria-label={p.name}>
      <img src={p.image} alt={p.name} loading="lazy"/>
      {gallery[1] && <img className="sf-card-alt" src={gallery[1]} alt="" loading="lazy"/>}
      <Badges p={p}/>
      {soldOut && <span className="sf-soldout">Sold out</span>}
    </Link>
    <WishButton p={p} className="sf-card-wish"/>
    {!soldOut && <button type="button" className="sf-card-quick" onClick={() => setQuickView(p)}><Eye/> Quick view</button>}
    </div>
    <div className="sf-card-body">
      <p className="sf-card-cat">{p.subcategory || p.category}</p>
      <h3><Link to={productUrl(p)}>{p.name}</Link></h3>
      <Price p={p} size="sm"/>
      {colors.length > 1 && <div className="sf-card-colors" aria-label={`${colors.length} colours`}>
        {colors.slice(0, 4).map(c => <i key={c} title={c} style={{background: swatchColor(c)}}/>)}
        {colors.length > 4 && <small>+{colors.length - 4}</small>}
      </div>}
    </div>
  </article>;
}

export function ProductGrid({items, cols = 4}) {
  return <div className={`sf-grid sf-grid-${cols}`}>{items.map(p => <ProductCard key={pid(p)} p={p}/>)}</div>;
}

export function ProductRail({title, eyebrow, items, link, linkLabel = 'View all'}) {
  if (!items.length) return null;
  return <section className="sf-section">
    <SectionHead eyebrow={eyebrow} title={title} link={link} linkLabel={linkLabel}/>
    <div className="sf-rail">{items.map(p => <ProductCard key={pid(p)} p={p}/>)}</div>
  </section>;
}

function usePerView() {
  const get = () => (matchMedia('(max-width: 900px)').matches ? 2 : matchMedia('(max-width: 1100px)').matches ? 3 : 4);
  const [n, setN] = useState(get);
  useEffect(() => { const on = () => setN(get()); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  return n;
}

// Shows `perView` products at a time and auto-advances one card, looping back to the start.
export function ProductCarousel({title, eyebrow, items, link, linkLabel = 'View all', interval = 3500}) {
  const perView = usePerView();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef(null);
  const last = Math.max(0, items.length - perView);
  const at = Math.min(index, last);
  const step = d => setIndex(i => { const cur = Math.min(i, last); return cur + d > last ? 0 : cur + d < 0 ? last : cur + d; });
  useEffect(() => {
    if (paused || !last || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!document.hidden) step(1); }, interval);
    return () => clearInterval(t);
  }, [paused, last, interval]);
  if (!items.length) return null;
  return <section className="sf-section sf-carousel" style={{'--per-view': perView}} aria-roledescription="carousel" aria-label={title}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <div className="sf-section-head">
      <div>{eyebrow && <p className="sf-eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
      <div className="sf-carousel-nav">
        {link && <Link to={link} className="sf-link-arrow">{linkLabel} <ArrowRight/></Link>}
        {last > 0 && <><button type="button" onClick={() => step(-1)} aria-label="Previous products"><ChevronLeft/></button><button type="button" onClick={() => step(1)} aria-label="Next products"><ChevronRight/></button></>}
      </div>
    </div>
    <div className="sf-carousel-viewport"
      onTouchStart={e => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (touch.current ?? 0); if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); setPaused(false); }}>
      <div className="sf-carousel-track" style={{transform: `translateX(calc(${-at} * (100% + var(--gap)) / var(--per-view)))`}}>
        {items.map((p, i) => <div className="sf-carousel-slide" key={pid(p)} aria-hidden={i < at || i >= at + perView}><ProductCard p={p}/></div>)}
      </div>
    </div>
    {last > 0 && <div className="sf-carousel-dots">{Array.from({length: last + 1}, (_, i) => <button key={i} type="button" className={i === at ? 'on' : ''} onClick={() => setIndex(i)} aria-label={`Show products from ${i + 1}`}/>)}</div>}
  </section>;
}

export function SectionHead({eyebrow, title, text, link, linkLabel = 'View all'}) {
  return <div className="sf-section-head">
    <div>{eyebrow && <p className="sf-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{text && <span>{text}</span>}</div>
    {link && <Link to={link} className="sf-link-arrow">{linkLabel} <ArrowRight/></Link>}
  </div>;
}

export function Breadcrumbs({items}) {
  return <nav className="sf-crumbs" aria-label="Breadcrumb">
    {items.map(([label, to], i) => <React.Fragment key={label}>
      {i > 0 && <ChevronRight aria-hidden/>}
      {to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}
    </React.Fragment>)}
  </nav>;
}

export function Empty({icon: Icon, title, text, action, to}) {
  return <div className="sf-empty">
    {Icon && <div className="sf-empty-icon"><Icon/></div>}
    <h2>{title}</h2>{text && <p>{text}</p>}
    {action && <Link to={to} className="sf-btn">{action}</Link>}
  </div>;
}

export function useVariants(p) {
  const photoColors = (p.variationImages || []).filter(v => v?.color && v?.image);
  const colors = photoColors.length ? [...new Set(photoColors.map(v => v.color))] : [photographedColor(p)];
  const sizes = sizesOf(p).length ? sizesOf(p) : ['One Size'];
  const [color, setColor] = useState(colors[0]);
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : '');
  useEffect(() => { setColor(colors[0]); setSize(sizes.length === 1 ? sizes[0] : ''); }, [pid(p)]);
  const image = photoColors.find(v => v.color === color)?.image || p.image;
  return {colors, sizes, color, setColor, size, setSize, image};
}

export function ColorPicker({colors, value, onChange}) {
  return <div className="sf-colors">{colors.map(c => <button key={c} type="button" className={value === c ? 'on' : ''} onClick={() => onChange(c)} aria-pressed={value === c} title={c}><i style={{background: swatchColor(c)}}/><span>{c}</span></button>)}</div>;
}

export function SizePicker({sizes, value, onChange, error}) {
  if (sizes.length === 1 && sizes[0] === 'One Size') return null;
  return <div className={`sf-sizes ${error ? 'err' : ''}`}>{sizes.map(s => <button key={s} type="button" className={value === s ? 'on' : ''} aria-pressed={value === s} onClick={() => onChange(s)}>{s}</button>)}</div>;
}

export function QuickView() {
  const {quickView: p, setQuickView, addToCart} = useStore();
  useEffect(() => {
    if (!p) return;
    const onKey = e => e.key === 'Escape' && setQuickView(null);
    addEventListener('keydown', onKey); document.body.classList.add('sf-lock');
    return () => { removeEventListener('keydown', onKey); document.body.classList.remove('sf-lock'); };
  }, [p]);
  if (!p) return null;
  return <QuickViewBody p={p} close={() => setQuickView(null)} add={addToCart}/>;
}

function QuickViewBody({p, close, add}) {
  const v = useVariants(p);
  const [err, setErr] = useState(false);
  const submit = () => { if (!v.size) { setErr(true); return; } add(p, {size: v.size, color: v.color, image: v.image}); };
  return <div className="sf-modal-wrap" onClick={close}>
    <div className="sf-modal sf-qv" role="dialog" aria-modal="true" aria-label={p.name} onClick={e => e.stopPropagation()}>
      <button className="sf-modal-x" onClick={close} aria-label="Close"><X/></button>
      <div className="sf-qv-media"><img src={v.image} alt={p.name}/><Badges p={p}/></div>
      <div className="sf-qv-info">
        <p className="sf-card-cat">{p.subcategory || p.category}</p>
        <h2>{p.name}</h2>
        <Price p={p} size="lg"/>
        <p className="sf-muted">{p.details}</p>
        <div className="sf-field-label">Colour: <b>{v.color}</b></div>
        <ColorPicker colors={v.colors} value={v.color} onChange={v.setColor}/>
        {v.sizes[0] !== 'One Size' && <div className="sf-field-label">Size: <b>{v.size || 'Select a size'}</b></div>}
        <SizePicker sizes={v.sizes} value={v.size} onChange={s => { v.setSize(s); setErr(false); }} error={err}/>
        {err && <p className="sf-error">Please choose a size.</p>}
        <div className="sf-qv-actions">
          <button className="sf-btn sf-btn-block" onClick={submit}><ShoppingBag/> Add to bag</button>
          <WishButton p={p} className="sf-wish-lg"/>
        </div>
        <Link to={productUrl(p)} className="sf-link-arrow">View full details <ArrowRight/></Link>
      </div>
    </div>
  </div>;
}
