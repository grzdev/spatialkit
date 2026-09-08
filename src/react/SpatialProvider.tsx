import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { resolvePart, type PartRecord, type SpatialPart } from './model';

interface SpatialContextValue {
  records: PartRecord[];
  selectedPart: SpatialPart | null;
  select: (target: string | null, modelId?: string) => void;
  register: (modelId: string, records: PartRecord[]) => () => void;
}
const SpatialContext = createContext<SpatialContextValue | null>(null);
export interface SpatialProviderProps {
  children: ReactNode;
  onSelectionChange?: (part: SpatialPart | null) => void;
}

/** An isolated selection registry. Mount inside the consumer's existing R3F Canvas. */
export function SpatialProvider({ children, onSelectionChange }: SpatialProviderProps) {
  const [models, setModels] = useState<Map<string, PartRecord[]>>(() => new Map());
  const registered = useRef(new Map<string, PartRecord[]>());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const callback = useRef(onSelectionChange);
  callback.current = onSelectionChange;
  const records = useMemo(() => [...models.values()].flat(), [models]);
  const selectedPart = records.find((record) => record.part.id === selectedId)?.part ?? null;
  const previous = useRef<SpatialPart | null>(null);
  useEffect(() => {
    if (previous.current !== selectedPart) {
      previous.current = selectedPart;
      callback.current?.(selectedPart);
    }
  }, [selectedPart]);
  const register = useCallback((modelId: string, parts: PartRecord[]) => {
    if (registered.current.has(modelId)) throw new Error(`[SpatialKit] Duplicate modelId "${modelId}". Give each model a unique modelId.`);
    registered.current.set(modelId, parts);
    setModels(new Map(registered.current));
    return () => {
      registered.current.delete(modelId);
      setModels(new Map(registered.current));
      setSelectedId((id) => parts.some((record) => record.part.id === id) ? null : id);
    };
  }, []);
  const select = useCallback((target: string | null, modelId?: string) => {
    setSelectedId(target === null ? null : resolvePart(records, target, modelId)?.part.id ?? null);
  }, [records]);
  const value = useMemo(() => ({ records, selectedPart, select, register }), [records, selectedPart, select, register]);
  return <SpatialContext.Provider value={value}>{children}</SpatialContext.Provider>;
}

export function useSpatialContext() {
  const context = useContext(SpatialContext);
  if (!context) throw new Error('[SpatialKit] Components and useSpatial must be inside <SpatialProvider>.');
  return context;
}
/** Access model parts and selection without adopting any application state library. */
export function useSpatial() {
  const { records, selectedPart, select } = useSpatialContext();
  return { parts: records.map((record) => record.part), selectedPart, select, clearSelection: () => select(null) };
}
