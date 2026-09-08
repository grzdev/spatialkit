import { Component, StrictMode, Suspense, useEffect, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { Annotation, SelectableModel, SpatialProvider, useSpatial, type SpatialPart } from 'spatialkit/react';
import { INITIAL_NOTES, parseNotes, STORAGE_KEY, type Note } from './notes';
import './style.css';

const snippet = `<Canvas>\n  <SpatialProvider onSelectionChange={setSelectedPart}>\n    <SelectableModel src="/pump.glb" modelId="pump" />\n    <Annotation target="pressure-valve" label="Inspect this seal" />\n  </SpatialProvider>\n</Canvas>`;
const title = (part: SpatialPart) => String(part.metadata.label ?? part.name);

class SceneError extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <Html center><div className="scene-message" role="alert">The model could not load.<br /><button onClick={() => location.reload()}>Try again</button></div></Html> : this.props.children;
  }
}

function SceneBridge({ onParts, selectRef }: { onParts: (parts: SpatialPart[]) => void; selectRef: React.MutableRefObject<(target: string | null) => void> }) {
  const { parts, select } = useSpatial();
  const signature = parts.map((part) => part.id).join('|');
  useEffect(() => { onParts(parts); }, [signature, onParts]);
  useEffect(() => { selectRef.current = select; return () => { selectRef.current = () => {}; }; }, [select, selectRef]);
  return null;
}

