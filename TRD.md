# Technical Requirements Document (TRD)

## 1. Zero Waterfall & Minimum Requests
- `GET /api/books/:slug/bundle` delivers a book's summary metadata, table of contents, and full Chapter 1 branching node graph in a single batched JSON response.
- Hovering or focusing a book card on `BookShelf` silently prefetches its Chapter 1 bundle into `localStorage` and memory (`prefetchBookBundle`).
- Standard tactical choices inside `ChapterPlayer` transition 100% locally in memory with zero network calls.

## 2. Column Projection Only
- `GET /api/books` projects strictly list-display fields (`id`, `slug`, `title`, `subtitle`, `gumroad_url`, `cover_thumb_url`, `total_chapters`, `free_chapters`, `est_minutes`, `difficulty`, `category`, `version`).
- Full `nodes` graphs are returned only on chapter/bundle routes.

## 3. Route-Level Code Splitting
- `BookShelf`, `ChapterPlayer`, `PromptArena`, and `VaultModal` are loaded via `React.lazy` and `Suspense` with exact-height skeleton fallbacks (`CLS = 0`).

## 4. Multi-Layer Caching & Persistence
- Static read endpoints set `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`.
- Client chapter bundles are version-keyed in `localStorage` (`jwai_chapter_v1_${slug}_ch${num}_v${version}`).
- Player XP, streaks, skills, and unlock codes persist synchronously in `localStorage` (`0ms` UI update) and flush to `POST /api/progress` via a 10-second debounced background sync (`navigator.sendBeacon` on tab hide).

## 5. Server-Side AI Security & Rate Limiting
- `GEMINI_API_KEY` is read exclusively in `server/gemini.ts` and never bundled to the client.
- `POST /api/evaluate` and `POST /api/sandbox/stream` enforce a per-IP sliding-window rate limit (25 requests/minute).
