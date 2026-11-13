import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { CHECKLIST_ITEM_IDS } from '../stories/checklists';

export const CHECKLIST_STORAGE_KEY = 'death-of-20s:preparation-checklist:v1';
export function parseChecklistProgress(raw: string | null): Set<string> {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && CHECKLIST_ITEM_IDS.has(id)) : []);
  } catch { return new Set(); }
}

type Progress = { checked: Set<string>; saved: boolean; toggle: (id: string, checked: boolean) => void };
const ChecklistContext = createContext<Progress | null>(null);

export function ChecklistProvider({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(() => {
    try { return parseChecklistProgress(window.localStorage.getItem(CHECKLIST_STORAGE_KEY)); }
    catch { return new Set<string>(); }
  });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...checked])); setSaved(true); }
    catch { setSaved(false); }
  }, [checked]);
  const toggle = (id: string, complete: boolean) => {
    if (!CHECKLIST_ITEM_IDS.has(id)) return;
    setChecked(previous => { const next = new Set(previous); if (complete) next.add(id); else next.delete(id); return next; });
  };
  return <ChecklistContext.Provider value={{ checked, saved, toggle }}>{children}</ChecklistContext.Provider>;
}

export function useChecklistProgress() {
  const progress = useContext(ChecklistContext);
  if (!progress) throw new Error('Checklist progress requires ChecklistProvider');
  return progress;
}
