/**
 * Wall Geometry Utilities
 *
 * Utilities for wall joint detection and bounding box calculations.
 */

import * as THREE from "three";
import type { Element } from "../../types";
import { getWallEndpoints, distance } from "../geometry";
import { parseThickness } from "./parsers";

/**
 * Wall corner joint information for mitered geometry
 */
export interface WallJoint {
  wallId: string;
  endpoint: "start" | "end";
  connectedWallId: string;
  connectedEndpoint: "start" | "end";
  position: { x: number; y: number };
}

/**
 * Find wall joints by detecting walls that share endpoints within a tolerance
 */
export function findWallJoints(
  walls: Element[],
  scale: number,
  tolerance: number = 0.15 // 15cm tolerance in 3D space
): WallJoint[] {
  const joints: WallJoint[] = [];

  for (let i = 0; i < walls.length; i++) {
    const wall1 = walls[i];
    const endpoints1 = getWallEndpoints(wall1.x, wall1.y, wall1.width, wall1.height);
    const start1 = {
      x: endpoints1.start.x * scale,
      y: endpoints1.start.y * scale,
    };
    const end1 = { x: endpoints1.end.x * scale, y: endpoints1.end.y * scale };

    for (let j = i + 1; j < walls.length; j++) {
      const wall2 = walls[j];
      const endpoints2 = getWallEndpoints(
        wall2.x,
        wall2.y,
        wall2.width,
        wall2.height
      );
      const start2 = {
        x: endpoints2.start.x * scale,
        y: endpoints2.start.y * scale,
      };
      const end2 = { x: endpoints2.end.x * scale, y: endpoints2.end.y * scale };

      // Check all endpoint combinations
      const combinations: Array<{
        p1: { x: number; y: number };
        e1: "start" | "end";
        p2: { x: number; y: number };
        e2: "start" | "end";
      }> = [
        { p1: start1, e1: "start", p2: start2, e2: "start" },
        { p1: start1, e1: "start", p2: end2, e2: "end" },
        { p1: end1, e1: "end", p2: start2, e2: "start" },
        { p1: end1, e1: "end", p2: end2, e2: "end" },
      ];

      for (const combo of combinations) {
        const dist = distance(combo.p1, combo.p2);
        if (dist < tolerance) {
          // Found a joint
          const jointPos = {
            x: (combo.p1.x + combo.p2.x) / 2,
            y: (combo.p1.y + combo.p2.y) / 2,
          };
          joints.push({
            wallId: wall1.id,
            endpoint: combo.e1,
            connectedWallId: wall2.id,
            connectedEndpoint: combo.e2,
            position: jointPos,
          });
          joints.push({
            wallId: wall2.id,
            endpoint: combo.e2,
            connectedWallId: wall1.id,
            connectedEndpoint: combo.e1,
            position: jointPos,
          });
        }
      }
    }
  }

  return joints;
}

/**
 * Get wall bounding box in 3D space (for roof anchoring)
 */
export function getWallsBoundingBox(
  walls: Element[],
  scale: number,
  wallHeight: number,
  offsetX: number,
  offsetZ: number
): { min: THREE.Vector3; max: THREE.Vector3 } | null {
  if (walls.length === 0) return null;

  let minX = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxZ = -Infinity;

  for (const wall of walls) {
    const width2D = wall.width * scale;
    const height2D = wall.height * scale;
    const isHorizontal = width2D >= height2D;
    const parsedThickness = parseThickness(wall.properties.thickness);
    const wallThickness = Math.max(parsedThickness, 0.1);

    if (isHorizontal) {
      const wallLength = Math.max(width2D, 0.15);
      const x1 = wall.x * scale + offsetX;
      const x2 = wall.x * scale + wallLength + offsetX;
      const z1 = wall.y * scale + offsetZ;
      const z2 = wall.y * scale + wallThickness + offsetZ;
      minX = Math.min(minX, x1);
      maxX = Math.max(maxX, x2);
      minZ = Math.min(minZ, z1);
      maxZ = Math.max(maxZ, z2);
    } else {
      const wallLength = Math.max(height2D, 0.15);
      const x1 = wall.x * scale + offsetX;
      const x2 = wall.x * scale + wallThickness + offsetX;
      const z1 = wall.y * scale + offsetZ;
      const z2 = wall.y * scale + wallLength + offsetZ;
      minX = Math.min(minX, x1);
      maxX = Math.max(maxX, x2);
      minZ = Math.min(minZ, z1);
      maxZ = Math.max(maxZ, z2);
    }
  }

  return {
    min: new THREE.Vector3(minX, 0, minZ),
    max: new THREE.Vector3(maxX, wallHeight, maxZ),
  };
}
