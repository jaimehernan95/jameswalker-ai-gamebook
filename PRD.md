# Product Requirements Document (PRD)

## Product
**Name:** James Walker AI — Interactive Game-Book  
**Companion Store:** `https://jameswalkerai.gumroad.com`

## Vision
Transform static AI prompt playbooks and career guides into an interactive, choose-your-own-adventure simulation where readers step into real workplace scenarios, craft or refine prompts under explicit constraints, receive structured rubric feedback, unlock Gumroad book chapters, and earn shareable rank badges.

## Target Users & Environment
Mobile and desktop readers on variable or slow cellular connections who expect instant page loads, zero layout shift, and seamless chapter transitions.

## Core Functional Requirements
1. **Playable Scenario Engine:** Branching decision trees presenting realistic workplace challenges, tactical choices with immediate consequences, and skill progression (`Clarity`, `Context`, `Constraint`, `Verification`).
2. **Live Prompt Boss & Sandbox (Server-Proxied):** Readers submit prompts evaluated by `gemini-4-hydrogen` on the server (`POST /api/evaluate`) for a 0–100 rubric score and 2 concrete improvements, plus real-time SSE streaming in the Prompt Arena (`POST /api/sandbox/stream`).
3. **Book Vault & Gumroad Bridge:** Catalog of 3 James Walker AI playbooks with free Chapter 1 previews, direct Gumroad deep links, and license key redemption (`POST /api/unlock`).
4. **Offline-First Progress & Streak Tracker:** Immediate synchronous persistence in `localStorage` with debounced background sync (`<= 1 write per 10 seconds`) and daily reading streak tracking.
