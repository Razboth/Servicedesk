# Production Dockerfile for Bank SulutGo ServiceDesk - Linux Server Optimized
# Multi-stage build for minimal image size and security

# Stage 1: Dependencies
FROM node:20-alpine AS deps
LABEL stage=builder
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with production optimizations
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Install Prisma separately
RUN npm install prisma @prisma/client

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js with standalone output for minimal size
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=1

# Build the application
RUN npm run build

# Stage 3: Production Runner - Optimized for Linux Server
FROM node:20-alpine AS runner
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl \
    tini \
    ca-certificates \
    tzdata

WORKDIR /app

# Set timezone (Asia/Makassar for Bank SulutGo)
ENV TZ=Asia/Makassar
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create non-root user with specific UID/GID for consistency
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Create necessary directories with proper permissions
RUN mkdir -p \
    /app/uploads \
    /app/logs \
    /app/certificates \
    /app/.next/cache && \
    chown -R nextjs:nodejs \
    /app/uploads \
    /app/logs \
    /app/certificates \
    /app/.next

# Set production environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME="0.0.0.0" \
    NODE_OPTIONS="--max-old-space-size=2048"

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 4000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Use tini as init system to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"]