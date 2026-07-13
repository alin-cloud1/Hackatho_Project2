import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { config, ragEnabled, llmProvider } from "./config.js";
import { assertDbConnection } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { attachWebSocket } from "./realtime.js";

import authRoutes from "./routes/auth.js";
import complaintRoutes from "./routes/complaints.js";
import seatingRoutes from "./routes/seating.js";
import ledgerRoutes from "./routes/ledger.js";
import syllabusRoutes from "./routes/syllabus.js";
import sosRoutes from "./routes/sos.js";
import factcheckRoutes from "./routes/factcheck.js";

const app = express();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ragEnabled, time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/seating", seatingRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/factcheck", factcheckRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(__dirname, "..", "..", "frontend", "dist");
const serveClient = fs.existsSync(path.join(clientDir, "index.html"));

if (serveClient) {
  app.use(express.static(clientDir));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

app.use((_req, res) => res.status(404).json({ error: "Not found." }));
app.use((err, _req, res, _next) => {
  console.error("API error:", err);
  res.status(500).json({ error: "Internal server error." });
});

const server = http.createServer(app);
attachWebSocket(server);

async function start() {
  await assertDbConnection();
  await seedIfEmpty(); // fresh MongoDB? seed roster/rulebook/curriculum automatically
  server.listen(config.port, () => {
    const url = `http://localhost:${config.port}`;
    if (serveClient) {
      console.log(`Anti-Kuddus Protocol running (single server) on ${url}`);
      console.log(`  Full app + API served from one origin — open ${url}`);
    } else {
      console.log(`Anti-Kuddus backend (API only) listening on ${url}`);
      console.log(`  No frontend build found — run 'npm run build' to serve the app here too.`);
    }
    console.log(`  LLM/RAG syllabus + fact-check: ${ragEnabled ? `ENABLED via ${llmProvider}` : "disabled (local fallback)"}`);
    console.log(`  WebSocket SOS feed: ws://localhost:${config.port}/ws`);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err.message);
  process.exit(1);
});
