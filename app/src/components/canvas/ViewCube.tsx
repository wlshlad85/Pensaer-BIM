/**
 * ViewCube Component
 *
 * A 3D orientation indicator cube that shows current camera orientation
 * and provides click-to-view navigation. Standard in BIM/CAD software.
 */

import { useEffect, useRef, useCallback, memo } from "react";
import * as THREE from "three";

interface ViewCubeProps {
  /** Current camera for synchronization */
  camera: THREE.PerspectiveCamera | null;
  /** Callback when a face is clicked */
  onViewChange?: (view: "top" | "front" | "right" | "back" | "left" | "bottom") => void;
  /** Size in pixels */
  size?: number;
}

// View directions (camera position when looking at that face)
const VIEW_DIRECTIONS: Record<string, [number, number, number]> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

export const ViewCube = memo(function ViewCube({
  camera,
  onViewChange,
  size = 80,
}: ViewCubeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Initialize ViewCube scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera for the cube (orthographic-like perspective)
    const cubeCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cubeCamera.position.set(0, 0, 5);
    cubeCameraRef.current = cubeCamera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create cube with face labels
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);

    // Create materials for each face
    const materials = [
      createFaceMaterial("R", 0x6b7280), // Right (+X)
      createFaceMaterial("L", 0x6b7280), // Left (-X)
      createFaceMaterial("T", 0x3b82f6), // Top (+Y) - highlight
      createFaceMaterial("Bo", 0x6b7280), // Bottom (-Y)
      createFaceMaterial("F", 0x6b7280), // Front (+Z)
      createFaceMaterial("Ba", 0x6b7280), // Back (-Z)
    ];

    const cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    cubeRef.current = cube;

    // Add edge wireframe
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x9ca3af, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    cube.add(edges);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(2, 3, 2);
    scene.add(directionalLight);

    return () => {
      renderer.dispose();
      geometry.dispose();
      materials.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      container.removeChild(renderer.domElement);
    };
  }, [size]);

  // Sync cube rotation with main camera
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (camera && cubeRef.current && rendererRef.current && sceneRef.current && cubeCameraRef.current) {
        // Copy camera rotation to cube (inverted to show "view from")
        cubeRef.current.quaternion.copy(camera.quaternion).invert();
        rendererRef.current.render(sceneRef.current, cubeCameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [camera]);

  // Handle click on cube face
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !cubeCameraRef.current || !cubeRef.current || !sceneRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / size) * 2 - 1,
        -((event.clientY - rect.top) / size) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cubeCameraRef.current);

      const intersects = raycaster.intersectObject(cubeRef.current);
      if (intersects.length > 0 && intersects[0].face) {
        const faceIndex = intersects[0].face.materialIndex;
        const views = ["right", "left", "top", "bottom", "front", "back"] as const;
        const selectedView = views[faceIndex];
        onViewChange?.(selectedView);
      }
    },
    [size, onViewChange]
  );

  return (
    <div
      ref={containerRef}
      className="cursor-pointer"
      onClick={handleClick}
      title="Click face to change view"
      style={{ width: size, height: size }}
    />
  );
});

// Helper to create a material with a text label
function createFaceMaterial(label: string, color: number): THREE.MeshStandardMaterial {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // Fill background
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, 128, 128);

  // Draw border
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 124);

  // Draw label
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.5,
    metalness: 0.1,
  });
}

export default ViewCube;
