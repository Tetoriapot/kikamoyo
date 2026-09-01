import type { PatternLayer } from '@/lib/pattern-types';
import { clamp } from '@/lib/pattern-layout';
import { hashUnit } from '@/lib/seed';

export interface ProceduralPolygon {
  key: string;
  points: Array<[number, number]>;
  colorIndex: number;
  opacity: number;
}

export interface QuarterCircleTile {
  key: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  colorIndex: number;
  opacity: number;
}

function stableNumber(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function pointKey(row: number, column: number, columns: number) {
  return row * (columns + 1) + column;
}

function polygonBounds(points: Array<[number, number]>) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function translated(points: Array<[number, number]>, x: number, y: number) {
  return points.map(([pointX, pointY]) => [stableNumber(pointX + x), stableNumber(pointY + y)] as [number, number]);
}

function rotatedPolygon(centerX: number, centerY: number, angle: number, local: Array<[number, number]>) {
  const radians = (angle * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return local.map(([x, y]) => [
    stableNumber(centerX + x * cosine - y * sine),
    stableNumber(centerY + x * sine + y * cosine),
  ] as [number, number]);
}

function periodicCopies(polygon: ProceduralPolygon, width: number, height: number, maxPeriod = 3) {
  const bounds = polygonBounds(polygon.points);
  const minX = clamp(Math.ceil(-bounds.maxX / width), -maxPeriod, maxPeriod);
  const maxX = clamp(Math.floor((width - bounds.minX) / width), -maxPeriod, maxPeriod);
  const minY = clamp(Math.ceil(-bounds.maxY / height), -maxPeriod, maxPeriod);
  const maxY = clamp(Math.floor((height - bounds.minY) / height), -maxPeriod, maxPeriod);
  const copies: ProceduralPolygon[] = [];
  for (let offsetY = minY; offsetY <= maxY; offsetY += 1) {
    for (let offsetX = minX; offsetX <= maxX; offsetX += 1) {
      copies.push({
        ...polygon,
        key: `${polygon.key}:${offsetX}:${offsetY}`,
        points: translated(polygon.points, offsetX * width, offsetY * height),
      });
    }
  }
  return copies;
}

export function createLowPolyFacets(
  layer: PatternLayer,
  width: number,
  height: number,
  seed: number,
  maxObjects: number,
  paletteLength: number,
  seamless = false,
) {
  const density = clamp(layer.config.density, 10, 100);
  const targetCell = clamp((layer.config.size * 0.75 + layer.config.gap * 0.2) * (70 / density) * layer.scale, 28, Math.max(width, height));
  let columns = Math.max(1, Math.ceil(width / targetCell));
  let rows = Math.max(1, Math.ceil(height / targetCell));
  const estimated = columns * rows * 2;
  if (estimated > maxObjects) {
    const factor = Math.sqrt(estimated / Math.max(2, maxObjects));
    columns = Math.max(1, Math.floor(columns / factor));
    rows = Math.max(1, Math.floor(rows / factor));
  }

  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const jitterPower = Math.max(layer.config.roughness, layer.config.jitterPosition) / 100;
  const jitterX = cellWidth * 0.36 * jitterPower;
  const jitterY = cellHeight * 0.36 * jitterPower;
  const vertices: Array<Array<[number, number]>> = [];

  for (let row = 0; row <= rows; row += 1) {
    const points: Array<[number, number]> = [];
    for (let column = 0; column <= columns; column += 1) {
      const periodicColumn = column === columns ? 0 : column;
      const periodicRow = row === rows ? 0 : row;
      const key = pointKey(periodicRow, periodicColumn, columns);
      const x = column * cellWidth + (column > 0 && column < columns
        ? (hashUnit(seed, layer.id, key, 101) * 2 - 1) * jitterX
        : 0);
      const y = row * cellHeight + (row > 0 && row < rows
        ? (hashUnit(seed, layer.id, key, 102) * 2 - 1) * jitterY
        : 0);
      points.push([stableNumber(x), stableNumber(y)]);
    }
    vertices.push(points);
  }

  const facets: ProceduralPolygon[] = [];
  const paletteSize = Math.max(1, paletteLength);
  const angle = (layer.rotation * Math.PI) / 180;
  const projectedRange = Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)) || 1;
  const colorPower = Math.max(layer.config.roughness, layer.config.jitterColor) / 100;
  const opacityPower = Math.max(layer.config.roughness, layer.config.jitterOpacity) / 100;

  function facet(points: Array<[number, number]>, key: number, half: number) {
    const centerX = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const centerY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    const normalizedX = centerX / width - 0.5;
    const normalizedY = centerY / height - 0.5;
    const phaseA = hashUnit(seed, layer.id, 0, 140) * Math.PI * 2;
    const phaseB = hashUnit(seed, layer.id, 0, 141) * Math.PI * 2;
    const periodicField = (
      Math.sin(centerX / width * Math.PI * 2 + phaseA)
      + Math.sin(centerY / height * Math.PI * 2 + phaseB)
      + Math.sin((centerX / width + centerY / height) * Math.PI * 2 + phaseA - phaseB)
      + 3
    ) / 6;
    const field = seamless
      ? periodicField
      : 0.5 + (normalizedX * Math.cos(angle) + normalizedY * Math.sin(angle)) / projectedRange;
    const noise = seamless
      ? Math.sin((centerX / width * 2 + centerY / height * 3) * Math.PI * 2 + phaseB) * colorPower * 0.2
      : (hashUnit(seed, layer.id, key, 120 + half) * 2 - 1) * (0.18 + colorPower * 0.42);
    const colorIndex = Math.floor(clamp(field + noise, 0, 0.999999) * paletteSize + layer.colorIndex) % paletteSize;
    const opacity = stableNumber(clamp(1 - hashUnit(seed, layer.id, key, 124 + half) * 0.34 * opacityPower, 0.56, 1));
    facets.push({ key: `${key}:${half}`, points, colorIndex, opacity });
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = vertices[row][column];
      const topRight = vertices[row][column + 1];
      const bottomLeft = vertices[row + 1][column];
      const bottomRight = vertices[row + 1][column + 1];
      const key = row * columns + column;
      const diagonal = hashUnit(seed, layer.id, key, 130) >= 0.5;
      if (diagonal) {
        facet([topLeft, topRight, bottomRight], key, 0);
        facet([topLeft, bottomRight, bottomLeft], key, 1);
      } else {
        facet([topLeft, topRight, bottomLeft], key, 0);
        facet([topRight, bottomRight, bottomLeft], key, 1);
      }
    }
  }
  return facets.slice(0, maxObjects);
}

