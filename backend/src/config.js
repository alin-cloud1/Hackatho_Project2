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
    url: process.env.DATABASE_URL || "",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    // Free, reliable models. llama-3.3-70b is high quality; -8b-instant is faster.
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    // Current free-tier models (gemini-1.5-* were retired). Override via .env.
    genModel: process.env.GEMINI_GEN_MODEL || "gemini-2.0-flash",
    embedModel: process.env.GEMINI_EMBED_MODEL || "text-embedding-004",
  },
};

// Pick the LLM provider: explicit override, else Groq if its key is set, else
// Gemini if its key is set, else none (local heuristic fallback everywhere).
export const llmProvider =
  process.env.LLM_PROVIDER ||
  (config.groq.apiKey ? "groq" : config.gemini.apiKey ? "gemini" : "none");

config.llm = { provider: llmProvider };

export const llmEnabled = llmProvider !== "none";
// Only Gemini offers an embeddings endpoint; Groq is generation-only.
export const embeddingsEnabled = llmProvider === "gemini" && Boolean(config.gemini.apiKey);
// Back-compat alias used across the codebase.
export const ragEnabled = llmEnabled;
