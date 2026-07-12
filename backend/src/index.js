import http from "node:http";
import express from "express";
import cors from "cors";
import { config, ragEnabled } from "./config.js";
import { assertDbConnection } from "./db.js";
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

// 404 + centralized error handler.
app.use((_req, res) => res.status(404).json({ error: "Not found." }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("API error:", err);
  res.status(500).json({ error: "Internal server error." });
});

const server = http.createServer(app);
attachWebSocket(server);

async function start() {
  await assertDbConnection();
  server.listen(config.port, () => {
    console.log(`Anti-Kuddus backend listening on http://localhost:${config.port}`);
    console.log(`  RAG (Gemini) syllabus/fact-check: ${ragEnabled ? "ENABLED" : "disabled (local fallback)"}`);
    console.log(`  WebSocket SOS feed: ws://localhost:${config.port}/ws`);
  });
}

start().catch((err) => {
  console.error("Failed to start backend:", err.message);
  process.exit(1);
});
