# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies only (leverage Docker cache)
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public/ and uploads/ exist even when the repo has them gitignored
RUN mkdir -p /app/public/uploads

# Build the Next.js app with standalone output
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default port – override via PORT env var (Cloud Run sets this automatically)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the minimal standalone server produced by Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public/ is guaranteed to exist because we ran mkdir -p in the builder stage
COPY --from=builder /app/public ./public

# Copy the JSON data files used as the file-based database
# NOTE: These are baked into the image. For production use a real database.
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Ensure the uploads directory exists (writable by the app user)
# WARNING: uploads are NOT persisted across container restarts on Cloud Run.
# Mount a Cloud Storage FUSE volume or switch to GCS-based uploads for persistence.
RUN mkdir -p ./public/uploads && chown nextjs:nodejs ./public/uploads

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
