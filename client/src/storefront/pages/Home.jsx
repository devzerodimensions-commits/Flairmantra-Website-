import React, {useEffect, useState} from 'react';
import {ArrowRight, ChevronLeft, ChevronRight, Instagram, Play, Quote} from 'lucide-react';
import {useStore, readJSON, isNew, slugify} from '../store';
import {Link, ProductRail, ProductGrid, SectionHead} from '../components';

const bannerDefaults = [
  {id: 'hero-wedding', eyebrow: 'The Wedding Edit 2026', title: 'Tradition, reimagined.', copy: 'Heirloom-worthy lehengas, sarees and sherwanis for every celebration.', image: '/images/wedding-bridal.png', link: '/category/festive-edit', button: 'Shop the edit'},
  {id: 'banner-women', eyebrow: 'The Women’s Edit', title: 'Drape yourself in confidence.', copy: 'Sarees, kurtas and festive silhouettes designed for modern celebrations.', image: '/images/women-blue-banarasi-saree.png', link: '/category/women', button: 'Shop women'},
  {id: 'banner-men', eyebrow: 'The Men’s Edit', title: 'Tradition, sharply tailored.', copy: 'Refined kurtas and statement sherwanis for every important moment.', image: '/images/men-emerald-sherwani.png', link: '/category/men', button: 'Shop men'},
  {id: 'banner-festive', eyebrow: 'Celebration Mode', title: 'Made to move. Made to shine.', copy: 'Joyful colour, mirror work and occasion-ready craft from the Festive Edit.', image: '/images/navratri-chaniya-choli.png', link: '/category/festive-edit', button: 'Explore festive'}
];

const sectionDefaults = {
  navratri: {eyebrow: 'Navratri special', title: 'Dance-ready favourites', productIds: ['fm-wl-01', 'fm-wl-02', 'fm-wl-03', 'fm-wl-04'], link: '/category/festive-edit', active: true},
  men: {eyebrow: 'The men’s edit', title: 'Tradition, tailored for him', productIds: ['fm-mk-01', 'fm-mk-02', 'fm-ms-01', 'fm-mj-01'], link: '/category/men', active: true},
  jewelry: {eyebrow: 'The finishing touch', title: 'Jewelry & accessories', productIds: ['fm-aj-01', 'fm-aj-02', 'fm-ab-01', 'fm-ab-02'], link: '/category/accessories', active: true},
  testimonials: {eyebrow: 'Real people. Real flair.', title: 'Loved by our clients', active: true, items: [
    {id: 'review-1', name: 'Pratixa P.', location: 'Ajax, Canada', quote: 'The fit, colour and detailing were beautiful. I felt confident throughout the celebration.', poster: '/social/flairmantra-tradition-orange.jpeg'},
    {id: 'review-2', name: 'FlairMantra Client', location: 'Toronto, Canada', quote: 'Thoughtful service and a festive outfit that looked even better in person.', poster: '/social/flairmantra-white-navratri.jpeg'}
  ]}
};

const socialDefaults = [
  {id: 's1', url: '/social/flairmantra-tradition-orange.jpeg', caption: 'Step into tradition. Shine with confidence.'},
  {id: 's2', url: '/social/flairmantra-white-navratri.jpeg', caption: 'Tradition. Elegance. You.'},
  {id: 's3', url: '/social/flairmantra-fashion-reel.webp', caption: 'The FlairMantra festive story.', type: 'animation'},
  {id: 's4', url: '/social/flairmantra-orange-full.jpeg', caption: 'Crafted with love and care.'},
  {id: 's5', url: '/social/flairmantra-grey-navratri.jpeg', caption: 'Festive ready, made for every you.'}
];

