import type { PatternLayer, PatternType } from '@/lib/pattern-types';
import { hashUnit } from '@/lib/seed';

export interface PatternInstance {
  key: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  colorIndex: number;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function enrich(layer: PatternLayer, seed: number, key: number, x: number, y: number, baseRotation: number, step: number, paletteLength: number): PatternInstance {
  const rough = layer.config.roughness / 100;
  const posPower = Math.max(rough, layer.config.jitterPosition / 100);
  const rotPower = Math.max(rough, layer.config.jitterRotation / 100);
  const sizePower = Math.max(rough, layer.config.jitterSize / 100);
  const opacityPower = Math.max(rough, layer.config.jitterOpacity / 100);
  const jitter = step * 0.18 * posPower;
  return {
    key: `${key}`,
    x: x + (hashUnit(seed, layer.id, key, 0) * 2 - 1) * jitter,
    y: y + (hashUnit(seed, layer.id, key, 1) * 2 - 1) * jitter,
    rotation: baseRotation + (hashUnit(seed, layer.id, key, 2) * 2 - 1) * 38 * rotPower,
    scaleX: clamp(1 + (hashUnit(seed, layer.id, key, 3) * 2 - 1) * 0.32 * sizePower, 0.48, 1.52),
    scaleY: clamp(1 + (hashUnit(seed, layer.id, key, 4) * 2 - 1) * 0.32 * sizePower, 0.48, 1.52),
    opacity: clamp(1 - hashUnit(seed, layer.id, key, 5) * 0.38 * opacityPower, 0.3, 1),
    colorIndex: layer.config.jitterColor > 0
      ? Math.floor(hashUnit(seed, layer.id, key, 6) * Math.max(1, paletteLength))
      : (key + layer.colorIndex) % Math.max(1, paletteLength),
  };
}

function fitGrid(width: number, height: number, stepX: number, stepY: number, maxObjects: number, objectsPerCell = 1) {
  let columns = Math.max(1, Math.ceil(width / stepX));
  let rows = Math.max(1, Math.ceil(height / stepY));
  const estimated = columns * rows * objectsPerCell;
  if (estimated > maxObjects) {
    const factor = Math.sqrt(estimated / Math.max(1, maxObjects));
    columns = Math.max(1, Math.floor(columns / factor));
    rows = Math.max(1, Math.floor(rows / factor));
  }
  return { columns, rows, stepX: width / columns, stepY: height / rows };
}

export function createBaseInstances(layer: PatternLayer, width: number, height: number, seed: number, maxObjects: number, paletteLength: number) {
  const density = clamp(layer.config.density, 10, 100);
  let step = Math.max(7, layer.config.gap * (60 / density));
  const placement = layer.config.placement;
  const result: PatternInstance[] = [];

  if (['radial', 'concentric', 'kaleidoscope', 'symmetric'].includes(placement)) {
    const rings = placement === 'concentric' ? 4 : 3;
    const radiusBase = Math.min(width, height);
    let key = 0;
    for (let ring = 0; ring < rings; ring += 1) {
      const count = placement === 'symmetric' ? 8 : 10 + ring * 6;
      const radius = placement === 'concentric' ? (ring + 1) * radiusBase * 0.075 : radiusBase * (0.09 + ring * 0.08);
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + (ring % 2 ? Math.PI / count : 0);
        result.push(enrich(layer, seed, key, width / 2 + Math.cos(angle) * radius, height / 2 + Math.sin(angle) * radius, (angle * 180) / Math.PI + 90, step, paletteLength));
        key += 1;
      }
    }
    const limited = result.slice(0, maxObjects);
    return placement === 'kaleidoscope'
      ? limited.map((item, index) => ({ ...item, rotation: index % 2 ? -item.rotation : item.rotation }))
      : limited;
  }

  if (placement === 'random' || placement === 'pseudoRandom') {
    const count = Math.min(maxObjects, Math.max(12, Math.round((width * height) / (step * step) * 0.68)));
    for (let index = 0; index < count; index += 1) {
      const x = hashUnit(seed, layer.id, index, placement === 'random' ? 20 : 30) * width;
      const y = hashUnit(seed, layer.id, index, placement === 'random' ? 21 : 31) * height;
      result.push(enrich(layer, seed, index, x, y, hashUnit(seed, layer.id, index, 22) * 360, step, paletteLength));
    }
    return result;
  }

  if (placement === 'stripe') {
    const columns = Math.max(2, Math.min(maxObjects, Math.round(width / step)));
    step = width / columns;
    for (let column = 0; column < columns; column += 1) {
      result.push(enrich(layer, seed, column, (column + 0.5) * step, height / 2, 0, step, paletteLength));
    }
    return result;
  }

