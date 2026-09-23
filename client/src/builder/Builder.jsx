// Elementor-style page builder for the admin (full screen at /admin/builder?page=KEY).
// Left: widgets, page structure and templates. Middle: the real storefront page in an
// iframe (/__preview). Right: settings for the selected section. Layouts are saved to
// fm-page-layouts, the same place the admin panel and the storefront read them from.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrowLeft, Monitor, Tablet, Smartphone, Undo2, Redo2, ExternalLink, Plus, Search, Layers, LayoutTemplate, GripVertical, Copy, Trash2, X, Upload, Image as ImageIcon, Check,
  PanelTop, GalleryHorizontalEnd, Heading, AlignLeft, Columns2, Film, MousePointerClick, MoveVertical, ShoppingBag, Grid2x2, Megaphone, LayoutGrid, ShieldCheck, Quote, CircleHelp, Mail, Phone, Instagram, Eye, EyeOff} from 'lucide-react';
import {SECTION_TYPES, STYLE_FIELDS, TEMPLATES, newBlock, templateBlocks} from '../storefront/sections';
import {clientCatalog} from '../clientCatalog';
import {collections} from '../storefront/store';
import './builder.css';

const ICONS = {hero: PanelTop, slider: GalleryHorizontalEnd, heading: Heading, text: AlignLeft, imageText: Columns2, image: ImageIcon, gallery: Grid2x2, video: Film, button: MousePointerClick, spacer: MoveVertical,
  products: ShoppingBag, categories: LayoutGrid, promo: Megaphone, tiles: Columns2, trust: ShieldCheck, quote: Quote, faq: CircleHelp, newsletter: Mail, contact: Phone, instagram: Instagram};
const GROUPS = ['Hero', 'Basic', 'Media', 'Shop', 'Social'];
// Preview widths. Desktop is drawn at a real desktop width and scaled down to fit, like Elementor.
const DEVICES = [['desktop', Monitor, 1280], ['tablet', Tablet, 820], ['mobile', Smartphone, 390]];
const readJSON = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? f; } catch { return f; } };
const clone = v => JSON.parse(JSON.stringify(v));

function pageList() {
  const cats = readJSON('fm-categories', null) || clientCatalog.categories;
  const customs = readJSON('fm-pages', []);
  return [
    {key: 'home', name: 'Home', url: '/'}, {key: 'shop', name: 'Shop', url: '/shop'},
    {key: 'about', name: 'About us', url: '/about'}, {key: 'contact', name: 'Contact', url: '/contact'}, {key: 'shipping-returns', name: 'Shipping & returns', url: '/shipping-returns'},
    ...cats.map(c => ({key: `category-${c.id || c.slug}`, name: `Category: ${c.name}`, url: `/category/${c.id || c.slug}`})),
    ...customs.map(p => ({key: `custom-${p.slug}`, name: p.name, url: `/${p.slug}`}))
  ];
}

// Shrinks uploaded photos so pages stay fast and fit in storage.
function resizeImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- Field editors ---------- */

function ImageField({value, onChange, library}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const upload = async e => { const f = e.target.files?.[0]; if (!f) return; setBusy(true); try { onChange(await resizeImage(f)); } finally { setBusy(false); e.target.value = ''; } };
  return <div className="pb-img-field">
    <div className="pb-img-preview">{value ? <img src={value} alt=""/> : <span><ImageIcon/> No image</span>}{value && <button type="button" onClick={() => onChange('')} aria-label="Remove image"><X/></button>}</div>
    <div className="pb-img-actions">
      <label className="pb-btn-sm"><Upload/> {busy ? 'Uploading…' : 'Upload'}<input type="file" accept="image/*" onChange={upload} hidden/></label>
      <button type="button" className="pb-btn-sm" onClick={() => setOpen(o => !o)}><ImageIcon/> Library</button>
    </div>
    {open && <div className="pb-library">{library.map(src => <button type="button" key={src} className={src === value ? 'on' : ''} onClick={() => { onChange(src); setOpen(false); }}><img src={src} alt="" loading="lazy"/></button>)}</div>}
    <input className="pb-url" value={value?.startsWith('data:') ? '' : value || ''} onChange={e => onChange(e.target.value)} placeholder={value?.startsWith('data:') ? 'Uploaded image' : 'or paste an image URL'}/>
  </div>;
}

