/**
 * Pensaer BIM Platform - 2D Canvas Component
 *
 * Main SVG-based canvas for 2D BIM visualization and interaction.
 */

import { useRef, useCallback, useState } from "react";
import {
  useModelStore,
  useSelectionStore,
  useUIStore,
  useHistoryStore,
} from "../../stores";
import { useSelection } from "../../hooks/useSelection";
import type { Element } from "../../types";
import {
  snapPoint,
  snapPointWithPerpendicular,
  type SnapResult,
  type SnapOptions,
  type PerpendicularSnapResult,
} from "../../utils/snap";

import { Grid } from "./Grid";
import { SelectionBox } from "./SelectionBox";
import { SnapIndicator } from "./SnapIndicator";
import { GuideLine } from "./GuideLine";
import { DrawingPreview } from "./DrawingPreview";
import {
  WallElement,
  DoorElement,
  WindowElement,
  RoomElement,
} from "./elements";
import { CDEBadge } from "./CDEBadge";

const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 1500;

// Building boundary with padding to keep elements within visible area
const BOUNDARY_PADDING = 50;
const MIN_X = BOUNDARY_PADDING;
const MIN_Y = BOUNDARY_PADDING;
const MAX_X = CANVAS_WIDTH - BOUNDARY_PADDING;
const MAX_Y = CANVAS_HEIGHT - BOUNDARY_PADDING;

// ============================================
// BOUNDARY HELPERS
// ============================================

/**
 * Clamp a point to stay within the building boundary.
 */
function clampToBoundary(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.max(MIN_X, Math.min(MAX_X, point.x)),
    y: Math.max(MIN_Y, Math.min(MAX_Y, point.y)),
  };
}

/**
 * Check if a point is within the building boundary.
 */
function isWithinBoundary(point: { x: number; y: number }): boolean {
  return point.x >= MIN_X && point.x <= MAX_X && point.y >= MIN_Y && point.y <= MAX_Y;
}

/**
 * Check if an element rectangle is fully within the building boundary.
 */
function isElementWithinBoundary(x: number, y: number, width: number, height: number): boolean {
  return x >= MIN_X && y >= MIN_Y && x + width <= MAX_X && y + height <= MAX_Y;
}

// ============================================
// WALL HIT DETECTION HELPERS
// ============================================

/**
 * Find a wall at the given point (for placing doors/windows).
 * Returns the wall and position along its length (0-1).
 */
