# James Walker AI — Interactive 3D Game-Book

[![Live Demo](https://img.shields.io/badge/Live_Demo-jameswalker--ai--gamebook.onrender.com-1D4ED8?style=flat-square&logo=render&logoColor=white)](https://jameswalker-ai-gamebook.onrender.com)
[![CI](https://github.com/jaimehernan95/jameswalker-ai-gamebook/actions/workflows/ci.yml/badge.svg)](https://github.com/jaimehernan95/jameswalker-ai-gamebook/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-0F141E?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-0F141E?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_Studio-0F141E?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)

**An open-source 3D virtual reading studio and interactive AI game-book engine that turns static PDF playbooks into tactile, playable workplace simulations with hand-highlighted pages, live prompt grading, and real-time voice coaching.**

Built as the live interactive companion to [jameswalkerai.gumroad.com](https://jameswalkerai.gumroad.com) for readers learning practical AI skills and developers building interactive publishing experiences.

---

### Demo Preview

> **Recording your 12-second Demo GIF (`assets/demo.gif`)**
>
> Replace this callout with `<img src="./assets/demo.gif" alt="James Walker AI 3D Reading Studio Demo" width="760" />` once captured:
>
> 1. Open **[`https://jameswalker-ai-gamebook.onrender.com`](https://jameswalker-ai-gamebook.onrender.com)** (or run locally and visit `http://localhost:3000/?demo=1` for the built-in 12s auto-play simulation).
> 2. Resize your browser window to **`1280×720`** (16:9).
> 3. Record a crisp 10–14 second clip at **15 fps** using [Kap](https://getkap.co/) (macOS), [ScreenToGif](https://www.screentogif.com/) (Windows), or `ffmpeg`:
>    - **0–3s:** Orbit across the 4 hardcover books in the **3D Studio** and click *AI for Online Work*.
>    - **3–7s:** Click **Open Interactive Pages**, drag the **Hand Highlighter** across a key passage, and flip to **Pages 03–04** (toggle *Naive Prompt* → *2026 Framework*).
>    - **7–12s:** Launch **Play Ch. 1 Free** and score a prompt in the **Prompt Duel**.
> 4. Save the compressed file (< 5 MB) to `assets/demo.gif` and commit.

---

## 1-Command Quick Start

Run the full-stack app locally in under 30 seconds (no API key required — offline scoring rubric works out of the box):

```bash
git clone https://github.com/jaimehernan95/jameswalker-ai-gamebook.git && cd jameswalker-ai-gamebook && npm install --legacy-peer-deps && npm run dev
```

Open **[`http://localhost:3000`](http://localhost:3000)** in your browser.

---

## Key Features

- **3D Virtual Reading Studio (Three.js):** Procedural 6-part hardcover models for all 4 volumes (*AI for Online Work*, *ChatGPT for Your 9-to-5*, *AI Workflow Architect*, and *Prompt Engineering Manual*) with `1024×1408` high-DPI covers, printed spines, exploded book-anatomy slider, damped camera focus presets, and **Gallery / Obsidian / Atelier** lighting moods.
- **Hands-On Interactive Book Spread:** Realistic 2-page physical book reader with 3D perspective page turns, procedural Web Audio paper-rustle sound, persistent **Hand Highlighter** markers (Amber, Cobalt, Sage, Eraser + Margin Notes), and per-book **Before/After Tech Case Demos & Micro-Exercises**.
- **2 Free Playable Chapters Per Book:** Branching workplace simulations featuring live **Stakeholder Trust**, **Time to Deadline**, and **AI Leverage** HUD meters plus instant `0ms` simulated terminal outputs.
- **AI Prompt Duel & Streaming Arena:** Server-proxied prompt grading (`POST /api/evaluate`) and SSE streaming (`POST /api/sandbox/stream`) via `@google/genai`, with a deterministic offline rubric fallback when `GEMINI_API_KEY` is unset.
- **Real-Time Voice Mentor:** Bidirectional WebSocket voice coaching (`/api/live`) with `16kHz` PCM microphone capture, `24kHz` gapless audio playback, barge-in interruption handling, and live transcripts.
- **Living Dispatch & PDF QR Companion Kit:** Weekly/monthly AI update feed, vector SVG QR exercise generator (`?book=ai-for-online-work&ch=1`), and browser-side printable PDF companion builder (`jsPDF`).

---

## Environment Variables (Optional)

Copy `.env.example` to `.env` if you want to enable live AI grading, Prompt Arena streaming, and Voice Mentor locally:

```bash
cp .env.example .env
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Optional | Server-side Google Gemini API key (free tier via [Google AI Studio](https://aistudio.google.com/apikey)). Kept strictly on the Express server. If blank or `demo`, the app uses its built-in offline rubric. |
| `APP_URL` | Optional | Public URL used for canonical links and QR deep-links (defaults to `http://localhost:3000`). |
| `PORT` | Optional | HTTP server port (defaults to `3000`). |

---

## Architecture Overview

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Three.js (`RoomEnvironment` PMREM + software-WebGL detection), and route-level `React.lazy` code splitting.
- **Backend:** Express + `ws` (`server.ts`) mounting Vite middleware in development and serving immutable hashed assets from `dist/` in production.
- **Zero-Waterfall Data Design:**
  - `GET /api/books` — projected book catalog summaries only.
  - `GET /api/books/:slug/bundle` — batched metadata, TOC, and Chapter 1 node graph with `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
  - `POST /api/progress` — offline-first `localStorage` state with debounced background sync.

---

## Deploy Your Own (Free Tier)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jaimehernan95/jameswalker-ai-gamebook)

1. Click **Deploy to Render** above (reads `render.yaml` automatically with health check `/api/health`).
2. Paste your `GEMINI_API_KEY` (or leave as `demo` to run with the offline rubric immediately).
3. Your live instance builds and launches automatically.

### Demo Vault Unlock Keys (Chapter 3)

Chapters 1 & 2 are free across all 4 books. To test Chapter 3 vault unlocking locally or on the live demo:

- `ONLINEWORK-2026` — *AI for Online Work (2026 Interactive Edition)*
- `WALKER9TO5` — *ChatGPT for Your 9-to-5*
- `ARCHITECT-KEY` — *AI Workflow Architect*
- `MANUAL-2026` — *Prompt Engineering Field Manual*
- `JAMESWALKER-PRO` — Unlocks all 4 volumes

---

## Contributing

Contributions are welcome! Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup, design conventions, and good first issues.

## License

This project is open source under the **MIT License** — see [LICENSE](./LICENSE) for full details.