function ProductsField({value = [], onChange, products}) {
  const [q, setQ] = useState('');
  const chosen = value.map(id => products.find(p => String(p.id || p._id) === id)).filter(Boolean);
  const term = q.trim().toLowerCase();
  const options = products.filter(p => !value.includes(String(p.id || p._id)) && (!term || p.name.toLowerCase().includes(term))).slice(0, 30);
  return <div className="pb-products-field">
    <ul className="pb-chosen">{chosen.map((p, i) => <li key={p.id || p._id}><img src={p.image} alt=""/><span>{p.name}</span>
      <button type="button" disabled={i === 0} onClick={() => { const n = [...value]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} aria-label="Move up">↑</button>
      <button type="button" onClick={() => onChange(value.filter(id => id !== String(p.id || p._id)))} aria-label={`Remove ${p.name}`}><X/></button></li>)}</ul>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products to add…"/>
    <ul className="pb-options">{options.map(p => <li key={p.id || p._id}><button type="button" onClick={() => onChange([...value, String(p.id || p._id)])}><img src={p.image} alt=""/><span>{p.name}</span><Plus/></button></li>)}</ul>
  </div>;
}

function Field({field, block, onChange, ctx}) {
  if (field.when && !field.when(block)) return null;
  const value = block[field.key];
  const set = v => onChange(field.key, v);
  let input;
  switch (field.type) {
    case 'textarea': input = <textarea rows={4} value={value || ''} onChange={e => set(e.target.value)}/>; break;
    case 'select': input = <select value={value ?? field.options[0][0]} onChange={e => set(e.target.value)}>{field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>; break;
    case 'number': input = <div className="pb-range"><input type="range" min={field.min} max={field.max} step={field.step} value={Number(value ?? field.min)} onChange={e => set(Number(e.target.value))}/><input type="number" min={field.min} max={field.max} value={Number(value ?? field.min)} onChange={e => set(Number(e.target.value))}/></div>; break;
    case 'image': input = <ImageField value={value} onChange={set} library={ctx.library}/>; break;
    case 'products': input = <ProductsField value={value || []} onChange={set} products={ctx.products}/>; break;
    case 'link': input = <><input list="pb-links" value={value || ''} onChange={e => set(e.target.value)} placeholder="/shop or https://…"/></>; break;
    default: input = <input value={value || ''} onChange={e => set(e.target.value)}/>;
  }
  return <label className="pb-field"><span>{field.label}</span>{input}</label>;
}

/* ---------- Builder ---------- */

export default function Builder() {
  const params = new URLSearchParams(location.search);
  const [pageKey, setPageKey] = useState(params.get('page') || 'home');
  const pages = useMemo(pageList, []);
  const page = pages.find(p => p.key === pageKey) || {key: pageKey, name: pageKey, url: '/'};
  const products = useMemo(() => readJSON('fm-products', null) || clientCatalog.products, []);
  const library = useMemo(() => [...new Set([
    ...readJSON('fm-media', []).filter(m => String(m.type || '').startsWith('image') || /^data:image/.test(m.url || '')).map(m => m.url),
    ...products.flatMap(p => [p.image, ...(p.variationImages || []).map(v => v.image)]),
    '/images/wedding-bridal.png', '/images/women-blue-banarasi-saree.png', '/images/men-emerald-sherwani.png', '/images/navratri-chaniya-choli.png', '/images/pakistani-collection.png',
    '/social/flairmantra-tradition-orange.jpeg', '/social/flairmantra-white-navratri.jpeg', '/social/flairmantra-orange-full.jpeg', '/social/flairmantra-grey-navratri.jpeg'
  ].filter(Boolean))], [products]);

  const saved = readJSON('fm-page-layouts', {})[pageKey];
  // Sections plus undo/redo stacks, kept together so every change is one update.
  const [doc, setDoc] = useState(() => ({blocks: clone(saved?.blocks || []), past: [], future: []}));
  const blocks = doc.blocks;
  const [status, setStatus] = useState(saved?.status || 'Draft');
  const lastEdit = useRef(null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('add');
  const [sideTab, setSideTab] = useState('content');
  const [device, setDevice] = useState('desktop');
  const [insertAt, setInsertAt] = useState(null);
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(null);
  const [dragId, setDragId] = useState(null);
  const frame = useRef(null);
  const ready = useRef(false);
  const canvas = useRef(null);
  const [box, setBox] = useState({w: 900, h: 700});
  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({w: e.contentRect.width, h: e.contentRect.height}));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const authed = !!(sessionStorage.getItem('fm-admin-token') || sessionStorage.getItem('fm-admin'));
  useEffect(() => { if (!authed) location.replace('/admin'); }, [authed]);

  // Every edit goes through here so it can be undone. Typing into one field within a
  // second counts as a single step, so undo doesn't go back one letter at a time.
  const setBlocks = useCallback((next, {coalesce} = {}) => {
    const now = Date.now(), prev = lastEdit.current;
    const merge = coalesce && prev && prev.key === coalesce && now - prev.time < 1000;
    lastEdit.current = coalesce ? {key: coalesce, time: now} : null;
    setDoc(d => {
      const value = typeof next === 'function' ? next(d.blocks) : next;
      return {blocks: value, past: merge ? d.past : [...d.past.slice(-49), d.blocks], future: []};
    });
    setDirty(true);
  }, []);
  const undo = () => { lastEdit.current = null; setDoc(d => (d.past.length ? {blocks: d.past[d.past.length - 1], past: d.past.slice(0, -1), future: [d.blocks, ...d.future]} : d)); setDirty(true); };
  const redo = () => { lastEdit.current = null; setDoc(d => (d.future.length ? {blocks: d.future[0], past: [...d.past, d.blocks], future: d.future.slice(1)} : d)); setDirty(true); };

  const selectedBlock = blocks.find(b => b.id === selected);
  const post = useCallback(extra => frame.current?.contentWindow?.postMessage({source: 'fm-builder', state: {blocks, selected, pageKey, ...extra}}, location.origin), [blocks, selected, pageKey]);
  useEffect(() => { if (ready.current) post(); }, [post]);

  const insert = (type, index = insertAt ?? (selected ? blocks.findIndex(b => b.id === selected) + 1 : blocks.length)) => {
    const b = newBlock(type);
    setBlocks(cur => [...cur.slice(0, index), b, ...cur.slice(index)]);
    setSelected(b.id); setSideTab('content'); setInsertAt(null);
    setTimeout(() => post({selected: b.id, scrollTick: Date.now()}), 50);
  };
  const move = (id, dir) => setBlocks(cur => { const i = cur.findIndex(b => b.id === id), j = i + dir; if (i < 0 || j < 0 || j >= cur.length) return cur; const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const duplicate = id => { const copyId = Math.random().toString(36).slice(2, 10); setBlocks(cur => { const i = cur.findIndex(b => b.id === id); return [...cur.slice(0, i + 1), {...clone(cur[i]), id: copyId}, ...cur.slice(i + 1)]; }); setSelected(copyId); };
  const remove = id => { setBlocks(cur => cur.filter(b => b.id !== id)); setSelected(s => (s === id ? null : s)); };
  const update = (key, value) => setBlocks(cur => cur.map(b => (b.id === selected ? {...b, [key]: value} : b)), {coalesce: `${selected}:${key}`});
  const reorder = (fromId, toIndex) => setBlocks(cur => { const i = cur.findIndex(b => b.id === fromId); if (i < 0) return cur; const n = [...cur]; const [item] = n.splice(i, 1); n.splice(toIndex > i ? toIndex - 1 : toIndex, 0, item); return n; });
  const applyTemplate = key => {
    if (blocks.length && !confirm('Replace this page’s sections with the template? You can undo this.')) return;
    setBlocks(templateBlocks(key)); setSelected(null); setTab('structure');
  };

  // Messages from the preview iframe.
  useEffect(() => {
    const onMessage = e => {
      if (e.origin !== location.origin || e.data?.source !== 'fm-preview') return;
      const m = e.data;
      if (m.action === 'ready') { ready.current = true; post(); }
      if (m.action === 'select') { setSelected(m.id); setSideTab('content'); }
      if (m.action === 'move') move(m.id, m.dir);
      if (m.action === 'duplicate') duplicate(m.id);
      if (m.action === 'remove') remove(m.id);
      if (m.action === 'insert') { setInsertAt(m.index); setTab('add'); }
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  });

  const save = publish => {
    const all = readJSON('fm-page-layouts', {});
    all[pageKey] = {...(all[pageKey] || {}), title: page.name, status: publish ? 'Published' : 'Draft', showHeader: true, showFooter: true, blocks, updatedAt: new Date().toISOString()};
    try {
      localStorage.setItem('fm-page-layouts', JSON.stringify(all));
      setStatus(publish ? 'Published' : 'Draft'); setDirty(false);
      setNotice({ok: true, text: publish ? 'Published — your page is updated.' : 'Draft saved. Publish when you’re ready.'});
    } catch {
      setNotice({ok: false, text: 'Couldn’t save: your images are too large for browser storage. Use smaller images or image links.'});
    }
  };
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 4000); return () => clearTimeout(t); }, [notice]);
  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    const onKey = e => {
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName || '');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); redo(); }
      else if (e.key === 'Delete' && selected && !typing) remove(selected);
      else if (e.key === 'Escape') { setSelected(null); setInsertAt(null); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const switchPage = key => {
    if (dirty && !confirm('You have unsaved changes. Leave this page without saving?')) return;
    const l = readJSON('fm-page-layouts', {})[key];
    setPageKey(key); setDoc({blocks: clone(l?.blocks || []), past: [], future: []}); setStatus(l?.status || 'Draft'); setSelected(null); setDirty(false);
    window.history.replaceState({}, '', `/admin/builder?page=${encodeURIComponent(key)}`);
  };

  if (!authed) return null;
  const term = q.trim().toLowerCase();
  const widgets = Object.entries(SECTION_TYPES).filter(([, t]) => !term || t.label.toLowerCase().includes(term));
  const type = selectedBlock && SECTION_TYPES[selectedBlock.type === 'contact' ? 'contactBlock' : selectedBlock.type];

  return <div className="pb">
    <datalist id="pb-links">{[...pages.map(p => p.url), ...collections.map(c => `/category/${c.slug}`), '/cart', '/account', '/track-order', '/wishlist'].filter((v, i, a) => a.indexOf(v) === i).map(u => <option key={u} value={u}/>)}</datalist>
    <div className="pb-top">
      <a className="pb-back" href="/admin" onClick={e => { if (dirty && !confirm('Leave without saving your changes?')) e.preventDefault(); }}><ArrowLeft/> Admin</a>
      <select className="pb-page-select" value={pageKey} onChange={e => switchPage(e.target.value)} aria-label="Page to edit">{pages.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}</select>
      <span className={`pb-status ${status === 'Published' ? 'live' : ''}`}>{status === 'Published' ? (dirty ? 'Published · unsaved changes' : 'Published') : 'Draft'}</span>
      <div className="pb-devices" role="group" aria-label="Preview size">{DEVICES.map(([d, I]) => <button key={d} type="button" className={device === d ? 'on' : ''} onClick={() => setDevice(d)} aria-label={`${d} preview`} title={d[0].toUpperCase() + d.slice(1)}><I/></button>)}</div>
      <div className="pb-top-actions">
        <button type="button" onClick={undo} disabled={!doc.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2/></button>
        <button type="button" onClick={redo} disabled={!doc.future.length} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2/></button>
        <a href={page.url} target="_blank" rel="noreferrer" title="Open the live page"><ExternalLink/></a>
        <button type="button" className="pb-save" onClick={() => save(false)}>Save draft</button>
        <button type="button" className="pb-publish" onClick={() => save(true)}>{status === 'Published' && !dirty ? 'Published ✓' : 'Publish'}</button>
      </div>
    </div>

    <aside className="pb-left">
      <div className="pb-tabs" role="tablist">
        {[['add', Plus, 'Add'], ['structure', Layers, 'Structure'], ['templates', LayoutTemplate, 'Templates']].map(([k, I, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><I/>{l}</button>)}
      </div>
      {tab === 'add' && <div className="pb-panel">
        {insertAt !== null && <div className="pb-hint">Choose a section to insert at position {insertAt + 1}. <button type="button" onClick={() => setInsertAt(null)}>Cancel</button></div>}
        <label className="pb-search"><Search/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search sections"/></label>
        {GROUPS.map(g => { const list = widgets.filter(([, t]) => t.group === g); if (!list.length) return null; return <div key={g} className="pb-group"><h4>{g}</h4><div className="pb-widgets">{list.map(([key, t]) => { const I = ICONS[t.icon] || LayoutGrid; return <button type="button" key={key} draggable onDragStart={e => e.dataTransfer.setData('text/fm-widget', key)} onClick={() => insert(key)}><I/><span>{t.label}</span></button>; })}</div></div>; })}
        <p className="pb-tip">Click a section to add it, or drag it into the Structure list.</p>
      </div>}
      {tab === 'structure' && <div className="pb-panel">
        {!blocks.length && <p className="pb-tip">No sections yet. Add one from the Add tab or start from a template.</p>}
        <ol className="pb-tree" onDragOver={e => e.preventDefault()} onDrop={e => { const w = e.dataTransfer.getData('text/fm-widget'); if (w) insert(w, blocks.length); }}>
          {blocks.map((b, i) => { const t = SECTION_TYPES[b.type === 'contact' ? 'contactBlock' : b.type]; const I = ICONS[t?.icon] || LayoutGrid; return <li key={b.id}
            className={`${selected === b.id ? 'on' : ''} ${dragId === b.id ? 'dragging' : ''}`}
            draggable onDragStart={e => { setDragId(b.id); e.dataTransfer.setData('text/fm-block', b.id); }} onDragEnd={() => setDragId(null)}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('over'); }} onDragLeave={e => e.currentTarget.classList.remove('over')}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('over'); const id = e.dataTransfer.getData('text/fm-block'), w = e.dataTransfer.getData('text/fm-widget'); if (id) reorder(id, i); else if (w) insert(w, i); }}
            onClick={() => { setSelected(b.id); post({selected: b.id, scrollTick: Date.now()}); }}>
            <GripVertical className="pb-grip"/><I/><span>{t?.label || b.type}{b.title ? <small>{b.title}</small> : null}</span>
            <button type="button" onClick={e => { e.stopPropagation(); update('hideOn', b.hideOn ? '' : 'mobile'); }} aria-label={b.hideOn ? 'Show on all devices' : 'Hide on phones'} title={b.hideOn ? 'Hidden on some devices' : 'Visible on all devices'} hidden={selected !== b.id}>{b.hideOn ? <EyeOff/> : <Eye/>}</button>
          </li>; })}
        </ol>
      </div>}
      {tab === 'templates' && <div className="pb-panel">
        <p className="pb-tip">Start from a ready-made layout, then change the words and pictures.</p>
        <div className="pb-templates">{Object.entries(TEMPLATES).map(([k, t]) => <button type="button" key={k} onClick={() => applyTemplate(k)}><b>{t.name}</b><small>{t.blocks.length ? t.blocks.map(x => SECTION_TYPES[Array.isArray(x) ? x[0] : x].label).join(' · ') : 'Start empty'}</small></button>)}</div>
      </div>}
    </aside>

    <main className="pb-canvas" ref={canvas}>
      {(() => {
        const width = DEVICES.find(d => d[0] === device)[2];
        const scale = Math.min(1, (box.w - 32) / width), height = Math.max(200, box.h - 32);
        return <div className="pb-frame" style={{width: width * scale, height}}>
          <iframe ref={frame} src="/__preview" title="Page preview" style={{width, height: height / scale, transform: `scale(${scale})`}}/>
        </div>;
      })()}
    </main>

    <aside className="pb-right">
      {selectedBlock ? <>
        <div className="pb-right-head"><h3>{type?.label || selectedBlock.type}</h3><button type="button" className="pb-icon" onClick={() => setSelected(null)} aria-label="Close settings"><X/></button></div>
        <div className="pb-tabs small">{[['content', 'Content'], ['style', 'Style']].map(([k, l]) => <button key={k} className={sideTab === k ? 'on' : ''} onClick={() => setSideTab(k)}>{l}</button>)}</div>
        <div className="pb-fields">
          {(sideTab === 'content' ? type?.fields || [] : STYLE_FIELDS).map(f => <Field key={f.key} field={f} block={selectedBlock} onChange={update} ctx={{library, products}}/>)}
        </div>
        <div className="pb-right-foot">
          <button type="button" className="pb-btn-sm" onClick={() => duplicate(selectedBlock.id)}><Copy/> Duplicate</button>
          <button type="button" className="pb-btn-sm danger" onClick={() => remove(selectedBlock.id)}><Trash2/> Delete</button>
        </div>
      </> : <div className="pb-right-empty">
        <MousePointerClick/>
        <h3>Select a section to edit it</h3>
        <p>Click any section in the preview. Use <b>+</b> between sections to add new ones, and the toolbar to move, copy or delete.</p>
        <ul><li><b>Save draft</b> keeps your work private.</li><li><b>Publish</b> puts this page live.</li><li><b>Ctrl+Z</b> undoes a change.</li></ul>
      </div>}
    </aside>

    {notice && <div className={`pb-notice ${notice.ok ? 'ok' : 'err'}`} role="status">{notice.ok && <Check/>}{notice.text}</div>}
  </div>;
}