function Hero() {
  const saved = readJSON('fm-banners', null);
  const slides = [bannerDefaults[0], ...(saved || bannerDefaults.slice(1))].filter(b => b.active !== false);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused || slides.length < 2) return; const t = setInterval(() => setI(x => (x + 1) % slides.length), 5500); return () => clearInterval(t); }, [paused, slides.length]);
  const move = d => setI(x => (x + d + slides.length) % slides.length);
  return <section className="sf-hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
    {slides.map((b, n) => <div key={b.id} className={`sf-hero-slide ${n === i ? 'on' : ''}`} aria-hidden={n !== i}>
      <img src={b.image} alt="" loading={n ? 'lazy' : 'eager'}/>
      <div className="sf-hero-copy sf-wrap">
        <p className="sf-eyebrow">{b.eyebrow}</p>
        <h1>{b.title}</h1>
        <p>{b.copy}</p>
        <Link to={b.link || '/shop'} className="sf-btn sf-btn-gold" tabIndex={n === i ? 0 : -1}>{(b.button || 'Shop now').toLowerCase().replace(/^\w/, c => c.toUpperCase())} <ArrowRight/></Link>
      </div>
    </div>)}
    {slides.length > 1 && <>
      <button className="sf-hero-arrow prev" onClick={() => move(-1)} aria-label="Previous slide"><ChevronLeft/></button>
      <button className="sf-hero-arrow next" onClick={() => move(1)} aria-label="Next slide"><ChevronRight/></button>
      <div className="sf-hero-dots">{slides.map((b, n) => <button key={b.id} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}/>)}</div>
    </>}
  </section>;
}

function CategoryStrip() {
  const {categories, products} = useStore();
  return <section className="sf-section sf-cats">
    <SectionHead eyebrow="Shop by category" title="Find your occasion"/>
    <div className="sf-cat-row">
      {categories.map(c => {
        const slug = c.id || slugify(c.name);
        const count = products.filter(p => [...(p.collections || []), p.category].some(x => slugify(x) === slug)).length;
        return <Link key={slug} to={`/category/${slug}`} className="sf-cat">
          <span className="sf-cat-img"><img src={c.image} alt="" loading="lazy"/></span>
          <b>{c.name}</b><small>{count ? `${count} styles` : c.subtitle}</small>
        </Link>;
      })}
    </div>
  </section>;
}

function PromoSplit() {
  return <section className="sf-section sf-promo-split">
    <Link to="/category/women" className="sf-promo">
      <img src="/images/women-blue-banarasi-saree.png" alt="" loading="lazy"/>
      <div><p className="sf-eyebrow">For her</p><h3>Sarees &amp; kurtas</h3><span>Shop women <ArrowRight/></span></div>
    </Link>
    <Link to="/category/men" className="sf-promo">
      <img src="/images/men-emerald-sherwani.png" alt="" loading="lazy"/>
      <div><p className="sf-eyebrow">For him</p><h3>Kurtas &amp; sherwanis</h3><span>Shop men <ArrowRight/></span></div>
    </Link>
    <Link to="/category/accessories" className="sf-promo">
      <img src="/images/accessories/kundan-necklace.jpg" alt="" loading="lazy"/>
      <div><p className="sf-eyebrow">Finishing touch</p><h3>Jewelry &amp; bags</h3><span>Shop accessories <ArrowRight/></span></div>
    </Link>
  </section>;
}

function PriceBands() {
  const bands = [['Under $50', '/shop?max=50'], ['$50 – $100', '/shop?min=50&max=100'], ['$100 – $200', '/shop?min=100&max=200'], ['Luxe $200+', '/shop?min=200']];
  return <section className="sf-section sf-bands">
    <SectionHead eyebrow="Shop by budget" title="Something for every celebration"/>
    <div className="sf-band-row">{bands.map(([label, to]) => <Link key={to} to={to} className="sf-band"><span>{label}</span><ArrowRight/></Link>)}</div>
  </section>;
}

