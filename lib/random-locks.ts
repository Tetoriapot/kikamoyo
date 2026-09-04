import {
  cloneDocument,
  type EditorDocument,
  type PatternLayer,
} from '@/lib/pattern-types';

export interface RandomLocks {
  palette: boolean;
  shape: boolean;
  placement: boolean;
}

export const DEFAULT_RANDOM_LOCKS: RandomLocks = {
  palette: false,
  shape: false,
  placement: false,
};

function preserveShape(
  current: PatternLayer,
  candidate: PatternLayer,
): PatternLayer {
  return {
    ...candidate,
    type: current.type,
    rotation: current.rotation,
    scale: current.scale,
    opacity: current.opacity,
    blendMode: current.blendMode,
    colorIndex: current.colorIndex,
    config: {
      ...candidate.config,
      size: current.config.size,
      aspectX: current.config.aspectX,
      aspectY: current.config.aspectY,
      strokeWidth: current.config.strokeWidth,
      cornerRadius: current.config.cornerRadius,
      fillMode: current.config.fillMode,
      roughness: current.config.roughness,
      jitterPosition: current.config.jitterPosition,
      jitterRotation: current.config.jitterRotation,
      jitterSize: current.config.jitterSize,
      jitterColor: current.config.jitterColor,
      jitterOpacity: current.config.jitterOpacity,
    },
  };
}

function preservePlacement(
  current: PatternLayer,
  candidate: PatternLayer,
): PatternLayer {
  return {
    ...candidate,
    offsetX: current.offsetX,
    offsetY: current.offsetY,
    config: {
      ...candidate.config,
      placement: current.config.placement,
      gap: current.config.gap,
      density: current.config.density,
    },
  };
}

export function mergeLockedRandomChannels(
  current: EditorDocument,
  candidate: EditorDocument,
  locks: RandomLocks,
) {
  if (!locks.palette && !locks.shape && !locks.placement)
    return cloneDocument(candidate);
  const next = cloneDocument(candidate);
  if (locks.palette) {
    next.palette = [...current.palette];
    next.canvas.background = current.canvas.background;
  }
  if (locks.shape || locks.placement) {
    // Coordinates and procedural geometry are Seed-derived, so holding either
    // structural channel also holds the Seed while unlocked colors may change.
    next.seed = current.seed;
    next.layers = current.layers.map((layer, index) => {
      const generated =
        candidate.layers[index] ??
        candidate.layers[index % candidate.layers.length] ??
        layer;
      let merged: PatternLayer = {
        ...generated,
        id: layer.id,
        name: layer.name,
        config: { ...generated.config },
      };
      if (locks.shape) merged = preserveShape(layer, merged);
      if (locks.placement) merged = preservePlacement(layer, merged);
      return merged;
    });
  }
  return next;
}
