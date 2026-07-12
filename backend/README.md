# Anti-Kuddus Protocol — Backend

Node.js + Express + SQLite API powering the Class 7-B resistance. Serves all
six hackathon missions with role-based access (admin / student), a one-way
anonymity pipeline for complaints, a WebSocket SOS feed, and a **free RAG**
syllabus negotiator + fact-checker powered by the Google Gemini free tier.

## Stack

- **Node.js / Express** — REST API (ESM)
- **SQLite** — via Node's built-in `node:sqlite` (no database server to install;
  data lives in `backend/data/anti_kuddus.db`)
- **JWT** — roll-number auth with roles
- **ws** — real-time SOS broadcast to admins
- **Google Gemini free API** — embeddings (RAG retrieval) + generation, with a
  local keyword fallback when no key is configured

## Prerequisites

- **Node.js ≥ 22.5** (ships the built-in `node:sqlite` module — no separate
  database server required). Tested on Node 24.

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then edit values
```

Edit `.env` (optional):

- **Free RAG:** get a key at <https://aistudio.google.com/apikey> and set
  `GEMINI_API_KEY`. Leave blank to run the local fallback (no key needed).
- `SQLITE_FILE` can override the database file location (defaults to
  `backend/data/anti_kuddus.db`).

Create the schema and seed data (roster, rulebook, curriculum; embeddings are
precomputed if a Gemini key is present):

```bash
npm run db:setup
npm run db:seed
```

Run the server:

```bash
npm run dev      # auto-reload
# or
npm start
```

Server: <http://localhost:4000> · Health check: `GET /api/health`

## Tests

```bash
node scripts/smoke-logic.mjs   # DB-free: seat algorithm, hashing, RAG filter
node scripts/smoke-api.mjs     # end-to-end API (server must be running)
```

## Auth / demo accounts

| Roll | Who | PIN | Role |
|------|-----|-----|------|
| 00 | Rashid Sir | 0000 | admin |
| 02 | Biltu | 2222 | admin |
| 03 | Miltu | 3333 | admin |
| 04–18 | Students | 1004–1018 | student |
| 01 | **Kuddus** | — | **revoked (cannot log in)** |

## API

All routes are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Route | Role | Purpose |
|--------|-------|------|---------|
| POST | `/auth/login` | public | Roll-number + PIN login → JWT |
| GET | `/auth/me` | any | Current user |
| GET | `/complaints` | any | Admin: all + strike count. Student: only their own |
| POST | `/complaints` | student | File an anonymous complaint (roll hashed) |
| GET | `/seating/plan` | any | Computed seating grid (`?rows&cols&aisle`) |
| GET/PUT | `/seating/profile` | any | Read / set the caller's own height + vision/hearing |
| GET | `/ledger` | any | Entries + totals (cash, calories, converters) |
| POST | `/ledger` | student | Log a forced payment (amount) or stolen food |
| POST | `/syllabus/summarize` | student | RAG-filter syllabus + JSON study plan |
| GET | `/sos` | any | All SOS alerts |
| POST | `/sos` | student | Raise an SOS (broadcasts over WebSocket) |
| POST | `/sos/:id/ack` | admin | Acknowledge an alert |
| POST | `/factcheck` | student | Validate a claim → TRUE/FALSE + confidence + quote |

**WebSocket:** connect to `ws://localhost:4000/ws?token=<jwt>` to receive
`sos:new` and `sos:update` events in real time (admin dashboards).

## Mission → implementation map

- **M1 Whistleblower** — `routes/complaints.js`; SHA-256 roll hashing in
  `lib/crypto.js` (raw roll never stored). Admin/student visibility split.
- **M2 Seat Planner** — `lib/seatPlanner.js` line-of-sight algorithm + persisted
  `seat_profiles`.
- **M3 Syllabus Negotiator** — `services/rag.js`: Gemini embeddings retrieve the
  official curriculum context, generation cross-references + returns a JSON study
  plan. Local keyword fallback without a key.
- **M4 Corrupt Economy** — `routes/ledger.js`; student-entered amounts, aggregate
  totals + cricket-bat / jhalmuri converters.
- **M5 SOS** — `routes/sos.js` + `realtime.js` WebSocket broadcast.
- **M6 Fact-Checker** — `services/factcheck.js`: semantic embedding search over
  the rulebook (or string match), LLM verdict, styled card fields.

## Security notes

- **Never commit `.env`** — it's git-ignored. Keep `GEMINI_API_KEY` and
  `JWT_SECRET` out of version control (hackathon disqualification risk).
- The SQLite data file (`backend/data/`) is git-ignored too.
- Roll numbers are salted + hashed before storage; complaints cannot be
  reverse-engineered to a student.
