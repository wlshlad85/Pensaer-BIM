#!/bin/bash
# =============================================================================
# Build Rust Kernel to WebAssembly
# Output goes to app/src/wasm/ for client-side geometry
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[WASM]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# -----------------------------------------------------------------------------
# Check Prerequisites
# -----------------------------------------------------------------------------

log "Checking prerequisites..."

command -v rustup >/dev/null 2>&1 || error "Rust not installed. Run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
command -v wasm-pack >/dev/null 2>&1 || {
    log "Installing wasm-pack..."
    cargo install wasm-pack
}

# Ensure wasm32 target is installed
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

KERNEL_DIR="kernel"
OUTPUT_DIR="app/src/wasm"
CRATE_NAME="pensaer-geometry"  # The crate to compile

# Build modes
BUILD_MODE="${1:-release}"

case "$BUILD_MODE" in
    release)
        WASM_PACK_ARGS="--release"
        log "Building in RELEASE mode (optimized)"
        ;;
    dev|debug)
        WASM_PACK_ARGS="--dev"
        log "Building in DEBUG mode (fast compile)"
        ;;
    profiling)
        WASM_PACK_ARGS="--profiling"
        log "Building in PROFILING mode"
        ;;
    *)
        error "Unknown build mode: $BUILD_MODE (use: release, dev, profiling)"
        ;;
esac

# -----------------------------------------------------------------------------
# Build WASM
# -----------------------------------------------------------------------------

log "Building WASM from kernel/$CRATE_NAME..."

cd "$KERNEL_DIR"

# Build with wasm-pack
wasm-pack build \
    --target web \
    $WASM_PACK_ARGS \
    --out-dir "../$OUTPUT_DIR" \
    --out-name pensaer_geometry \
    "$CRATE_NAME" 2>&1 | while read -r line; do
        echo "  $line"
    done

cd ..

# -----------------------------------------------------------------------------
# Post-processing
# -----------------------------------------------------------------------------

log "Post-processing WASM output..."

# Remove unnecessary files
rm -f "$OUTPUT_DIR/.gitignore"
rm -f "$OUTPUT_DIR/package.json"
rm -f "$OUTPUT_DIR/README.md"

# Create TypeScript declarations if not present
if [ ! -f "$OUTPUT_DIR/pensaer_geometry.d.ts" ]; then
    log "Creating TypeScript declarations..."
    cat > "$OUTPUT_DIR/pensaer_geometry.d.ts" << 'EOF'
// Auto-generated TypeScript declarations for pensaer-geometry WASM module

export interface WasmGeometryModule {
  // Wall operations
  create_wall(start: Float64Array, end: Float64Array, height: number, thickness: number): string;
  get_wall_mesh(wall_id: string): Float32Array;

  // Opening operations
  create_door(wall_id: string, offset: number, width: number, height: number): string;
  create_window(wall_id: string, offset: number, width: number, height: number, sill_height: number): string;

  // Room operations
  create_room(points: Float64Array, height: number): string;
  compute_room_area(room_id: string): number;

  // Utilities
  compute_distance(p1: Float64Array, p2: Float64Array): number;
  point_on_line(point: Float64Array, line_start: Float64Array, line_end: Float64Array, tolerance: number): boolean;

  // Memory management
  free(ptr: number): void;
}

export default function init(): Promise<WasmGeometryModule>;
EOF
fi

# Create loader utility
cat > "$OUTPUT_DIR/loader.ts" << 'EOF'
/**
 * WASM Geometry Module Loader
 *
 * Handles lazy-loading of the Pensaer geometry WASM module
 * with fallback to server-side computation if WASM fails.
 */

let wasmModule: typeof import('./pensaer_geometry') | null = null;
let loadPromise: Promise<typeof import('./pensaer_geometry')> | null = null;

/**
 * Load the WASM geometry module.
 * Returns cached module if already loaded.
 */
export async function loadGeometryWasm() {
  if (wasmModule) return wasmModule;

  if (!loadPromise) {
    loadPromise = import('./pensaer_geometry').then(async (wasm) => {
      await wasm.default();
      wasmModule = wasm;
      console.log('[WASM] Geometry module loaded successfully');
      return wasm;
    }).catch((error) => {
      console.warn('[WASM] Failed to load geometry module, falling back to server:', error);
      throw error;
    });
  }

  return loadPromise;
}

/**
 * Check if WASM is supported in this browser.
 */
export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      return module instanceof WebAssembly.Module;
    }
  } catch (e) {
    // WASM not supported
  }
  return false;
}

/**
 * Get the loaded WASM module (throws if not loaded).
 */
export function getGeometryWasm() {
  if (!wasmModule) {
    throw new Error('WASM module not loaded. Call loadGeometryWasm() first.');
  }
  return wasmModule;
}
EOF

# -----------------------------------------------------------------------------
# Size Report
# -----------------------------------------------------------------------------

log "WASM build complete!"

if [ -f "$OUTPUT_DIR/pensaer_geometry_bg.wasm" ]; then
    WASM_SIZE=$(ls -lh "$OUTPUT_DIR/pensaer_geometry_bg.wasm" | awk '{print $5}')
    success "Output: $OUTPUT_DIR/pensaer_geometry_bg.wasm ($WASM_SIZE)"
fi

echo ""
log "Files generated:"
ls -la "$OUTPUT_DIR"/*.{wasm,js,ts} 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
success "WASM build complete! Import with:"
echo "  import { loadGeometryWasm } from '@/wasm/loader';"
echo "  const wasm = await loadGeometryWasm();"
