# Changelog

## [1.0.0] - 2026-11-19
### Added
- Tactile Ink & Paper editorial interface across Book Shelf, Chapter Player, Prompt Arena, and Gumroad Vault Modal.
- Route-level code splitting via `React.lazy` + `Suspense` and zero-CLS skeleton loaders.
- Single-batched `GET /api/books/:slug/bundle` and projected `GET /api/books` endpoints with `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
- Three playable AI playbooks with branching workplace scenarios, Chapter 1 free previews, and unlockable Chapter 2 campaigns.
- Server-side Prompt Boss Rubric Evaluator (`POST /api/evaluate`) and live SSE Streaming Prompt Sandbox (`POST /api/sandbox/stream`) backed by `@google/genai` (`gemini-4-hydrogen`) with offline rubric fallback when unconfigured.
- Offline-first `localStorage` persistence with 10-second debounced background progress sync (`POST /api/progress`).
- GitHub Actions CI workflow, PRD, TRD, Schema, and MIT License documentation.
