"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  type ReactNode
} from "react";
import { DEFAULT_GLOSSARY_ENTRIES } from "@/lib/glossary-initial-data";
import type { GlossaryEntry } from "@/lib/glossary-types";

const STORAGE_KEY = "gameloc-glossary-v1";

type GlossaryContextValue = {
  entries: GlossaryEntry[];
  addEntry: (entry: Omit<GlossaryEntry, "id">) => void;
  updateEntry: (id: string, patch: Partial<Omit<GlossaryEntry, "id">>) => void;
  deleteEntry: (id: string) => void;
  resetToDefaults: () => void;
};

const GlossaryContext = createContext<GlossaryContextValue | null>(null);

function loadFromStorage(): GlossaryEntry[] {
  if (typeof window === "undefined") return DEFAULT_GLOSSARY_ENTRIES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GLOSSARY_ENTRIES;
    const parsed = JSON.parse(raw) as GlossaryEntry[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* ignore */
  }
  return DEFAULT_GLOSSARY_ENTRIES;
}

function saveToStorage(entries: GlossaryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<GlossaryEntry[]>(DEFAULT_GLOSSARY_ENTRIES);
  const skipPersistOnce = useRef(true);

  useEffect(() => {
    startTransition(() => {
      setEntries(loadFromStorage());
    });
  }, []);

  useEffect(() => {
    if (skipPersistOnce.current) {
      skipPersistOnce.current = false;
      return;
    }
    saveToStorage(entries);
  }, [entries]);

  const addEntry = useCallback((entry: Omit<GlossaryEntry, "id">) => {
    const id = `glos-${Date.now()}`;
    setEntries((prev) => [...prev, { ...entry, id }]);
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<Omit<GlossaryEntry, "id">>) => {
    setEntries((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const resetToDefaults = useCallback(() => {
    setEntries(DEFAULT_GLOSSARY_ENTRIES);
    saveToStorage(DEFAULT_GLOSSARY_ENTRIES);
  }, []);

  const value = useMemo(
    () => ({ entries, addEntry, updateEntry, deleteEntry, resetToDefaults }),
    [entries, addEntry, updateEntry, deleteEntry, resetToDefaults]
  );

  return <GlossaryContext.Provider value={value}>{children}</GlossaryContext.Provider>;
}

export function useGlossary() {
  const ctx = useContext(GlossaryContext);
  if (!ctx) {
    throw new Error("useGlossary must be used within GlossaryProvider");
  }
  return ctx;
}

/** Entries whose source term appears in text (longer sources first). */
export { getGlossaryMatchesForSource } from "@/lib/glossary-match";
