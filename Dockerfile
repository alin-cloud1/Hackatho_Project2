# Anti-Kuddus Protocol — single-container full-stack image.
# Stage 1 builds the React frontend; stage 2 runs the Express backend which
# serves that build + the API on ONE port (Hugging Face Spaces default: 7860).
#
# Requires a MongoDB connection: set MONGODB_URI (e.g. a MongoDB Atlas cluster)
# as a runtime secret. The backend auto-seeds the database on first boot.

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
    SEED_EMBEDDINGS=false \
    MONGODB_DB=anti_kuddus

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./

# Bring in the compiled frontend so the backend can serve it (single origin).
COPY --from=build /build/frontend/dist /app/frontend/dist

EXPOSE 7860

# Auto-seeds the database on first boot (seedIfEmpty), then starts the server.
CMD ["node", "src/index.js"]
