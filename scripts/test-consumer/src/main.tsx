import { StrictMode, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { SpatialProvider, SelectableModel, Annotation, useSpatial, type SpatialPart } from 'spatialkit/react'

// ─── Small bridge component to read useSpatial inside Canvas ─────────────────
function PartList({ onSelect }: { onSelect: (id: string | null) => void }) {
  const { parts, selectedPart, select } = useSpatial()
  return (
    <Html
      style={{
        position: 'fixed', top: 80, left: 20, width: 220,
        background: '#0e1420', border: '1px solid #243050',
        borderRadius: 10, padding: '14px 16px', fontFamily: 'monospace',
        fontSize: 11, color: '#dce8ff', userSelect: 'none',
        boxShadow: '0 4px 24px rgba(0,0,0,.5)',
      }}
      prepend zIndexRange={[100, 0]}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.4, color: '#6585b0', marginBottom: 10 }}>
        ASSEMBLY — {parts.length} PARTS
      </div>
      {parts.map(p => (
        <button key={p.id}
          onClick={() => { select(p.id); onSelect(p.id); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: selectedPart?.id === p.id ? '#1e305c' : 'transparent',
            border: selectedPart?.id === p.id ? '1px solid #60a5fa' : '1px solid transparent',
            borderRadius: 5, padding: '5px 8px', color: selectedPart?.id === p.id ? '#60a5fa' : '#a4bedf',
            fontSize: 11, marginBottom: 2, cursor: 'pointer', fontFamily: 'monospace',
          }}
        >
          ◈ {p.name}
        </button>
      ))}
    </Html>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState<SpatialPart | null>(null)

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0e1420', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 60, zIndex: 200,
        background: '#131c2e', borderBottom: '1px solid #243050',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12,
      }}>
        <div style={{
          width: 28, height: 28, background: '#2563eb', borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#fff', fontWeight: 800, transform: 'rotate(-5deg)',
        }}>S</div>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#dce8ff', letterSpacing: -0.5 }}>spatialkit</span>
        <span style={{
          fontSize: 9, border: '1px solid #243050', borderRadius: 4,
          padding: '2px 6px', color: '#6585b0', fontFamily: 'monospace', letterSpacing: 0.6,
        }}>CONSUMER TEST</span>

        {selected && (
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10,
            background: '#1e305c', border: '1px solid #60a5fa', borderRadius: 8,
            padding: '6px 14px', fontSize: 12, color: '#60a5fa',
          }}>
            ◈ <strong>{selected.name}</strong>
            <span style={{ fontSize: 9, color: '#6585b0', fontFamily: 'monospace' }}>{selected.id}</span>
          </div>
        )}
      </div>

      {/* Canvas — this is where spatialkit/react lives */}
      <Canvas
        camera={{ position: [5.1, 3.7, 5.4], fov: 39 }}
        dpr={[1, 1.75]}
        style={{ paddingTop: 60 }}
        onPointerMissed={() => setSelected(null)}
      >
        <color attach="background" args={['#111a2c']} />
        <ambientLight intensity={1.2} />
        <hemisphereLight args={['#ffffff', '#4060a0', 2]} />
        <directionalLight position={[4, 7, 5]} intensity={3} />
        <directionalLight position={[-4, 3, -2]} intensity={1.8} color="#c5dfed" />

        {/*
          ─── THIS IS THE API FROM THE SNIPPET ───────────────────────────
          SpatialProvider wraps everything; onSelectionChange fires when
          the user clicks a mesh.
        */}
        <SpatialProvider onSelectionChange={setSelected}>

          {/* SelectableModel loads a GLB and makes every mesh clickable */}
          <Suspense fallback={<Html center><div style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 12 }}>Loading model…</div></Html>}>
            <SelectableModel
              src="/pump.glb"
              modelId="pump"
              highlightColor="#60a5fa"
            />
          </Suspense>

          {/*
            Annotation pins a DOM label to a named mesh.
            It tracks the mesh in world space every frame.
          */}
          {selected && (
            <Annotation
              target={selected.id}
              label={`✦ ${selected.name}`}
              offset={[0, 0.5, 0]}
              style={{
                background: '#1e305c',
                color: '#60a5fa',
                border: '1px solid #2563eb',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 11,
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
              }}
            />
          )}

          {/* PartList reads useSpatial() — must be inside SpatialProvider */}
          <PartList onSelect={() => {}} />

        </SpatialProvider>

        <OrbitControls makeDefault target={[0, 0.4, 0]} minDistance={1} maxDistance={15} />
        <gridHelper args={[20, 40, '#243050', '#1a2640']} position={[0, -0.1, 0]} />
      </Canvas>

      {/* Bottom hint */}
      <div style={{
        position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)',
        fontFamily: 'monospace', fontSize: 10, color: '#6585b0',
        background: '#131c2e', border: '1px solid #243050', borderRadius: 6,
        padding: '7px 14px', letterSpacing: 0.5,
      }}>
        Click any pump component · Drag to orbit · Scroll to zoom
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
