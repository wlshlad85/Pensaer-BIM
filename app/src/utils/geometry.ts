/**
 * Pensaer BIM Platform - Geometry Utilities
 *
 * Core geometry functions for 2D BIM operations.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Line {
  start: Point;
  end: Point;
}

// ============================================
// POINT OPERATIONS
// ============================================

export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function addPoints(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function subtractPoints(p1: Point, p2: Point): Point {
  return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function scalePoint(p: Point, scale: number): Point {
  return { x: p.x * scale, y: p.y * scale };
}

// ============================================
// BOUNDS OPERATIONS
// ============================================

export function pointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function boundsContains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function getBoundsCenter(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getBoundsCorners(bounds: Bounds): Point[] {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y },
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    { x: bounds.x, y: bounds.y + bounds.height },
  ];
}

export function mergeBounds(boundsList: Bounds[]): Bounds | null {
  if (boundsList.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of boundsList) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ============================================
// LINE OPERATIONS
// ============================================

export function lineLength(line: Line): number {
  return distance(line.start, line.end);
}

export function lineAngle(line: Line): number {
  return Math.atan2(line.end.y - line.start.y, line.end.x - line.start.x);
}

export function pointOnLine(point: Point, line: Line, tolerance = 5): boolean {
  const d1 = distance(point, line.start);
  const d2 = distance(point, line.end);
  const lineLen = lineLength(line);
  return Math.abs(d1 + d2 - lineLen) < tolerance;
}

export function nearestPointOnLine(point: Point, line: Line): Point {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return line.start;

  let t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    x: line.start.x + t * dx,
    y: line.start.y + t * dy,
  };
}

// ============================================
// TRANSFORMATION
// ============================================

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

// ============================================
// WALL-SPECIFIC
// ============================================

export function getWallEndpoints(
  x: number,
  y: number,
  width: number,
  height: number
): { start: Point; end: Point } {
  // For horizontal walls (width > height), endpoints are left/right
  // For vertical walls (height > width), endpoints are top/bottom
  if (width > height) {
    return {
      start: { x, y: y + height / 2 },
      end: { x: x + width, y: y + height / 2 },
    };
  } else {
    return {
      start: { x: x + width / 2, y },
      end: { x: x + width / 2, y: y + height },
    };
  }
}

export function isHorizontalWall(width: number, height: number): boolean {
  return width > height;
}

// ============================================
// COORDINATE TRANSFORMS
// ============================================

export function screenToCanvas(
  screenPoint: Point,
  pan: Point,
  zoom: number
): Point {
  return {
    x: (screenPoint.x - pan.x) / zoom,
    y: (screenPoint.y - pan.y) / zoom,
  };
}

export function canvasToScreen(
  canvasPoint: Point,
  pan: Point,
  zoom: number
): Point {
  return {
    x: canvasPoint.x * zoom + pan.x,
    y: canvasPoint.y * zoom + pan.y,
  };
}
