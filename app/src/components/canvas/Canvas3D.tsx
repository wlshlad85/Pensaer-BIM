/**
 * Pensaer BIM Platform - Canvas3D Component
 *
 * Three.js powered 3D view matching the prototype exactly.
 * Features: Auto-rotation, view controls, building visualization.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useModelStore, useSelectionStore } from '../../stores';

type ViewType = 'perspective' | 'top' | 'front' | 'side';

// Camera presets matching prototype
const CAMERA_PRESETS: Record<ViewType, { position: [number, number, number]; lookAt: [number, number, number] }> = {
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
  const animationRef = useRef<number | null>(null);
  const meshesRef = useRef<THREE.Mesh[]>([]);

  const [isRotating, setIsRotating] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>('perspective');
  const rotationRef = useRef(0);

  const elements = useModelStore((s) => s.elements);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);

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
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
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
    buildingGroup.name = 'building';

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
      floor: 0x6b7280,
    };

    // Scale factor: 1 unit in 2D = 0.01 units in 3D
    const scale = 0.01;
    const wallHeight = 3;

    // Offset to center the building
    const offsetX = -3;
    const offsetZ = -2.5;

    // Build walls
    elements
      .filter((el) => el.type === 'wall')
      .forEach((wall) => {
        const isSelected = selectedIds.includes(wall.id);
        const width = wall.width * scale;
        const depth = wall.height * scale;
        const height = wallHeight;

        const geometry = new THREE.BoxGeometry(
          Math.max(width, 0.15),
          height,
          Math.max(depth, 0.15)
        );
        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.wallSelected : colors.wall,
          roughness: 0.7,
          metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = wall.id;
        mesh.userData = { element: wall };
        mesh.position.set(
          wall.x * scale + width / 2 + offsetX,
          height / 2,
          wall.y * scale + depth / 2 + offsetZ
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build doors
    elements
      .filter((el) => el.type === 'door')
      .forEach((door) => {
        const isSelected = selectedIds.includes(door.id);
        const width = door.width * scale;
        const height = 2.1;

        const geometry = new THREE.BoxGeometry(
          Math.max(width, 0.5),
          height,
          0.1
        );
        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.doorSelected : colors.door,
          roughness: 0.5,
          metalness: 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = door.id;
        mesh.userData = { element: door };
        mesh.position.set(
          door.x * scale + width / 2 + offsetX,
          height / 2,
          door.y * scale + offsetZ
        );
        mesh.castShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build windows
    elements
      .filter((el) => el.type === 'window')
      .forEach((window) => {
        const isSelected = selectedIds.includes(window.id);
        const width = window.width * scale;
        const height = 1.2;

        // Window frame
        const geometry = new THREE.BoxGeometry(width, height, 0.08);
        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.windowSelected : colors.window,
          roughness: 0.2,
          metalness: 0.5,
          transparent: true,
          opacity: 0.7,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = window.id;
        mesh.userData = { element: window };
        mesh.position.set(
          window.x * scale + width / 2 + offsetX,
          1.5,
          window.y * scale + offsetZ
        );
        mesh.castShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build room floors (transparent)
    elements
      .filter((el) => el.type === 'room')
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
          room.y * scale + depth / 2 + offsetZ
        );
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Build roof
    elements
      .filter((el) => el.type === 'roof')
      .forEach((roof) => {
        const isSelected = selectedIds.includes(roof.id);
        // In 2D: width is span across building, height is depth of building
        const roofSpan = Math.max(roof.width, roof.height) * scale;
        const roofDepth = Math.min(roof.width, roof.height) * scale;

        // Ensure minimum dimensions for visibility
        const minSpan = Math.max(roofSpan, 2);
        const minDepth = Math.max(roofDepth, 2);

        // Gable roof shape (triangle cross-section)
        // Peak height proportional to span
        const peakHeight = minSpan * 0.4;
        const shape = new THREE.Shape();
        shape.moveTo(-minSpan / 2, 0);
        shape.lineTo(minSpan / 2, 0);
        shape.lineTo(0, peakHeight);
        shape.lineTo(-minSpan / 2, 0);

        const extrudeSettings = {
          depth: minDepth,
          bevelEnabled: false,
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const material = new THREE.MeshStandardMaterial({
          color: isSelected ? colors.roofSelected : colors.roof,
          roughness: 0.6,
          metalness: 0.2,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = roof.id;
        mesh.userData = { element: roof };

        // Position: account for rotation.y = -PI/2
        // After rotation: original X→-Z, original Z→X
        // Geometry origin is at start of extrusion, so offset by depth/2 in X and span/2 in Z
        mesh.rotation.y = -Math.PI / 2;
        mesh.position.set(
          roof.x * scale + minDepth / 2 + offsetX,
          wallHeight,
          roof.y * scale + minSpan / 2 + offsetZ
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        buildingGroup.add(mesh);
        meshesRef.current.push(mesh);
      });

    // Add default roof if none exists
    if (!elements.some((el) => el.type === 'roof')) {
      const roofGeometry = new THREE.ConeGeometry(3, 1.5, 4);
      const roofMaterial = new THREE.MeshStandardMaterial({
        color: colors.roof,
        roughness: 0.6,
        metalness: 0.2,
      });
      const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
      roofMesh.position.set(0, wallHeight + 0.75, 0);
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.castShadow = true;
      buildingGroup.add(roofMesh);
      meshesRef.current.push(roofMesh);
    }

    scene.add(buildingGroup);
  }, [elements, selectedIds]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        // Auto-rotate in perspective view
        if (isRotating && currentView === 'perspective') {
          rotationRef.current += 0.005;
          const radius = 11;
          cameraRef.current.position.x = Math.sin(rotationRef.current) * radius;
          cameraRef.current.position.z = Math.cos(rotationRef.current) * radius;
          cameraRef.current.lookAt(0, 1, 0);
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRotating, currentView]);

  // Change camera view
  const changeView = useCallback((view: ViewType) => {
    setCurrentView(view);
    if (cameraRef.current) {
      const preset = CAMERA_PRESETS[view];
      cameraRef.current.position.set(...preset.position);
      cameraRef.current.lookAt(...preset.lookAt);
    }
  }, []);

  // Handle click for selection
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObjects(meshesRef.current, false);
      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        if (clicked.userData.element) {
          select(clicked.userData.element.id);
        }
      }
    },
    [select]
  );

  return (
    <div className="w-full h-full relative canvas-bg">
      <div ref={containerRef} className="w-full h-full" onClick={handleClick} />

      {/* View Controls Panel - Matching Prototype */}
      <div className="absolute top-4 left-4 bg-gray-900/80 backdrop-blur-xl rounded-xl p-1 flex flex-col gap-1">
        {(['perspective', 'top', 'front', 'side'] as ViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => changeView(view)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              currentView === view
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
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
              ? 'bg-blue-600 text-white'
              : 'bg-gray-900/80 text-gray-400 hover:text-white'
          }`}
        >
          <i className={`fa-solid ${isRotating ? 'fa-pause' : 'fa-play'} mr-2`}></i>
          {isRotating ? 'Pause' : 'Rotate'}
        </button>
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
      </div>
    </div>
  );
}
