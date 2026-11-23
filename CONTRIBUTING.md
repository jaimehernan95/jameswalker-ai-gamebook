# Contributing to James Walker AI — Interactive Game-Book

Thank you for your interest in contributing! Whether you are fixing a bug, improving Three.js rendering, authoring a new interactive chapter scenario, or adding tests, this guide will get you running quickly.

## Local Development Setup

**Prerequisites:** Node.js `>= 20` (Node 22 recommended) and `npm`.

```bash
# 1. Fork and clone your repository
git clone https://github.com/<your-username>/jameswalker-ai-gamebook.git
cd jameswalker-ai-gamebook

# 2. Install dependencies (peer-dep flag resolves Vite 8 + esbuild optional peer ranges)
npm install --legacy-peer-deps

# 3. Optional: copy environment template (runs offline without an API key)
cp .env.example .env

# 4. Start the full-stack Express + Vite server on http://localhost:3000
npm run dev
```

## Project Structure

```text
server.ts                     # Express API, rate limiting, security headers & WebSocket mount
server/
  booksData.ts                # 4 playbooks, branching chapter graphs & unlock codes
  dispatchData.ts             # Living Dispatch feed, QR exercises & PDF checklist
  gemini.ts                   # Server-side @google/genai prompt evaluator + offline fallback
  liveBridge.ts               # WebSocket bridge for real-time Voice Mentor
src/
  three/gamebookScene.ts      # Procedural Three.js 3D Reading Studio & 1024x1408 book covers
  components/
    InteractiveBookSpread.tsx # 2-page tactile book spread, hand highlighter & tech case demos
    Header.tsx                # 3-zone top navigation bar
    VaultModal.tsx            # Buyer unlock key redemption modal
  pages/
    Studio3D.tsx              # Default 3D landing viewport & collapsible bottom dock
    BookShelf.tsx             # 2D library catalog view
    ChapterPlayer.tsx         # Branching scenario engine & Prompt Duel boss encounters
    PromptArena.tsx           # Live streaming prompt sandbox
    LivingDispatch.tsx        # Weekly AI updates, QR kit & PDF companion generator
    VoiceMentor.tsx           # Real-time PCM audio coaching interface
```

## Design & Engineering Conventions

- **Gallery Publishing Palette:** Keep UI surfaces aligned with Cool Alabaster (`#F6F7F9`), Pure White (`#FFFFFF`), Deep Obsidian (`#0F141E`), Graphite (`#4E5869`), Hairline Rule (`#DDE2EA`), Royal Cobalt (`#1D4ED8`), and Champagne Brass (`#B89352`).
- **Zero-Asset 3D Pipeline:** All Three.js textures, materials, geometry, and Web Audio paper-turn effects must remain 100% procedural (no unhosted external image/audio URLs). Always preserve the `isSoftwareGl` guard and `dispose()` cleanup.
- **Security & Privacy:** Never hardcode API keys or expose server secrets to `VITE_*` variables. Do not commit `.env`, `.data/`, or copyrighted source PDFs.
- **Chapter Graph Integrity:** Every choice card's `nextNodeId` in `server/booksData.ts` must resolve to an existing node in that chapter, and `GET /api/books` must return projected summaries without full node graphs.

## Verification Checklist Before Opening a PR

Run both checks locally — GitHub Actions CI executes the exact same commands:

```bash
npm run lint   # TypeScript strict typecheck (tsc --noEmit)
npm run build  # Production Vite client bundle
```

## Submitting a Pull Request

1. Create a focused branch from `main` (e.g., `feat/chapter-audio-mute` or `fix/mobile-spread-swipe`).
2. Keep commits clear and scoped using Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
3. Open a Pull Request using the repository PR template and attach a screenshot or short GIF for visual/3D changes.
