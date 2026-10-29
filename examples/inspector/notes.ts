export interface Note { id: string; target: string; label: string; point?: [number, number, number] }
export const STORAGE_KEY = 'spatialkit.inspector.notes.v1';
export const INITIAL_NOTES: Note[] = [];

export function loadNotesFromStorage(modelId = 'pump'): Note[] {
  const key = notesKey(modelId);
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = parseNotes(raw, modelId);
      // Clean and remove any stale "Inspect this seal" or starter note from browser storage
      const cleaned = parsed.filter((n) => n.id !== 'starter-note' && !/inspect.*seal/i.test(n.label));
      if (cleaned.length !== parsed.length) {
        try { localStorage.setItem(key, JSON.stringify(cleaned)); } catch {}
      }
      return cleaned;
    }
  } catch {}
  return [];
}

export function parseNotes(raw: string, modelId = 'pump'): Note[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 500) throw new Error('Expected up to 500 notes.');
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
      typeof item.target !== 'string' || !item.target.startsWith(`${modelId}/`) || item.target.length <= modelId.length + 1 || typeof item.label !== 'string' ||
      !item.label.trim() || item.label.length > 240 ||
      (item.point !== undefined && (!Array.isArray(item.point) || item.point.length !== 3 || item.point.some((value: unknown) => typeof value !== 'number' || !Number.isFinite(value))))) throw new Error('Invalid note data.');
    ids.add(item.id);
    return { id: item.id, target: item.target, label: item.label, ...(item.point ? { point: item.point as [number, number, number] } : {}) };
  });
}

export function notesKey(modelId: string): string {
  return modelId === 'pump' ? STORAGE_KEY : `spatialkit.inspector.notes.v2:${modelId}`;
}

export function annotationOffset(notes: Note[], index: number): [number, number, number] {
  if (notes[index].point) return [0, 0.16, 0];
  return [0, 0.4 + notes.slice(0, index).filter((note) => note.target === notes[index].target).length * 0.25, 0];
}
