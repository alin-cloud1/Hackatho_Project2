---
title: Anti-Kuddus Protocol
emoji: 🛡️
colorFrom: indigo
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# Anti-Kuddus Protocol — Hackathon BAIUST 2026

A full-stack web app for the Class 7-B resistance: log Captain Kuddus's tyranny,
land the three anonymous strikes, and get him impeached. Six missions, a
role-based UI, a Node/SQLite backend, and a free LLM-powered RAG syllabus
negotiator (Groq or Gemini) — all served from **one Express server on one port**.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Node.js + Express + built-in `node:sqlite` (zero-install DB)
- **Realtime:** WebSocket SOS broadcast
- **RAG/LLM:** Groq or Google Gemini (free tier) with a local keyword fallback

## Run locally
```bash
npm run setup     # install everything + create & seed the SQLite DB
npm run dev       # dev mode: backend :4000 + frontend :5173 (hot reload)
# or
npm start         # single server: builds the frontend, serves app + API on :4000
```

Demo logins — **Admins:** Rashid Sir `00/0000`, Biltu `02/2222`, Miltu `03/3333`.
**Students:** rolls `04`–`18`, PINs `1004`–`1018`. Kuddus (`01`) is permanently locked out.

## Enable real LLM RAG (free)
Set **one** provider key in `backend/.env` — or, on Hugging Face, as a Space **secret**:
- **Groq (recommended):** free key at <https://console.groq.com/keys> → `GROQ_API_KEY=...`
- **Gemini (alternative):** free key at <https://aistudio.google.com/apikey> → `GEMINI_API_KEY=...`

Without a key, the syllabus negotiator + fact-checker use a local heuristic fallback.

## Deployment (this Space)
This repo ships a `Dockerfile` that builds the frontend and runs the backend as a
single container on port `7860`. Hugging Face builds and runs it automatically.
Set `GROQ_API_KEY` (or `GEMINI_API_KEY`) and ideally `JWT_SECRET` as Space **secrets**.

> Note: the free tier's filesystem is ephemeral, so logged complaints/ledger/SOS
> data resets when the Space restarts. The roster, rulebook, and curriculum are
> re-seeded automatically on boot.
