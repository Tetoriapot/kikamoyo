'use client';

import { memo, useId } from 'react';
import type { EditorDocument, PatternType } from '@/lib/pattern-types';
import { addSeamlessCopies, createBaseInstances, modulo } from '@/lib/pattern-layout';

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

export const PatternCanvas = memo(function PatternCanvas({ document, id, className, tilePreview = false, maxObjects = 5000, label = '生成した幾何学模様' }: {
  document: EditorDocument;
  id?: string;
  className?: string;
  tilePreview?: boolean;
  maxObjects?: number;
  label?: string;
}) {
  const reactId = useId().replaceAll(':', '');
  const seamless = document.canvas.seamless;
  const previewTiling = tilePreview && seamless;
  const patternWidth = seamless ? document.canvas.tileSize : document.canvas.width;
  const patternHeight = seamless ? document.canvas.tileSize : document.canvas.height;
  const viewWidth = previewTiling ? patternWidth * 3 : document.canvas.width;
  const viewHeight = previewTiling ? patternHeight * 3 : document.canvas.height;
  const visibleLayerCount = Math.max(1, document.layers.filter((layer) => layer.visible).length);
  const layerLimit = Math.max(1, Math.floor(maxObjects / visibleLayerCount));
  const transform = `translate(${viewWidth / 2} ${viewHeight / 2}) scale(${document.canvas.flipX ? -1 : 1} ${document.canvas.flipY ? -1 : 1}) translate(${-viewWidth / 2} ${-viewHeight / 2})`;

  return (
    <svg id={id} className={className} viewBox={`0 0 ${viewWidth} ${viewHeight}`} width={viewWidth} height={viewHeight}
      aria-labelledby={`title-${reactId}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
      <title id={`title-${reactId}`}>{label}</title>
      <defs>
        {document.layers.filter((layer) => layer.visible).map((layer) => {
          const base = createBaseInstances(layer, patternWidth, patternHeight, document.seed, layerLimit, document.palette.length);
          const offsetInstances = base.map((instance) => ({
            ...instance,
            x: seamless ? modulo(instance.x + layer.offsetX, patternWidth) : instance.x + layer.offsetX,
            y: seamless ? modulo(instance.y + layer.offsetY, patternHeight) : instance.y + layer.offsetY,
          }));
          const lineLike = ['lines', 'doubleLines'].includes(layer.type) && layer.config.placement === 'stripe';
          const visualSize = lineLike ? Math.max(patternWidth, patternHeight) * 1.55 : layer.config.size;
          const instances = seamless
            ? addSeamlessCopies(offsetInstances, layer, patternWidth, layerLimit, visualSize)
            : offsetInstances;
          const patternId = `pattern-${reactId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          return (
            <pattern key={layer.id} id={patternId} width={patternWidth} height={patternHeight} patternUnits="userSpaceOnUse">
              <g>
                {instances.map((instance) => {
                  const color = document.palette[instance.colorIndex % document.palette.length] ?? '#111827';
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
      {previewTiling && <g aria-hidden="true" fill="none" stroke="rgba(255,255,255,.68)" strokeWidth={Math.max(1, patternWidth / 260)} strokeDasharray={`${patternWidth / 36} ${patternWidth / 50}`}>
        <path d={`M ${patternWidth} 0V${viewHeight}M${patternWidth * 2} 0V${viewHeight}M0 ${patternHeight}H${viewWidth}M0 ${patternHeight * 2}H${viewWidth}`} />
        <rect x={patternWidth} y={patternHeight} width={patternWidth} height={patternHeight} stroke="rgba(255,255,255,.95)" strokeWidth={Math.max(2, patternWidth / 150)} />
      </g>}
    </svg>
  );
});
