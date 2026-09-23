// Page-builder sections. The admin page builder edits a list of these blocks per page
// (stored in fm-page-layouts); the storefront and the builder preview render them with
// the same components, so what the owner sees while editing is exactly what shoppers see.
import React, {useState} from 'react';
import {ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Truck, RotateCcw, ShieldCheck, Headphones, Quote, Instagram, Play} from 'lucide-react';
import {useStore, readJSON, collections, inCollection, isNew, pid, slugify} from './store';
import {Link, ProductGrid, ProductCarousel, SectionHead} from './components';

/* ---------- Field and section definitions (used by the builder) ---------- */

const TEXT = (key, label, extra) => ({key, label, type: 'text', ...extra});
const AREA = (key, label) => ({key, label, type: 'textarea'});
const IMG = (key, label = 'Image') => ({key, label, type: 'image'});
const LINK = (key = 'link', label = 'Button link') => ({key, label, type: 'link'});
const SELECT = (key, label, options) => ({key, label, type: 'select', options});
const NUM = (key, label, min, max, step = 1) => ({key, label, type: 'number', min, max, step});
const ALIGN = SELECT('align', 'Alignment', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']]);
const collectionOptions = [['', 'All products'], ...collections.map(c => [c.slug, c.name])];

export const SECTION_TYPES = {
  hero: {label: 'Banner', group: 'Hero', icon: 'hero', fields: [TEXT('eyebrow', 'Small heading'), TEXT('title', 'Heading'), AREA('text', 'Text'), IMG('image', 'Background image'), TEXT('button', 'Button text'), LINK(), ALIGN, SELECT('height', 'Height', [['m', 'Medium'], ['l', 'Large'], ['s', 'Small']])],
    defaults: {eyebrow: 'New collection', title: 'Tradition. Elegance. You.', text: 'Discover expressive Indian fashion made for every celebration.', image: '/images/wedding-bridal.png', button: 'Shop now', link: '/shop', align: 'left', height: 'm'}},
  slider: {label: 'Slider', group: 'Hero', icon: 'slider', fields: [1, 2, 3, 4].flatMap(n => [IMG(`image${n}`, `Slide ${n} image`), TEXT(`title${n}`, `Slide ${n} heading`), TEXT(`text${n}`, `Slide ${n} text`), TEXT(`button${n}`, `Slide ${n} button`), LINK(`link${n}`, `Slide ${n} link`)]),
    defaults: {image1: '/images/wedding-bridal.png', title1: 'Tradition, reimagined.', text1: 'Heirloom-worthy lehengas, sarees and sherwanis.', button1: 'Shop the edit', link1: '/category/festive-edit', image2: '/images/women-blue-banarasi-saree.png', title2: 'Drape yourself in confidence.', text2: 'Sarees, kurtas and festive silhouettes.', button2: 'Shop women', link2: '/category/women', image3: '/images/men-emerald-sherwani.png', title3: 'Tradition, sharply tailored.', text3: 'Refined kurtas and statement sherwanis.', button3: 'Shop men', link3: '/category/men'}},
  heading: {label: 'Heading', group: 'Basic', icon: 'heading', fields: [TEXT('eyebrow', 'Small heading'), TEXT('title', 'Heading'), AREA('text', 'Intro text'), ALIGN], defaults: {eyebrow: '', title: 'Your section heading', text: 'Add a short introduction here.', align: 'center'}},
  text: {label: 'Text', group: 'Basic', icon: 'text', fields: [TEXT('title', 'Heading'), AREA('text', 'Text (blank line = new paragraph)'), ALIGN], defaults: {title: 'Tell your story', text: 'Write your content here.', align: 'left'}},
  imageText: {label: 'Image + text', group: 'Basic', icon: 'imageText', fields: [IMG('image'), TEXT('eyebrow', 'Small heading'), TEXT('title', 'Heading'), AREA('text', 'Text'), TEXT('button', 'Button text'), LINK(), SELECT('imageSide', 'Image side', [['left', 'Left'], ['right', 'Right']])],
    defaults: {image: '/social/flairmantra-grey-navratri.jpeg', eyebrow: 'Our story', title: 'Crafted with love and care', text: 'Thoughtful fabrics, expressive colour and beautiful details come together in every FlairMantra look.', button: 'Our story', link: '/about', imageSide: 'left'}},
  image: {label: 'Image', group: 'Basic', icon: 'image', fields: [IMG('image'), TEXT('alt', 'Description (for screen readers)'), LINK('link', 'Link (optional)'), SELECT('width', 'Width', [['wide', 'Page width'], ['full', 'Full screen'], ['narrow', 'Narrow']])], defaults: {image: '/images/navratri-chaniya-choli.png', alt: 'FlairMantra collection', link: '', width: 'wide'}},
  gallery: {label: 'Gallery', group: 'Media', icon: 'gallery', fields: [TEXT('title', 'Heading'), ...[1, 2, 3, 4, 5, 6].map(n => IMG(`image${n}`, `Image ${n}`)), SELECT('columns', 'Columns', [['3', '3'], ['4', '4'], ['2', '2']])],
    defaults: {title: 'Lookbook', image1: '/social/flairmantra-tradition-orange.jpeg', image2: '/social/flairmantra-white-navratri.jpeg', image3: '/social/flairmantra-grey-navratri.jpeg', image4: '/social/flairmantra-orange-full.jpeg', image5: '', image6: '', columns: '4'}},
  video: {label: 'Video', group: 'Media', icon: 'video', fields: [TEXT('title', 'Heading'), TEXT('url', 'YouTube link or video file URL'), IMG('poster', 'Cover image (video files only)')], defaults: {title: 'The FlairMantra story', url: '', poster: '/social/flairmantra-grey-navratri.jpeg'}},
  button: {label: 'Button', group: 'Basic', icon: 'button', fields: [TEXT('button', 'Button text'), LINK(), ALIGN, SELECT('variant', 'Style', [['dark', 'Dark'], ['gold', 'Gold'], ['outline', 'Outline']])], defaults: {button: 'Learn more', link: '/shop', align: 'center', variant: 'dark'}},
  spacer: {label: 'Spacer', group: 'Basic', icon: 'spacer', fields: [NUM('height', 'Height (px)', 8, 240, 8)], defaults: {height: 60}},
  products: {label: 'Products', group: 'Shop', icon: 'products', fields: [TEXT('eyebrow', 'Small heading'), TEXT('title', 'Heading'), SELECT('source', 'Show', [['new', 'New arrivals'], ['collection', 'A collection'], ['manual', 'Products I choose']]), {key: 'collection', label: 'Collection', type: 'select', options: collectionOptions, when: b => b.source === 'collection'}, {key: 'ids', label: 'Choose products', type: 'products', when: b => b.source === 'manual'}, NUM('count', 'How many', 2, 16), SELECT('layout', 'Layout', [['grid', 'Grid'], ['carousel', 'Auto-sliding carousel']]), TEXT('button', 'Link text'), LINK('link', 'Link')],
    defaults: {eyebrow: 'Just landed', title: 'Trending now', source: 'new', collection: '', ids: [], count: 8, layout: 'grid', button: 'View all', link: '/shop'}},
  categories: {label: 'Categories', group: 'Shop', icon: 'categories', fields: [TEXT('eyebrow', 'Small heading'), TEXT('title', 'Heading'), AREA('text', 'Intro text'), SELECT('style', 'Style', [['circles', 'Circles'], ['tiles', 'Tiles']]), NUM('count', 'How many', 2, 8)], defaults: {eyebrow: 'Shop by category', title: 'Find your occasion', text: '', style: 'circles', count: 5}},
  promo: {label: 'Promo banner', group: 'Shop', icon: 'promo', fields: [IMG('image'), TEXT('eyebrow', 'Small heading'), TEXT('title', 'Heading'), AREA('text', 'Text'), TEXT('button', 'Button text'), LINK()],
    defaults: {image: '/images/navratri-chaniya-choli.png', eyebrow: 'Limited edit', title: 'Celebrate in colour', text: 'Statement styles selected for your next special occasion.', button: 'Explore collection', link: '/category/festive-edit'}},
  promoTiles: {label: 'Promo tiles', group: 'Shop', icon: 'tiles', fields: [1, 2, 3].flatMap(n => [IMG(`image${n}`, `Tile ${n} image`), TEXT(`eyebrow${n}`, `Tile ${n} small heading`), TEXT(`title${n}`, `Tile ${n} heading`), LINK(`link${n}`, `Tile ${n} link`)]),
    defaults: {image1: '/images/women-blue-banarasi-saree.png', eyebrow1: 'For her', title1: 'Sarees & kurtas', link1: '/category/women', image2: '/images/men-emerald-sherwani.png', eyebrow2: 'For him', title2: 'Kurtas & sherwanis', link2: '/category/men', image3: '/images/accessories/kundan-necklace.jpg', eyebrow3: 'Finishing touch', title3: 'Jewelry & bags', link3: '/category/accessories'}},
  trust: {label: 'Benefits', group: 'Shop', icon: 'trust', fields: [TEXT('title', 'Heading (optional)'), ...[1, 2, 3, 4].flatMap(n => [TEXT(`item${n}`, `Benefit ${n}`), TEXT(`sub${n}`, `Benefit ${n} detail`)])],
    defaults: {title: '', item1: 'Free shipping', sub1: 'On Canadian orders over $75', item2: '15-day returns', sub2: 'First size exchange free', item3: 'Secure checkout', sub3: 'Your details are protected', item4: 'Stylist on call', sub4: 'Help whenever you need it'}},
  testimonials: {label: 'Testimonials', group: 'Social', icon: 'quote', fields: [TEXT('title', 'Heading'), ...[1, 2, 3].flatMap(n => [AREA(`text${n}`, `Review ${n}`), TEXT(`name${n}`, `Review ${n} name`)])],
    defaults: {title: 'Loved by our clients', text1: 'The fit, colour and detailing were beautiful. I felt confident throughout the celebration.', name1: 'Pratixa P., Ajax', text2: 'Thoughtful service and a festive outfit that looked even better in person.', name2: 'Toronto client', text3: '', name3: ''}},
  faq: {label: 'FAQ', group: 'Basic', icon: 'faq', fields: [TEXT('title', 'Heading'), ...[1, 2, 3, 4, 5].flatMap(n => [TEXT(`q${n}`, `Question ${n}`), AREA(`a${n}`, `Answer ${n}`)])],
    defaults: {title: 'Frequently asked questions', q1: 'How long does shipping take?', a1: 'Orders are dispatched in 2–3 days. You will receive tracking details once your order ships.', q2: 'Can I return or exchange?', a2: 'Returns are accepted within 15 days of delivery for unworn items with tags. Your first size exchange is free.', q3: 'Do you ship outside Canada?', a3: 'Yes — we ship to the USA, UK and Australia at flat rates confirmed with your order.'}},
  newsletter: {label: 'Newsletter', group: 'Social', icon: 'newsletter', fields: [TEXT('title', 'Heading'), AREA('text', 'Text'), TEXT('button', 'Button text')], defaults: {title: 'A little celebration in your inbox', text: 'New collections, styling stories and special offers.', button: 'Subscribe'}},
  contactBlock: {label: 'Contact', group: 'Social', icon: 'contact', fields: [TEXT('title', 'Heading'), AREA('text', 'Text'), TEXT('button', 'Button text'), LINK()], defaults: {title: 'We are here to help', text: 'Need styling or order assistance? Our team is available 24/7.', button: 'Contact us', link: '/contact'}},
  instagram: {label: 'Instagram', group: 'Social', icon: 'instagram', fields: [TEXT('title', 'Heading'), ...[1, 2, 3, 4, 5].map(n => IMG(`image${n}`, `Photo ${n}`))],
    defaults: {title: 'Seen on Instagram', image1: '/social/flairmantra-tradition-orange.jpeg', image2: '/social/flairmantra-white-navratri.jpeg', image3: '/social/flairmantra-fashion-reel.webp', image4: '/social/flairmantra-orange-full.jpeg', image5: '/social/flairmantra-grey-navratri.jpeg'}}
};

// Style options every section shares (shown on the builder's "Style" tab).
export const STYLE_FIELDS = [
  SELECT('bg', 'Background', [['none', 'None'], ['cream', 'Cream'], ['dark', 'Dark'], ['maroon', 'Maroon']]),
  SELECT('pad', 'Spacing', [['m', 'Normal'], ['s', 'Small'], ['l', 'Large'], ['none', 'None']]),
  SELECT('hideOn', 'Show on', [['', 'All devices'], ['mobile', 'Desktop only'], ['desktop', 'Phones only']])
];

export const newBlock = type => ({id: Math.random().toString(36).slice(2, 10), type, ...structuredClone(SECTION_TYPES[type]?.defaults || {})});

// Ready-made layouts for new pages.
export const TEMPLATES = {
  homepage: {name: 'Full homepage', blocks: ['slider', 'categories', ['products', {layout: 'carousel', title: 'New arrivals', count: 10}], 'promoTiles', ['products', {source: 'collection', collection: 'festive-edit', title: 'Festive favourites', eyebrow: 'Celebration mode', count: 4, link: '/category/festive-edit'}], 'imageText', 'testimonials', 'instagram', 'newsletter']},
  landing: {name: 'Collection landing', blocks: ['hero', ['products', {count: 8}], 'promo', 'trust']},
  about: {name: 'About us', blocks: [['hero', {eyebrow: 'Our story', title: 'Tradition. Elegance. You.', height: 's'}], 'imageText', 'text', 'trust', 'testimonials']},
  contact: {name: 'Contact / help', blocks: ['heading', 'faq', 'contactBlock']},
  blank: {name: 'Blank page', blocks: []}
};
export const templateBlocks = key => (TEMPLATES[key]?.blocks || []).map(t => (Array.isArray(t) ? {...newBlock(t[0]), ...t[1]} : newBlock(t)));

/* ---------- Layout storage ---------- */

// On the live server the store content carries the layouts; without it, the admin's browser data is used.
export function usePageLayout(key) {
  const store = useStore();
  const all = store?.content?.['page-layouts'] ?? readJSON('fm-page-layouts', {});
  const layout = all?.[key];
  return layout && layout.status !== 'Draft' && layout.blocks?.length ? layout : null;
}

/* ---------- Rendering ---------- */

const paragraphs = t => String(t || '').split(/\n\s*\n/).filter(Boolean);
const youtubeId = url => (String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || [])[1];

function Btn({text, to, variant = 'dark'}) {
  if (!text) return null;
  const cls = variant === 'gold' ? 'sf-btn sf-btn-gold' : variant === 'outline' ? 'sf-btn sf-btn-ghost' : 'sf-btn';
  return <Link to={to || '/shop'} className={cls}>{text} <ArrowRight/></Link>;
}

function Slider({b}) {
  const slides = [1, 2, 3, 4].map(n => ({image: b[`image${n}`], title: b[`title${n}`], text: b[`text${n}`], button: b[`button${n}`], link: b[`link${n}`]})).filter(s => s.image);
  const [i, setI] = useState(0);
  React.useEffect(() => { if (slides.length < 2) return; const t = setInterval(() => setI(x => (x + 1) % slides.length), 5500); return () => clearInterval(t); }, [slides.length]);
  if (!slides.length) return null;
  return <div className="sf-hero pb-hero-m">
    {slides.map((s, n) => <div key={n} className={`sf-hero-slide ${n === i % slides.length ? 'on' : ''}`}>
      <img src={s.image} alt=""/>
      <div className="sf-hero-copy sf-wrap">{s.title && <h1>{s.title}</h1>}{s.text && <p>{s.text}</p>}<Btn text={s.button} to={s.link} variant="gold"/></div>
    </div>)}
    {slides.length > 1 && <>
      <button className="sf-hero-arrow prev" onClick={() => setI(x => (x - 1 + slides.length) % slides.length)} aria-label="Previous slide"><ChevronLeft/></button>
      <button className="sf-hero-arrow next" onClick={() => setI(x => (x + 1) % slides.length)} aria-label="Next slide"><ChevronRight/></button>
      <div className="sf-hero-dots">{slides.map((_, n) => <button key={n} className={n === i % slides.length ? 'on' : ''} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`}/>)}</div>
    </>}
  </div>;
}

function Faq({b}) {
  const items = [1, 2, 3, 4, 5].map(n => [b[`q${n}`], b[`a${n}`]]).filter(([q]) => q);
  const [open, setOpen] = useState(0);
  return <div className="sf-wrap pb-narrow">
    {b.title && <h2 className="pb-title">{b.title}</h2>}
    <div className="pb-faq">{items.map(([q, a], n) => <div key={n} className={`sf-acc ${open === n ? 'open' : ''}`}>
      <button type="button" onClick={() => setOpen(open === n ? -1 : n)} aria-expanded={open === n}>{q}<ChevronDown/></button>
      {open === n && <div className="sf-acc-body">{paragraphs(a).map((p, k) => <p key={k}>{p}</p>)}</div>}
    </div>)}</div>
  </div>;
}

function Newsletter({b}) {
  const [done, setDone] = useState(false);
  return <div className="sf-wrap pb-newsletter">
    <div><h2>{b.title}</h2>{b.text && <p>{b.text}</p>}</div>
    {done ? <p className="pb-done">Thank you — you’re on the list.</p> : <form onSubmit={e => { e.preventDefault(); setDone(true); }}><input type="email" required placeholder="Your email address" aria-label="Email address"/><button className="sf-btn sf-btn-gold">{b.button || 'Subscribe'}</button></form>}
  </div>;
}

function SectionBody({b}) {
  const {products, categories} = useStore();
  switch (b.type) {
    case 'hero':
      return <div className={`sf-hero pb-hero-${b.height || 'm'} pb-align-${b.align || 'left'}`}>
        <div className="sf-hero-slide on"><img src={b.image} alt=""/>
          <div className="sf-hero-copy sf-wrap">{b.eyebrow && <p className="sf-eyebrow">{b.eyebrow}</p>}{b.title && <h1>{b.title}</h1>}{b.text && <p>{b.text}</p>}<Btn text={b.button} to={b.link} variant="gold"/></div>
        </div>
      </div>;
    case 'slider': return <Slider b={b}/>;
    case 'heading':
      return <div className={`sf-wrap pb-heading pb-align-${b.align || 'center'}`}>{b.eyebrow && <p className="sf-eyebrow">{b.eyebrow}</p>}<h2>{b.title}</h2>{b.text && <p>{b.text}</p>}</div>;
    case 'text':
      return <div className={`sf-wrap pb-narrow pb-text pb-align-${b.align || 'left'}`}>{b.title && <h2>{b.title}</h2>}{paragraphs(b.text).map((p, n) => <p key={n}>{p}</p>)}</div>;
    case 'imageText':
      return <div className={`sf-editorial pb-imagetext ${b.imageSide === 'right' ? 'pb-flip' : ''}`}>
        <div className="sf-editorial-img"><img src={b.image} alt="" loading="lazy"/></div>
        <div className="sf-editorial-copy">{b.eyebrow && <p className="sf-eyebrow">{b.eyebrow}</p>}<h2>{b.title}</h2>{paragraphs(b.text).map((p, n) => <p key={n}>{p}</p>)}<div className="sf-editorial-actions"><Btn text={b.button} to={b.link}/></div></div>
      </div>;
    case 'image': {
      const img = <img src={b.image} alt={b.alt || ''} loading="lazy"/>;
      return <div className={`pb-image pb-image-${b.width || 'wide'} ${b.width === 'full' ? '' : 'sf-wrap'}`}>{b.link ? <Link to={b.link}>{img}</Link> : img}</div>;
    }
    case 'gallery': {
      const imgs = [1, 2, 3, 4, 5, 6].map(n => b[`image${n}`]).filter(Boolean);
      return <div className="sf-wrap">{b.title && <h2 className="pb-title">{b.title}</h2>}<div className={`pb-gallery pb-cols-${b.columns || 4}`}>{imgs.map((src, n) => <img key={n} src={src} alt="" loading="lazy"/>)}</div></div>;
    }
    case 'video': {
      const yt = youtubeId(b.url);
      return <div className="sf-wrap pb-narrow">{b.title && <h2 className="pb-title">{b.title}</h2>}
        <div className="pb-video">{yt ? <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={b.title || 'Video'} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy"/> : b.url ? <video src={b.url} poster={b.poster} controls playsInline preload="metadata"/> : <div className="pb-video-empty"><Play/><span>Add a YouTube link or video URL</span></div>}</div>
      </div>;
    }
    case 'button': return <div className={`sf-wrap pb-button pb-align-${b.align || 'center'}`}><Btn text={b.button} to={b.link} variant={b.variant}/></div>;
    case 'spacer': return <div style={{height: Number(b.height) || 40}} aria-hidden/>;
    case 'products': {
      let list = b.source === 'manual' ? (b.ids || []).map(id => products.find(p => pid(p) === id)).filter(Boolean)
        : b.source === 'collection' ? products.filter(p => inCollection(p, b.collection)) : products.filter(isNew);
      if (!list.length && b.source !== 'manual') list = products;
      list = list.slice(0, Number(b.count) || 8);
      if (b.layout === 'carousel') return <ProductCarousel eyebrow={b.eyebrow} title={b.title} items={list} link={b.link} linkLabel={b.button || 'View all'}/>;
      return <div className="sf-section pb-flush"><SectionHead eyebrow={b.eyebrow} title={b.title} link={b.button ? b.link : null} linkLabel={b.button}/><ProductGrid items={list}/></div>;
    }
    case 'categories': {
      const list = categories.slice(0, Number(b.count) || 5);
      return <div className="sf-section pb-flush"><SectionHead eyebrow={b.eyebrow} title={b.title} text={b.text}/>
        {b.style === 'tiles' ? <div className="pb-cat-tiles">{list.map(c => <Link key={c.id || c.name} to={`/category/${c.id || slugify(c.name)}`} className="sf-promo"><img src={c.image} alt="" loading="lazy"/><div><h3>{c.name}</h3><span>Shop now <ArrowRight/></span></div></Link>)}</div>
          : <div className="sf-cat-row">{list.map(c => <Link key={c.id || c.name} to={`/category/${c.id || slugify(c.name)}`} className="sf-cat"><span className="sf-cat-img"><img src={c.image} alt="" loading="lazy"/></span><b>{c.name}</b><small>{c.subtitle}</small></Link>)}</div>}
      </div>;
    }
    case 'promo':
      return <div className="sf-wrap"><div className="pb-promo"><img src={b.image} alt="" loading="lazy"/><div>{b.eyebrow && <p className="sf-eyebrow">{b.eyebrow}</p>}<h2>{b.title}</h2>{b.text && <p>{b.text}</p>}<Btn text={b.button} to={b.link} variant="gold"/></div></div></div>;
    case 'promoTiles':
      return <div className="sf-section pb-flush sf-promo-split">{[1, 2, 3].filter(n => b[`image${n}`]).map(n => <Link key={n} to={b[`link${n}`] || '/shop'} className="sf-promo"><img src={b[`image${n}`]} alt="" loading="lazy"/><div>{b[`eyebrow${n}`] && <p className="sf-eyebrow">{b[`eyebrow${n}`]}</p>}<h3>{b[`title${n}`]}</h3><span>Shop now <ArrowRight/></span></div></Link>)}</div>;
    case 'trust': {
      const icons = [Truck, RotateCcw, ShieldCheck, Headphones];
      const items = [1, 2, 3, 4].map(n => [b[`item${n}`], b[`sub${n}`]]).filter(([t]) => t);
      return <div className="sf-wrap">{b.title && <h2 className="pb-title">{b.title}</h2>}<div className="pb-trust">{items.map(([t, s], n) => { const I = icons[n % 4]; return <div key={n}><I/><span><b>{t}</b>{s && <small>{s}</small>}</span></div>; })}</div></div>;
    }
    case 'testimonials': {
      const items = [1, 2, 3].map(n => [b[`text${n}`], b[`name${n}`]]).filter(([t]) => t);
      return <div className="sf-wrap">{b.title && <h2 className="pb-title">{b.title}</h2>}<div className="sf-review-row">{items.map(([t, name], n) => <figure key={n} className="sf-review"><blockquote><Quote aria-hidden/>{t}</blockquote>{name && <figcaption><b>{name}</b></figcaption>}</figure>)}</div></div>;
    }
    case 'faq': return <Faq b={b}/>;
    case 'newsletter': return <Newsletter b={b}/>;
    case 'contactBlock': case 'contact':
      return <div className="sf-wrap pb-contact"><h2>{b.title}</h2>{b.text && <p>{b.text}</p>}<Btn text={b.button} to={b.link}/></div>;
    case 'instagram': {
      const imgs = [1, 2, 3, 4, 5].map(n => b[`image${n}`]).filter(Boolean);
      const settings = readJSON('fm-site-settings', {});
      const url = settings.instagram || 'https://www.instagram.com/flairmantra/';
      return <div className="sf-wrap"><SectionHead eyebrow="@flairmantra" title={b.title} link={url} linkLabel="Follow us"/><div className="sf-insta">{imgs.map((src, n) => <a key={n} href={url} target="_blank" rel="noreferrer" className="sf-insta-tile"><img src={src} alt="" loading="lazy"/><span><Instagram/></span></a>)}</div></div>;
    }
    default: return null;
  }
}

export function Section({block}) {
  const pad = block.pad || (['hero', 'slider', 'spacer'].includes(block.type) ? 'none' : 'm');
  const cls = ['pb-section', `pb-bg-${block.bg || 'none'}`, `pb-pad-${pad}`, block.hideOn ? `pb-hide-${block.hideOn}` : '', `pb-type-${block.type}`].join(' ');
  return <section className={cls} data-block={block.id}><SectionBody b={block}/></section>;
}

export function PageSections({blocks}) {
  return <>{(blocks || []).map(b => <Section key={b.id} block={b}/>)}</>;
}
