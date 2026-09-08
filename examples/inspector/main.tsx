import {
  Component,
  StrictMode,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ComponentRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import {
  Annotation,
  SelectableModel,
  SpatialProvider,
  useSpatial,
  type SpatialPart,
} from 'spatialkit/react';
import { INITIAL_NOTES, parseNotes, STORAGE_KEY, type Note } from './notes';
import './style.css';

// ─── Code snippet shown in the integration panel ────────────────────────────
const snippet = `<Canvas>
  <SpatialProvider onSelectionChange={setSelectedPart}>
    <SelectableModel src="/pump.glb" modelId="pump" />
    <Annotation target="pressure-valve" label="Inspect this seal" />
  </SpatialProvider>
</Canvas>`;

const title = (part: SpatialPart) => String(part.metadata.label ?? part.name);

// ─── Scene error boundary ───────────────────────────────────────────────────
class SceneError extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? (
      <Html center>
        <div className="scene-message" role="alert">
          The model could not load.<br />
          <button onClick={() => location.reload()}>Try again</button>
        </div>
      </Html>
    ) : this.props.children;
  }
}

// ─── Bridge: exposes useSpatial to the parent React tree ───────────────────
function SceneBridge({
  onParts,
  selectRef,
}: {
  onParts: (parts: SpatialPart[]) => void;
  selectRef: React.MutableRefObject<(target: string | null) => void>;
}) {
  const { parts, select } = useSpatial();
  const signature = parts.map((p) => p.id).join('|');
  useEffect(() => { onParts(parts); }, [signature, onParts]);
  useEffect(() => {
    selectRef.current = select;
    return () => { selectRef.current = () => {}; };
  }, [select, selectRef]);
  return null;
}

// ─── Theme helpers ──────────────────────────────────────────────────────────
function getInitialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem('sk-theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('sk-theme', theme); } catch {}
}

// ─── Figma-style collapsible tree group ────────────────────────────────────
function TreeGroup({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`tree-group ${open ? '' : 'collapsed'}`}>
      <button
        className="tree-group-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="tree-chevron">▾</span>
        {label}
        <span className="tree-group-count">{count}</span>
      </button>
      <div className="tree-group-body">{children}</div>
    </div>
  );
}

