# ==============================================================================
# SAI Books – Production Hardened Multi-Stage Dockerfile
# Security Standards: CIS Docker Benchmark, Non-Root Execution, Minimal Attack Surface
# ==============================================================================

# Stage 1: Dependencies Cache
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# Stage 2: Application Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client and build Next.js application
RUN npx prisma generate
RUN npm run build

# Stage 3: Minimal Production Runner (Least Privilege)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install only curl for healthcheck and openssl for Prisma runtime
RUN apk add --no-cache openssl curl

# Create dedicated non-root system group and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set up permissions for cache and application files
RUN mkdir .next && chown nextjs:nodejs .next

# Copy built artifacts and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Switch to unprivileged non-root user
USER nextjs

EXPOSE 3000

# Periodic Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