function findWallAtPoint(
  point: { x: number; y: number },
  elements: Element[],
  hitTolerance = 20,
): { wall: Element; positionAlongWall: number } | null {
  const walls = elements.filter((el) => el.type === "wall");

  for (const wall of walls) {
    // Check if point is within the wall bounds (with tolerance)
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
          Math.min(1, (point.x - wall.x) / wall.width),
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
          Math.min(1, (point.y - wall.y) / wall.height),
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
function calculateHostedElementPosition(
  wall: Element,
  positionAlongWall: number,
  elementWidth: number,
  elementHeight: number,
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

// ============================================
// WALL AUTO-JOIN HELPERS
// ============================================

/**
 * Get the endpoints of a wall.
 */
function getWallEndpoints(wall: Element): {
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
function findWallsToJoin(
  newWall: Element,
  existingWalls: Element[],
  tolerance = 30,
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
        newEndpoints.start.y - endpoints.start.y,
      ),
      Math.hypot(
        newEndpoints.start.x - endpoints.end.x,
        newEndpoints.start.y - endpoints.end.y,
      ),
      Math.hypot(
        newEndpoints.end.x - endpoints.start.x,
        newEndpoints.end.y - endpoints.start.y,
      ),
      Math.hypot(
        newEndpoints.end.x - endpoints.end.x,
        newEndpoints.end.y - endpoints.end.y,
      ),
    ];

    const minDistance = Math.min(...distances);
    if (minDistance <= tolerance) {
      wallsToJoin.push(wall.id);
    }
  }

  return wallsToJoin;
}

export function Canvas2D() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Stores
  const elements = useModelStore((s) => s.elements);
  const addElement = useModelStore((s) => s.addElement);
  const updateElement = useModelStore((s) => s.updateElement);
  const recordAction = useHistoryStore((s) => s.recordAction);

  const select = useSelectionStore((s) => s.select);
  const addToSelection = useSelectionStore((s) => s.addToSelection);
  const toggleSelection = useSelectionStore((s) => s.toggleSelection);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const setHovered = useSelectionStore((s) => s.setHovered);

  // Box selection hook
  const { completeBoxSelection } = useSelection();

  const activeTool = useUIStore((s) => s.activeTool);
  const zoom = useUIStore((s) => s.zoom);
  const panX = useUIStore((s) => s.panX);
  const panY = useUIStore((s) => s.panY);
  const pan = useUIStore((s) => s.pan);
  const setZoom = useUIStore((s) => s.setZoom);
  const showContextMenu = useUIStore((s) => s.showContextMenu);
  const hideContextMenu = useUIStore((s) => s.hideContextMenu);
  const addToast = useUIStore((s) => s.addToast);
  const hiddenLayers = useUIStore((s) => s.hiddenLayers);
  const lockedLayers = useUIStore((s) => s.lockedLayers);
  const snap = useUIStore((s) => s.snap);

  // Local state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 });
  const [boxEnd, setBoxEnd] = useState({ x: 0, y: 0 });
  const [snapResult, setSnapResult] = useState<PerpendicularSnapResult | null>(null);

  // Door/Window placement preview
  const [placementPreview, setPlacementPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: "door" | "window";
    wallId: string;
  } | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragElement, setDragElement] = useState<Element | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Convert UI snap settings to snap options for the snap utility
  // Base options without perpendicular reference (set dynamically during drawing)
  const getSnapOptions = useCallback(
    (perpendicularReference?: { x: number; y: number }): Partial<SnapOptions> => ({
      gridSize: 50,
      tolerance: snap.threshold,
      enableGrid: snap.enabled && snap.grid,
      enableEndpoint: snap.enabled && snap.endpoint,
      enableMidpoint: snap.enabled && snap.midpoint,
      enableCenter: snap.enabled && snap.endpoint, // Center follows endpoint setting
      enableEdge: snap.enabled,
      enablePerpendicular: snap.enabled && snap.perpendicular,
      perpendicularReference,
      perpendicularTolerance: 5,
    }),
    [snap],
  );

  // For backward compatibility
  const snapOptions = getSnapOptions();

  // Get canvas coordinates from mouse event
  // Accounts for: 1) SVG viewBox scaling, 2) pan translation, 3) zoom scale
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();

      // Step 1: Get mouse position relative to SVG element (viewport pixels)
      const viewportX = e.clientX - rect.left;
      const viewportY = e.clientY - rect.top;

      // Step 2: Convert viewport pixels to viewBox coordinates
      // viewBox is 2000x1500, but rendered size may differ
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const viewBoxX = viewportX * scaleX;
      const viewBoxY = viewportY * scaleY;

      // Step 3: Apply inverse of the <g> transform (pan and zoom)
      // The transform is: translate(panX, panY) scale(zoom)
      // Inverse: (point - pan) / zoom
      return {
        x: (viewBoxX - panX) / zoom,
        y: (viewBoxY - panY) / zoom,
      };
    },
    [panX, panY, zoom],
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      hideContextMenu();

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        // Middle click or Alt+click for panning
        setIsPanning(true);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        return;
      }

      if (e.button !== 0) return;

      const point = getCanvasPoint(e);

      if (activeTool === "select") {
        // Start box selection if clicking on empty space
        if (!(e.target as HTMLElement).closest?.(".model-element")) {
          setIsBoxSelecting(true);
          setBoxStart(point);
          setBoxEnd(point);
          if (!e.shiftKey) {
            clearSelection();
          }
        }
      } else if (["wall", "room"].includes(activeTool)) {
        // Start drawing - clamp to boundary
        const clampedPoint = clampToBoundary(point);
        const snapped = snapPoint(clampedPoint, elements, snapOptions);
        const boundedSnap = clampToBoundary(snapped.point);
        setIsDrawing(true);
        setDrawStart(boundedSnap);
        setDrawEnd(boundedSnap);
        setSnapResult({ ...snapped, point: boundedSnap });
      } else if (["door", "window"].includes(activeTool)) {
        // Click on wall to place door/window
        const hitResult = findWallAtPoint(point, elements);

        if (hitResult) {
          const { wall, positionAlongWall } = hitResult;

          if (activeTool === "door") {
            // Create door on wall
            const doorWidth = 90; // ~900mm at scale
            const doorHeight = 24;
            const position = calculateHostedElementPosition(
              wall,
              positionAlongWall,
              doorWidth,
              doorHeight,
            );

            const newDoor: Element = {
              id: `door-${Date.now()}`,
              type: "door",
              name: `Door-${Date.now().toString(36).slice(-4).toUpperCase()}`,
              ...position,
              properties: {
                width: "900mm",
                height: "2100mm",
                material: "Wood",
                fireRating: "30 min",
                swingDirection: "Inward",
                handleSide: "Right",
                level: "Level 1",
              },
              relationships: {
                hostedBy: wall.id,
                leadsTo: [],
              },
              issues: [],
              aiSuggestions: [],
            };

            addElement(newDoor);

            // Update wall's hosts relationship
            const updatedHosts = [
              ...(wall.relationships.hosts || []),
              newDoor.id,
            ];
            updateElement(wall.id, {
              relationships: { ...wall.relationships, hosts: updatedHosts },
            });

            recordAction(`Place ${newDoor.name} on ${wall.name}`);
            addToast("success", `Placed door on ${wall.name}`);
          } else if (activeTool === "window") {
            // Create window on wall
            const windowWidth = 100; // ~1000mm at scale
            const windowHeight = 24;
            const position = calculateHostedElementPosition(
              wall,
              positionAlongWall,
              windowWidth,
              windowHeight,
            );

            const newWindow: Element = {
              id: `window-${Date.now()}`,
              type: "window",
              name: `Window-${Date.now().toString(36).slice(-4).toUpperCase()}`,
              ...position,
              properties: {
                width: "1000mm",
                height: "1200mm",
                sillHeight: "900mm",
                glazingType: "Double",
                uValue: "1.4 W/m²K",
                openingType: "Casement",
                frame: "Aluminum",
                level: "Level 1",
              },
              relationships: {
                hostedBy: wall.id,
                facesRoom: undefined,
              },
              issues: [],
              aiSuggestions: [],
            };

            addElement(newWindow);

            // Update wall's hosts relationship
            const updatedHosts = [
              ...(wall.relationships.hosts || []),
              newWindow.id,
            ];
            updateElement(wall.id, {
              relationships: { ...wall.relationships, hosts: updatedHosts },
            });

            recordAction(`Place ${newWindow.name} on ${wall.name}`);
            addToast("success", `Placed window on ${wall.name}`);
          }
        } else {
          // No wall found - show helpful message
          addToast("warning", `Click on a wall to place ${activeTool}`);
        }
      }
    },
    [
      activeTool,
      elements,
      getCanvasPoint,
      panX,
      panY,
      clearSelection,
      hideContextMenu,
      addElement,
      updateElement,
      recordAction,
      addToast,
      snapOptions,
    ],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        pan(e.clientX - panStart.x - panX, e.clientY - panStart.y - panY);
        setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
        return;
      }

      const point = getCanvasPoint(e);

      // Handle element dragging
      if (isDragging && dragElement) {
        const newX = point.x - dragOffset.x;
        const newY = point.y - dragOffset.y;

        // Snap to grid (50px grid)
        const snappedX = Math.round(newX / 10) * 10;
        const snappedY = Math.round(newY / 10) * 10;

        // Clamp to boundary (ensure element stays within bounds)
        const clampedX = Math.max(MIN_X, Math.min(MAX_X - dragElement.width, snappedX));
        const clampedY = Math.max(MIN_Y, Math.min(MAX_Y - dragElement.height, snappedY));

        // Update element position in real-time
        updateElement(dragElement.id, { x: clampedX, y: clampedY });
        return;
      }

      if (isDrawing) {
        // Clamp to boundary during drawing
        const clampedPoint = clampToBoundary(point);
        // Use perpendicular-aware snapping when drawing (reference = drawStart)
        const opts = getSnapOptions(drawStart);
        const snapped = snapPointWithPerpendicular(clampedPoint, elements, opts);
        const boundedSnap = clampToBoundary(snapped.point);
        setDrawEnd(boundedSnap);
        setSnapResult({ ...snapped, point: boundedSnap });
      } else if (isBoxSelecting) {
        setBoxEnd(point);
      } else if (["wall", "room"].includes(activeTool)) {
        // Show snap preview while moving (no perpendicular reference yet)
        const snapped = snapPoint(point, elements, snapOptions);
        setSnapResult(snapped.snapped ? snapped : null);
      } else if (["door", "window"].includes(activeTool)) {
        // Show placement preview when hovering over walls
        const hitResult = findWallAtPoint(point, elements);

        if (hitResult) {
          const { wall, positionAlongWall } = hitResult;
          const elementWidth = activeTool === "door" ? 90 : 100;
          const elementHeight = 24;
          const position = calculateHostedElementPosition(
            wall,
            positionAlongWall,
            elementWidth,
            elementHeight,
          );

          setPlacementPreview({
            ...position,
            type: activeTool as "door" | "window",
            wallId: wall.id,
          });
        } else {
          setPlacementPreview(null);
        }
      }
    },
    [
      isPanning,
      isDrawing,
      isBoxSelecting,
      isDragging,
      dragElement,
      dragOffset,
      activeTool,
      elements,
      getCanvasPoint,
      panStart,
      panX,
      panY,
      pan,
      updateElement,
      snapOptions,
      getSnapOptions,
      drawStart,
    ],
  );

  // Handle mouse up
  const handleMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        return;
      }

      // Finalize element drag
      if (isDragging && dragElement) {
        setIsDragging(false);

        // Check if the element actually moved
        const currentElement = elements.find((el) => el.id === dragElement.id);
        if (
          currentElement &&
          (currentElement.x !== dragStartPos.x ||
            currentElement.y !== dragStartPos.y)
        ) {
          // Record the move action in history
          recordAction(`Move ${dragElement.name}`);
          addToast("info", `Moved ${dragElement.name}`);
        }

        setDragElement(null);
        setDragOffset({ x: 0, y: 0 });
        setDragStartPos({ x: 0, y: 0 });
        return;
      }

      if (isDrawing) {
        setIsDrawing(false);
        setSnapResult(null);

        // Create the element
        const width = Math.abs(drawEnd.x - drawStart.x);
        const height = Math.abs(drawEnd.y - drawStart.y);

        if (width > 10 || height > 10) {
          if (activeTool === "wall") {
            const isHorizontal = width > height;
            const wallId = `wall-${Date.now()}`;
            const wallName = `Wall-${Date.now().toString(36).slice(-4).toUpperCase()}`;

            // Find existing walls to check for auto-join
            const existingWalls = elements.filter((el) => el.type === "wall");

            const newWall: Element = {
              id: wallId,
              type: "wall",
              name: wallName,
              x: isHorizontal
                ? Math.min(drawStart.x, drawEnd.x)
                : drawStart.x - 6,
              y: isHorizontal
                ? drawStart.y - 6
                : Math.min(drawStart.y, drawEnd.y),
              width: isHorizontal ? width : 12,
              height: isHorizontal ? 12 : height,
              properties: {
                thickness: "200mm",
                height: "3000mm",
                material: "Concrete",
                fireRating: "60 min",
                structural: true,
                level: "Level 1",
              },
              relationships: { hosts: [], joins: [], bounds: [] },
              issues: [],
              aiSuggestions: [],
            };

            // Find walls to auto-join
            const wallsToJoin = findWallsToJoin(newWall, existingWalls);

            // Update new wall's joins relationship
            newWall.relationships.joins = wallsToJoin;

            // Add the new wall
            addElement(newWall);

            // Update existing walls to include the new wall in their joins
            for (const joinWallId of wallsToJoin) {
              const joinWall = elements.find((el) => el.id === joinWallId);
              if (joinWall) {
                const updatedJoins = [
                  ...(joinWall.relationships.joins || []),
                  wallId,
                ];
                updateElement(joinWallId, {
                  relationships: {
                    ...joinWall.relationships,
                    joins: updatedJoins,
                  },
                });
              }
            }

            recordAction(`Create ${wallName}`);

            if (wallsToJoin.length > 0) {
              addToast(
                "success",
                `Created ${wallName} (joined to ${wallsToJoin.length} wall${wallsToJoin.length > 1 ? "s" : ""})`,
              );
            } else {
              addToast("success", `Created ${wallName}`);
            }
          } else if (activeTool === "room") {
            const newRoom: Element = {
              id: `room-${Date.now()}`,
              type: "room",
              name: `Room ${Date.now().toString(36).slice(-4).toUpperCase()}`,
              x: Math.min(drawStart.x, drawEnd.x),
              y: Math.min(drawStart.y, drawEnd.y),
              width,
              height,
              properties: {
                area: `${((width * height) / 10000).toFixed(1)} m²`,
                perimeter: `${(((width + height) * 2) / 100).toFixed(1)} m`,
                occupancy: "B - Business",
                level: "Level 1",
              },
              relationships: { boundedBy: [], accessVia: [] },
              issues: [],
              aiSuggestions: [],
            };
            addElement(newRoom);
            recordAction(`Create ${newRoom.name}`);
            addToast("success", `Created ${newRoom.name}`);
          }
        }
        return;
      }

      if (isBoxSelecting) {
        setIsBoxSelecting(false);
        // Complete box selection - find elements within box and add to selection
        completeBoxSelection(boxStart.x, boxStart.y, boxEnd.x, boxEnd.y, false, "intersect");
        return;
      }
    },
    [
      isPanning,
      isDrawing,
      isBoxSelecting,
      isDragging,
      dragElement,
      dragStartPos,
      elements,
      activeTool,
      drawStart,
      drawEnd,
      boxStart,
      boxEnd,
      addElement,
      updateElement,
      addToast,
      recordAction,
      completeBoxSelection,
    ],
  );

  // Handle wheel for zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * delta);
    },
    [zoom, setZoom],
  );

  // Element mouse down handler (for drag initiation)
  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, element: Element) => {
      if (activeTool !== "select" || e.button !== 0) return;
      e.stopPropagation();

      // Check if layer is locked
      const isLocked = lockedLayers.has(element.type);

      // Select the element (even if locked)
      // Ctrl/Cmd+click toggles selection
      // Shift+click adds to selection
      // Normal click replaces selection
      if (e.ctrlKey || e.metaKey) {
        toggleSelection(element.id);
      } else if (e.shiftKey) {
        addToSelection(element.id);
      } else {
        select(element.id);
      }

      // Don't allow drag if layer is locked
      if (isLocked) {
        addToast("info", `${element.type} layer is locked`);
        return;
      }

      // Initialize drag
      const point = getCanvasPoint(e);
      setIsDragging(true);
      setDragElement(element);
      setDragOffset({ x: point.x - element.x, y: point.y - element.y });
      setDragStartPos({ x: element.x, y: element.y });
    },
    [activeTool, select, addToSelection, toggleSelection, getCanvasPoint, lockedLayers, addToast],
  );

  // Element click handler (for selection only, drag is handled by mousedown/mouseup)
  const handleElementClick = useCallback(
    (e: React.MouseEvent, _element: Element) => {
      e.stopPropagation();
      if (activeTool !== "select") return;

      // Click selection is handled in mousedown now
      // This is kept for potential future use
    },
    [activeTool],
  );

  // Element context menu handler
  const handleElementContextMenu = useCallback(
    (e: React.MouseEvent, element: Element) => {
      e.preventDefault();
      e.stopPropagation();
      select(element.id);
      showContextMenu(e.clientX, e.clientY, element.id);
    },
    [select, showContextMenu],
  );

  // Render element based on type
  const renderElement = (element: Element) => {
    const commonProps = {
      element,
      onClick: handleElementClick,
      onMouseDown: handleElementMouseDown,
      onContextMenu: handleElementContextMenu,
      onMouseEnter: (el: Element) => setHovered(el.id),
      onMouseLeave: () => setHovered(null),
    };

    switch (element.type) {
      case "wall":
        return <WallElement key={element.id} {...commonProps} />;
      case "door":
        return <DoorElement key={element.id} {...commonProps} />;
      case "window":
        return <WindowElement key={element.id} {...commonProps} />;
      case "room":
        return <RoomElement key={element.id} {...commonProps} />;
      default:
        return null;
    }
  };

  // Filter visible elements (respect layer visibility)
  const visibleElements = elements.filter((el) => !hiddenLayers.has(el.type));

  // Sort elements: rooms first (background), then walls, then doors/windows
  const sortedElements = [...visibleElements].sort((a, b) => {
    const order: Record<string, number> = {
      room: 0,
      floor: 0,
      wall: 1,
      column: 1,
      beam: 1,
      door: 2,
      window: 2,
      roof: 3,
      stair: 2,
    };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
  });

  return (
    <svg
      ref={svgRef}
      data-canvas="2d"
      className="w-full h-full canvas-bg"
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsPanning(false);
        setIsDrawing(false);
        setIsBoxSelecting(false);
        setIsDragging(false);
        setDragElement(null);
        setHovered(null);
        setPlacementPreview(null);
      }}
      onWheel={handleWheel}
      style={{
        cursor:
          isPanning || isDragging
            ? "grabbing"
            : activeTool === "select"
              ? "default"
              : "crosshair",
      }}
    >
      {/* Transform group for pan/zoom */}
      <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
        {/* Grid */}
        <Grid width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

        {/* Building boundary indicator */}
        <rect
          x={MIN_X}
          y={MIN_Y}
          width={MAX_X - MIN_X}
          height={MAX_Y - MIN_Y}
          fill="none"
          stroke="rgba(59, 130, 246, 0.3)"
          strokeWidth={2}
          strokeDasharray="10 5"
          className="pointer-events-none"
        />

        {/* Elements */}
        {sortedElements.map(renderElement)}

        {/* CDE state badges (rendered on top of elements) */}
        {sortedElements.map((el) => (
          <CDEBadge key={`cde-${el.id}`} element={el} />
        ))}

        {/* Drawing preview */}
        {isDrawing && (
          <DrawingPreview
            tool={activeTool}
            startX={drawStart.x}
            startY={drawStart.y}
            endX={drawEnd.x}
            endY={drawEnd.y}
          />
        )}

        {/* Box selection */}
        {isBoxSelecting && (
          <SelectionBox
            startX={boxStart.x}
            startY={boxStart.y}
            endX={boxEnd.x}
            endY={boxEnd.y}
          />
        )}

        {/* Perpendicular guide line */}
        {isDrawing && snapResult?.guideLine && snapResult.snapType === "perpendicular" && (
          <GuideLine
            start={snapResult.guideLine.start}
            end={snapResult.guideLine.end}
            visible={true}
            label="90°"
          />
        )}

        {/* Snap indicator */}
        {snapResult?.snapped && snapResult.snapType && (
          <SnapIndicator
            x={snapResult.point.x}
            y={snapResult.point.y}
            snapType={snapResult.snapType}
            visible={true}
          />
        )}

        {/* Door/Window placement preview */}
        {placementPreview && (
          <g className="pointer-events-none">
            <rect
              x={placementPreview.x}
              y={placementPreview.y}
              width={placementPreview.width}
              height={placementPreview.height}
              fill={
                placementPreview.type === "door"
                  ? "rgba(139, 92, 246, 0.5)"
                  : "rgba(59, 130, 246, 0.5)"
              }
              stroke={placementPreview.type === "door" ? "#8b5cf6" : "#3b82f6"}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            {/* Center indicator */}
            <circle
              cx={placementPreview.x + placementPreview.width / 2}
              cy={placementPreview.y + placementPreview.height / 2}
              r={4}
              fill={placementPreview.type === "door" ? "#8b5cf6" : "#3b82f6"}
            />
          </g>
        )}
      </g>
    </svg>
  );
}
