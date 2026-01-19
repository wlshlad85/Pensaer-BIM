/**
 * Roof Geometry Builders
 *
 * Three.js geometry generation for various roof types.
 */

import * as THREE from "three";

/**
 * Create flat roof geometry
 */
export function createFlatRoofGeometry(
  width: number,
  depth: number,
  thickness: number = 0.15
): THREE.BufferGeometry {
  return new THREE.BoxGeometry(width, thickness, depth);
}

/**
 * Create gable roof geometry (triangular cross-section)
 */
export function createGableRoofGeometry(
  span: number,
  depth: number,
  slopeRadians: number
): THREE.BufferGeometry {
  // Peak height based on slope angle
  const peakHeight = (span / 2) * Math.tan(slopeRadians);

  const shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0);
  shape.lineTo(span / 2, 0);
  shape.lineTo(0, peakHeight);
  shape.lineTo(-span / 2, 0);

  return new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
}

/**
 * Create hip roof geometry (sloped on all four sides)
 */
export function createHipRoofGeometry(
  width: number,
  depth: number,
  slopeRadians: number
): THREE.BufferGeometry {
  // For hip roof, the ridge runs along the longer dimension
  // Peak height based on slope and shorter dimension
  const shortSide = Math.min(width, depth);
  const longSide = Math.max(width, depth);
  const peakHeight = (shortSide / 2) * Math.tan(slopeRadians);

  // Calculate ridge length (it's shorter than the base by the hip offset on each end)
  const hipOffset = shortSide / 2;
  const ridgeLength = Math.max(0.1, longSide - 2 * hipOffset);

  // Create vertices for hip roof
  const halfW = width / 2;
  const halfD = depth / 2;
  const isWidthLonger = width >= depth;

  // Base vertices (corners)
  const v0 = new THREE.Vector3(-halfW, 0, -halfD); // Back left
  const v1 = new THREE.Vector3(halfW, 0, -halfD); // Back right
  const v2 = new THREE.Vector3(halfW, 0, halfD); // Front right
  const v3 = new THREE.Vector3(-halfW, 0, halfD); // Front left

  // Ridge vertices (at peak)
  let r0: THREE.Vector3, r1: THREE.Vector3;
  if (isWidthLonger) {
    // Ridge runs along X axis (width direction)
    const ridgeHalfLen = ridgeLength / 2;
    r0 = new THREE.Vector3(-ridgeHalfLen, peakHeight, 0);
    r1 = new THREE.Vector3(ridgeHalfLen, peakHeight, 0);
  } else {
    // Ridge runs along Z axis (depth direction)
    const ridgeHalfLen = ridgeLength / 2;
    r0 = new THREE.Vector3(0, peakHeight, -ridgeHalfLen);
    r1 = new THREE.Vector3(0, peakHeight, ridgeHalfLen);
  }

  // Create geometry from vertices
  const geometry = new THREE.BufferGeometry();

  // Define faces as triangles
  const vertices: number[] = [];
  const normals: number[] = [];

  // Helper to add a triangle with computed normal
  function addTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
    const edge1 = new THREE.Vector3().subVectors(b, a);
    const edge2 = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(
      normal.x,
      normal.y,
      normal.z,
      normal.x,
      normal.y,
      normal.z,
      normal.x,
      normal.y,
      normal.z
    );
  }

  if (isWidthLonger) {
    // Back face (triangular hip)
    addTriangle(v0, r0, v1);
    addTriangle(v1, r0, r1);

    // Front face (triangular hip)
    addTriangle(v2, r1, v3);
    addTriangle(v3, r1, r0);

    // Left slope (trapezoid as two triangles)
    addTriangle(v0, v3, r0);

    // Right slope (trapezoid as two triangles)
    addTriangle(v1, r1, v2);

    // Bottom face (optional, for closed geometry)
    addTriangle(v0, v1, v2);
    addTriangle(v0, v2, v3);
  } else {
    // Left face (triangular hip)
    addTriangle(v0, v3, r0);
    addTriangle(r0, v3, r1);

    // Right face (triangular hip)
    addTriangle(v1, r1, v2);
    addTriangle(v1, r0, r1);

    // Back slope
    addTriangle(v0, r0, v1);

    // Front slope
    addTriangle(v2, r1, v3);

    // Bottom face
    addTriangle(v0, v1, v2);
    addTriangle(v0, v2, v3);
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create roof geometry based on type
 */
export function createRoofGeometry(
  roofType: "flat" | "gable" | "hip",
  width: number,
  depth: number,
  slopeRadians: number,
  thickness: number = 0.15
): THREE.BufferGeometry {
  switch (roofType) {
    case "flat":
      return createFlatRoofGeometry(width, depth, thickness);
    case "hip":
      return createHipRoofGeometry(width, depth, slopeRadians);
    case "gable":
    default:
      return createGableRoofGeometry(width, depth, slopeRadians);
  }
}
