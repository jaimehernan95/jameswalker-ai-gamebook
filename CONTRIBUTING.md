# Contributing

Thank you for contributing to the **James Walker AI — Interactive Game-Book** codebase.

## Workflow
1. Fork the repository and create a feature branch (`git checkout -b feat/new-chapter`).
2. Install dependencies with `npm install`.
3. Run the local full-stack server with `npm run dev`.
4. Before opening a pull request, verify:
   - Typecheck passes cleanly: `npm run lint`
   - Production bundle compiles: `npm run build`
   - New chapter graphs contain no dead-end `nextNodeId` references and preserve projected list payloads on `GET /api/books`.

## Design & Performance Conventions
- Keep the **Tactile Ink & Paper** palette (`#FAF9F6`, `#141413`, `#D94E1F`, `#E2E0D8`).
- Avoid exposing secrets or API keys in client code.
- Maintain zero-waterfall single-bundle chapter loads and client-side `localStorage` versioned caching.
