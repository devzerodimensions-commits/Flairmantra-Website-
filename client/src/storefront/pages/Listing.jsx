import React, {useEffect, useMemo, useState} from 'react';
import {SlidersHorizontal, X, SearchX, ChevronDown} from 'lucide-react';
import {useStore, collections, inCollection, groupOf, sizesOf, colorsOf, swatchColor, money, isNew, slugify} from '../store';
import {Breadcrumbs, ProductGrid} from '../components';

const PAGE = 12;
const sorts = [['featured', 'Featured'], ['new', 'Newest first'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['name', 'Name: A–Z']];

function FilterGroup({title, children, open: initial = true}) {
  const [open, setOpen] = useState(initial);
  return <div className={`sf-fgroup ${open ? 'open' : ''}`}>
    <button type="button" className="sf-fgroup-head" onClick={() => setOpen(o => !o)} aria-expanded={open}>{title}<ChevronDown/></button>
    {open && <div className="sf-fgroup-body">{children}</div>}
  </div>;
}

export default function Listing({slug = '', search = false}) {
  const {products, categories, route, go} = useStore();
  const params = new URLSearchParams(route.split('?')[1] || '');
  const q = search ? (params.get('q') || '').trim() : '';

  const [types, setTypes] = useState(params.get('type') ? [params.get('type')] : []);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [min, setMin] = useState(params.get('min') || '');
  const [max, setMax] = useState(params.get('max') || '');
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState(params.get('sort') || 'featured');
  const [limit, setLimit] = useState(PAGE);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setTypes(params.get('type') ? [params.get('type')] : []); setSizes([]); setColors([]); setFabrics([]);
    setMin(params.get('min') || ''); setMax(params.get('max') || ''); setInStock(false); setSort(params.get('sort') || 'featured'); setLimit(PAGE);
  }, [route]);
  useEffect(() => { document.body.classList.toggle('sf-lock', drawer); }, [drawer]);

  const meta = collections.find(c => c.slug === slug);
  const cat = categories.find(c => (c.id || slugify(c.name)) === slug);
  const title = search ? (q ? `Results for “${q}”` : 'Search') : meta?.name || cat?.name || (slug ? slug.replace(/-/g, ' ') : 'Shop all');
  useEffect(() => { document.title = `${title} | FlairMantra`; }, [title]);

  const base = useMemo(() => {
    let list = products.filter(p => inCollection(p, slug));
    if (q) {
      const words = q.toLowerCase().split(/\s+/);
      list = list.filter(p => { const hay = [p.name, p.category, p.subcategory, p.fabric, p.details, ...(p.colors || []), ...(p.tags || [])].join(' ').toLowerCase(); return words.every(w => hay.includes(w.replace(/s$/, ''))); });
    }
    return list;
  }, [products, slug, q]);

  const opts = useMemo(() => ({
    types: [...new Set(base.map(groupOf))],
    sizes: [...new Set(base.flatMap(sizesOf))].filter(s => s !== 'One Size'),
    colors: [...new Set(base.flatMap(colorsOf))],
    fabrics: [...new Set(base.map(p => p.fabric).filter(Boolean))]
  }), [base]);

  const toggle = (setter, v) => { setter(cur => (cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v])); setLimit(PAGE); };
  let shown = base.filter(p =>
    (!types.length || types.includes(groupOf(p))) &&
    (!sizes.length || sizes.some(s => sizesOf(p).includes(s))) &&
    (!colors.length || colors.some(c => colorsOf(p).includes(c))) &&
    (!fabrics.length || fabrics.includes(p.fabric)) &&
    (min === '' || p.price >= Number(min)) && (max === '' || p.price <= Number(max)) &&
    (!inStock || Number(p.stock ?? 25) > 0));
  if (sort === 'low') shown = [...shown].sort((a, b) => a.price - b.price);
  if (sort === 'high') shown = [...shown].sort((a, b) => b.price - a.price);
  if (sort === 'name') shown = [...shown].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'new') shown = [...shown].sort((a, b) => Number(isNew(b)) - Number(isNew(a)));

  const chips = [
    ...types.map(v => [v, () => toggle(setTypes, v)]), ...sizes.map(v => [`Size ${v}`, () => toggle(setSizes, v)]),
    ...colors.map(v => [v, () => toggle(setColors, v)]), ...fabrics.map(v => [v, () => toggle(setFabrics, v)]),
    ...(min !== '' ? [[`From ${money(min)}`, () => setMin('')]] : []), ...(max !== '' ? [[`Up to ${money(max)}`, () => setMax('')]] : []),
    ...(inStock ? [['In stock', () => setInStock(false)]] : [])
  ];
  const clear = () => { setTypes([]); setSizes([]); setColors([]); setFabrics([]); setMin(''); setMax(''); setInStock(false); };

  const filters = <div className="sf-filters">
    {opts.types.length > 1 && <FilterGroup title="Product type">{opts.types.map(t => <label key={t} className="sf-check"><input type="checkbox" checked={types.includes(t)} onChange={() => toggle(setTypes, t)}/><span>{t}</span><small>{base.filter(p => groupOf(p) === t).length}</small></label>)}</FilterGroup>}
    <FilterGroup title="Price">
      <div className="sf-price-inputs">
        <label><span>Min</span><input type="number" min="0" inputMode="numeric" value={min} onChange={e => setMin(e.target.value)} placeholder="$0"/></label>
        <label><span>Max</span><input type="number" min="0" inputMode="numeric" value={max} onChange={e => setMax(e.target.value)} placeholder="Any"/></label>
      </div>
      <div className="sf-chips">{[[0, 50], [50, 100], [100, 200], [200, '']].map(([a, b]) => <button key={a} type="button" className={String(min) === String(a || '') && String(max) === String(b) ? 'on' : ''} onClick={() => { setMin(a ? String(a) : ''); setMax(String(b)); }}>{b ? `${a ? '$' + a : 'Under'} ${a ? '– ' : ''}$${b}` : `$${a}+`}</button>)}</div>
    </FilterGroup>
    {opts.sizes.length > 0 && <FilterGroup title="Size"><div className="sf-size-filter">{opts.sizes.map(s => <button key={s} type="button" className={sizes.includes(s) ? 'on' : ''} onClick={() => toggle(setSizes, s)} aria-pressed={sizes.includes(s)}>{s}</button>)}</div></FilterGroup>}
    {opts.colors.length > 0 && <FilterGroup title="Colour"><div className="sf-color-filter">{opts.colors.map(c => <button key={c} type="button" className={colors.includes(c) ? 'on' : ''} onClick={() => toggle(setColors, c)} aria-pressed={colors.includes(c)}><i style={{background: swatchColor(c)}}/>{c}</button>)}</div></FilterGroup>}
    {opts.fabrics.length > 0 && <FilterGroup title="Fabric" open={false}>{opts.fabrics.map(f => <label key={f} className="sf-check"><input type="checkbox" checked={fabrics.includes(f)} onChange={() => toggle(setFabrics, f)}/><span>{f}</span></label>)}</FilterGroup>}
    <FilterGroup title="Availability"><label className="sf-check"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)}/><span>In stock only</span></label></FilterGroup>
  </div>;

  return <div className="sf-wrap sf-listing">
    <Breadcrumbs items={[['Home', '/'], ...(slug || search ? [['Shop', '/shop']] : []), [search ? 'Search' : title]]}/>
    <div className="sf-listing-head">
      <div><h1>{title}</h1><p className="sf-muted">{shown.length} {shown.length === 1 ? 'style' : 'styles'}{cat?.subtitle ? ` · ${cat.subtitle}` : ''}</p></div>
    </div>
    {!search && <div className="sf-collection-tabs">
      <a href="/shop" className={!slug ? 'on' : ''} onClick={e => { e.preventDefault(); go('/shop'); }}>All</a>
      {collections.map(c => <a key={c.slug} href={`/category/${c.slug}`} className={slug === c.slug ? 'on' : ''} onClick={e => { e.preventDefault(); go(`/category/${c.slug}`); }}>{c.name}</a>)}
    </div>}
    <div className="sf-toolbar">
      <button className="sf-btn sf-btn-ghost sf-only-mobile" onClick={() => setDrawer(true)}><SlidersHorizontal/> Filters{chips.length ? ` (${chips.length})` : ''}</button>
      <div className="sf-chip-row">{chips.map(([label, remove]) => <button key={label} className="sf-chip" onClick={remove}>{label}<X/></button>)}{chips.length > 1 && <button className="sf-chip-clear" onClick={clear}>Clear all</button>}</div>
      <label className="sf-sort"><span>Sort</span><select value={sort} onChange={e => setSort(e.target.value)}>{sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    </div>
    <div className="sf-listing-body">
      <aside className="sf-only-desktop sf-sidebar">{filters}</aside>
      <section>
        {shown.length ? <>
          <ProductGrid items={shown.slice(0, limit)} cols={3}/>
          {shown.length > limit && <div className="sf-more"><p className="sf-muted">Showing {limit} of {shown.length}</p><div className="sf-more-bar"><i style={{width: `${limit / shown.length * 100}%`}}/></div><button className="sf-btn sf-btn-ghost" onClick={() => setLimit(l => l + PAGE)}>Load more</button></div>}
        </> : <div className="sf-empty"><div className="sf-empty-icon"><SearchX/></div><h2>{q && !base.length ? `No results for “${q}”` : 'No styles match these filters'}</h2><p>{q && !base.length ? 'Check the spelling or try a broader word like “saree” or “kurta”.' : 'Try removing a filter or widening the price range.'}</p>{chips.length ? <button className="sf-btn" onClick={clear}>Clear filters</button> : <button className="sf-btn" onClick={() => go('/shop')}>Browse all styles</button>}</div>}
      </section>
    </div>
    {drawer && <>
      <div className="sf-overlay" onClick={() => setDrawer(false)}/>
      <aside className="sf-drawer sf-drawer-left sf-filter-drawer" aria-label="Filters">
        <div className="sf-drawer-head"><h2>Filters</h2><button className="sf-icon-btn" onClick={() => setDrawer(false)} aria-label="Close filters"><X/></button></div>
        <div className="sf-drawer-scroll">{filters}</div>
        <div className="sf-drawer-foot sf-row"><button className="sf-btn sf-btn-ghost" onClick={clear}>Clear</button><button className="sf-btn" onClick={() => setDrawer(false)}>Show {shown.length} styles</button></div>
      </aside>
    </>}
  </div>;
}