export function createShardPolygons(
  layer: PatternLayer,
  width: number,
  height: number,
  seed: number,
  maxObjects: number,
  paletteLength: number,
  seamless: boolean,
) {
  const paletteSize = Math.max(1, paletteLength);
  const density = clamp(layer.config.density, 10, 100);
  const desired = Math.max(10, Math.round(density * 1.45));
  const output: ProceduralPolygon[] = [];
  const longestSide = Math.max(width, height);
  const rotationPower = Math.max(layer.config.roughness, layer.config.jitterRotation) / 100;
  const opacityPower = Math.max(layer.config.roughness, layer.config.jitterOpacity) / 100;

  for (let index = 0; index < desired && output.length < maxObjects; index += 1) {
    const centerX = hashUnit(seed, layer.id, index, 201) * width;
    const centerY = hashUnit(seed, layer.id, index, 202) * height;
    const length = clamp(
      longestSide * (0.18 + hashUnit(seed, layer.id, index, 203) * 0.62) * (layer.config.size / 78) * layer.scale,
      20,
      longestSide * 1.8,
    );
    const thickness = clamp(
      length * (0.012 + hashUnit(seed, layer.id, index, 204) * 0.07) * (0.55 + layer.config.gap / 120),
      2,
      longestSide * 0.12,
    );
    const angle = layer.rotation + (hashUnit(seed, layer.id, index, 205) * 2 - 1) * (18 + 162 * rotationPower);
    const triangular = hashUnit(seed, layer.id, index, 206) < 0.34;
    const local = triangular
      ? [[-length / 2, thickness * 0.12], [length / 2, -thickness], [length * 0.34, thickness]] as Array<[number, number]>
      : [[-length / 2, -thickness * 0.45], [length / 2, -thickness], [length / 2, thickness * 0.4], [-length / 2, thickness]] as Array<[number, number]>;
    const polygon: ProceduralPolygon = {
      key: `${index}`,
      points: rotatedPolygon(centerX, centerY, angle, local),
      colorIndex: layer.config.jitterColor > 0
        ? Math.floor(hashUnit(seed, layer.id, index, 207) * paletteSize)
        : (index + layer.colorIndex) % paletteSize,
      opacity: stableNumber(clamp(0.12 + hashUnit(seed, layer.id, index, 208) * (0.24 + opacityPower * 0.28), 0.08, 0.68)),
    };
    const orbit = seamless ? periodicCopies(polygon, width, height) : [polygon];
    if (output.length > 0 && output.length + orbit.length > maxObjects) break;
    output.push(...orbit);
  }
  return output;
}

export function createQuarterCircleTiles(
  layer: PatternLayer,
  width: number,
  height: number,
  seed: number,
  maxObjects: number,
  paletteLength: number,
) {
  const density = clamp(layer.config.density, 10, 100);
  const requestedStep = Math.max(12, layer.config.gap * (68 / density));
  let columns = Math.max(1, Math.ceil(width / requestedStep));
  let rows = Math.max(1, Math.ceil(height / requestedStep));
  const estimated = columns * rows;
  if (estimated > maxObjects) {
    const factor = Math.sqrt(estimated / Math.max(1, maxObjects));
    columns = Math.max(1, Math.floor(columns / factor));
    rows = Math.max(1, Math.floor(rows / factor));
  }
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const paletteSize = Math.max(1, paletteLength);
  const rotationPower = Math.max(layer.config.roughness, layer.config.jitterRotation) / 100;
  const sizeRatio = clamp((layer.config.size / Math.max(1, layer.config.gap)) * layer.scale, 0.22, 1.08);
  const tiles: QuarterCircleTile[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const key = row * columns + column;
      const orderedRotation = ((column + row * 2) % 4) * 90;
      const randomRotation = Math.floor(hashUnit(seed, layer.id, key, 301) * 4) * 90;
      const rotation = layer.rotation + (rotationPower > 0.35 ? randomRotation : orderedRotation);
      tiles.push({
        key: `${key}`,
        x: stableNumber((column + 0.5) * cellWidth),
        y: stableNumber((row + 0.5) * cellHeight),
        size: stableNumber(Math.min(cellWidth, cellHeight) * sizeRatio * 1.01),
        rotation,
        colorIndex: layer.config.jitterColor > 0
          ? Math.floor(hashUnit(seed, layer.id, key, 302) * paletteSize)
          : (key + layer.colorIndex) % paletteSize,
        opacity: stableNumber(clamp(1 - hashUnit(seed, layer.id, key, 303) * 0.35 * (layer.config.jitterOpacity / 100), 0.45, 1)),
      });
    }
  }
  return tiles.slice(0, maxObjects);
}
