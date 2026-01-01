# ============================================================================
# CloudOps API Gateway - TypeScript Service
# Multi-stage Docker build for production
# ============================================================================

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm build

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership to non-root user
RUN chown -R appuser:nodejs /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "dist/server.js"]