function App() {
  const [selected, setSelected] = useState<SpatialPart | null>(null);
  const [parts, setParts] = useState<SpatialPart[]>([]);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState('');
  const [showNotes, setShowNotes] = useState(true);
  const [codeOpen, setCodeOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storageState, setStorageState] = useState('Notes saved on this device');
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [storageReady, setStorageReady] = useState(false);
  const selectRef = useRef<(target: string | null) => void>(() => {});
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setNotes(parseNotes(raw));
    } catch {
      setStorageState('Saved notes could not be read. Export notes to keep a copy.');
      return; // Preserve unreadable data instead of silently overwriting it.
    }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }
    catch { setStorageState('Storage unavailable. Export notes to keep a copy.'); }
  }, [notes, storageReady]);
  useEffect(() => { setDraft(''); }, [selected?.id]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { selectRef.current(null); setCodeOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  function exportNotes() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'spatialkit-notes.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visibleParts = parts.filter((part) => title(part).toLowerCase().includes(filter.toLowerCase()));
  const selectedNotes = notes.filter((note) => note.target === selected?.id);

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="/" aria-label="SpatialKit home"><span className="brand-mark">S<span>↗</span></span>spatialkit<span className="version">REACT PREVIEW</span></a>
      <nav><span className="nav-active">Playground</span><button onClick={() => setCodeOpen(!codeOpen)}>Integration guide <span>↗</span></button><a href="https://github.com/grzdev/spatialkit" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
    </header>
    <section className="intro">
      <div><div className="eyebrow"><span className="status-dot" /> INTERACTIVE BUILDING BLOCKS</div><h1>Give your 3D models <em>context.</em></h1><p>Select a part. Attach a thought. Build something useful.</p></div>
      <button className="code-button" onClick={() => setCodeOpen(!codeOpen)}><span>〈/〉</span> {codeOpen ? 'Back to inspector' : 'See the React code'} <span>↗</span></button>
    </section>
    {codeOpen && <section className="code-panel" aria-label="React integration guide">
      <div><div className="eyebrow">YOUR SCENE. A FEW COMPONENTS.</div><h2>This is the actual API.</h2><p>Import from <code>spatialkit/react</code> inside your existing React Three Fiber canvas. Add Suspense and an error boundary for loading.</p><button onClick={async () => { try { await navigator.clipboard.writeText(snippet); setCopied(true); } catch { setStorageState('Clipboard unavailable. Select and copy the code manually.'); } }}>{copied ? 'Copied ✓' : 'Copy example'}</button></div>
      <pre><code>{snippet}</code></pre>
    </section>}
    <main className="workspace">
      <aside className="parts-panel">
        <div className="panel-heading"><span>ASSEMBLY</span><span className="count">{parts.length || '—'}</span></div>
        <div className="asset-title"><div className="asset-icon">⬡</div><div><strong>PX–04 Pump</strong><span>Demo assembly · GLB</span></div></div>
        <label className="search"><span>⌕</span><input aria-label="Filter parts" placeholder="Find a part…" value={filter} onChange={(event) => setFilter(event.target.value)} /><kbd>⌕</kbd></label>
        <div className="part-list" aria-label="Model parts">
          {visibleParts.map((part) => <button key={part.id} className={`part-item ${selected?.id === part.id ? 'selected' : ''}`} aria-pressed={selected?.id === part.id} onClick={() => selectRef.current(part.id)}><span className="part-glyph">◇</span><span>{title(part)}</span>{notes.some((note) => note.target === part.id) && <span className="note-dot" aria-label="Has notes" />}</button>)}
          {parts.length > 0 && !visibleParts.length && <p className="empty-filter">No matching parts.</p>}
          {!parts.length && <p className="empty-filter">Loading assembly…</p>}
        </div>
        <div className="asset-footer"><span className="status-dot" /> {parts.length ? 'Ready to explore' : 'Preparing model'}<span>01 ASSET</span></div>
      </aside>
      <section className="viewport" aria-label="Interactive 3D pump model">
        <div className="viewport-top"><span className="view-label"><span className="status-dot" /> PERSPECTIVE</span><span className="view-file">pump.glb <span> / </span> 3D INSPECTOR</span></div>
        <Canvas dpr={[1, 1.75]} camera={{ position: [5.1, 3.7, 5.4], fov: 39 }} onPointerMissed={() => selectRef.current(null)} fallback={<div className="scene-message">This preview needs WebGL. Try a browser with hardware acceleration enabled.</div>}>
          <color attach="background" args={['#efeee7']} />
          <ambientLight intensity={1.2} />
          <hemisphereLight args={['#ffffff', '#687a69', 2]} />
          <directionalLight position={[4, 7, 5]} intensity={3.2} />
          <directionalLight position={[-4, 3, -2]} intensity={1.8} color="#c5dfed" />
          <SceneError><Suspense fallback={<Html center><div className="scene-message">Preparing your assembly…</div></Html>}>
            <SpatialProvider onSelectionChange={setSelected}>
              <SelectableModel src="/pump.glb" modelId="pump" />
              <SceneBridge onParts={setParts} selectRef={selectRef} />
              {showNotes && notes.map((note, index) => <Annotation key={note.id} target={note.target} label={note.label} offset={[0, 0.4 + notes.slice(0, index).filter((other) => other.target === note.target).length * 0.25, 0]} className="model-annotation" />)}
            </SpatialProvider>
            <ContactShadows position={[0, -0.012, 0]} opacity={0.3} scale={12} blur={2.5} far={5} resolution={256} frames={1} />
          </Suspense></SceneError>
          <gridHelper args={[20, 40, '#cfcec4', '#dfded5']} position={[0, -0.025, 0]} />
          <OrbitControls ref={controls} makeDefault target={[0, 1, 0]} minDistance={3} maxDistance={14} maxPolarAngle={Math.PI / 2.05} enableDamping />
        </Canvas>
        <div className="viewport-bottom"><div className="orbit-hint"><span>↔</span> Drag to orbit <i /> Scroll to zoom</div><div className="view-actions"><button aria-label="Reset camera view" title="Reset camera view" onClick={() => controls.current?.reset()}>↺</button><button aria-label={showNotes ? 'Hide annotations' : 'Show annotations'} title="Toggle annotations" aria-pressed={showNotes} onClick={() => setShowNotes(!showNotes)}>▤</button></div></div>
        <div className="axis"><span>Y</span><b>↑</b><i>↙ X</i><em>Z ↘</em></div>
      </section>
      <aside className="inspector-panel">
        <div className="panel-heading"><span>INSPECTOR</span><span className="panel-symbol">⊙</span></div>
        {selected ? <>
          <div className="selection-detail"><div className="eyebrow">SELECTED PART <button aria-label="Clear selection" onClick={() => selectRef.current(null)}>×</button></div><h2>{title(selected)}</h2><code className="part-id">{selected.id}</code><p>{String(selected.metadata.description ?? 'A selectable mesh in this model.')}</p><dl><div><dt>Material</dt><dd>{String(selected.metadata.material ?? 'Not specified')}</dd></div><div><dt>Assembly</dt><dd>PX–04 Pump</dd></div></dl></div>
          <div className="notes-section"><div className="section-title"><h3>Attached notes</h3><span>{selectedNotes.length.toString().padStart(2, '0')}</span></div>
            {selectedNotes.map((note) => <div className="note-card" key={note.id}><span className="note-mark">↳</span><p>{note.label}</p><button aria-label={`Delete note: ${note.label}`} onClick={() => setNotes((current) => current.filter((item) => item.id !== note.id))}>×</button></div>)}
            {!selectedNotes.length && <p className="muted">No notes on this part yet.</p>}
            <form onSubmit={(event) => { event.preventDefault(); if (!draft.trim() || notes.length >= 500) return; setNotes((current) => [...current, { id: crypto.randomUUID(), target: selected.id, label: draft.trim() }]); setDraft(''); setShowNotes(true); }}>
              <label htmlFor="note">Add an annotation</label><textarea id="note" placeholder="What should someone know about this part?" maxLength={240} rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} /><div className="form-bottom"><span>{draft.length}/240</span><button type="submit" disabled={!draft.trim() || notes.length >= 500}>Attach note <span>↗</span></button></div>
            </form>
          </div>
        </> : <div className="empty-selection"><div className="selection-art"><span>⌖</span><i /><b /></div><div className="eyebrow">START WITH A PART</div><h2>A little detail.<br />A lot of context.</h2><p>Click a part of the model or choose one from the assembly to inspect it and attach a note.</p><button onClick={() => selectRef.current('pressure-valve')} disabled={!parts.length}>Explore the pressure valve <span>↗</span></button><div className="tip"><span>↳</span><p>Your notes stay attached as you move around the model.</p></div></div>}
        <div className="save-footer"><div><span className="status-dot" /><span role="status">{storageState}</span></div><button onClick={exportNotes}>Export notes <span>↓</span></button></div>
      </aside>
    </main>
    <footer className="page-footer"><span><b>Built with SpatialKit.</b> The playground is the example. The components are yours.</span><span>REACT + THREE.JS <i /> LOCAL-FIRST NOTES</span></footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
