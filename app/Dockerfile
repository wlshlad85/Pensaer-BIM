# =============================================================================
# Pensaer-BIM Frontend Dockerfile
# Multi-stage build for development and production
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base with dependencies
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# -----------------------------------------------------------------------------
# Stage 2: Development
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies including devDependencies
RUN npm ci

# Copy source (volumes will override in docker-compose)
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# -----------------------------------------------------------------------------
# Stage 3: Build production assets
# -----------------------------------------------------------------------------
FROM base AS builder

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build arguments for environment
ARG VITE_API_URL
ARG VITE_WS_URL

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 4: Production with nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
