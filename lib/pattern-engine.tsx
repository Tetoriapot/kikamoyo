'use client';

import { memo, useId } from 'react';
import type { EditorDocument, PatternType } from '@/lib/pattern-types';
import {
  addSeamlessCopies,
  createBaseInstances,
  modulo,
} from '@/lib/pattern-layout';
import {
  createLowPolyFacets,
  createQuarterCircleTiles,
  createShardPolygons,
} from '@/lib/procedural-layout';
import { getRepeatPlan } from '@/lib/repeat-layout';
import { hashUnit } from '@/lib/seed';
import { textSpaceStops } from '@/lib/composition';

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

function Shape({
  type,
  size,
  aspectX,
  aspectY,
  strokeWidth,
  cornerRadius,
  fillMode,
  color,
}: {
  type: PatternType;
  size: number;
  aspectX: number;
  aspectY: number;
  strokeWidth: number;
  cornerRadius: number;
  fillMode: 'fill' | 'stroke' | 'both';
  color: string;
}) {
  const lineType = [
    'lines',
    'doubleLines',
    'waves',
    'zigzag',
    'chevron',
    'arcs',
    'rings',
    'radial',
  ].includes(type);
  const fill = lineType || fillMode === 'stroke' ? 'none' : color;
  const stroke = lineType || fillMode !== 'fill' ? color : 'none';
  const common = {
    fill,
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const radius = size / 2;

  switch (type) {
    case 'dots':
      return <circle r={Math.max(2, size * 0.22)} {...common} />;
    case 'circles':
      return <circle r={radius} {...common} />;
    case 'ellipse':
      return (
        <ellipse rx={radius * aspectX} ry={radius * aspectY} {...common} />
      );
    case 'squares':
      return (
        <rect
          x={-radius * aspectX}
          y={-radius * aspectY}
          width={size * aspectX}
          height={size * aspectY}
          rx={cornerRadius}
          {...common}
        />
      );
    case 'rectangles':
      return (
        <rect
          x={-radius * 1.45 * aspectX}
          y={-radius * 0.55 * aspectY}
          width={size * 1.45 * aspectX}
          height={size * 0.55 * aspectY}
          rx={cornerRadius}
          {...common}
        />
      );
    case 'triangles':
      return <polygon points={polygonPoints(3, radius)} {...common} />;
    case 'diamonds':
      return (
        <polygon
          points={`0,${-radius} ${radius * aspectX},0 0,${radius} ${-radius * aspectX},0`}
          {...common}
        />
      );
    case 'hexagons':
      return <polygon points={polygonPoints(6, radius)} {...common} />;
    case 'octagons':
      return <polygon points={polygonPoints(8, radius)} {...common} />;
    case 'stars':
      return <polygon points={starPoints(radius)} {...common} />;
    case 'crosses':
      return (
        <path
          d={`M ${-radius} ${-radius * 0.22} H ${-radius * 0.22} V ${-radius} H ${radius * 0.22} V ${-radius * 0.22} H ${radius} V ${radius * 0.22} H ${radius * 0.22} V ${radius} H ${-radius * 0.22} V ${radius * 0.22} H ${-radius} Z`}
          {...common}
        />
      );
    case 'lines':
      return <line x1="0" y1={-radius} x2="0" y2={radius} {...common} />;
    case 'doubleLines':
      return (
        <g>
          <line
            x1={-strokeWidth * 1.4}
            y1={-radius}
            x2={-strokeWidth * 1.4}
            y2={radius}
            {...common}
          />
          <line
            x1={strokeWidth * 1.4}
            y1={-radius}
            x2={strokeWidth * 1.4}
            y2={radius}
            {...common}
          />
        </g>
      );
    case 'waves':
      return (
        <path
          d={`M ${-radius} 0 C ${-radius * 0.66} ${-radius * 0.56}, ${-radius * 0.34} ${radius * 0.56}, 0 0 C ${radius * 0.34} ${-radius * 0.56}, ${radius * 0.66} ${radius * 0.56}, ${radius} 0`}
          {...common}
        />
      );
    case 'zigzag':
      return (
        <path
          d={`M ${-radius} ${radius * 0.38} L ${-radius * 0.5} ${-radius * 0.38} L 0 ${radius * 0.38} L ${radius * 0.5} ${-radius * 0.38} L ${radius} ${radius * 0.38}`}
          {...common}
        />
      );
    case 'chevron':
      return (
        <path
          d={`M ${-radius} ${-radius * 0.45} L 0 ${radius * 0.45} L ${radius} ${-radius * 0.45}`}
          {...common}
        />
      );
    case 'arcs':
      return (
        <path
          d={`M ${-radius} ${radius * 0.25} A ${radius} ${radius} 0 0 1 ${radius} ${radius * 0.25}`}
          {...common}
        />
      );
    case 'rings':
      return <circle r={radius} {...common} />;
    case 'radial':
      return (
        <g>
          {Array.from({ length: 10 }, (_, index) => (
            <line
              key={index}
              x1="0"
              y1={-radius * 0.2}
              x2="0"
              y2={-radius}
              transform={`rotate(${index * 36})`}
              {...common}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function CollageShape({
  variant,
  size,
  color,
  strokeWidth,
}: {
  variant: number;
  size: number;
  color: string;
  strokeWidth: number;
}) {
  const radius = size / 2;
  const outline = {
    fill: 'none',
    stroke: color,
    strokeWidth: Math.max(1.5, strokeWidth),
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (variant % 10) {
    case 0:
      return <circle r={radius * 0.58} fill={color} />;
    case 1:
      return <circle r={radius * 0.72} {...outline} />;
    case 2:
      return (
        <rect
          x={-radius * 1.35}
          y={-radius * 0.28}
          width={radius * 2.7}
          height={radius * 0.56}
          rx={radius * 0.28}
          fill={color}
        />
      );
    case 3:
      return (
        <line
          x1={-radius * 1.15}
          y1={radius * 0.55}
          x2={radius * 1.15}
          y2={-radius * 0.55}
          {...outline}
        />
      );
    case 4:
      return (
        <path
          d={`M ${-radius} ${-radius} H ${radius} A ${radius * 2} ${radius * 2} 0 0 1 ${-radius} ${radius} Z`}
          fill={color}
        />
      );
    case 5:
      return (
        <g fill={color}>
          {[-0.72, 0, 0.72].map((offset) => (
            <polygon
              key={offset}
              points={polygonPoints(3, radius * 0.36)}
              transform={`translate(${offset * radius} 0)`}
            />
          ))}
        </g>
      );
    case 6:
      return (
        <g fill={color}>
          {[
            [-0.4, -0.4],
            [0.4, -0.4],
            [-0.4, 0.4],
            [0.4, 0.4],
          ].map(([x, y]) => (
            <polygon
              key={`${x}-${y}`}
              points={`0,${-radius * 0.28} ${radius * 0.28},0 0,${radius * 0.28} ${-radius * 0.28},0`}
              transform={`translate(${x * radius} ${y * radius})`}
            />
          ))}
        </g>
      );
    case 7:
      return (
        <g fill={color}>
          {[-0.5, 0, 0.5].flatMap((y) =>
            [-0.5, 0, 0.5].map((x) => (
              <circle
                key={`${x}-${y}`}
                cx={x * radius}
                cy={y * radius}
                r={radius * 0.1}
              />
            )),
          )}
        </g>
      );
    case 8:
      return (
        <g {...outline}>
          <circle r={radius * 0.72} />
          {[-0.45, 0, 0.45].map((offset) => (
            <line
              key={offset}
              x1={-radius * 0.62}
              y1={offset * radius}
              x2={radius * 0.62}
              y2={offset * radius}
            />
          ))}
        </g>
      );
    default:
      return (
        <g {...outline}>
          <line
            x1={-radius * 0.55}
            y1={-radius * 0.55}
            x2={radius * 0.55}
            y2={radius * 0.55}
          />
          <line
            x1={radius * 0.55}
            y1={-radius * 0.55}
            x2={-radius * 0.55}
            y2={radius * 0.55}
          />
        </g>
      );
  }
}

function polygonPointsAttribute(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

export const PatternCanvas = memo(function PatternCanvas({
  document,
  id,
  className,
  tilePreview = false,
  maxObjects = 5000,
  label = '生成した幾何学模様',
  description,
  decorative = false,
  viewport = 'canvas',
  outputWidth,
  outputHeight,
  viewBox,
}: {
  document: EditorDocument;
  id?: string;
  className?: string;
  tilePreview?: boolean;
  maxObjects?: number;
  label?: string;
  description?: string;
  decorative?: boolean;
  viewport?: 'canvas' | 'fundamentalTile';
  outputWidth?: number;
  outputHeight?: number;
  viewBox?: { x: number; y: number; width: number; height: number };
}) {
  const reactId = useId().replaceAll(':', '');
  const seamless = document.canvas.seamless;
  const previewTiling = tilePreview && seamless;
  const repeatMode = document.canvas.repeatMode ?? 'straight';
  const repeatPlan = getRepeatPlan(repeatMode, document.canvas.tileSize);
  const patternWidth = seamless
    ? document.canvas.tileSize
    : document.canvas.width;
  const patternHeight = seamless
    ? document.canvas.tileSize
    : document.canvas.height;
  const viewWidth =
    viewport === 'fundamentalTile' && seamless
      ? repeatPlan.width
      : previewTiling
        ? repeatPlan.width * 3
        : document.canvas.width;
  const viewHeight =
    viewport === 'fundamentalTile' && seamless
      ? repeatPlan.height
      : previewTiling
        ? repeatPlan.height * 3
        : document.canvas.height;
  const effectiveViewBox = viewBox ?? {
    x: 0,
    y: 0,
    width: viewWidth,
    height: viewHeight,
  };
  const visibleLayerCount = Math.max(
    1,
    document.layers.filter((layer) => layer.visible).length,
  );
  const layerLimit = Math.max(1, Math.floor(maxObjects / visibleLayerCount));
  const transformCenterX =
    viewport === 'fundamentalTile' ? viewWidth / 2 : document.canvas.width / 2;
  const transformCenterY =
    viewport === 'fundamentalTile'
      ? viewHeight / 2
      : document.canvas.height / 2;
  const transform = `translate(${transformCenterX} ${transformCenterY}) scale(${document.canvas.flipX ? -1 : 1} ${document.canvas.flipY ? -1 : 1}) translate(${-transformCenterX} ${-transformCenterY})`;
  const visibleLayers = document.layers.filter((layer) => layer.visible);
  const fillBounds = seamless
    ? effectiveViewBox
    : {
        x: 0,
        y: 0,
        width: document.canvas.width,
        height: document.canvas.height,
      };

  return (
    <svg
      id={id}
      className={className}
      viewBox={`${effectiveViewBox.x} ${effectiveViewBox.y} ${effectiveViewBox.width} ${effectiveViewBox.height}`}
      width={outputWidth ?? viewWidth}
      height={outputHeight ?? viewHeight}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      focusable={decorative ? false : undefined}
      aria-labelledby={
        decorative
          ? undefined
          : `title-${reactId}${description ? ` desc-${reactId}` : ''}`
      }
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {!decorative && <title id={`title-${reactId}`}>{label}</title>}
      {!decorative && description && (
        <desc id={`desc-${reactId}`}>{description}</desc>
      )}
      <defs>
        {document.canvas.textSpace && !seamless && (
          <>
            <linearGradient
              id={`space-gradient-${reactId}`}
              gradientUnits="userSpaceOnUse"
              x1={0}
              x2={document.canvas.width}
              y1={0}
              y2={0}
            >
              {textSpaceStops(document.canvas.textSpace).map((stop, index) => (
                <stop key={index} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
            <mask
              id={`text-space-${reactId}`}
              maskUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={document.canvas.width}
              height={document.canvas.height}
              style={{ maskType: 'luminance' }}
            >
              <rect
                width={document.canvas.width}
                height={document.canvas.height}
                fill={`url(#space-gradient-${reactId})`}
              />
            </mask>
          </>
        )}
        {visibleLayers.map((layer) => {
          const patternId = `pattern-${reactId}-${layer.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
          const surfaceTransform = `translate(${layer.offsetX} ${layer.offsetY})`;

          if (layer.type === 'lowPoly') {
            const facets = createLowPolyFacets(
              layer,
              patternWidth,
              patternHeight,
              document.seed,
              layerLimit,
              document.palette.length,
              seamless,
            );
            return (
              <pattern
                key={layer.id}
                id={patternId}
                width={patternWidth}
                height={patternHeight}
                patternUnits="userSpaceOnUse"
                patternTransform={surfaceTransform}
              >
                {facets.map((facet) => {
                  const color =
                    document.palette[
                      facet.colorIndex % document.palette.length
                    ] ?? '#111827';
                  return (
                    <polygon
                      key={facet.key}
                      points={polygonPointsAttribute(facet.points)}
                      fill={layer.config.fillMode === 'stroke' ? 'none' : color}
                      stroke={layer.config.fillMode === 'fill' ? 'none' : color}
                      strokeWidth={layer.config.strokeWidth}
                      strokeLinejoin="round"
                      opacity={facet.opacity}
                    />
                  );
                })}
              </pattern>
            );
          }

          if (layer.type === 'glassShards') {
            const shards = createShardPolygons(
              layer,
              patternWidth,
              patternHeight,
              document.seed,
              layerLimit,
              document.palette.length,
              seamless,
            );
            return (
              <pattern
                key={layer.id}
                id={patternId}
                width={patternWidth}
                height={patternHeight}
                patternUnits="userSpaceOnUse"
                patternTransform={surfaceTransform}
              >
                {shards.map((shard) => {
                  const color =
                    document.palette[
                      shard.colorIndex % document.palette.length
                    ] ?? '#111827';
                  return (
                    <polygon
                      key={shard.key}
                      points={polygonPointsAttribute(shard.points)}
                      fill={layer.config.fillMode === 'stroke' ? 'none' : color}
                      stroke={layer.config.fillMode === 'fill' ? 'none' : color}
                      strokeWidth={layer.config.strokeWidth}
                      strokeLinejoin="round"
                      opacity={shard.opacity}
                    />
                  );
                })}
              </pattern>
            );
          }

          if (layer.type === 'quarterTiles') {
            const tiles = createQuarterCircleTiles(
              layer,
              patternWidth,
              patternHeight,
              document.seed,
              layerLimit,
              document.palette.length,
            );
            return (
              <pattern
                key={layer.id}
                id={patternId}
                width={patternWidth}
                height={patternHeight}
                patternUnits="userSpaceOnUse"
                patternTransform={surfaceTransform}
              >
                {tiles.map((tile) => {
                  const color =
                    document.palette[
                      tile.colorIndex % document.palette.length
                    ] ?? '#111827';
                  const radius = tile.size / 2;
                  return (
                    <path
                      key={tile.key}
                      transform={`translate(${tile.x} ${tile.y}) rotate(${tile.rotation})`}
                      d={`M ${-radius} ${-radius} H ${radius} A ${tile.size} ${tile.size} 0 0 1 ${-radius} ${radius} Z`}
                      fill={layer.config.fillMode === 'stroke' ? 'none' : color}
                      stroke={layer.config.fillMode === 'fill' ? 'none' : color}
                      strokeWidth={layer.config.strokeWidth}
                      strokeLinejoin="round"
                      opacity={tile.opacity}
                    />
                  );
                })}
              </pattern>
            );
          }

          const base = createBaseInstances(
            layer,
            patternWidth,
            patternHeight,
            document.seed,
            layerLimit,
            document.palette.length,
          );
          const offsetInstances = base.map((instance) => ({
            ...instance,
            x: seamless
              ? modulo(instance.x + layer.offsetX, patternWidth)
              : instance.x + layer.offsetX,
            y: seamless
              ? modulo(instance.y + layer.offsetY, patternHeight)
              : instance.y + layer.offsetY,
          }));
          const lineLike =
            ['lines', 'doubleLines'].includes(layer.type) &&
            layer.config.placement === 'stripe';
          const visualSize = lineLike
            ? Math.max(patternWidth, patternHeight) * 1.55
            : layer.type === 'geoCollage'
              ? layer.config.size * 2.6
              : layer.config.size;
          const instances = seamless
            ? addSeamlessCopies(
                offsetInstances,
                layer,
                patternWidth,
                layerLimit,
                visualSize,
              )
            : offsetInstances;
          return (
            <pattern
              key={layer.id}
              id={patternId}
              width={patternWidth}
              height={patternHeight}
              patternUnits="userSpaceOnUse"
            >
              <g>
                {instances.map((instance) => {
                  const color =
                    document.palette[
                      instance.colorIndex % document.palette.length
                    ] ?? '#111827';
                  return (
                    <g
                      key={instance.key}
                      transform={`translate(${instance.x} ${instance.y}) rotate(${instance.rotation + layer.rotation}) scale(${instance.scaleX * layer.scale} ${instance.scaleY * layer.scale})`}
                      opacity={instance.opacity}
                    >
                      {layer.type === 'geoCollage' ? (
                        <CollageShape
                          variant={Math.floor(
                            hashUnit(
                              document.seed,
                              layer.id,
                              Number(instance.key.split(':')[0]) || 0,
                              410,
                            ) * 10,
                          )}
                          size={layer.config.size}
                          color={color}
                          strokeWidth={layer.config.strokeWidth}
                        />
                      ) : (
                        <Shape
                          type={layer.type}
                          size={visualSize}
                          aspectX={layer.config.aspectX}
                          aspectY={layer.config.aspectY}
                          strokeWidth={layer.config.strokeWidth}
                          cornerRadius={layer.config.cornerRadius}
                          fillMode={layer.config.fillMode}
                          color={color}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            </pattern>
          );
        })}
        {seamless &&
          repeatMode !== 'straight' &&
          visibleLayers.map((layer) => {
            const safeLayerId = layer.id.replace(/[^a-zA-Z0-9_-]/g, '');
            const patternId = `pattern-${reactId}-${safeLayerId}`;
            const layoutId = `layout-${reactId}-${safeLayerId}`;
            return (
              <pattern
                key={`layout-${layer.id}`}
                id={layoutId}
                width={repeatPlan.width}
                height={repeatPlan.height}
                patternUnits="userSpaceOnUse"
              >
                {repeatPlan.placements.map((placement) => (
                  <g
                    key={placement.key}
                    transform={`translate(${placement.x} ${placement.y}) scale(${placement.scaleX} ${placement.scaleY})`}
                  >
                    <rect
                      width={patternWidth}
                      height={patternHeight}
                      fill={`url(#${patternId})`}
                    />
                  </g>
                ))}
              </pattern>
            );
          })}
      </defs>
      {!document.canvas.transparent && (
        <rect
          data-export-background="true"
          x={effectiveViewBox.x}
          y={effectiveViewBox.y}
          width={effectiveViewBox.width}
          height={effectiveViewBox.height}
          fill={document.canvas.background}
        />
      )}
      <g
        mask={
          document.canvas.textSpace && !seamless
            ? `url(#text-space-${reactId})`
            : undefined
        }
      >
        <g transform={transform}>
          {visibleLayers.map((layer) => {
            const safeLayerId = layer.id.replace(/[^a-zA-Z0-9_-]/g, '');
            const patternId =
              seamless && repeatMode !== 'straight'
                ? `layout-${reactId}-${safeLayerId}`
                : `pattern-${reactId}-${safeLayerId}`;
            return (
              <rect
                key={layer.id}
                x={fillBounds.x}
                y={fillBounds.y}
                width={fillBounds.width}
                height={fillBounds.height}
                fill={`url(#${patternId})`}
                opacity={layer.opacity}
                style={{ mixBlendMode: layer.blendMode }}
              />
            );
          })}
        </g>
      </g>
      {previewTiling && (
        <g
          aria-hidden="true"
          fill="none"
          stroke="rgba(255,255,255,.68)"
          strokeWidth={Math.max(1, patternWidth / 260)}
          strokeDasharray={`${patternWidth / 36} ${patternWidth / 50}`}
        >
          <path
            d={`M ${repeatPlan.width} 0V${viewHeight}M${repeatPlan.width * 2} 0V${viewHeight}M0 ${repeatPlan.height}H${viewWidth}M0 ${repeatPlan.height * 2}H${viewWidth}`}
          />
          <rect
            x={repeatPlan.width}
            y={repeatPlan.height}
            width={repeatPlan.width}
            height={repeatPlan.height}
            stroke="rgba(255,255,255,.95)"
            strokeWidth={Math.max(2, patternWidth / 150)}
          />
        </g>
      )}
    </svg>
  );
});
