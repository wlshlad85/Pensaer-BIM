/**
 * Camera Constants
 *
 * Preset camera positions and configurations for 3D views.
 */

export type ViewType = "perspective" | "top" | "front" | "side";

export interface CameraPreset {
  position: [number, number, number];
  lookAt: [number, number, number];
}

/**
 * Camera presets for different view types
 */
export const CAMERA_PRESETS: Record<ViewType, CameraPreset> = {
  perspective: { position: [8, 6, 8], lookAt: [0, 1, 0] },
  top: { position: [0, 12, 0], lookAt: [0, 0, 0] },
  front: { position: [0, 3, 12], lookAt: [0, 1, 0] },
  side: { position: [12, 3, 0], lookAt: [0, 1, 0] },
};

/**
 * Default camera configuration
 */
export const CAMERA_CONFIG = {
  fov: 45,
  near: 0.1,
  far: 1000,
  minDistance: 3,
  maxDistance: 50,
  dampingFactor: 0.05,
};
