import {
  Component,
  StrictMode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ComponentRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Html } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import {
  Annotation,
  BlenderControls,
  Measurement,
  SelectableModel,
  SelectableObject,
  SpatialProvider,
  TimelineScrubber,
  useSpatial,
  type SpatialPart,
  type SurfaceHit,
} from 'spatialkit/react';
import { INITIAL_NOTES, parseNotes, notesKey, annotationOffset, type Note } from './notes';
import { DEMO_MODEL, MODEL_FIT, prepareModel, type ModelAsset } from './model-files';
import { generateComponent, publicFilename, INSTALL_COMMAND } from './integration';
import { ControlsLab } from './ControlsLab';
import './style.css';

const title = (part: SpatialPart) => String(part.metadata.label ?? part.name);

// ─── Scene error boundary ───────────────────────────────────────────────────
class SceneError extends Component<{ children: ReactNode; onReset: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? (
      <Html center>
        <div className="scene-message" role="alert">
          The model could not load.<br />
          <button onClick={this.props.onReset}>Return to demo</button>
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
function Workbench({ model, onUpload, onDemo, uploading, uploadError }: {
  model: ModelAsset;
  onUpload: (file: File) => void;
  onDemo: () => void;
  uploading: boolean;
  uploadError: string;
}) {
  const [selected, setSelected]       = useState<SpatialPart | null>(null);
  const [parts, setParts]             = useState<SpatialPart[]>([]);
  const [filter, setFilter]           = useState('');
  const [draft, setDraft]             = useState('');
  const [showNotes, setShowNotes]     = useState(true);
  const [codeOpen, setCodeOpen]       = useState(false);
  const [copied, setCopied]           = useState(false);
  const [storageState, setStorageState] = useState('Notes saved on this device');
  const [notes, setNotes]             = useState<Note[]>(model.id === 'pump' ? INITIAL_NOTES : []);
  const [storageReady, setStorageReady] = useState(false);
  const [theme, setTheme]             = useState<'light' | 'dark'>(getInitialTheme);
  const [labOpen, setLabOpen]         = useState(() => window.location.hash === '#controls');

  const selectRef = useRef<(target: string | null) => void>(() => {});
  const controls  = useRef<ComponentRef<typeof BlenderControls>>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const noteFileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [placingHotspot, setPlacingHotspot] = useState(false);
  const [pendingHotspot, setPendingHotspot] = useState<SurfaceHit | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [caliperPointA, setCaliperPointA] = useState<[number, number, number] | null>(null);
  const [measurements, setMeasurements] = useState<Array<{ id: string; start: [number, number, number]; end: [number, number, number] }>>([]);
  const [proceduralExplode, setProceduralExplode] = useState(0);
  const [crossSectionEnabled, setCrossSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<'x' | 'y' | 'z'>('y');
  const [sectionOffset, setSectionOffset] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const snippet = generateComponent(model, notes);
  const storageKey = notesKey(model.id);

  // Compute active clipping plane for cross-section mode
  const clippingPlanes = useMemo(() => {
    if (!crossSectionEnabled) return undefined;
    const normal = sectionAxis === 'x'
      ? new Vector3(-1, 0, 0)
      : sectionAxis === 'y'
        ? new Vector3(0, -1, 0)
        : new Vector3(0, 0, -1);
    // sectionOffset ranges from -1.8 to 1.8 units
    const plane = new Plane(normal, sectionOffset * 2);
    return [plane];
  }, [crossSectionEnabled, sectionAxis, sectionOffset]);

  function showLab(open: boolean) {
    setLabOpen(open);
    history.replaceState(null, '', open ? '#controls' : `${location.pathname}${location.search}`);
  }

  // Apply theme on mount + change
  useEffect(() => { applyTheme(theme); }, [theme]);

  // Restore notes from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) setNotes(parseNotes(raw, model.id));
    } catch {
      setStorageState('Saved notes could not be read. Export notes to keep a copy.');
      return;
    }
    setStorageReady(true);
  }, []);

