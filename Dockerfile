# Anti-Kuddus Protocol — single-container full-stack image.
# Stage 1 builds the React frontend; stage 2 runs the Express backend which
# serves that build + the API on ONE port (Hugging Face Spaces default: 7860).

# ---- Stage 1: build the frontend ----
FROM node:24-slim AS build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Uses .env.production (relative API base) → same-origin single-server build.
RUN npm run build

# ---- Stage 2: runtime (backend + built frontend) ----
FROM node:24-slim
ENV NODE_ENV=production \
    PORT=7860 \
    SEED_EMBEDDINGS=false

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# Bring in the compiled frontend so the backend can serve it (single origin).
COPY --from=build /build/frontend/dist /app/frontend/dist

# SQLite needs a writable data dir. HF Spaces run as a non-root user.
RUN mkdir -p /app/backend/data && chmod -R 777 /app/backend/data

EXPOSE 7860

# On first boot, create + seed the SQLite DB, then start the single server.
CMD ["sh", "-c", "if [ ! -f data/anti_kuddus.db ]; then node scripts/setup-db.js && node scripts/seed-db.js; fi; node src/index.js"]
