/**
 * Pensaer BIM Platform - Canvas3D Component
 *
 * Three.js powered 3D view matching the prototype exactly.
 * Features: Auto-rotation, view controls, building visualization.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Evaluator, Brush, SUBTRACTION } from "three-bvh-csg";
import { useModelStore, useSelectionStore } from "../../stores";
import { ViewCube } from "./ViewCube";
import { FPSCounter } from "../FPSCounter";
import { useZoomToFit } from "../../hooks/useZoomToFit";
import type { Element } from "../../types";
import { getWallEndpoints, distance } from "../../utils/geometry";

type ViewType = "perspective" | "top" | "front" | "side";

/**
 * Parse wall thickness from property value (e.g., "200mm" → 0.2 meters)
 * Supports mm, cm, m units. Defaults to 0.2m if unparseable.
 */
function parseThickness(value: string | number | boolean | undefined): number {
  if (typeof value === "number") return value / 1000; // Assume mm
  if (typeof value !== "string") return 0.2; // Default 200mm

  const match = value.match(/^([\d.]+)\s*(mm|cm|m)?$/i);
  if (!match) return 0.2;

  const num = parseFloat(match[1]);
  const unit = (match[2] || "mm").toLowerCase();

  switch (unit) {
    case "m":
      return num;
    case "cm":
      return num / 100;
    case "mm":
    default:
      return num / 1000;
  }
}
/**
 * Roof type enumeration for geometry generation
 */
type RoofType = "flat" | "gable" | "hip";

/**
 * Parse roof type from element properties
 * Supports: "flat", "gable", "hip" (defaults to "gable")
 */
function parseRoofType(properties: Record<string, string | number | boolean>): RoofType {
  const roofType = properties.roof_type || properties.type;
  if (typeof roofType === "string") {
    const normalized = roofType.toLowerCase().trim();
    if (normalized === "flat") return "flat";
    if (normalized === "hip" || normalized === "hipped") return "hip";
    if (normalized === "gable" || normalized === "pitched") return "gable";
  }
  return "gable"; // Default to gable roof
}

/**
 * Parse slope from properties (supports degrees or ratio format)
 * - "30" or 30 → 30 degrees
 * - "4:12" → approximately 18.4 degrees
 * - "slope_degrees: 45" → 45 degrees
 * Returns slope in radians
 */
function parseRoofSlope(properties: Record<string, string | number | boolean>): number {
  // Check for slope_degrees first (from MCP)
  if (typeof properties.slope_degrees === "number") {
    return (properties.slope_degrees * Math.PI) / 180;
  }
  if (typeof properties.slope_degrees === "string") {
    const degrees = parseFloat(properties.slope_degrees);
    if (!isNaN(degrees)) return (degrees * Math.PI) / 180;
  }

  // Check for slope in ratio format (e.g., "4:12")
  const slope = properties.slope;
  if (typeof slope === "string") {
    const ratioMatch = slope.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    if (ratioMatch) {
      const rise = parseFloat(ratioMatch[1]);
      const run = parseFloat(ratioMatch[2]);
      return Math.atan(rise / run);
    }
    // Try parsing as degrees
    const degrees = parseFloat(slope);
    if (!isNaN(degrees)) return (degrees * Math.PI) / 180;
  }

  // Default to ~30 degrees (common roof pitch)
  return Math.PI / 6;
}

/**
 * Create flat roof geometry
 */
function createFlatRoofGeometry(
  width: number,
  depth: number,
  thickness: number = 0.15
): THREE.BufferGeometry {
  return new THREE.BoxGeometry(width, thickness, depth);
}

/**
 * Create gable roof geometry (triangular cross-section)
 */
