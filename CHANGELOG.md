# Changelog

All notable changes to **James Walker AI — Interactive Game-Book** are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-11-22

### Added
- **3D Virtual Reading Studio Landing Experience:** Promoted the Three.js gallery studio to the default homepage featuring all 4 hardcover volumes on a stepped architectural dais with `1024×1408` procedural covers, printed spine titles, exploded book-anatomy slider, and **Gallery / Obsidian / Atelier** lighting moods.
- **Tactile Interactive Open Book Spread:** Added a physical two-page book modal with 3D perspective page turns, synthesized Web Audio paper-rustle sound, persistent **Hand Highlighter** markers (Amber, Cobalt, Sage, Eraser + Margin Notes drawer), and per-book **Before/After Tech Case Demos & Micro-Exercises**.
- **2 Free Playable Chapters Across All 4 Volumes:** Expanded free access so Chapters 1 & 2 are playable out-of-the-box on every playbook while Chapter 3 unlocks via Gumroad keys.
- **Launch & Open-Source Tooling:** Added full OpenGraph/Twitter Card metadata, Schema.org `WebApplication` JSON-LD, standalone `1280×640` social preview template (`assets/og-preview.html`), and GitHub Issue/PR templates.

### Changed
- **Gallery Publishing Palette:** Upgraded the interface across all pages to Cool Alabaster (`#F6F7F9`), Deep Obsidian (`#0F141E`), Royal Cobalt (`#1D4ED8`), and Champagne Brass (`#B89352`).
- **CI & Deploy Compatibility:** Resolved Vite 8 + esbuild peer dependency installation in `.github/workflows/ci.yml`, `render.yaml`, and `Dockerfile`.

### Security
- Added placeholder API key guards (`demo`, `test`, `placeholder`) so offline rubric fallback triggers cleanly without upstream `400` errors.
- Added per-IP rate limiting and payload length caps across public write endpoints (`/api/unlock`, `/api/progress`, `/api/dispatches`, `/api/newsletter/subscribe`), sanitized upstream error responses, and added baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`).

## [1.0.0] - 2026-11-19

### Added
- Initial public release of the interactive game-book companion platform to `jameswalkerai.gumroad.com`.
- Branching workplace simulation engine (`ChapterPlayer`) with live Stakeholder Trust, Deadline, and AI Leverage HUD meters.
- Server-side Prompt Boss Rubric Evaluator (`POST /api/evaluate`) and SSE Streaming Prompt Arena (`POST /api/sandbox/stream`) backed by `@google/genai` with deterministic offline fallback.
- Real-time bidirectional Voice Mentor over WebSockets (`/api/live`) with `16kHz` PCM capture and `24kHz` gapless playback.
- Living AI Dispatch feed, printable PDF QR exercise generator, and browser-side Companion PDF export (`jsPDF`).
- Offline-first `localStorage` persistence with debounced progress sync (`POST /api/progress`) and Render free-tier deployment blueprint (`render.yaml`).