function Editorial() {
  return <section className="sf-editorial">
    <div className="sf-editorial-img"><img src="/images/wedding-bridal.png" alt="Bridal lehenga" loading="lazy"/></div>
    <div className="sf-editorial-copy">
      <p className="sf-eyebrow">The Bridal Atelier</p>
      <h2>Made for your forever moment</h2>
      <p>Heirloom-worthy ensembles brought to life with intricate handwork, rich textiles and a distinctly modern soul. Speak to a stylist for sizing help and made-to-measure questions.</p>
      <div className="sf-editorial-actions"><Link to="/category/festive-edit" className="sf-btn">Discover bridal <ArrowRight/></Link><Link to="/contact" className="sf-btn sf-btn-ghost">Book a stylist</Link></div>
    </div>
  </section>;
}

function Testimonials({config}) {
  const items = (config.items || []).filter(x => x.quote);
  if (config.active === false || !items.length) return null;
  return <section className="sf-section sf-reviews">
    <SectionHead eyebrow={config.eyebrow} title={config.title}/>
    <div className="sf-review-row">{items.map(r => <figure key={r.id} className="sf-review">
      {r.video ? <video src={r.video} poster={r.poster} controls playsInline preload="metadata"/> : r.poster && <img src={r.poster} alt="" loading="lazy"/>}
      <blockquote><Quote aria-hidden/>{r.quote}</blockquote>
      <figcaption><b>{r.name}</b><small>{r.location}</small></figcaption>
    </figure>)}</div>
  </section>;
}

function Social() {
  const {settings} = useStore();
  const items = (readJSON('fm-social', null) || socialDefaults).filter(x => x.active !== false);
  return <section className="sf-section sf-social-strip">
    <SectionHead eyebrow="@flairmantra" title="Seen on Instagram" link={settings.instagram} linkLabel="Follow us"/>
    <div className="sf-insta">{items.map(s => <a key={s.id} href={settings.instagram} target="_blank" rel="noreferrer" className="sf-insta-tile">
      {s.type === 'video' ? <video src={s.url} poster={s.poster} muted playsInline preload="metadata"/> : <img src={s.url} alt={s.caption || ''} loading="lazy"/>}
      <span>{['video', 'animation'].includes(s.type) ? <Play/> : <Instagram/>}{s.caption}</span>
    </a>)}</div>
  </section>;
}

export default function Home() {
  const {products, recent, findProduct} = useStore();
  const config = {...sectionDefaults, ...readJSON('fm-home-sections', {})};
  const pick = key => {
    const s = config[key];
    if (!s || s.active === false) return [];
    return (s.productIds || []).map(findProduct).filter(p => p && (p.status || 'active') === 'active');
  };
  const newIn = products.filter(isNew);
  const recentItems = recent.map(findProduct).filter(Boolean).slice(0, 8);
  useEffect(() => { document.title = 'FlairMantra | Indian Occasion Wear Online in Canada'; }, []);
  return <>
    <Hero/>
    <CategoryStrip/>
    <ProductRail eyebrow="Just landed" title="New arrivals" items={newIn} link="/category/new-arrivals"/>
    <PromoSplit/>
    {pick('navratri').length > 0 && <section className="sf-section"><SectionHead eyebrow={config.navratri.eyebrow} title={config.navratri.title} link={config.navratri.link}/><ProductGrid items={pick('navratri')}/></section>}
    <PriceBands/>
    <ProductRail eyebrow={config.men.eyebrow} title={config.men.title} items={pick('men')} link={config.men.link}/>
    <Editorial/>
    <ProductRail eyebrow={config.jewelry.eyebrow} title={config.jewelry.title} items={pick('jewelry')} link={config.jewelry.link}/>
    <Testimonials config={config.testimonials}/>
    {recentItems.length > 0 && <ProductRail eyebrow="Pick up where you left off" title="Recently viewed" items={recentItems}/>}
    <Social/>
    <section className="sf-section"><SectionHead eyebrow="Everything we love" title="Shop all styles" link="/shop"/><ProductGrid items={products.filter(p => !newIn.includes(p)).slice(0, 8)}/></section>
  </>;
}
