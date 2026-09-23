// Live preview used inside the admin page builder (loaded in an iframe at /__preview).
// The builder sends the page's sections with postMessage; clicks on a section and its
// toolbar are sent back so the builder can select, move, duplicate, delete or insert.
import React, {useEffect, useState} from 'react';
import {ArrowUp, ArrowDown, Copy, Trash2, Plus, LayoutGrid} from 'lucide-react';
import {Section, SECTION_TYPES} from './sections';
import './preview.css';

const send = msg => window.parent?.postMessage({source: 'fm-preview', ...msg}, location.origin);

function Inserter({index}) {
  return <div className="pbx-insert"><button type="button" onClick={() => send({action: 'insert', index})} aria-label="Add a section here"><Plus/></button></div>;
}

export default function BuilderPreview() {
  const [state, setState] = useState({blocks: [], selected: null, pageKey: 'home'});
  useEffect(() => {
    const onMessage = e => { if (e.origin === location.origin && e.data?.source === 'fm-builder') setState(s => ({...s, ...e.data.state})); };
    // Links and forms in the preview must not navigate away from the page being edited.
    const block = e => { if (e.target.closest('a, form button[type=submit], form input[type=submit]') && !e.target.closest('.pbx-toolbar, .pbx-insert')) { e.preventDefault(); e.stopPropagation(); } };
    const noSubmit = e => e.preventDefault();
    addEventListener('message', onMessage);
    addEventListener('click', block, true);
    addEventListener('submit', noSubmit, true);
    document.documentElement.classList.add('pbx-mode');
    send({action: 'ready'});
    return () => { removeEventListener('message', onMessage); removeEventListener('click', block, true); removeEventListener('submit', noSubmit, true); };
  }, []);
  useEffect(() => {
    if (!state.selected) return;
    document.querySelector(`[data-pbx="${state.selected}"]`)?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }, [state.selected, state.scrollTick]);

  const {blocks, selected, pageKey} = state;
  const listingPage = pageKey === 'shop' || pageKey.startsWith('category-');
  return <div className="pbx">
    {blocks.length === 0 && <div className="pbx-empty">
      <LayoutGrid/>
      <h2>Start building this page</h2>
      <p>Add a section from the left panel, or pick a ready-made template.</p>
      <button type="button" className="sf-btn" onClick={() => send({action: 'insert', index: 0})}><Plus/> Add a section</button>
    </div>}
    {blocks.map((b, i) => <div key={b.id} data-pbx={b.id} className={`pbx-block ${selected === b.id ? 'on' : ''} ${b.hideOn ? 'pbx-dim' : ''}`} onClick={() => send({action: 'select', id: b.id})}>
      {i === 0 && <Inserter index={0}/>}
      <div className="pbx-toolbar" onClick={e => e.stopPropagation()}>
        <span>{SECTION_TYPES[b.type]?.label || b.type}{b.hideOn ? ` · ${b.hideOn === 'mobile' ? 'desktop only' : 'phones only'}` : ''}</span>
        <button type="button" disabled={i === 0} onClick={() => send({action: 'move', id: b.id, dir: -1})} aria-label="Move up"><ArrowUp/></button>
        <button type="button" disabled={i === blocks.length - 1} onClick={() => send({action: 'move', id: b.id, dir: 1})} aria-label="Move down"><ArrowDown/></button>
        <button type="button" onClick={() => send({action: 'duplicate', id: b.id})} aria-label="Duplicate"><Copy/></button>
        <button type="button" onClick={() => send({action: 'remove', id: b.id})} aria-label="Delete"><Trash2/></button>
      </div>
      <Section block={b}/>
      <Inserter index={i + 1}/>
    </div>)}
    {listingPage && <div className="pbx-placeholder">The product listing for this page appears here automatically.</div>}
  </div>;
}
