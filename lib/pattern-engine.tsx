'use client';

import { memo, useId } from 'react';
import type { EditorDocument, PatternLayer, PatternType } from '@/lib/pattern-types';
import { hashUnit } from '@/lib/seed';

interface Instance {
  key: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  colorIndex: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function polygonPoints(sides: number, radius: number, start = -90) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = ((start + (index * 360) / sides) * Math.PI) / 180;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(' ');
}

function starPoints(radius: number) {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = ((-90 + index * 36) * Math.PI) / 180;
    const currentRadius = index % 2 === 0 ? radius : radius * 0.42;
    return `${Math.cos(angle) * currentRadius},${Math.sin(angle) * currentRadius}`;
  }).join(' ');
}

function Shape({ type, size, aspectX, aspectY, strokeWidth, cornerRadius, fillMode, color }: {
  type: PatternType;
  size: number;
  aspectX: number;
  aspectY: number;
  strokeWidth: number;
  cornerRadius: number;
  fillMode: 'fill' | 'stroke' | 'both';
  color: string;
}) {
  const lineType = ['lines', 'doubleLines', 'waves', 'zigzag', 'chevron', 'arcs', 'rings', 'radial'].includes(type);
  const fill = lineType || fillMode === 'stroke' ? 'none' : color;
  const stroke = lineType || fillMode !== 'fill' ? color : 'none';
  const common = { fill, stroke, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const radius = size / 2;

  switch (type) {
    case 'dots': return <circle r={Math.max(2, size * 0.22)} {...common} />;
    case 'circles': return <circle r={radius} {...common} />;
    case 'ellipse': return <ellipse rx={radius * aspectX} ry={radius * aspectY} {...common} />;
    case 'squares': return <rect x={-radius * aspectX} y={-radius * aspectY} width={size * aspectX} height={size * aspectY} rx={cornerRadius} {...common} />;
    case 'rectangles': return <rect x={-radius * 1.45 * aspectX} y={-radius * 0.55 * aspectY} width={size * 1.45 * aspectX} height={size * 0.55 * aspectY} rx={cornerRadius} {...common} />;
    case 'triangles': return <polygon points={polygonPoints(3, radius)} {...common} />;
    case 'diamonds': return <polygon points={`0,${-radius} ${radius * aspectX},0 0,${radius} ${-radius * aspectX},0`} {...common} />;
    case 'hexagons': return <polygon points={polygonPoints(6, radius)} {...common} />;
    case 'octagons': return <polygon points={polygonPoints(8, radius)} {...common} />;
    case 'stars': return <polygon points={starPoints(radius)} {...common} />;
    case 'crosses': return <path d={`M ${-radius} ${-radius * 0.22} H ${-radius * 0.22} V ${-radius} H ${radius * 0.22} V ${-radius * 0.22} H ${radius} V ${radius * 0.22} H ${radius * 0.22} V ${radius} H ${-radius * 0.22} V ${radius * 0.22} H ${-radius} Z`} {...common} />;
    case 'lines': return <line x1="0" y1={-radius} x2="0" y2={radius} {...common} />;
    case 'doubleLines': return <g><line x1={-strokeWidth * 1.4} y1={-radius} x2={-strokeWidth * 1.4} y2={radius} {...common} /><line x1={strokeWidth * 1.4} y1={-radius} x2={strokeWidth * 1.4} y2={radius} {...common} /></g>;
    case 'waves': return <path d={`M ${-radius} 0 C ${-radius * 0.66} ${-radius * 0.56}, ${-radius * 0.34} ${radius * 0.56}, 0 0 C ${radius * 0.34} ${-radius * 0.56}, ${radius * 0.66} ${radius * 0.56}, ${radius} 0`} {...common} />;
    case 'zigzag': return <path d={`M ${-radius} ${radius * 0.38} L ${-radius * 0.5} ${-radius * 0.38} L 0 ${radius * 0.38} L ${radius * 0.5} ${-radius * 0.38} L ${radius} ${radius * 0.38}`} {...common} />;
    case 'chevron': return <path d={`M ${-radius} ${-radius * 0.45} L 0 ${radius * 0.45} L ${radius} ${-radius * 0.45}`} {...common} />;
    case 'arcs': return <path d={`M ${-radius} ${radius * 0.25} A ${radius} ${radius} 0 0 1 ${radius} ${radius * 0.25}`} {...common} />;
    case 'rings': return <circle r={radius} {...common} />;
    case 'radial': return <g>{Array.from({ length: 10 }, (_, index) => <line key={index} x1="0" y1={-radius * 0.2} x2="0" y2={-radius} transform={`rotate(${index * 36})`} {...common} />)}</g>;
    default: return null;
  }
}

function enrich(layer: PatternLayer, seed: number, key: number, x: number, y: number, baseRotation: number, step: number, paletteLength: number): Instance {
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

function baseInstances(layer: PatternLayer, tile: number, seed: number, maxObjects: number, paletteLength: number) {
  const density = clamp(layer.config.density, 10, 100);
  let step = Math.max(7, layer.config.gap * (60 / density));
  const placement = layer.config.placement;
  const result: Instance[] = [];

  if (['radial', 'concentric', 'kaleidoscope', 'symmetric'].includes(placement)) {
    const rings = placement === 'concentric' ? 4 : 3;
    let key = 0;
    for (let ring = 0; ring < rings; ring += 1) {
      const count = placement === 'symmetric' ? 8 : 10 + ring * 6;
      const radius = placement === 'concentric' ? (ring + 1) * tile * 0.075 : tile * (0.09 + ring * 0.08);
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + (ring % 2 ? Math.PI / count : 0);
        result.push(enrich(layer, seed, key, tile / 2 + Math.cos(angle) * radius, tile / 2 + Math.sin(angle) * radius, (angle * 180) / Math.PI + 90, step, paletteLength));
        key += 1;
      }
    }
    if (placement === 'kaleidoscope') {
      return result.map((item, index) => ({ ...item, rotation: index % 2 ? -item.rotation : item.rotation })).slice(0, maxObjects);
    }
    return result.slice(0, maxObjects);
  }

  if (placement === 'random' || placement === 'pseudoRandom') {
    const count = Math.min(maxObjects, Math.max(12, Math.round((tile * tile) / (step * step) * 0.68)));
    for (let index = 0; index < count; index += 1) {
      const x = hashUnit(seed, layer.id, index, placement === 'random' ? 20 : 30) * tile;
      const y = hashUnit(seed, layer.id, index, placement === 'random' ? 21 : 31) * tile;
      result.push(enrich(layer, seed, index, x, y, hashUnit(seed, layer.id, index, 22) * 360, step, paletteLength));
    }
    return result.slice(0, maxObjects);
  }

  if (placement === 'stripe') {
    const columns = Math.max(2, Math.round(tile / step));
    step = tile / columns;
    for (let column = 0; column < columns; column += 1) {
      result.push(enrich(layer, seed, column, (column + 0.5) * step, tile / 2, 0, step, paletteLength));
    }
    return result.slice(0, maxObjects);
  }

  let columns = Math.max(1, Math.round(tile / step));
  let rows = Math.max(1, Math.round(tile / step));
  if (columns * rows > maxObjects) {
    const factor = Math.sqrt((columns * rows) / maxObjects);
    columns = Math.max(1, Math.floor(columns / factor));
    rows = Math.max(1, Math.floor(rows / factor));
  }
  const stepX = tile / columns;
  const stepY = tile / rows;
  let key = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (placement === 'checker' && (row + column) % 2 === 1) continue;
      let x = (column + 0.5) * stepX;
      let y = (row + 0.5) * stepY;
      if (['offsetGrid', 'brick', 'hexGrid', 'diagonal'].includes(placement) && row % 2 === 1) x += stepX / 2;
      if (placement === 'wave') y += Math.sin((column / Math.max(1, columns)) * Math.PI * 2) * stepY * 0.28;
      const rotation = placement === 'diagonal' ? 45 : 0;
      result.push(enrich(layer, seed, key, x % tile, y, rotation, Math.min(stepX, stepY), paletteLength));
      key += 1;
    }
  }
  return result.slice(0, maxObjects);
}

