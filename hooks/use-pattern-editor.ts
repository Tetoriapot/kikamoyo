'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_PRESET, presetDocument } from '@/data/presets';
import type {
  CanvasConfig, EditorDocument, EditorSnapshot, OmakaseGeneration, PatternConfig, PatternLayer,
} from '@/lib/pattern-types';
import {
  cloneDocument, cloneSnapshot, normalizeSnapshot, parseEditorSnapshot,
} from '@/lib/pattern-types';

interface HistoryState {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
}

type DocumentUpdater = EditorDocument | ((document: EditorDocument) => EditorDocument);
type RestoreStatus = 'initial' | 'session' | 'shared' | 'invalid-shared';

interface ReplaceOptions {
  presetId?: string | null;
  presetName?: string;
  activeLayerId?: string | null;
  generation?: OmakaseGeneration;
}

const INITIAL_SNAPSHOT: EditorSnapshot = {
  sessionVersion: 1,
  document: presetDocument(INITIAL_PRESET),
  presetId: INITIAL_PRESET.id,
  presetName: INITIAL_PRESET.name,
  activeLayerId: INITIAL_PRESET.document.layers[0]?.id ?? null,
};

function decodeState(value: string) {
  if (value.length > 250_000) throw new Error('Shared state is too large');
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = window.atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function removeInvalidStateFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('state');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function usePatternEditor() {
  const [history, setHistory] = useState<HistoryState>({ past: [], present: cloneSnapshot(INITIAL_SNAPSHOT), future: [] });
  const [hydrated, setHydrated] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('initial');
  const lastCommitAt = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('state');
      let restored: EditorSnapshot | null = null;
      let status: RestoreStatus = 'initial';

      if (shared) {
        try {
          restored = parseEditorSnapshot(decodeState(shared), '共有された模様');
          status = restored ? 'shared' : 'invalid-shared';
        } catch {
          status = 'invalid-shared';
        }
        if (!restored) removeInvalidStateFromUrl();
      }

      if (!restored) {
        try {
          const saved = window.localStorage.getItem('lastSession');
          if (saved) {
            restored = parseEditorSnapshot(JSON.parse(saved) as unknown);
            if (restored && status !== 'invalid-shared') status = 'session';
            if (!restored) window.localStorage.removeItem('lastSession');
          }
        } catch {
          // Storage may be unavailable or contain malformed JSON. The initial preset remains safe.
        }
      }

      if (restored) {
        lastCommitAt.current = 0;
        setHistory({ past: [], present: restored, future: [] });
      }
      setRestoreStatus(status);
      setHydrated(true);
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
      const draft = cloneDocument(current.present.document);
      const nextDocument = typeof updater === 'function' ? updater(draft) : cloneDocument(updater);
      if (JSON.stringify(nextDocument) === JSON.stringify(current.present.document)) return current;
      const next = normalizeSnapshot({ ...current.present, document: nextDocument });
      const past = coalesce ? current.past : [...current.past, current.present].slice(-20);
      return { past, present: next, future: [] };
    });
  }, []);

  const replace = useCallback((document: EditorDocument, options: ReplaceOptions = {}) => {
    lastCommitAt.current = 0;
    setHistory((current) => {
      const next = normalizeSnapshot({
        sessionVersion: 1,
        document: cloneDocument(document),
        presetId: options.presetId ?? null,
        presetName: options.presetName ?? 'カスタム模様',
        activeLayerId: options.activeLayerId ?? document.layers[0]?.id ?? null,
        ...(options.generation ? { generation: options.generation } : {}),
      });
      return { past: [...current.past, current.present].slice(-20), present: next, future: [] };
    });
  }, []);

  const setIdentity = useCallback((options: ReplaceOptions) => {
    setHistory((current) => ({
      ...current,
      present: normalizeSnapshot({
        ...current.present,
        presetId: options.presetId === undefined ? current.present.presetId : options.presetId,
        presetName: options.presetName ?? current.present.presetName,
        activeLayerId: options.activeLayerId === undefined ? current.present.activeLayerId : options.activeLayerId,
        ...(options.generation === undefined ? {} : { generation: options.generation }),
      }),
    }));
  }, []);

  const setActiveLayerId = useCallback((activeLayerId: string) => {
    setHistory((current) => current.present.document.layers.some((layer) => layer.id === activeLayerId)
      ? { ...current, present: { ...current.present, activeLayerId } }
      : current);
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
    snapshot: history.present,
    document: history.present.document,
    presetId: history.present.presetId,
    presetName: history.present.presetName,
    activeLayerId: history.present.activeLayerId,
    generation: history.present.generation,
    hydrated,
    restoreStatus,
    commit,
    replace,
    setIdentity,
    setActiveLayerId,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    patchCanvas,
    patchLayer,
    patchLayerConfig,
    addLayer,
    removeLayer,
    duplicateLayer,
    moveLayer,
  };
}
