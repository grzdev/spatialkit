export interface Note { id: string; target: string; label: string }
export const STORAGE_KEY = 'spatialkit.inspector.notes.v1';
export const INITIAL_NOTES: Note[] = [{ id: 'starter-note', target: 'pump/pressure-valve', label: 'Inspect this seal' }];

export function parseNotes(raw: string): Note[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 500) throw new Error('Expected up to 500 notes.');
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id || ids.has(item.id) ||
      typeof item.target !== 'string' || !item.target.startsWith('pump/') || typeof item.label !== 'string' ||
      !item.label.trim() || item.label.length > 240) throw new Error('Invalid note data.');
    ids.add(item.id);
    return { id: item.id, target: item.target, label: item.label };
  });
}
