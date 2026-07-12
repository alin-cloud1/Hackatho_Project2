# Anti-Kuddus Protocol — Frontend

Class 7-B's resistance HQ. A React frontend covering all six hackathon missions
(Whistleblower Portal, Seat Planner, Syllabus Negotiator, Corrupt Economy Ledger,
SOS Rescue Flare, Fact-Checker) at both baseline and advanced-engineering tiers.

This is the **frontend only**. It currently runs entirely against local mock data
and browser storage — no backend exists yet.

## Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- React Router v7 for client-side routing
- Recharts for the ledger's charts
- lucide-react for icons

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL. Log in with any roll number from the demo roster:

| Roll | Name | PIN |
|---|---|---|
| 01 | Kodu Kuddus | 1111 |
| 02 | Biltu Rahman | 2222 |
| 03 | Miltu Hasan | 3333 |
| 04–18 | others | 1004–1018 (PIN = `10` + roll) |

Full roster: [`src/data/mockData.ts`](src/data/mockData.ts).

```bash
npm run build   # production build
npm run lint    # oxlint
```

## Architecture

```
src/
  types.ts              shared TypeScript types
  data/mockData.ts       roster, rulebook, calorie table, curriculum topics
  state/AppStateContext  global app state (auth session + complaints/ledger/SOS),
                          persisted to localStorage/sessionStorage
  lib/
    crypto.ts             SHA-256 anonymity hashing (Mission 1)
    exif.ts                canvas re-encode to strip photo EXIF (Mission 1)
    seatPlanner.ts         line-of-sight seating algorithm (Mission 2)
    llm.ts                  syllabus RAG-style filter + study plan builder (Mission 3)
    factCheck.ts            claim matcher, exact + semantic-lite (Mission 6)
  components/            Layout/Sidebar, StrikeMeter, shared UI primitives
  pages/                  one page per mission + Login + Dashboard
```

Routing is a single `<Layout>` shell wrapping all mission pages behind a
`RequireAuth` guard in [`App.tsx`](src/App.tsx); `/login` is the only public route.

## What's real vs. mocked (and why)

Every mission's **baseline** requirement is fully functional against local state —
forms submit, data persists across reloads (`localStorage`), and every page reflects
live shared state (e.g. logging a complaint immediately moves the strike meter on
the dashboard).

The **advanced engineering** tier is implemented as genuine client-side logic
wherever the algorithm itself is the deliverable, and as a clearly-labeled local
stand-in wherever the real feature requires a server or paid API:

| Mission | Advanced feature | Status |
|---|---|---|
| M1 | Anonymity pipeline | **Real** — SHA-256 (Web Crypto API) hashes the roll number client-side before it's stored; raw roll number never enters a complaint record |
| M1 | EXIF stripping | **Real** — photo is re-rasterized through an off-screen `<canvas>`, which drops all metadata |
| M2 | Line-of-sight algorithm | **Real** — geometric sightline calculation + auto-swap resolver, see [`seatPlanner.ts`](src/lib/seatPlanner.ts) |
| M2 | Dynamic constraints (aisles, impairment) | **Real** — configurable aisle column, accessibility-first seating |
| M3 | RAG-style filtering | **Mocked** — local term-overlap scoring against a curriculum topic list stands in for a real embedding/LLM call. Swap [`lib/llm.ts`](src/lib/llm.ts) for a real API; the function signature (`summarizeSyllabus(text, date) → SyllabusResult`) is designed to stay stable |
| M3 | JSON study plan | **Real** — deterministic day-by-day scheduler once topics are filtered |
| M4 | Caloric/currency engines | **Real** — pure arithmetic over the ledger |
| M5 | Real-time broadcast | **Simulated** — same-tab shared state stands in for WebSocket/Web Push (no backend to broadcast to yet). UI includes a "simulate offline" toggle to demo the queue/sync path |
| M5 | Offline resilience | **Real** — alerts queue on `navigator.onLine === false` and flush automatically on the browser's `online` event |
| M6 | Semantic fact-check | **Mocked** — keyword-overlap scoring stands in for real embeddings. Swap [`lib/factCheck.ts`](src/lib/factCheck.ts); call shape is unchanged |

**Trade-off rationale:** the algorithmic missions (seating, offline queueing,
hashing/EXIF) don't need a backend to be "real" — they're implemented properly now.
The missions that inherently require a server (LLM/embedding API calls, a
multi-device WebSocket broadcast) are stubbed with local heuristics that produce
plausible, demo-ready output, behind an interface designed so the backend can be
dropped in later without touching any page component.

## Environment variables

No API keys are required yet. `.env.example` documents the variables the backend
integration will need (`VITE_API_BASE_URL`, `VITE_LLM_API_KEY`). Copy it to `.env`
when wiring up the backend — `.env` is git-ignored.

## Known gaps / next steps

- No backend: all data lives in `localStorage`/`sessionStorage` per browser, not
  shared across devices.
- SOS "real-time broadcast" only feels real within one browser tab/session — needs
  a WebSocket server to actually broadcast across Biltu's and Miltu's devices.
- Syllabus and fact-check "AI" are local heuristics, not real LLM/embedding calls.
- No automated test suite yet.
