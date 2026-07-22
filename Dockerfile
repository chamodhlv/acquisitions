# ============================================================
# Multi-stage Dockerfile for the Acquisitions Node.js App
# ============================================================

# ---------- Stage 1: Base ----------
FROM node:22-alpine AS base
WORKDIR /app
# Copy package files first for better layer caching
COPY package.json package-lock.json ./


# ---------- Stage 2: Development ----------
FROM base AS development
ENV NODE_ENV=development
# Install ALL dependencies (including devDependencies)
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "--watch", "src/index.js"]


# ---------- Stage 3: Production ----------
FROM base AS production
ENV NODE_ENV=production
# Install only production dependencies for a leaner image
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
# Run migrations then start server
CMD ["npm", "start"]