// ─── Main app ───────────────────────────────────────────────────────────────
function App() {
  const [selected, setSelected]       = useState<SpatialPart | null>(null);
  const [parts, setParts]             = useState<SpatialPart[]>([]);
  const [filter, setFilter]           = useState('');
  const [draft, setDraft]             = useState('');
  const [showNotes, setShowNotes]     = useState(true);
  const [codeOpen, setCodeOpen]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [storageState, setStorageState] = useState('Notes saved on this device');
  const [notes, setNotes]             = useState<Note[]>(INITIAL_NOTES);
  const [storageReady, setStorageReady] = useState(false);
  const [theme, setTheme]             = useState<'light' | 'dark'>(getInitialTheme);

  const selectRef = useRef<(target: string | null) => void>(() => {});
  const controls  = useRef<ComponentRef<typeof OrbitControls>>(null);

  // Apply theme on mount + change
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Restore notes from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setNotes(parseNotes(raw));
    } catch {
      setStorageState('Saved notes could not be read. Export notes to keep a copy.');
      return;
    }
    setStorageReady(true);
  }, []);

  // Persist notes
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); }
    catch { setStorageState('Storage unavailable. Export notes to keep a copy.'); }
  }, [notes, storageReady]);

  // Reset draft on selection change
  useEffect(() => { setDraft(''); }, [selected?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { selectRef.current(null); setCodeOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset copy feedback
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  function exportNotes() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url; a.download = 'spatialkit-notes.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const visibleParts  = parts.filter((p) =>
    title(p).toLowerCase().includes(filter.toLowerCase())
  );
  const selectedNotes = notes.filter((n) => n.target === selected?.id);

  // Split parts into "groups" for the Figma-style tree.
  // For now we place everything under one "Meshes" section — the
  // tree-group component handles collapse/expand.
  const meshParts    = visibleParts;

  return (
    <div className="app">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <header className="topbar">
        <a className="brand" href="/" aria-label="SpatialKit home">
          <span className="brand-mark">S<span>↗</span></span>
          spatialkit
          <span className="version">REACT PREVIEW</span>
        </a>

        <nav className="topbar-nav" aria-label="Site navigation">
          <span className="nav-active">Playground</span>

          <span className="topbar-sep" aria-hidden="true" />

          <button
            className={`code-button-inline ${codeOpen ? 'active' : ''}`}
            onClick={() => setCodeOpen((o) => !o)}
            aria-expanded={codeOpen}
            aria-controls="code-panel-region"
          >
            <span className="code-mono">〈/〉</span>
            {codeOpen ? 'Back to inspector' : 'Integration guide'}
            <span>↗</span>
          </button>

          <a
            href="https://github.com/grzdev/spatialkit"
            target="_blank"
            rel="noreferrer"
            aria-label="View SpatialKit on GitHub"
          >
            GitHub ↗
          </a>

          <span className="topbar-sep" aria-hidden="true" />

          {/* Dark / Light mode toggle */}
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>

      {/* ── Code integration panel (collapsible) ───────────────────── */}
      <div
        id="code-panel-region"
        className={`code-panel-wrapper ${codeOpen ? 'open' : ''}`}
        aria-hidden={!codeOpen}
      >
        <div className="code-panel">
          <div>
            <div className="eyebrow">YOUR SCENE. A FEW COMPONENTS.</div>
            <h2>This is the actual API.</h2>
            <p>
              Import from <code>spatialkit/react</code> inside your existing
              React Three Fiber canvas. Add Suspense and an error boundary for loading.
            </p>
            <button
              className="copy-button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(snippet); setCopied(true); }
                catch { setStorageState('Clipboard unavailable. Select and copy the code manually.'); }
              }}
            >
              {copied ? '✓ Copied' : 'Copy example'} <span>↗</span>
            </button>
          </div>
          <pre><code>{snippet}</code></pre>
        </div>
      </div>

      {/* ── 3-column workspace — fills remaining viewport ──────────── */}
      <main className="workspace" aria-label="SpatialKit model inspector">

        {/* ── Left: Assembly panel ─── */}
        <aside className="parts-panel" aria-label="Assembly parts list">
          <div className="panel-heading">
            <span>ASSEMBLY</span>
            <span className="panel-badge">{parts.length || '—'}</span>
          </div>

          {/* Asset identity */}
          <div className="asset-header">
            <div className="asset-icon" aria-hidden="true">⬡</div>
            <div className="asset-meta">
              <strong>PX–04 Pump</strong>
              <span>Demo assembly · GLB</span>
            </div>
          </div>

          {/* Search */}
          <div className="search-wrap">
            <label className="search">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                aria-label="Filter parts"
                placeholder="Find a part…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </label>
          </div>

          {/* Figma-style tree */}
          <div className="part-tree" role="tree" aria-label="Model parts">
            {parts.length === 0 && (
              <p className="empty-filter">Loading assembly…</p>
            )}

            {parts.length > 0 && (
              <TreeGroup label="MESHES" count={meshParts.length}>
                {meshParts.map((part) => (
                  <button
                    key={part.id}
                    role="treeitem"
                    className={`part-item ${selected?.id === part.id ? 'selected' : ''}`}
                    aria-selected={selected?.id === part.id}
                    onClick={() => selectRef.current(part.id)}
                  >
                    <span className="part-glyph" aria-hidden="true">◈</span>
                    <span className="part-label-wrap">
                      <span className="part-name">{title(part)}</span>
                      <span className="part-id-label">{part.id}</span>
                    </span>
                    {notes.some((n) => n.target === part.id) && (
                      <span className="note-dot" aria-label="Has notes" />
                    )}
                  </button>
                ))}

                {parts.length > 0 && !meshParts.length && (
                  <p className="empty-filter">No matching parts.</p>
                )}
              </TreeGroup>
            )}
          </div>

          {/* Assembly footer */}
          <div className="panel-footer">
            <span className="status-dot" aria-hidden="true" />
            {parts.length ? 'Ready to explore' : 'Preparing model'}
            <span className="panel-footer-right">01 ASSET</span>
          </div>
        </aside>

        {/* ── Center: 3D Viewport ─── */}
        <section className="viewport" aria-label="Interactive 3D pump model">
          <div className="viewport-top">
            <span className="view-label">
              <span className="status-dot" aria-hidden="true" />
              PERSPECTIVE
            </span>
            <span className="view-file">
              pump.glb <span>/</span> 3D INSPECTOR
            </span>
          </div>

          <Canvas
            dpr={[1, 1.75]}
            camera={{ position: [5.1, 3.7, 5.4], fov: 39 }}
            onPointerMissed={() => selectRef.current(null)}
            fallback={
              <div className="scene-message">
                This preview needs WebGL. Try a browser with hardware acceleration enabled.
              </div>
            }
          >
            <color attach="background" args={[theme === 'dark' ? '#1c2419' : '#efeee7']} />
            <ambientLight intensity={1.2} />
            <hemisphereLight args={['#ffffff', '#687a69', 2]} />
            <directionalLight position={[4, 7, 5]} intensity={3.2} />
            <directionalLight position={[-4, 3, -2]} intensity={1.8} color="#c5dfed" />

            <SceneError>
              <Suspense fallback={<Html center><div className="scene-message">Preparing your assembly…</div></Html>}>
                <SpatialProvider onSelectionChange={setSelected}>
                  <SelectableModel src="/pump.glb" modelId="pump" />
                  <SceneBridge onParts={setParts} selectRef={selectRef} />
                  {showNotes && notes.map((note, i) => (
                    <Annotation
                      key={note.id}
                      target={note.target}
                      label={note.label}
                      offset={[
                        0,
                        0.4 + notes.slice(0, i).filter((o) => o.target === note.target).length * 0.25,
                        0,
                      ]}
                      className="model-annotation"
                    />
                  ))}
                </SpatialProvider>
                <ContactShadows
                  position={[0, -0.012, 0]}
                  opacity={0.3}
                  scale={12}
                  blur={2.5}
                  far={5}
                  resolution={256}
                  frames={1}
                />
              </Suspense>
            </SceneError>

            <gridHelper args={[20, 40, '#cfcec4', '#dfded5']} position={[0, -0.025, 0]} />
            <OrbitControls
              ref={controls}
              makeDefault
              target={[0, 1, 0]}
              minDistance={3}
              maxDistance={14}
              maxPolarAngle={Math.PI / 2.05}
              enableDamping
            />
          </Canvas>

          <div className="viewport-bottom">
            <div className="orbit-hint">
              <span>↔</span> Drag to orbit <i /> Scroll to zoom
            </div>
            <div className="view-actions">
              <button
                aria-label="Reset camera view"
                title="Reset camera view"
                onClick={() => controls.current?.reset()}
              >↺</button>
              <button
                aria-label={showNotes ? 'Hide annotations' : 'Show annotations'}
                title="Toggle annotations"
                aria-pressed={showNotes}
                onClick={() => setShowNotes((s) => !s)}
              >▤</button>
            </div>
          </div>

          <div className="axis" aria-hidden="true">
            <span>Y</span><b>↑</b><i>↙ X</i><em>Z ↘</em>
          </div>
        </section>

        {/* ── Right: Inspector panel ─── */}
        <aside className="inspector-panel" aria-label="Part inspector">
          <div className="panel-heading">
            <span>INSPECTOR</span>
            <span className="panel-symbol">⊙</span>
          </div>

          {selected ? (
            <>
              {/* Selection detail */}
              <div className="selection-detail">
                <div className="eyebrow">
                  SELECTED PART
                  <button
                    aria-label="Clear selection"
                    onClick={() => selectRef.current(null)}
                  >×</button>
                </div>
                <h2>{title(selected)}</h2>
                <code className="part-id">{selected.id}</code>
                <p>{String(selected.metadata.description ?? 'A selectable mesh in this model.')}</p>
                <dl>
                  <div>
                    <dt>Material</dt>
                    <dd>{String(selected.metadata.material ?? 'Not specified')}</dd>
                  </div>
                  <div>
                    <dt>Assembly</dt>
                    <dd>PX–04 Pump</dd>
                  </div>
                </dl>
              </div>

              {/* Notes */}
              <div className="notes-section">
                <div className="section-title">
                  <h3>Attached notes</h3>
                  <span>{selectedNotes.length.toString().padStart(2, '0')}</span>
                </div>

                {selectedNotes.map((note) => (
                  <div className="note-card" key={note.id}>
                    <span className="note-mark">↳</span>
                    <p>{note.label}</p>
                    <button
                      aria-label={`Delete note: ${note.label}`}
                      onClick={() =>
                        setNotes((cur) => cur.filter((n) => n.id !== note.id))
                      }
                    >×</button>
                  </div>
                ))}

                {!selectedNotes.length && (
                  <p className="muted">No notes on this part yet.</p>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!draft.trim() || notes.length >= 500) return;
                    setNotes((cur) => [
                      ...cur,
                      { id: crypto.randomUUID(), target: selected.id, label: draft.trim() },
                    ]);
                    setDraft('');
                    setShowNotes(true);
                  }}
                >
                  <label htmlFor="note-input">Add an annotation</label>
                  <textarea
                    id="note-input"
                    placeholder="What should someone know about this part?"
                    maxLength={240}
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="form-bottom">
                    <span>{draft.length}/240</span>
                    <button type="submit" disabled={!draft.trim() || notes.length >= 500}>
                      Attach note <span>↗</span>
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="empty-selection">
              <div className="selection-art" aria-hidden="true">
                <span>⌖</span><i /><b />
              </div>
              <div className="eyebrow"><span className="status-dot" /> START WITH A PART</div>
              <h2>A little detail.<br />A lot of context.</h2>
              <p>
                Click a part of the model or choose one from the assembly to
                inspect it and attach a note.
              </p>
              <button
                onClick={() => selectRef.current('pressure-valve')}
                disabled={!parts.length}
              >
                Explore the pressure valve <span>↗</span>
              </button>
              <div className="tip">
                <span>↳</span>
                <p>Your notes stay attached as you move around the model.</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="save-footer">
            <div>
              <span className="status-dot" aria-hidden="true" />
              <span role="status">{storageState}</span>
            </div>
            <button onClick={exportNotes}>Export notes <span>↓</span></button>
          </div>
        </aside>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