  // Persist notes
  useEffect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(storageKey, JSON.stringify(notes)); }
    catch { setStorageState('Storage unavailable. Export notes to keep a copy.'); }
  }, [notes, storageReady, storageKey]);

  // Reset draft on selection change
  useEffect(() => { setDraft(''); setEditingNote(null); }, [selected?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectRef.current(null);
        setCodeOpen(false);
        setPlacingHotspot(false);
        setPendingHotspot(null);
        setMeasuring(false);
        setCaliperPointA(null);
      }
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

  // Auto-dismiss import status feedback
  useEffect(() => {
    if (!importStatus) return;
    const t = setTimeout(() => setImportStatus(null), 3500);
    return () => clearTimeout(t);
  }, [importStatus]);

  function exportNotes() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url; a.download = `${publicFilename(model.name)}-notes.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleImportNotes(file: File) {
    try {
      const text = await file.text();
      const imported = parseNotes(text, model.id);
      if (!imported.length) {
        setImportStatus('No notes found in imported file.');
        return;
      }
      setNotes((existing) => {
        const existingIds = new Set(existing.map((n) => n.id));
        const merged = [...existing];
        let addedCount = 0;
        for (const note of imported) {
          if (!existingIds.has(note.id)) {
            merged.push(note);
            existingIds.add(note.id);
            addedCount++;
          }
        }
        setImportStatus(`Imported ${addedCount} new note${addedCount === 1 ? '' : 's'}.`);
        return merged;
      });
      setShowNotes(true);
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'Invalid notes JSON file.');
    }
  }

  function downloadComponent() {
    download(new Blob([snippet], { type: 'text/plain' }), 'ModelViewer.tsx');
  }

  function selectPart(target: string | null) {
    setPlacingHotspot(false);
    setPendingHotspot(null);
    if (!measuring) selectRef.current(target);
  }

  function handleSurfaceClick(hit: SurfaceHit) {
    if (measuring) {
      // Find world coordinates for the hit point
      const worldPos = hit.point.slice() as [number, number, number];
      if (!caliperPointA) {
        setCaliperPointA(worldPos);
      } else {
        setMeasurements((prev) => [
          ...prev,
          { id: crypto.randomUUID(), start: caliperPointA, end: worldPos },
        ]);
        setCaliperPointA(null);
      }
      return;
    }

    if (!placingHotspot) return;
    setPendingHotspot(hit);
    setDraft('');
    setEditingNote(null);
    setShowNotes(true);
  }

  async function downloadModel() {
    try {
      const blob = model.file ?? await fetch('/pump.glb').then((response) => {
        if (!response.ok) throw new Error('Model download failed');
        return response.blob();
      });
      if (!blob) throw new Error('Model download failed');
      download(blob, publicFilename(model.filename));
    } catch { setStorageState('Model download failed. Please try again.'); }
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
          <button className={`nav-view ${!labOpen ? 'nav-active' : ''}`} onClick={() => showLab(false)}>Inspector</button>
          <button className={`nav-view ${labOpen ? 'nav-active' : ''}`} onClick={() => showLab(true)}>Controls lab</button>

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

      {labOpen ? <ControlsLab onBack={() => showLab(false)} /> : <>

      {/* ── Code integration panel (collapsible) ───────────────────── */}
      <div
        id="code-panel-region"
        className={`code-panel-wrapper ${codeOpen ? 'open' : ''}`}
        aria-hidden={!codeOpen}
        hidden={!codeOpen}
      >
        <div className="code-panel">
          <div>
            <div className="eyebrow">YOUR MODEL → YOUR REACT SITE</div>
            <h2>Take this scene with you.</h2>
            <p className="integration-summary">{model.filename} · {notes.length} annotation{notes.length === 1 ? '' : 's'} · Code updates as you edit.</p>
            <ol className="integration-steps">
              <li><strong>Install the local SpatialKit preview.</strong><p>In the SpatialKit repository, run <code>npm run build</code> and <code>npm pack</code>. Install the generated <code>spatialkit-0.1.0.tgz</code> in your React app with <code>npm install /path/to/spatialkit-0.1.0.tgz</code>. This preview is not published to npm yet.</p><code className="install-command">{INSTALL_COMMAND}</code></li>
              <li><strong>Add your model.</strong><p>Save the model below as <code>public/models/{publicFilename(model.filename)}</code> in your project.</p><button className="copy-button" onClick={downloadModel}>Download model ↓</button></li>
              <li><strong>Add the component.</strong><p>Save this code as <code>ModelViewer.tsx</code>, then render <code>{'<ModelViewer />'}</code> in your page. React 18 + Fiber 8 are the tested versions. In Next.js, load this component with <code>dynamic(() =&gt; import('./ModelViewer'), {'{ ssr: false }'})</code> from a client component.</p></li>
              <li><strong>Preview and deploy.</strong><p>Run your app’s development server. Include the model in your deployed public files; visitors can then view it and its annotations in a WebGL-enabled browser. No webcam is needed.</p></li>
            </ol>
            <div className="integration-actions">
            <button
              className="copy-button"
              onClick={async () => {
                try { await navigator.clipboard.writeText(snippet); setCopied(true); }
                catch { setStorageState('Clipboard unavailable. Select and copy the code manually.'); }
              }}
            >
              {copied ? '✓ Copied' : 'Copy React code'} <span>↗</span>
            </button>
            <button className="copy-button" onClick={downloadComponent}>Download .tsx ↓</button>
            </div>
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
              <strong title={model.name}>{model.name}</strong>
              <span>{model.format}</span>
            </div>
          </div>

          <div className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) onUpload(file); }}>
            <input ref={fileInput} className="file-input" type="file" accept=".glb,.gltf" aria-label="Upload 3D model"
              onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file); }} />
            <button className="upload-button" onClick={() => fileInput.current?.click()} disabled={uploading}>{uploading ? 'Preparing model…' : '↑ Upload your model'}</button>
            <p>Drop GLB or embedded glTF · up to 50 MB</p>
            <span>Files stay in your browser.</span>
            {model.object && <button className="demo-link" onClick={onDemo}>↶ Back to demo</button>}
          </div>
          {uploadError && <div className="upload-error" role="alert">{uploadError}</div>}
          {model.object && <p className="model-persistence">Notes are saved for this file. Re-upload the same model after a refresh to restore them.</p>}

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
                    onClick={() => selectPart(part.id)}
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
        <section className={`viewport ${placingHotspot ? 'placing-hotspot' : ''} ${measuring ? 'measuring' : ''}`} aria-label="Interactive 3D model">
          <div className="viewport-top">
            <span className="view-label">
              <span className="status-dot" aria-hidden="true" />
              PERSPECTIVE
            </span>
            <span className="view-file">
              {model.filename} <span>/</span> 3D INSPECTOR
            </span>
          </div>

          <Canvas
            dpr={[1, 1.75]}
            camera={{ position: [5.1, 3.7, 5.4], fov: 39 }}
            gl={{ localClippingEnabled: true }}
            onPointerMissed={() => { if (!placingHotspot) selectPart(null); }}
            fallback={
              <div className="scene-message">
                This preview needs WebGL. Try a browser with hardware acceleration enabled.
              </div>
            }
          >
            <color attach="background" args={[theme === 'dark' ? '#111a2c' : '#e8eef8']} />
            <ambientLight intensity={1.2} />
            <hemisphereLight args={['#ffffff', '#687a69', 2]} />
            <directionalLight position={[4, 7, 5]} intensity={3.2} />
            <directionalLight position={[-4, 3, -2]} intensity={1.8} color="#c5dfed" />

            <SceneError onReset={onDemo}>
              <Suspense fallback={<Html center><div className="scene-message">Preparing your assembly…</div></Html>}>
                <SpatialProvider onSelectionChange={setSelected}>
                  {model.object
                    ? <SelectableObject object={model.object} animations={model.animations} animationProgress={model.hasAnimations ? animationProgress : undefined} explode={proceduralExplode} clippingPlanes={clippingPlanes} modelId={model.id} fit={MODEL_FIT} onSurfaceClick={handleSurfaceClick} />
                    : <SelectableModel src="/pump.glb" modelId="pump" animationProgress={animationProgress} explode={proceduralExplode} clippingPlanes={clippingPlanes} onSurfaceClick={handleSurfaceClick} />}
                  <SceneBridge onParts={setParts} selectRef={selectRef} />
                  {showNotes && notes.map((note, i) => (
                    <Annotation
                      key={note.id}
                      target={note.target}
                      label={note.label}
                      point={note.point}
                      offset={annotationOffset(notes, i)}
                      className="model-annotation"
                    />
                  ))}
                  {measurements.map((m) => (
                    <Measurement
                      key={m.id}
                      start={m.start}
                      end={m.end}
                      unit="cm"
                      color="#f6ad55"
                    />
                  ))}
                  {caliperPointA && (
                    <mesh position={caliperPointA}>
                      <sphereGeometry args={[0.035, 16, 16]} />
                      <meshBasicMaterial color="#f6ad55" depthTest={false} />
                    </mesh>
                  )}
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
            <BlenderControls
              ref={controls}
              makeDefault
              target={[0, 1, 0]}
              minDistance={3}
              maxDistance={14}
              enableDamping
            />
          </Canvas>

          {model.hasAnimations ? (
            <div className="animation-dock">
              <span className="animation-label">ANIMATION</span>
              <button onClick={() => setAnimationProgress(0)} aria-label="Move animation to start">|◀</button>
              <TimelineScrubber
                className="animation-scrubber"
                value={animationProgress}
                onChange={setAnimationProgress}
                label="Exploded inspection animation"
                formatValue={(value) => `${Math.round(value * 100)} percent`}
              />
              <output>{Math.round(animationProgress * 100)}%</output>
              <button onClick={() => setAnimationProgress(1)} aria-label="Move animation to end">▶|</button>
            </div>
          ) : (
            <div className="animation-dock">
              <span className="animation-label">EXPLODE</span>
              <button onClick={() => setProceduralExplode(0)} aria-label="Collapse assembly">|◀</button>
              <TimelineScrubber
                className="animation-scrubber"
                value={proceduralExplode}
                onChange={setProceduralExplode}
                label="Procedural exploded view"
                formatValue={(value) => `${Math.round(value * 100)} percent`}
              />
              <output>{Math.round(proceduralExplode * 100)}%</output>
              <button onClick={() => setProceduralExplode(1)} aria-label="Explode assembly outward">▶|</button>
            </div>
          )}

          {crossSectionEnabled && (
            <div className="animation-dock section-dock">
              <span className="animation-label">SECTION</span>
              <div className="section-axis-toggles" role="group" aria-label="Section cutting axis">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <button
                    key={axis}
                    className={sectionAxis === axis ? 'active' : ''}
                    onClick={() => setSectionAxis(axis)}
                  >
                    {axis.toUpperCase()}
                  </button>
                ))}
              </div>
              <TimelineScrubber
                className="animation-scrubber"
                min={-1}
                max={1}
                step={0.01}
                value={sectionOffset}
                onChange={setSectionOffset}
                label="Cross-section slice position"
                formatValue={(value) => `${value.toFixed(2)}`}
              />
              <output>{sectionOffset.toFixed(2)}</output>
              <button onClick={() => setSectionOffset(0)} aria-label="Reset cross-section to center">0</button>
            </div>
          )}

          <div className="viewport-bottom">
            {placingHotspot && <div className="placement-banner" role="status">{pendingHotspot ? 'Hotspot placed — add its text in the inspector' : 'Click anywhere on the model to place a hotspot'}</div>}
            {measuring && <div className="placement-banner caliper-banner" role="status">{caliperPointA ? 'Click second point to finish distance measurement' : 'Click first surface point to start measurement'}</div>}
            <div className="orbit-hint">
              <span>↔</span> MMB orbit <i /> Shift + MMB pan <i /> Wheel zoom
            </div>
            <div className="view-actions">
              <button
                aria-label={crossSectionEnabled ? 'Disable cross-section view' : 'Enable cross-section view'}
                title="Cross-section / Slicing Plane"
                aria-pressed={crossSectionEnabled}
                onClick={() => setCrossSectionEnabled((s) => !s)}
              >✂</button>
              <button
                aria-label={measuring ? 'Cancel measurement' : 'Measure point-to-point distance'}
                title="Measure distance between two points (Calipers)"
                aria-pressed={measuring}
                onClick={() => {
                  setMeasuring((m) => !m);
                  setCaliperPointA(null);
                  setPlacingHotspot(false);
                  setPendingHotspot(null);
                }}
              >📏</button>
              {measurements.length > 0 && (
                <button
                  aria-label="Clear all measurements"
                  title="Clear all dimension measurements"
                  onClick={() => setMeasurements([])}
                >⌫</button>
              )}
              <button
                aria-label={placingHotspot ? 'Cancel hotspot placement' : 'Place annotation hotspot'}
                title="Place an annotation on an exact surface point"
                aria-pressed={placingHotspot}
                onClick={() => {
                  setPlacingHotspot((active) => !active);
                  setPendingHotspot(null);
                  setEditingNote(null);
                  setDraft('');
                  setMeasuring(false);
                  setCaliperPointA(null);
                }}
              >⌖</button>
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
                    onClick={() => selectPart(null)}
                  >×</button>
                </div>
                <h2>{title(selected)}</h2>
                <code className="part-id">{selected.id}</code>
                <p>{String(selected.metadata.description ?? 'A selectable mesh in this model.')}</p>
                {parts.length === 1 && <p className="single-mesh-tip">This file contains one combined mesh. Use <strong>Place hotspot</strong> to annotate different points on it.</p>}
                <dl>
                  <div>
                    <dt>Material</dt>
                    <dd>{String(selected.metadata.material ?? 'Not specified')}</dd>
                  </div>
                  <div>
                    <dt>Assembly</dt>
                    <dd>{model.name}</dd>
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
                    <p>{note.label}{note.point && <small>Surface hotspot</small>}</p>
                    <button className="edit-note" aria-label={`Edit note: ${note.label}`} onClick={() => { setEditingNote(note.id); setDraft(note.label); }}>Edit</button>
                    <button
                      aria-label={`Delete note: ${note.label}`}
                      onClick={() =>
                        { setNotes((cur) => cur.filter((n) => n.id !== note.id)); if (editingNote === note.id) { setEditingNote(null); setDraft(''); } }
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
                    if (!draft.trim() || (!editingNote && notes.length >= 500)) return;
                    setNotes((cur) => editingNote ? cur.map((note) => note.id === editingNote ? { ...note, label: draft.trim() } : note) : [
                      ...cur,
                      { id: crypto.randomUUID(), target: selected.id, label: draft.trim(), ...(pendingHotspot?.part.id === selected.id ? { point: pendingHotspot.point } : {}) },
                    ]);
                    setDraft('');
                    setEditingNote(null);
                    setPendingHotspot(null);
                    setPlacingHotspot(false);
                    setShowNotes(true);
                  }}
                >
                  <label htmlFor="note-input">{editingNote ? 'Edit annotation' : pendingHotspot ? 'Describe this hotspot' : 'Add an annotation'}</label>
                  <textarea
                    id="note-input"
                    placeholder={pendingHotspot ? 'What should someone know about this exact point?' : 'What should someone know about this part?'}
                    maxLength={240}
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <div className="form-bottom">
                    <span>{draft.length}/240</span>
                    {(editingNote || pendingHotspot) && <button type="button" onClick={() => { setEditingNote(null); setPendingHotspot(null); setPlacingHotspot(false); setDraft(''); }}>Cancel</button>}
                    <button type="submit" disabled={!draft.trim() || (!editingNote && notes.length >= 500)}>
                      {editingNote ? 'Save annotation' : pendingHotspot ? 'Save hotspot' : 'Attach note'} <span>↗</span>
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
                onClick={() => selectPart(model.id === 'pump' ? 'pressure-valve' : parts[0]?.id ?? null)}
                disabled={!parts.length}
              >
                {model.id === 'pump' ? 'Explore the pressure valve' : 'Explore the first part'} <span>↗</span>
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
            {importStatus && <div className="import-status-banner" role="status">{importStatus}</div>}
            <div className="notes-storage-actions">
              <input
                ref={noteFileInput}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                aria-label="Import notes JSON"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) handleImportNotes(file);
                }}
              />
              <button onClick={() => noteFileInput.current?.click()}>
                Import notes <span>↑</span>
              </button>
              <button onClick={exportNotes}>
                Export notes <span>↓</span>
              </button>
            </div>
            <button className="integration-cta" onClick={() => setCodeOpen(true)}>Use in your React site <span>↗</span></button>
          </div>
        </aside>
      </main>
      </>}
    </div>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [model, setModel] = useState<ModelAsset>(DEMO_MODEL);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => () => model.dispose?.(), [model]);
  async function upload(file: File) {
    const token = ++request.current;
    setUploading(true); setUploadError('');
    try {
      const next = await prepareModel(file);
      if (token !== request.current) { next.dispose?.(); return; }
      setModel(next);
    } catch (error) {
      if (token === request.current) setUploadError(error instanceof Error ? error.message : 'This model could not be loaded. Try exporting it as an embedded GLB.');
    } finally { if (token === request.current) setUploading(false); }
  }
  function demo() {
    request.current++; setUploading(false); setUploadError(''); setModel(DEMO_MODEL);
  }
  return <Workbench key={model.id} model={model} onUpload={upload} onDemo={demo} uploading={uploading} uploadError={uploadError} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
