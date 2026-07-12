import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 4000,
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    secret: process.env.JWT_SECRET || "dev-insecure-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  },
  rollHashSalt: process.env.ROLL_HASH_SALT || "anti-kuddus-protocol-v1",
  db: {
    // SQLite database file (built-in node:sqlite). Defaults to backend/data/anti_kuddus.db.
    file: process.env.SQLITE_FILE || "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    genModel: process.env.GEMINI_GEN_MODEL || "gemini-1.5-flash",
    embedModel: process.env.GEMINI_EMBED_MODEL || "text-embedding-004",
  },
};

export const ragEnabled = Boolean(config.gemini.apiKey);
