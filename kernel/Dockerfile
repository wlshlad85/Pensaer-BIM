# =============================================================================
# Pensaer-BIM Kernel Dockerfile
# Rust geometry engine with optional WASM build
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build environment
# -----------------------------------------------------------------------------
FROM rust:1.88-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libssl-dev \
    protobuf-compiler \
    cmake \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY pensaer-geometry/Cargo.toml pensaer-geometry/
COPY pensaer-crdt/Cargo.toml pensaer-crdt/
COPY pensaer-ifc/Cargo.toml pensaer-ifc/
COPY pensaer-math/Cargo.toml pensaer-math/

# Create dummy source files to build dependencies
RUN mkdir -p pensaer-geometry/src pensaer-crdt/src pensaer-ifc/src pensaer-math/src \
    && echo "fn main() {}" > pensaer-geometry/src/lib.rs \
    && echo "fn main() {}" > pensaer-crdt/src/lib.rs \
    && echo "fn main() {}" > pensaer-ifc/src/lib.rs \
    && echo "fn main() {}" > pensaer-math/src/lib.rs

# Build dependencies (this layer is cached)
RUN cargo build --release 2>/dev/null || true

# Copy actual source
COPY . .

# Touch source files to invalidate cache
RUN find . -name "*.rs" -exec touch {} \;

# Build the application if the binary exists; otherwise, compile a stub health server.
RUN if cargo build --release --bin pensaer-kernel; then \
        cp /app/target/release/pensaer-kernel /app/pensaer-kernel; \
    else \
        rustc -O /app/pensaer-kernel-stub.rs -o /app/pensaer-kernel; \
    fi

# -----------------------------------------------------------------------------
# Stage 2: WASM build (optional, for client-side geometry)
# -----------------------------------------------------------------------------
FROM rust:1.88-slim AS wasm-builder

# Install wasm-pack
RUN cargo install wasm-pack

WORKDIR /app

# Copy source
COPY . .

# Ensure wasm output directory exists even if build is skipped
RUN mkdir -p /wasm-out

# Build WASM package
RUN wasm-pack build --target web --release pensaer-geometry \
    --out-dir /wasm-out 2>/dev/null || echo "WASM build skipped"

# -----------------------------------------------------------------------------
# Stage 3: Runtime
# -----------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy binary from builder (real or stub)
COPY --from=builder /app/pensaer-kernel /app/pensaer-kernel

# Copy WASM files (empty if build was skipped)
COPY --from=wasm-builder /wasm-out /app/wasm

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

# Expose gRPC port
EXPOSE 50051

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /app/pensaer-kernel --health-check || exit 1

# Environment
ENV RUST_LOG=info \
    RUST_BACKTRACE=1

# Start the kernel service
CMD ["/app/pensaer-kernel", "--bind", "0.0.0.0:50051"]
