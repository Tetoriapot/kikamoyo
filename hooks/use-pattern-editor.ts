'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_PRESET, presetDocument } from '@/data/presets';
import type { CanvasConfig, EditorDocument, PatternConfig, PatternLayer } from '@/lib/pattern-types';
import { cloneDocument } from '@/lib/pattern-types';

interface HistoryState {
  past: EditorDocument[];
  present: EditorDocument;
  future: EditorDocument[];
}

type DocumentUpdater = EditorDocument | ((document: EditorDocument) => EditorDocument);

function isDocument(value: unknown): value is EditorDocument {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EditorDocument>;
  return candidate.schemaVersion === 1 && typeof candidate.seed === 'number' && Array.isArray(candidate.layers)
    && Array.isArray(candidate.palette) && Boolean(candidate.canvas);
}

export function usePatternEditor() {
  const [history, setHistory] = useState<HistoryState>({ past: [], present: presetDocument(INITIAL_PRESET), future: [] });
  const [hydrated, setHydrated] = useState(false);
  const lastCommitAt = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const shared = params.get('state');
        if (shared) {
          const normalized = shared.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(shared.length / 4) * 4, '=');
          const binary = window.atob(normalized);
          const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
          const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
          if (isDocument(parsed)) {
            lastCommitAt.current = 0;
            setHistory({ past: [], present: parsed, future: [] });
          }
        } else {
          const saved = window.localStorage.getItem('lastSession');
          if (saved) {
            const parsed: unknown = JSON.parse(saved);
            if (isDocument(parsed)) {
              lastCommitAt.current = 0;
              setHistory({ past: [], present: parsed, future: [] });
            }
          }
        }
      } catch {
        window.localStorage.removeItem('lastSession');
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem('lastSession', JSON.stringify(history.present)); } catch { /* Device storage can be unavailable. */ }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [history.present, hydrated]);

  const commit = useCallback((updater: DocumentUpdater) => {
    const committedAt = Date.now();
    const coalesce = lastCommitAt.current > 0 && committedAt - lastCommitAt.current <= 220;
    lastCommitAt.current = committedAt;
    setHistory((current) => {
      const draft = cloneDocument(current.present);
      const next = typeof updater === 'function' ? updater(draft) : cloneDocument(updater);
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      const past = coalesce ? current.past : [...current.past, current.present].slice(-20);
      return { past, present: next, future: [] };
    });
  }, []);

  const replace = useCallback((document: EditorDocument) => {
    lastCommitAt.current = 0;
    setHistory((current) => ({ past: [...current.past, current.present].slice(-20), present: cloneDocument(document), future: [] }));
  }, []);

  const undo = useCallback(() => {
    lastCommitAt.current = 0;
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future].slice(0, 20) };
    });
  }, []);

  const redo = useCallback(() => {
    lastCommitAt.current = 0;
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return { past: [...current.past, current.present].slice(-20), present: next, future: current.future.slice(1) };
    });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable="true"]')) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, undo]);

  const patchCanvas = useCallback((patch: Partial<CanvasConfig>) => commit((document) => ({ ...document, canvas: { ...document.canvas, ...patch } })), [commit]);
  const patchLayer = useCallback((id: string, patch: Partial<PatternLayer>) => commit((document) => ({ ...document, layers: document.layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer) })), [commit]);
  const patchLayerConfig = useCallback((id: string, patch: Partial<PatternConfig>) => commit((document) => ({ ...document, layers: document.layers.map((layer) => layer.id === id ? { ...layer, config: { ...layer.config, ...patch } } : layer) })), [commit]);

  const addLayer = useCallback((source?: PatternLayer) => commit((document) => {
    if (document.layers.length >= 5) return document;
    const base = source ? cloneDocument({ ...document, layers: [source] }).layers[0] : document.layers[0];
    const copy: PatternLayer = { ...base, config: { ...base.config }, id: `layer-${Date.now()}-${document.layers.length}`, name: `レイヤー ${document.layers.length + 1}`, offsetX: base.offsetX + 10, offsetY: base.offsetY + 10 };
    return { ...document, layers: [...document.layers, copy] };
  }), [commit]);

  const removeLayer = useCallback((id: string) => commit((document) => document.layers.length <= 1 ? document : ({ ...document, layers: document.layers.filter((layer) => layer.id !== id) })), [commit]);
  const duplicateLayer = useCallback((id: string) => commit((document) => {
    if (document.layers.length >= 5) return document;
    const index = document.layers.findIndex((layer) => layer.id === id);
    if (index < 0) return document;
    const source = document.layers[index];
    const copy = { ...source, config: { ...source.config }, id: `layer-${Date.now()}-copy`, name: `${source.name} コピー`, offsetX: source.offsetX + 8, offsetY: source.offsetY + 8 };
    const layers = [...document.layers];
    layers.splice(index + 1, 0, copy);
    return { ...document, layers };
  }), [commit]);

  const moveLayer = useCallback((id: string, direction: -1 | 1) => commit((document) => {
    const index = document.layers.findIndex((layer) => layer.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= document.layers.length) return document;
    const layers = [...document.layers];
    [layers[index], layers[nextIndex]] = [layers[nextIndex], layers[index]];
    return { ...document, layers };
  }), [commit]);

  return {
    document: history.present, commit, replace, undo, redo,
    canUndo: history.past.length > 0, canRedo: history.future.length > 0,
    patchCanvas, patchLayer, patchLayerConfig, addLayer, removeLayer, duplicateLayer, moveLayer,
  };
}