function createGableRoofGeometry(
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
function createHipRoofGeometry(
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
  const v1 = new THREE.Vector3(halfW, 0, -halfD);  // Back right
  const v2 = new THREE.Vector3(halfW, 0, halfD);   // Front right
  const v3 = new THREE.Vector3(-halfW, 0, halfD);  // Front left

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
    normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
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

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Wall corner joint information for mitered geometry
 */
interface WallJoint {
  wallId: string;
  endpoint: "start" | "end";
  connectedWallId: string;
  connectedEndpoint: "start" | "end";
  position: { x: number; y: number };
}

/**
 * Find wall joints by detecting walls that share endpoints within a tolerance
 */
function findWallJoints(
  walls: Element[],
  scale: number,
  tolerance: number = 0.15  // 15cm tolerance in 3D space
): WallJoint[] {
  const joints: WallJoint[] = [];

  for (let i = 0; i < walls.length; i++) {
    const wall1 = walls[i];
    const endpoints1 = getWallEndpoints(wall1.x, wall1.y, wall1.width, wall1.height);
    const start1 = { x: endpoints1.start.x * scale, y: endpoints1.start.y * scale };
    const end1 = { x: endpoints1.end.x * scale, y: endpoints1.end.y * scale };

    for (let j = i + 1; j < walls.length; j++) {
      const wall2 = walls[j];
      const endpoints2 = getWallEndpoints(wall2.x, wall2.y, wall2.width, wall2.height);
      const start2 = { x: endpoints2.start.x * scale, y: endpoints2.start.y * scale };
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
function getWallsBoundingBox(
  walls: Element[],
  scale: number,
  wallHeight: number,
  offsetX: number,
  offsetZ: number
): { min: THREE.Vector3; max: THREE.Vector3 } | null {
  if (walls.length === 0) return null;

  let minX = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxZ = -Infinity;

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

// Camera presets matching prototype
const CAMERA_PRESETS: Record<
  ViewType,
  { position: [number, number, number]; lookAt: [number, number, number] }
> = {
  perspective: { position: [8, 6, 8], lookAt: [0, 1, 0] },
  top: { position: [0, 12, 0], lookAt: [0, 0, 0] },
  front: { position: [0, 3, 12], lookAt: [0, 1, 0] },
  side: { position: [12, 3, 0], lookAt: [0, 1, 0] },
};

export function Canvas3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);

  const [isRotating, setIsRotating] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  // Section plane state
  const [sectionEnabled, setSectionEnabled] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<"x" | "y" | "z">("x");
  const [sectionPosition, setSectionPosition] = useState(0);
  const clippingPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
  const sectionHelperRef = useRef<THREE.PlaneHelper | null>(null);

  const elements = useModelStore((s) => s.elements);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);
  const addToSelection = useSelectionStore((s) => s.addToSelection);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);

  // Zoom to Fit — F key, toolbar button, and programmatic event
  const zoomToFit = useZoomToFit({
    camera: cameraRef.current,
    controls: controlsRef.current,
    elements,
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(...CAMERA_PRESETS.perspective.position);
    camera.lookAt(...CAMERA_PRESETS.perspective.lookAt);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true; // Enable clipping planes
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent going below ground
    controls.target.set(0, 1, 0);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Accent lights for atmosphere
    const blueLight = new THREE.PointLight(0x3b82f6, 0.3, 20);
    blueLight.position.set(-5, 5, 5);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 0.2, 20);
    purpleLight.position.set(5, 3, -5);
    scene.add(purpleLight);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x16213e,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x3b82f6, 0x1e3a5f);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth === 0 || newHeight === 0) return; // Skip if not laid out
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Use ResizeObserver to handle initial layout and container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Force initial resize after a short delay to ensure layout is complete
    requestAnimationFrame(() => {
      handleResize();
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Build 3D model from elements
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing meshes
    meshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    meshesRef.current = [];

    // Create building group
    const buildingGroup = new THREE.Group();
    buildingGroup.name = "building";

    // Color palette
    const colors = {
      wall: 0x94a3b8,
      wallSelected: 0x3b82f6,
      door: 0xfbbf24,
      doorSelected: 0xf59e0b,
      window: 0x38bdf8,
      windowSelected: 0x0ea5e9,
      room: 0x3b82f6,
      roof: 0xf97316,
      roofSelected: 0xea580c,
      floor: 0xcbd5e1,
      floorSelected: 0x3b82f6,
    };

    // Scale factor: 1 unit in 2D = 0.01 units in 3D
    const scale = 0.01;
    const wallHeight = 3;

    // Offset to center the building
    const offsetX = -3;
    const offsetZ = -2.5;

    // Helper to find openings (doors/windows) hosted by a wall
    const getOpeningsForWall = (wallId: string): Element[] => {
      return elements.filter(
        (el) =>
          (el.type === "door" || el.type === "window") &&
          el.relationships.hostedBy === wallId
      );
    };

    // CSG evaluator for boolean operations
    const csgEvaluator = new Evaluator();

    // Get all walls for joint detection
    const walls = elements.filter((el) => el.type === "wall");

    // Find wall joints for mitered corners
    const wallJoints = findWallJoints(walls, scale);

    // Build walls with openings cut out using CSG and mitered corners
    walls.forEach((wall) => {
      const isSelected = selectedIds.includes(wall.id);
      const width2D = wall.width * scale;
      const height2D = wall.height * scale;

      // Determine wall orientation and dimensions
      const isHorizontal = width2D >= height2D;
      const baseWallLength = isHorizontal ? Math.max(width2D, 0.15) : Math.max(height2D, 0.15);

      // Parse wall thickness from properties
      const parsedThickness = parseThickness(wall.properties.thickness);
      const wallThickness = Math.max(parsedThickness, 0.1);

      // Find joints for this wall to calculate extensions for mitered corners
      const wallJointsForThisWall = wallJoints.filter((j) => j.wallId === wall.id);

      // Calculate extension amounts for each endpoint to create mitered corners
      let startExtension = 0;
      let endExtension = 0;

      wallJointsForThisWall.forEach((joint) => {
        const connectedWall = walls.find((w) => w.id === joint.connectedWallId);
        if (!connectedWall) return;

        const connectedWidth2D = connectedWall.width * scale;
        const connectedHeight2D = connectedWall.height * scale;
        const connectedIsHorizontal = connectedWidth2D >= connectedHeight2D;

        // Only extend if walls are perpendicular (one horizontal, one vertical)
        if (isHorizontal !== connectedIsHorizontal) {
          const connectedThickness = Math.max(
            parseThickness(connectedWall.properties.thickness),
            0.1
          );
          // Extend by half the connected wall's thickness for a proper miter
          const extensionAmount = connectedThickness / 2;

          if (joint.endpoint === "start") {
            startExtension = Math.max(startExtension, extensionAmount);
          } else {
            endExtension = Math.max(endExtension, extensionAmount);
          }
        }
      });

      // Total wall length including extensions for mitered corners
      const wallLength = baseWallLength + startExtension + endExtension;

      // Create wall geometry using BoxGeometry for CSG compatibility
      const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);

      // Create CSG brush from wall
      let wallBrush = new Brush(wallGeometry);
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: isSelected ? colors.wallSelected : colors.wall,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      wallBrush.material = wallMaterial;

      // Get openings for this wall
      const openings = getOpeningsForWall(wall.id);

      // Subtract each opening from the wall using CSG
      // CSG is performed in wall's local coordinate system BEFORE rotation
      // Wall geometry always extends along X axis, so openings are positioned along X
      wallBrush.updateMatrixWorld();

      openings.forEach((opening) => {
        // CRITICAL FIX (MUL-32, MUL-33): Opening width depends on wall orientation
        // For horizontal walls: opening.width is the dimension along the wall
        // For vertical walls: opening.height is the dimension along the wall
        const openingWidthAlongWall = isHorizontal
          ? opening.width * scale
          : opening.height * scale;

        let openingHeight3D: number;
        let openingY: number; // Y position of opening center (from floor)

        if (opening.type === "door") {
          openingHeight3D = 2.1; // Standard door height
          openingY = openingHeight3D / 2; // Door bottom at floor level
        } else {
          // Window
          openingHeight3D = 1.2; // Standard window height
          openingY = 1.5; // Window center at 1.5m (sill at ~0.9m)
        }

        // Create opening box geometry (larger than wall thickness for clean cut)
        const openingGeometry = new THREE.BoxGeometry(
          Math.max(openingWidthAlongWall, 0.3),
          openingHeight3D,
          wallThickness + 0.2 // Extra thickness ensures complete cut-through
        );

        const openingBrush = new Brush(openingGeometry);

        // Calculate opening position in wall's LOCAL coordinate system
        // Wall is centered at origin, extends along X (length), Y (height), Z (thickness)
        // Rotation to final orientation happens AFTER CSG
        const wallStartX = wall.x * scale;
        const wallStartZ = wall.y * scale;
        const openingStartX = opening.x * scale;
        const openingStartZ = opening.y * scale;

        // Calculate offset along wall's local X axis
        // For horizontal walls: 2D X maps to local X
        // For vertical walls: 2D Y maps to local X (rotation happens after CSG)
        let openingOffsetAlongWall: number;
        if (isHorizontal) {
          openingOffsetAlongWall = (openingStartX - wallStartX) + openingWidthAlongWall / 2 - baseWallLength / 2;
        } else {
          // Vertical wall: 2D Y coordinate maps to wall length (local X)
          openingOffsetAlongWall = (openingStartZ - wallStartZ) + openingWidthAlongWall / 2 - baseWallLength / 2;
        }

        // Position opening in wall's local space (always along X axis)
        openingBrush.position.set(
          openingOffsetAlongWall,
          openingY - wallHeight / 2, // Convert floor-relative to wall-center-relative
          0 // Centered on wall thickness
        );
        openingBrush.updateMatrixWorld();

        // Perform CSG subtraction to cut the opening
        try {
          const resultBrush = csgEvaluator.evaluate(wallBrush, openingBrush, SUBTRACTION);
          if (resultBrush && resultBrush.geometry) {
            wallBrush.geometry.dispose();
            wallBrush = resultBrush;
            wallBrush.updateMatrixWorld();
          }
        } catch (e) {
          console.warn('CSG subtraction failed for opening:', opening.id, e);
        }
      });

      // Convert final brush to mesh (clone geometry so brush can be disposed)
      const mesh = new THREE.Mesh(wallBrush.geometry.clone(), wallMaterial);
      mesh.name = wall.id;
      mesh.userData = { element: wall };

      // Position the wall (accounting for extensions)
      const thicknessOffset = wallThickness / 2;

      if (isHorizontal) {
        // Horizontal wall - shift position to account for start extension
        mesh.position.set(
          wall.x * scale + baseWallLength / 2 + offsetX - startExtension + (startExtension + endExtension) / 2,
          wallHeight / 2,
          wall.y * scale + thicknessOffset + offsetZ,
        );
      } else {
        // Vertical wall - rotate 90 degrees, shift position for start extension
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(
          wall.x * scale + thicknessOffset + offsetX,
          wallHeight / 2,
          wall.y * scale + baseWallLength / 2 + offsetZ - startExtension + (startExtension + endExtension) / 2,
        );
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      buildingGroup.add(mesh);
      meshesRef.current.push(mesh);

      // Clean up brush geometry
      wallBrush.geometry.dispose();
    });

    // Add corner fill pieces for proper L-joint appearance
    // This creates the solid corner blocks where perpendicular walls meet
    const processedCorners = new Set<string>();
    wallJoints.forEach((joint) => {
      // Create unique key for this corner (to avoid duplicates)
      const cornerKey = [joint.wallId, joint.connectedWallId].sort().join("-");
      if (processedCorners.has(cornerKey)) return;
      processedCorners.add(cornerKey);

      const wall1 = walls.find((w) => w.id === joint.wallId);
      const wall2 = walls.find((w) => w.id === joint.connectedWallId);
      if (!wall1 || !wall2) return;

      const width1 = wall1.width * scale;
      const height1 = wall1.height * scale;
      const width2 = wall2.width * scale;
      const height2 = wall2.height * scale;
      const isHorizontal1 = width1 >= height1;
      const isHorizontal2 = width2 >= height2;

      // Only create corner fill for perpendicular walls
      if (isHorizontal1 === isHorizontal2) return;

      const thickness1 = Math.max(parseThickness(wall1.properties.thickness), 0.1);
      const thickness2 = Math.max(parseThickness(wall2.properties.thickness), 0.1);

      // Identify which wall is horizontal and which is vertical
      const horizWall = isHorizontal1 ? wall1 : wall2;
      const vertWall = isHorizontal1 ? wall2 : wall1;
      const horizThickness = isHorizontal1 ? thickness1 : thickness2;
      const vertThickness = isHorizontal1 ? thickness2 : thickness1;
      const horizJointEndpoint = isHorizontal1 ? joint.endpoint : joint.connectedEndpoint;
      const vertJointEndpoint = isHorizontal1 ? joint.connectedEndpoint : joint.endpoint;

      // Calculate actual 3D corner position based on wall geometry
      // Horizontal wall: positioned at (wall.x, wall.y) in 2D, extends along X
      // Vertical wall: positioned at (wall.x, wall.y) in 2D, extends along Z

      // Determine the corner X position from horizontal wall endpoint
      let cornerX: number;
      const horizLength = Math.max(horizWall.width * scale, 0.15);
      if (horizJointEndpoint === "start") {
        cornerX = horizWall.x * scale + offsetX;
      } else {
        cornerX = horizWall.x * scale + horizLength + offsetX;
      }

      // Determine the corner Z position from vertical wall endpoint
      let cornerZ: number;
      const vertLength = Math.max(vertWall.height * scale, 0.15);
      if (vertJointEndpoint === "start") {
        cornerZ = vertWall.y * scale + offsetZ;
      } else {
        cornerZ = vertWall.y * scale + vertLength + offsetZ;
      }

      // Create a corner fill block sized to fill the gap
      const cornerGeometry = new THREE.BoxGeometry(vertThickness, wallHeight, horizThickness);
      const cornerMaterial = new THREE.MeshStandardMaterial({
        color: colors.wall,
        roughness: 0.7,
        metalness: 0.1,
      });
      const cornerMesh = new THREE.Mesh(cornerGeometry, cornerMaterial);

      // Position at the actual corner, offset by half thickness to center the block
      // The corner X needs adjustment based on which end of horizontal wall
      // The corner Z needs adjustment based on horizontal wall's thickness position
      const cornerXAdjust = horizJointEndpoint === "start" ? vertThickness / 2 : -vertThickness / 2;
      const cornerZAdjust = horizThickness / 2; // Horizontal wall Z offset

      cornerMesh.position.set(
        cornerX + cornerXAdjust,
        wallHeight / 2,
        cornerZ + cornerZAdjust,
      );

      cornerMesh.castShadow = true;
      cornerMesh.receiveShadow = true;
      buildingGroup.add(cornerMesh);
      meshesRef.current.push(cornerMesh);
    });

    // Build door panels (the actual door inside the opening)
    elements
      .filter((el) => el.type === "door")
      .forEach((door) => {
        const isSelected = selectedIds.includes(door.id);
        const hostWall = elements.find((el) => el.id === door.relationships.hostedBy);

        // Determine wall orientation for door positioning
        const isHostHorizontal = hostWall
          ? hostWall.width * scale >= hostWall.height * scale
          : true;

        // FIX (MUL-32): Door width depends on wall orientation
        // For horizontal walls: door.width is the dimension along the wall
        // For vertical walls: door.height is the dimension along the wall
        const doorWidthAlongWall = isHostHorizontal
          ? door.width * scale
          : door.height * scale;
        const doorHeight3D = 2.0; // Slightly shorter than opening

        // Parse wall thickness for door depth positioning
        const wallThickness = hostWall
          ? Math.max(parseThickness(hostWall.properties.thickness), 0.1)
          : 0.2;

        // Door panel geometry (thin panel)
        const geometry = new THREE.BoxGeometry(
          Math.max(doorWidthAlongWall, 0.3),
          doorHeight3D,
          0.05
        );
        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.doorSelected : colors.door,
          roughness: 0.5,
          metalness: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = door.id;
        mesh.userData = { element: door };

        if (isHostHorizontal) {
          mesh.position.set(
            door.x * scale + doorWidthAlongWall / 2 + offsetX,
            doorHeight3D / 2,
            door.y * scale + wallThickness / 2 + offsetZ,
          );
        } else {
          mesh.rotation.y = Math.PI / 2;
          mesh.position.set(
            door.x * scale + wallThickness / 2 + offsetX,
            doorHeight3D / 2,
            door.y * scale + doorWidthAlongWall / 2 + offsetZ,
          );
        }

        mesh.castShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build window frames and glazing (inside the opening)
    elements
      .filter((el) => el.type === "window")
      .forEach((window) => {
        const isSelected = selectedIds.includes(window.id);
        const hostWall = elements.find((el) => el.id === window.relationships.hostedBy);

        // Determine wall orientation
        const isHostHorizontal = hostWall
          ? hostWall.width * scale >= hostWall.height * scale
          : true;

        // FIX (MUL-33): Window width depends on wall orientation
        // For horizontal walls: window.width is the dimension along the wall
        // For vertical walls: window.height is the dimension along the wall
        const windowWidthAlongWall = isHostHorizontal
          ? window.width * scale
          : window.height * scale;
        const windowHeight3D = 1.1; // Slightly smaller than opening

        // Parse wall thickness
        const wallThickness = hostWall
          ? Math.max(parseThickness(hostWall.properties.thickness), 0.1)
          : 0.2;

        // Window frame (outer rectangle)
        const frameThickness = 0.03;
        const frameMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.1,
        });

        // Glass pane
        const glassMaterial = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.windowSelected : colors.window,
          roughness: 0.1,
          metalness: 0.3,
          transparent: true,
          opacity: 0.4,
        });

        const glassGeometry = new THREE.BoxGeometry(
          Math.max(windowWidthAlongWall - 0.06, 0.2),
          windowHeight3D - 0.06,
          0.02
        );
        const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
        glassMesh.name = window.id;
        glassMesh.userData = { element: window };

        // Create frame using thin boxes
        const frameGroup = new THREE.Group();

        // Top frame
        const topFrame = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(windowWidthAlongWall, 0.3), frameThickness, frameThickness),
          frameMaterial
        );
        topFrame.position.y = windowHeight3D / 2 - frameThickness / 2;

        // Bottom frame
        const bottomFrame = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(windowWidthAlongWall, 0.3), frameThickness, frameThickness),
          frameMaterial
        );
        bottomFrame.position.y = -windowHeight3D / 2 + frameThickness / 2;

        // Left frame
        const leftFrame = new THREE.Mesh(
          new THREE.BoxGeometry(frameThickness, windowHeight3D, frameThickness),
          frameMaterial
        );
        leftFrame.position.x = -windowWidthAlongWall / 2 + frameThickness / 2;

        // Right frame
        const rightFrame = new THREE.Mesh(
          new THREE.BoxGeometry(frameThickness, windowHeight3D, frameThickness),
          frameMaterial
        );
        rightFrame.position.x = windowWidthAlongWall / 2 - frameThickness / 2;

        // Center mullion (vertical divider)
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(frameThickness / 2, windowHeight3D - frameThickness * 2, frameThickness),
          frameMaterial
        );

        frameGroup.add(topFrame, bottomFrame, leftFrame, rightFrame, mullion, glassMesh);

        if (isHostHorizontal) {
          frameGroup.position.set(
            window.x * scale + windowWidthAlongWall / 2 + offsetX,
            1.5,
            window.y * scale + wallThickness / 2 + offsetZ,
          );
        } else {
          frameGroup.rotation.y = Math.PI / 2;
          frameGroup.position.set(
            window.x * scale + wallThickness / 2 + offsetX,
            1.5,
            window.y * scale + windowWidthAlongWall / 2 + offsetZ,
          );
        }

        buildingGroup.add(frameGroup);
        // Store the glass mesh for selection
        meshesRef.current.push(glassMesh);
      });

    // Build room floors (transparent)
    elements
      .filter((el) => el.type === "room")
      .forEach((room) => {
        const width = room.width * scale;
        const depth = room.height * scale;

        const geometry = new THREE.PlaneGeometry(width, depth);
        const material = new THREE.MeshStandardMaterial({
          color: colors.room,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = room.id;
        mesh.userData = { element: room };
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(
          room.x * scale + width / 2 + offsetX,
          0.05,
          room.y * scale + depth / 2 + offsetZ,
        );
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build floor slabs with proper thickness
    elements
      .filter((el) => el.type === "floor")
      .forEach((floor) => {
        const isSelected = selectedIds.includes(floor.id);
        const width = floor.width * scale;
        const depth = floor.height * scale;

        // Parse floor thickness from properties (default 150mm for typical slab)
        const parsedThickness = parseThickness(floor.properties.thickness);
        const slabThickness = Math.max(parsedThickness, 0.1); // Min 100mm

        // Parse elevation from properties (default to ground level)
        const elevation = typeof floor.properties.elevation === "number"
          ? floor.properties.elevation / 1000 // Convert mm to meters
          : 0;

        // Use BoxGeometry for floor slab
        const geometry = new THREE.BoxGeometry(
          Math.max(width, 0.5),
          slabThickness,
          Math.max(depth, 0.5),
        );

        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.floorSelected : colors.floor,
          roughness: 0.8,
          metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = floor.id;
        mesh.userData = { element: floor };

        // Position: center of slab, with bottom at elevation (top visible above ground)
        mesh.position.set(
          floor.x * scale + width / 2 + offsetX,
          elevation + slabThickness / 2,
          floor.y * scale + depth / 2 + offsetZ,
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build roof - anchored to wall tops (MUL-20 fix)
    // Calculate wall bounding box for proper roof positioning
    const wallsBoundingBox = getWallsBoundingBox(walls, scale, wallHeight, offsetX, offsetZ);

    elements
      .filter((el) => el.type === "roof")
      .forEach((roof) => {
        const isSelected = selectedIds.includes(roof.id);

        // Determine roof dimensions and position based on walls for proper anchoring
        let roofSpan: number;
        let roofDepth: number;
        let roofCenterX: number;
        let roofCenterZ: number;

        if (wallsBoundingBox) {
          // Anchor roof to wall bounding box for proper placement
          const wallsWidth = wallsBoundingBox.max.x - wallsBoundingBox.min.x;
          const wallsDepth = wallsBoundingBox.max.z - wallsBoundingBox.min.z;

          // Add small overhang (0.15m on each side) for realistic roof appearance
          const overhang = 0.15;

          // FIX (MUL-27, MUL-28, MUL-29, MUL-30): Correct roof dimension assignment
          // After gable geometry rotation (-PI/2 around Y):
          // - roofSpan (triangle width) aligns with World Z
          // - roofDepth (extrusion/ridge length) aligns with World X
          // For our building (longer along X), we need:
          // - roofDepth = larger dimension (ridge runs along X)
          // - roofSpan = smaller dimension (triangle spans Z)
          roofDepth = Math.max(wallsWidth, wallsDepth) + overhang * 2;  // Ridge length
          roofSpan = Math.min(wallsWidth, wallsDepth) + overhang * 2;   // Triangle width

          // Center roof over walls
          roofCenterX = (wallsBoundingBox.min.x + wallsBoundingBox.max.x) / 2;
          roofCenterZ = (wallsBoundingBox.min.z + wallsBoundingBox.max.z) / 2;
        } else {
          // Fallback to element dimensions if no walls exist
          roofSpan = Math.max(roof.width, roof.height) * scale;
          roofDepth = Math.min(roof.width, roof.height) * scale;
          roofCenterX = roof.x * scale + roofDepth / 2 + offsetX;
          roofCenterZ = roof.y * scale + roofSpan / 2 + offsetZ;
        }

        // Ensure minimum dimensions for visibility
        const minSpan = Math.max(roofSpan, 2);
        const minDepth = Math.max(roofDepth, 2);

        // Parse roof type and slope from properties (MUL-7)
        const roofType = parseRoofType(roof.properties);
        const slopeRadians = parseRoofSlope(roof.properties);

        // Create geometry based on roof type
        let geometry: THREE.BufferGeometry;
        let needsRotation = true; // Most roof types need -PI/2 rotation for proper orientation

        switch (roofType) {
          case "flat":
            geometry = createFlatRoofGeometry(minSpan, minDepth, 0.15);
            needsRotation = false; // Flat roof is symmetric, no rotation needed
            break;
          case "hip":
            geometry = createHipRoofGeometry(minSpan, minDepth, slopeRadians);
            needsRotation = false; // Hip roof geometry is already in world coordinates
            break;
          case "gable":
          default:
            geometry = createGableRoofGeometry(minSpan, minDepth, slopeRadians);
            break;
        }

        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.roofSelected : colors.roof,
          roughness: 0.6,
          metalness: 0.2,
          side: roofType === "hip" ? THREE.DoubleSide : THREE.FrontSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = roof.id;
        mesh.userData = { element: roof };

        // Position roof anchored to wall tops
        if (needsRotation) {
          // For gable: After rotation.y = -PI/2, geometry's local X becomes world Z
          mesh.rotation.y = -Math.PI / 2;
          mesh.position.set(
            roofCenterX + minDepth / 2, // Center the extrusion over the building
            wallHeight, // Base of roof sits directly on wall tops
            roofCenterZ,
          );
        } else {
          // For flat and hip roofs, geometry is already centered
          mesh.position.set(
            roofCenterX,
            roofType === "flat" ? wallHeight + 0.075 : wallHeight, // Flat roof slightly above walls
            roofCenterZ,
          );
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Add default roof anchored to walls if none exists
    if (!elements.some((el) => el.type === "roof")) {
      let roofMesh: THREE.Mesh;

      if (wallsBoundingBox) {
        // Create default gable roof sized to fit over walls
        const wallsWidth = wallsBoundingBox.max.x - wallsBoundingBox.min.x;
        const wallsDepth = wallsBoundingBox.max.z - wallsBoundingBox.min.z;
        const overhang = 0.15;
        // FIX: Correct dimension assignment (same as explicit roof handling above)
        const defaultRoofDepth = Math.max(wallsWidth, wallsDepth) + overhang * 2;  // Ridge length
        const defaultRoofSpan = Math.min(wallsWidth, wallsDepth) + overhang * 2;   // Triangle width
        const defaultSlope = Math.PI / 6; // 30 degrees default

        // Use the gable roof helper for consistency
        const geometry = createGableRoofGeometry(defaultRoofSpan, defaultRoofDepth, defaultSlope);
        const material = new THREE.MeshStandardMaterial({
          color: colors.roof,
          roughness: 0.6,
          metalness: 0.2,
        });
        roofMesh = new THREE.Mesh(geometry, material);
        roofMesh.rotation.y = -Math.PI / 2;
        // Center the extrusion over the building (offset by +depth/2 for proper centering)
        roofMesh.position.set(
          (wallsBoundingBox.min.x + wallsBoundingBox.max.x) / 2 + defaultRoofDepth / 2,
          wallHeight,
          (wallsBoundingBox.min.z + wallsBoundingBox.max.z) / 2,
        );
      } else {
        // Fallback: simple flat roof at origin when no walls exist
        const geometry = createFlatRoofGeometry(4, 4, 0.15);
        const material = new THREE.MeshStandardMaterial({
          color: colors.roof,
          roughness: 0.6,
          metalness: 0.2,
        });
        roofMesh = new THREE.Mesh(geometry, material);
        roofMesh.position.set(0, wallHeight + 0.075, 0);
      }

      roofMesh.castShadow = true;
      buildingGroup.add(roofMesh);
      meshesRef.current.push(roofMesh);
    }

    scene.add(buildingGroup);
  }, [elements, selectedIds]);

  // Update OrbitControls auto-rotate setting
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isRotating && currentView === "perspective";
      controlsRef.current.autoRotateSpeed = 1.0;
    }
  }, [isRotating, currentView]);

  // Update section plane
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Update clipping plane normal based on axis
    const normals: Record<string, THREE.Vector3> = {
      x: new THREE.Vector3(-1, 0, 0),
      y: new THREE.Vector3(0, -1, 0),
      z: new THREE.Vector3(0, 0, -1),
    };
    clippingPlaneRef.current.normal.copy(normals[sectionAxis]);
    clippingPlaneRef.current.constant = sectionPosition;

    // Update or create section helper
    if (sectionEnabled) {
      if (sectionHelperRef.current) {
        scene.remove(sectionHelperRef.current);
        sectionHelperRef.current.dispose();
      }
      const helper = new THREE.PlaneHelper(clippingPlaneRef.current, 15, 0x00ff88);
      helper.name = "sectionHelper";
      scene.add(helper);
      sectionHelperRef.current = helper;
    } else if (sectionHelperRef.current) {
      scene.remove(sectionHelperRef.current);
      sectionHelperRef.current.dispose();
      sectionHelperRef.current = null;
    }

    // Update clipping on all meshes
    meshesRef.current.forEach((mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.clippingPlanes = sectionEnabled ? [clippingPlaneRef.current] : [];
          mat.clipShadows = true;
          mat.needsUpdate = true;
        }
      });
    });
  }, [sectionEnabled, sectionAxis, sectionPosition]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (sceneRef.current && cameraRef.current && rendererRef.current && controlsRef.current) {
        // Update controls (handles damping and auto-rotate)
        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Change camera view
  const changeView = useCallback((view: ViewType) => {
    setCurrentView(view);
    if (cameraRef.current && controlsRef.current) {
      const preset = CAMERA_PRESETS[view];
      cameraRef.current.position.set(...preset.position);
      controlsRef.current.target.set(...preset.lookAt);
      controlsRef.current.update();
    }
  }, []);

  // Handle ViewCube face click
  const handleViewCubeClick = useCallback(
    (view: "top" | "front" | "right" | "back" | "left" | "bottom") => {
      if (!cameraRef.current || !controlsRef.current) return;

      const distance = 12;
      const target = new THREE.Vector3(0, 1, 0);

      // Map ViewCube face to camera position
      const positions: Record<string, [number, number, number]> = {
        top: [0, distance, 0.01], // Slight offset to avoid gimbal lock
        bottom: [0, -distance, 0.01],
        front: [0, 1, distance],
        back: [0, 1, -distance],
        right: [distance, 1, 0],
        left: [-distance, 1, 0],
      };

      const pos = positions[view];
      cameraRef.current.position.set(...pos);
      controlsRef.current.target.copy(target);
      controlsRef.current.update();

      // Update current view state if it matches a preset
      if (view === "top") setCurrentView("top");
      else if (view === "front") setCurrentView("front");
      else if (view === "right" || view === "left") setCurrentView("side");
      else setCurrentView("perspective");
    },
    []
  );

  // Handle click for selection
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current)
        return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(meshesRef.current, false);
      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        if (clicked.userData.element) {
          const elementId = clicked.userData.element.id;
          // Ctrl/Cmd+click toggles selection
          // Shift+click for additive selection
          // Normal click replaces selection
          if (event.ctrlKey || event.metaKey) {
            toggleSelection(elementId);
          } else if (event.shiftKey) {
            addToSelection(elementId);
          } else {
            select(elementId);
          }
        }
      }
    },
    [select, addToSelection, toggleSelection],
  );

  return (
    <div className="w-full h-full relative canvas-bg" data-canvas="3d">
      <div ref={containerRef} className="w-full h-full" onClick={handleClick} />

      {/* View Controls Panel - Matching Prototype */}
      <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-xl rounded-xl p-1 flex flex-col gap-1">
        {(["perspective", "top", "front", "side"] as ViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => changeView(view)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              currentView === view
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Auto-rotate Toggle - Matching Prototype */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isRotating
              ? "bg-blue-600 text-white"
              : "bg-gray-900/80 text-gray-400 hover:text-white"
          }`}
        >
          <i
            className={`fa-solid ${isRotating ? "fa-pause" : "fa-play"} mr-2`}
          ></i>
          {isRotating ? "Pause" : "Rotate"}
        </button>
      </div>

      {/* Section Plane Controls */}
      <div className="absolute bottom-16 left-4 bg-gray-900/80 backdrop-blur-xl rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">Section</span>
          <button
            onClick={() => setSectionEnabled(!sectionEnabled)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              sectionEnabled ? "bg-green-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform ${
                sectionEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        {sectionEnabled && (
          <>
            <div className="flex gap-1">
              {(["x", "y", "z"] as const).map((axis) => (
                <button
                  key={axis}
                  onClick={() => setSectionAxis(axis)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    sectionAxis === axis
                      ? "bg-green-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {axis.toUpperCase()}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="-10"
              max="10"
              step="0.1"
              value={sectionPosition}
              onChange={(e) => setSectionPosition(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-xs text-gray-400 text-center">
              {sectionPosition.toFixed(1)}m
            </span>
          </>
        )}
      </div>

      {/* ViewCube - Top Right */}
      <div className="absolute top-4 right-4 bg-gray-900/60 backdrop-blur-xl rounded-xl p-2">
        <ViewCube
          camera={cameraRef.current}
          onViewChange={handleViewCubeClick}
          size={80}
        />
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 bg-gray-900/80 backdrop-blur-xl rounded-lg flex">
        <button
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.position.multiplyScalar(0.9);
            }
          }}
        >
          <i className="fa-solid fa-plus text-xs"></i>
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
          onClick={() => {
            if (cameraRef.current) {
              cameraRef.current.position.multiplyScalar(1.1);
            }
          }}
        >
          <i className="fa-solid fa-minus text-xs"></i>
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
          onClick={zoomToFit}
          title="Zoom to Fit (F)"
          data-testid="zoom-to-fit-btn"
        >
          <i className="fa-solid fa-expand text-xs"></i>
        </button>
      </div>

      {/* FPS Counter (F8 to toggle, dev mode only) */}
      <FPSCounter position="top-left" />
    </div>
  );
}