function withSeamlessCopies(instances: Instance[], layer: PatternLayer, tile: number) {
  const spanningStripe = ['lines', 'doubleLines'].includes(layer.type) && layer.config.placement === 'stripe';
  const margin = spanningStripe ? tile : Math.min(tile, layer.config.size * layer.scale * 1.5 + layer.config.gap * 0.2);
  return instances.flatMap((item) => {
    const xOffsets = [0];
    const yOffsets = [0];
    if (item.x < margin) xOffsets.push(tile);
    if (item.x > tile - margin) xOffsets.push(-tile);
    if (item.y < margin) yOffsets.push(tile);
    if (item.y > tile - margin) yOffsets.push(-tile);
    return xOffsets.flatMap((dx) => yOffsets.map((dy) => ({ ...item, key: `${item.key}:${dx}:${dy}`, x: item.x + dx, y: item.y + dy })));
  });
}

export const PatternCanvas = memo(function PatternCanvas({ document, id, className, tilePreview = false, maxObjects = 5000, label = '生成した幾何学模様' }: {
  document: EditorDocument;
  id?: string;
  className?: string;
  tilePreview?: boolean;
  maxObjects?: number;
  label?: string;
}) {
  const reactId = useId().replaceAll(':', '');
  const tile = document.canvas.seamless ? document.canvas.tileSize : Math.max(document.canvas.width, document.canvas.height);
  const viewWidth = tilePreview ? tile * 3 : document.canvas.width;
  const viewHeight = tilePreview ? tile * 3 : document.canvas.height;
  const visibleLayerCount = Math.max(1, document.layers.filter((layer) => layer.visible).length);
  const layerLimit = Math.max(1, Math.floor(maxObjects / visibleLayerCount));
  const transform = `translate(${viewWidth / 2} ${viewHeight / 2}) scale(${document.canvas.flipX ? -1 : 1} ${document.canvas.flipY ? -1 : 1}) translate(${-viewWidth / 2} ${-viewHeight / 2})`;

  return (
    <svg id={id} className={className} viewBox={`0 0 ${viewWidth} ${viewHeight}`} width={viewWidth} height={viewHeight}
      aria-labelledby={`title-${reactId}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <title id={`title-${reactId}`}>{label}</title>
      <defs>
        {document.layers.filter((layer) => layer.visible).map((layer) => {
          const baseLimit = document.canvas.seamless ? Math.max(1, Math.floor(layerLimit / 9)) : layerLimit;
          const base = baseInstances(layer, tile, document.seed, baseLimit, document.palette.length);
          const offsetInstances = base.map((instance) => ({
            ...instance,
            x: document.canvas.seamless ? modulo(instance.x + layer.offsetX, tile) : instance.x + layer.offsetX,
            y: document.canvas.seamless ? modulo(instance.y + layer.offsetY, tile) : instance.y + layer.offsetY,
          }));
          const instances = (document.canvas.seamless ? withSeamlessCopies(offsetInstances, layer, tile) : offsetInstances).slice(0, layerLimit);
          const patternId = `pattern-${reactId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          const lineLike = ['lines', 'doubleLines'].includes(layer.type) && layer.config.placement === 'stripe';
          return (
            <pattern key={layer.id} id={patternId} width={tile} height={tile} patternUnits="userSpaceOnUse">
              <g>
                {instances.map((instance) => {
                  const color = document.palette[instance.colorIndex % document.palette.length] ?? '#111827';
                  const visualSize = lineLike ? tile * 1.55 : layer.config.size;
                  return (
                    <g key={instance.key} transform={`translate(${instance.x} ${instance.y}) rotate(${instance.rotation + layer.rotation}) scale(${instance.scaleX * layer.scale} ${instance.scaleY * layer.scale})`} opacity={instance.opacity}>
                      <Shape type={layer.type} size={visualSize} aspectX={layer.config.aspectX} aspectY={layer.config.aspectY}
                        strokeWidth={layer.config.strokeWidth} cornerRadius={layer.config.cornerRadius}
                        fillMode={layer.config.fillMode} color={color} />
                    </g>
                  );
                })}
              </g>
            </pattern>
          );
        })}
      </defs>
      {!document.canvas.transparent && <rect data-export-background="true" width={viewWidth} height={viewHeight} fill={document.canvas.background} />}
      <g transform={transform}>
        {document.layers.filter((layer) => layer.visible).map((layer) => {
          const patternId = `pattern-${reactId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          return <rect key={layer.id} width={viewWidth} height={viewHeight} fill={`url(#${patternId})`} opacity={layer.opacity}
            style={{ mixBlendMode: layer.blendMode }} />;
        })}
      </g>
      {tilePreview && <g aria-hidden="true" fill="none" stroke="rgba(255,255,255,.68)" strokeWidth={Math.max(1, tile / 260)} strokeDasharray={`${tile / 36} ${tile / 50}`}>
        <path d={`M ${tile} 0V${viewHeight}M${tile * 2} 0V${viewHeight}M0 ${tile}H${viewWidth}M0 ${tile * 2}H${viewWidth}`} />
        <rect x={tile} y={tile} width={tile} height={tile} stroke="rgba(255,255,255,.95)" strokeWidth={Math.max(2, tile / 150)} />
      </g>}
    </svg>
  );
});