  if (placement === 'tile') {
    const grid = fitGrid(width, height, step * 2, step * 2, maxObjects, 3);
    let key = 0;
    for (let row = 0; row < grid.rows && result.length < maxObjects; row += 1) {
      for (let column = 0; column < grid.columns && result.length < maxObjects; column += 1) {
        const left = column * grid.stepX;
        const top = row * grid.stepY;
        const points = [
          [left + grid.stepX * 0.25, top + grid.stepY * 0.25, 0],
          [left + grid.stepX * 0.75, top + grid.stepY * 0.25, 90],
          [left + grid.stepX * 0.5, top + grid.stepY * 0.75, 45],
        ] as const;
        for (const [x, y, rotation] of points) {
          if (result.length >= maxObjects) break;
          result.push(enrich(layer, seed, key, x, y, rotation, Math.min(grid.stepX, grid.stepY) / 2, paletteLength));
          key += 1;
        }
      }
    }
    return result;
  }

  const targetStepX = placement === 'brick' ? step * 2 : step;
  const targetStepY = placement === 'hexGrid' ? step * Math.sqrt(3) / 2 : step;
  const grid = fitGrid(width, height, targetStepX, targetStepY, maxObjects);
  let key = 0;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (placement === 'checker' && (row + column) % 2 === 1) continue;
      let x = (column + 0.5) * grid.stepX;
      let y = (row + 0.5) * grid.stepY;
      if (placement === 'offsetGrid' && row % 2 === 1) x += grid.stepX / 2;
      if (placement === 'brick' && row % 2 === 1) x += grid.stepX / 2;
      if (placement === 'hexGrid' && row % 2 === 1) x += grid.stepX / 2;
      if (placement === 'diagonal' && row % 2 === 1) x += grid.stepX / 3;
      if (placement === 'wave') y += Math.sin((column / Math.max(1, grid.columns)) * Math.PI * 2) * grid.stepY * 0.28;
      const rotation = placement === 'diagonal' ? 45 : 0;
      result.push(enrich(layer, seed, key, modulo(x, width), y, rotation, Math.min(grid.stepX, grid.stepY), paletteLength));
      key += 1;
    }
  }
  return result.slice(0, maxObjects);
}

function shapeHalfBounds(type: PatternType, size: number, aspectX: number, aspectY: number) {
  if (type === 'rectangles') return { x: size * 0.725 * aspectX, y: size * 0.275 * aspectY };
  if (type === 'ellipse' || type === 'squares') return { x: size * 0.5 * aspectX, y: size * 0.5 * aspectY };
  return { x: size * 0.5 * Math.max(1, aspectX), y: size * 0.5 * Math.max(1, aspectY) };
}

function transformedExtent(item: PatternInstance, layer: PatternLayer, visualSize: number) {
  const base = shapeHalfBounds(layer.type, visualSize, layer.config.aspectX, layer.config.aspectY);
  const stroke = layer.config.strokeWidth / 2 + 1;
  const halfWidth = (base.x + stroke) * Math.abs(item.scaleX * layer.scale);
  const halfHeight = (base.y + stroke) * Math.abs(item.scaleY * layer.scale);
  const angle = ((item.rotation + layer.rotation) * Math.PI) / 180;
  return {
    x: Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfHeight,
    y: Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfHeight,
  };
}

export function addSeamlessCopies(instances: PatternInstance[], layer: PatternLayer, tile: number, maxObjects: number, visualSize = layer.config.size) {
  const copies: PatternInstance[] = [];
  for (const item of instances) {
    const extent = transformedExtent(item, layer, visualSize);
    const minX = clamp(Math.ceil((-extent.x - item.x) / tile), -12, 12);
    const maxX = clamp(Math.floor((tile + extent.x - item.x) / tile), -12, 12);
    const minY = clamp(Math.ceil((-extent.y - item.y) / tile), -12, 12);
    const maxY = clamp(Math.floor((tile + extent.y - item.y) / tile), -12, 12);
    const orbit: PatternInstance[] = [];
    for (let offsetY = minY; offsetY <= maxY; offsetY += 1) {
      for (let offsetX = minX; offsetX <= maxX; offsetX += 1) {
        orbit.push({
          ...item,
          key: `${item.key}:${offsetX}:${offsetY}`,
          x: item.x + offsetX * tile,
          y: item.y + offsetY * tile,
        });
      }
    }
    if (copies.length > 0 && copies.length + orbit.length > maxObjects) break;
    copies.push(...orbit);
  }
  return copies;
}
