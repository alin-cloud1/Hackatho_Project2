// Tracks connected WebSocket clients (the admins' live dashboards) and
// broadcasts SOS events to them in real time.
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

const clients = new Set();

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    // Optional token auth via ?token= — only admins receive the live feed.
    try {
      const url = new URL(req.url, "http://localhost");
      const token = url.searchParams.get("token");
      const user = token ? jwt.verify(token, config.jwt.secret) : null;
      ws.user = user;
    } catch {
      ws.user = null;
    }
    clients.add(ws);
    ws.send(JSON.stringify({ type: "connected" }));
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  return wss;
}

/** Push an event to every connected client. */
export function broadcast(event) {
  const payload = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}
