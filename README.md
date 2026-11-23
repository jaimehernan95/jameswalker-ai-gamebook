# James Walker AI — Interactive Game-Book

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-141413?style=flat-square)
![React](https://img.shields.io/badge/React-19-D94E1F?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-141413?style=flat-square)
![CI](https://img.shields.io/badge/CI-typecheck%20%2B%20build-141413?style=flat-square)

<img src="./assets/demo.gif" alt="James Walker AI Interactive Game-Book Simulation" width="720" />

Companion interactive web application to [jameswalkerai.gumroad.com](https://jameswalkerai.gumroad.com). Transforms static AI prompt playbooks and career guides into a tactile, mobile-first workplace simulation with live Stakeholder Trust, Deadline, and AI Leverage meters, simulated AI terminal previews, and server-proxied Gemini prompt duels.

## Interactive Simulation Features

- **Simulation HUD & Telemetry:** Live **Stakeholder Trust** (0–100%), **Time to Deadline**, and **AI Leverage Score** meters that shift dynamically on every tactical move.
- **Tactile Prompt Card Deck & Simulated Terminal:** Every choice displays Risk/Reward tags and runs an instant `0ms` client-side typewriter simulation showing the dispatched prompt, token efficiency ratio, and stakeholder reaction.
- **Live Prompt Duel (Boss Encounter):** Real-time `0ms` 3-constraint keystroke checklist (`Role & Audience`, `Output Format`, `Edge-Case Guardrail`) before executing against `/api/evaluate`, complete with an ink-press **Simulation Outcome Stamp** (`APPROVED FOR PROD`, `PROMOTED`, `NEEDS REVISION`).
- **Interactive 3D Press Vault (Three.js):** Full-bleed WebGL studio featuring a 10-part procedural editorial press & hardcover folio monument, three clickable 3D playbook pedestals, 48 instanced orbiting glyph tiles, exploded-view slider, material finishes, and damped camera presets.
- **Live Voice Mentor (`gemini-3.8-live`):** Real-time bidirectional voice coaching over `/api/live` WebSocket (`16kHz` PCM capture, `24kHz` gapless scheduled playback, instant barge-in interruption handling, live waveform monitor, and transcript log).
- **AI for Online Work (2026 Interactive Edition):** Flagship 3-chapter playable companion to James Walker's 14-chapter roadmap (RCTS prompting, KDP/Gumroad compliance, Merchant of Record VAT, and Client-First freelance pitches).
- **Living Dispatch & Printable PDF QR Kit (`?route=dispatch`):** Free weekly/monthly AI context feed, reader newsletter capture, author dispatch composer, and live vector SVG QR generator linking PDF chapters directly to interactive drills (`?book=ai-for-online-work&ch=1`).
- **Built-In Demo Preview (`?demo=1`):** Append `?demo=1` to the URL (or click **Auto-Play Simulation Preview**) to play a deterministic 12-second showcase loop for recording `./assets/demo.gif`.

## Architecture Overview

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Three.js with route-level `React.lazy` splitting (`BookShelf`, `ChapterPlayer`, `PromptArena`, `LivingDispatch`, `Studio3D`, `VoiceMentor`, `VaultModal`).
- **Backend:** Express + Vite middleware (`server.ts`) keeping `GEMINI_API_KEY` strictly server-side using `@google/genai`.
- **Offline-First & Zero Waterfalls:**
  - `GET /api/books` returns projected summary columns only.
  - `GET /api/books/:slug/bundle` delivers book metadata + full Chapter 1 node graph in one batched response (`Cache-Control: public, max-age=3600, stale-while-revalidate=86400`).
  - Standard tactical card transitions run 100% locally in memory (`0ms` transitions) and persist immediately to `localStorage` with debounced background sync (`<= 1 write per 10s`).

## Local Quick Start

```bash
npm install && npm run dev
```

Open `http://localhost:3000` (or `http://localhost:3000/?demo=1` to auto-play the 12-second preview).

### Environment Variables

Copy `.env.example` to `.env` and configure:

- `GEMINI_API_KEY`: Server-side Gemini API key (if omitted, `/api/evaluate` falls back to a deterministic offline rubric).
- `APP_URL`: Public application URL when deployed.

## Deploy Free in 2 Minutes (Render.com)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/jaimehernan95/jameswalker-ai-gamebook)

1. Push this repository to `https://github.com/jaimehernan95/jameswalker-ai-gamebook` using the commands below.
2. Click **Deploy to Render** above (or go to [render.com](https://render.com) → **New + → Blueprint** and select `jaimehernan95/jameswalker-ai-gamebook`).
3. Render reads `render.yaml` automatically (`plan: free`, `healthCheckPath: /api/health`).
4. Paste your free `GEMINI_API_KEY` when prompted and click **Apply**.
5. Copy your permanent live URL (e.g., `https://jameswalker-ai-gamebook.onrender.com`) and paste it into **Living Dispatch → PDF Revamp & QR Kit** to generate your final PDF QR codes.

## Push to GitHub

To push this full project (excluding `.env`, `.data/`, and any private PDFs via `.gitignore`) to your repository:

```bash
git init
git add .
git commit -m "feat: 2026 interactive game-book, living dispatch, QR kit, and Render deploy config"
git branch -M main
git remote add origin https://github.com/jaimehernan95/jameswalker-ai-gamebook.git
git push -u origin main
```

## Demo Unlock Keys

- `ONLINEWORK-2026` — Unlocks *AI for Online Work (2026 Interactive Edition)*
- `WALKER9TO5` — Unlocks *ChatGPT for Your 9-to-5*
- `ARCHITECT-KEY` — Unlocks *AI Workflow Architect*
- `MANUAL-2026` — Unlocks *Prompt Engineering Field Manual*
- `JAMESWALKER-PRO` — Unlocks all playbooks in the vault
