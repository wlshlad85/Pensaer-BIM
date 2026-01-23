/**
 * Wall Detection Utilities
 *
 * Functions for detecting walls at points and calculating hosted element positions.
 */

import type { Element } from "../../types";

/**
 * Find a wall at the given point (for placing doors/windows).
 * Returns the wall and position along its length (0-1).
 */
export function findWallAtPoint(
  point: { x: number; y: number },
  elements: Element[],
  hitTolerance = 20
): { wall: Element; positionAlongWall: number } | null {
  const walls = elements.filter((el) => el.type === "wall");

  for (const wall of walls) {
    const isHorizontal = wall.width > wall.height;

    if (isHorizontal) {
      // Horizontal wall - check Y proximity and X within bounds
      const wallCenterY = wall.y + wall.height / 2;
      const isNearY = Math.abs(point.y - wallCenterY) <= hitTolerance;
      const isWithinX =
        point.x >= wall.x - hitTolerance &&
        point.x <= wall.x + wall.width + hitTolerance;

      if (isNearY && isWithinX) {
        const positionAlongWall = Math.max(
          0,
          Math.min(1, (point.x - wall.x) / wall.width)
        );
        return { wall, positionAlongWall };
      }
    } else {
      // Vertical wall - check X proximity and Y within bounds
      const wallCenterX = wall.x + wall.width / 2;
      const isNearX = Math.abs(point.x - wallCenterX) <= hitTolerance;
      const isWithinY =
        point.y >= wall.y - hitTolerance &&
        point.y <= wall.y + wall.height + hitTolerance;

      if (isNearX && isWithinY) {
        const positionAlongWall = Math.max(
          0,
          Math.min(1, (point.y - wall.y) / wall.height)
        );
        return { wall, positionAlongWall };
      }
    }
  }

  return null;
}

/**
 * Calculate door/window position on a wall.
 */
export function calculateHostedElementPosition(
  wall: Element,
  positionAlongWall: number,
  elementWidth: number,
  elementHeight: number
): { x: number; y: number; width: number; height: number } {
  const isHorizontal = wall.width > wall.height;

  if (isHorizontal) {
    // Place on horizontal wall
    const x = wall.x + positionAlongWall * wall.width - elementWidth / 2;
    const y = wall.y + wall.height / 2 - elementHeight / 2;
    return { x, y, width: elementWidth, height: elementHeight };
  } else {
    // Place on vertical wall - swap dimensions
    const x = wall.x + wall.width / 2 - elementHeight / 2;
    const y = wall.y + positionAlongWall * wall.height - elementWidth / 2;
    return { x, y, width: elementHeight, height: elementWidth };
  }
}

/**
 * Get the endpoints of a wall.
 */
export function getWallEndpoints(wall: Element): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const isHorizontal = wall.width > wall.height;

  if (isHorizontal) {
    const centerY = wall.y + wall.height / 2;
    return {
      start: { x: wall.x, y: centerY },
      end: { x: wall.x + wall.width, y: centerY },
    };
  } else {
    const centerX = wall.x + wall.width / 2;
    return {
      start: { x: centerX, y: wall.y },
      end: { x: centerX, y: wall.y + wall.height },
    };
  }
}

/**
 * Find walls that should be joined to a new wall based on endpoint proximity.
 */
export function findWallsToJoin(
  newWall: Element,
  existingWalls: Element[],
  tolerance = 30
): string[] {
  const wallsToJoin: string[] = [];
  const newEndpoints = getWallEndpoints(newWall);

  for (const wall of existingWalls) {
    if (wall.id === newWall.id) continue;

    const endpoints = getWallEndpoints(wall);

    // Check if any endpoint of the new wall is near any endpoint of the existing wall
    const distances = [
      Math.hypot(
        newEndpoints.start.x - endpoints.start.x,
        newEndpoints.start.y - endpoints.start.y
      ),
      Math.hypot(
        newEndpoints.start.x - endpoints.end.x,
        newEndpoints.start.y - endpoints.end.y
      ),
      Math.hypot(
        newEndpoints.end.x - endpoints.start.x,
        newEndpoints.end.y - endpoints.start.y
      ),
      Math.hypot(
        newEndpoints.end.x - endpoints.end.x,
        newEndpoints.end.y - endpoints.end.y
      ),
    ];

    const minDistance = Math.min(...distances);
    if (minDistance <= tolerance) {
      wallsToJoin.push(wall.id);
    }
  }

  return wallsToJoin;
}
