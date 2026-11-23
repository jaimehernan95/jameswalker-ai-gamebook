import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { WebSocketServer } from 'ws';
import {
  getBookBundle,
  getChapterBundle,
  getProjectedBooks,
  SANDBOX_PRESETS,
  UNLOCK_CODES,
} from './server/booksData.ts';
import {
  dispatchStore,
  PDF_REVAMP_CHECKLIST,
  QR_EXERCISES,
} from './server/dispatchData.ts';
import {
  claimAuthorPasscode,
  getAuthorAuthStatus,
  verifyAuthorBearerHeader,
  verifyAuthorPasscode,
} from './server/authorAuth.ts';
import { evaluatePromptChallenge, streamSandboxPrompt } from './server/gemini.ts';
import { attachLiveBridge } from './server/liveBridge.ts';
import { progressStore } from './server/progressStore.ts';
import type { DispatchIssue, ReaderProgress } from './src/types/gamebook.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const CACHE_READ_HEADER = 'public, max-age=3600, stale-while-revalidate=86400';

// Lightweight sliding-window rate limiter per IP for API endpoints
const rateWindows = new Map<string, number[]>();
function isRateLimited(ip: string, limit = 25, windowMs = 60_000): boolean {
  const now = Date.now();
  if (rateWindows.size > 1000) {
    for (const [key, list] of rateWindows.entries()) {
      const fresh = list.filter((t) => now - t < windowMs);
      if (fresh.length === 0) rateWindows.delete(key);
      else rateWindows.set(key, fresh);
    }
  }
  const stamps = (rateWindows.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= limit) {
    rateWindows.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  rateWindows.set(ip, stamps);
  return false;
}

const READER_ID_RE = /^[a-zA-Z0-9_-]{4,64}$/;

function clampInt(val: unknown, min: number, max: number, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeStringArray(val: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .slice(0, maxItems)
    .filter((item): item is string => typeof item === 'string')
    .map((s) => s.trim().slice(0, maxLen))
    .filter(Boolean);
}

function sanitizeReaderProgress(raw: unknown): ReaderProgress | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const readerId = typeof obj.readerId === 'string' ? obj.readerId.trim() : '';
  if (!READER_ID_RE.test(readerId) || typeof obj.xp !== 'number' || !Number.isFinite(obj.xp)) {
    return null;
  }

  const rawSkills =
    obj.skills && typeof obj.skills === 'object' ? (obj.skills as Record<string, unknown>) : {};
  const earnedRanks = Array.isArray(obj.earnedRanks)
    ? obj.earnedRanks.slice(0, 64).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const r = entry as Record<string, unknown>;
        return [
          {
            bookSlug: String(r.bookSlug ?? '').slice(0, 64),
            chapterNum: clampInt(r.chapterNum, 1, 99, 1),
            rankTitle: String(r.rankTitle ?? '').slice(0, 80),
            badgeCode: String(r.badgeCode ?? '').slice(0, 40),
            earnedAt: String(r.earnedAt ?? new Date().toISOString()).slice(0, 40),
          },
        ];
      })
    : [];

  const bookStates: ReaderProgress['bookStates'] = {};
  if (obj.bookStates && typeof obj.bookStates === 'object' && !Array.isArray(obj.bookStates)) {
    const entries = Object.entries(obj.bookStates as Record<string, unknown>).slice(0, 20);
    for (const [slug, stateVal] of entries) {
      if (!/^[a-z0-9-]{2,64}$/.test(slug) || !stateVal || typeof stateVal !== 'object') continue;
      const st = stateVal as Record<string, unknown>;
      const rawHud = st.hud && typeof st.hud === 'object' ? (st.hud as Record<string, unknown>) : {};
      const history = Array.isArray(st.history)
        ? st.history.slice(-30).flatMap((h) => {
            if (!h || typeof h !== 'object') return [];
            const item = h as Record<string, unknown>;
            return [
              {
                nodeId: String(item.nodeId ?? '').slice(0, 64),
                choiceLabel: String(item.choiceLabel ?? '').slice(0, 200),
                consequence: String(item.consequence ?? '').slice(0, 400),
                xpDelta: clampInt(item.xpDelta, -500, 1000, 0),
              },
            ];
          })
        : [];
      bookStates[slug] = {
        chapterNum: clampInt(st.chapterNum, 1, 99, 1),
        currentNodeId: String(st.currentNodeId ?? '').slice(0, 64),
        hud: {
          trust: clampInt(rawHud.trust, 0, 100, 50),
          minsLeft: clampInt(rawHud.minsLeft, 0, 1000, 60),
          leverage: clampInt(rawHud.leverage, 0, 100, 50),
        },
        history,
        lastBossScore:
          typeof st.lastBossScore === 'number'
            ? clampInt(st.lastBossScore, 0, 100, 0)
            : undefined,
        updatedAt: String(st.updatedAt ?? new Date().toISOString()).slice(0, 40),
      };
    }
  }

  return {
    readerId,
    xp: clampInt(obj.xp, 0, 1_000_000, 0),
    streakDays: clampInt(obj.streakDays, 0, 3650, 1),
    lastActiveDate: String(obj.lastActiveDate ?? new Date().toISOString().slice(0, 10)).slice(0, 32),
    skills: {
      clarity: clampInt(rawSkills.clarity, 0, 1000, 0),
      context: clampInt(rawSkills.context, 0, 1000, 0),
      constraint: clampInt(rawSkills.constraint, 0, 1000, 0),
      verification: clampInt(rawSkills.verification, 0, 1000, 0),
    },
    unlockedBooks: sanitizeStringArray(obj.unlockedBooks, 32, 64),
    unlockedCodes: sanitizeStringArray(obj.unlockedCodes, 32, 64),
    completedChapters: sanitizeStringArray(obj.completedChapters, 128, 80),
    earnedRanks,
    bookStates,
    updatedAt: new Date().toISOString(),
  };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'local';
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (/PERMISSION_DENIED|403/i.test(raw)) {
    return {
      status: 403,
      message: 'Gemini API permission denied. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (/API_KEY_INVALID|400/i.test(raw)) {
    return {
      status: 400,
      message: 'Invalid Gemini API key or malformed request. Check Settings > Secrets.',
    };
  }
  if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
    return {
      status: 429,
      message: 'Gemini API rate quota reached. Please wait a moment and try again.',
    };
  }
  if (/NOT_FOUND|404/i.test(raw)) {
    return {
      status: 404,
      message: 'Configured Gemini model was not found.',
    };
  }
  if (/503|UNAVAILABLE/i.test(raw)) {
    return {
      status: 503,
      message: 'Gemini model is temporarily experiencing high demand. Please retry in a few seconds.',
    };
  }
  console.error('[Gemini] Upstream error:', raw);
  return {
    status: 502,
    message: 'Prompt evaluation service is temporarily unavailable. Please retry in a moment.',
  };
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '256kb' }));

  // 0. Health Check (Render / Cloud Run / Koyeb zero-downtime probe)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true, service: 'james-walker-ai-gamebook' });
  });

  // 1. Projected Book Shelf Catalog (Summary columns only, zero chapter graphs)
  app.get('/api/books', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', CACHE_READ_HEADER);
    res.json({ books: getProjectedBooks() });
  });

  // 2. Single Batched Book Bundle (Metadata + TOC + Chapter 1 Graph)
  app.get('/api/books/:slug/bundle', (req: Request, res: Response) => {
    const bundle = getBookBundle(req.params.slug);
    if (!bundle) {
      res.status(404).json({ error: `Book "${req.params.slug}" not found.` });
      return;
    }
    res.setHeader('Cache-Control', CACHE_READ_HEADER);
    res.json(bundle);
  });

  // 3. Single Batched Chapter Node Graph
  app.get('/api/books/:slug/chapters/:num', (req: Request, res: Response) => {
    const num = Number(req.params.num);
    if (!Number.isInteger(num) || num < 1) {
      res.status(400).json({ error: 'Invalid chapter number.' });
      return;
    }
    const unlockedHeader = String(req.headers['x-unlocked-books'] ?? '');
    const unlockedBooks = unlockedHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const result = getChapterBundle(req.params.slug, num, unlockedBooks);
    if (result.status !== 200) {
      res.status(result.status).json({
        error: result.error,
        gumroad_url: result.gumroad_url,
      });
      return;
    }
    if (result.data.is_free) {
      res.setHeader('Cache-Control', CACHE_READ_HEADER);
    } else {
      res.setHeader('Cache-Control', 'private, max-age=300');
    }
    res.json(result.data);
  });

  // 4. Sandbox Presets (Projected)
  app.get('/api/sandbox/presets', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', CACHE_READ_HEADER);
    res.json({ presets: SANDBOX_PRESETS });
  });

  // 5. Gumroad License / Unlock Key Validation
  app.post('/api/unlock', (req: Request, res: Response) => {
    if (isRateLimited(getClientIp(req), 20, 60_000)) {
      res.status(429).json({ error: 'Too many unlock attempts. Please wait a minute.' });
      return;
    }
    const code = String(req.body?.code ?? '')
      .trim()
      .toUpperCase();
    if (!code || code.length > 64) {
      res.status(400).json({ error: 'Please enter a valid Gumroad unlock code.' });
      return;
    }
    const match = UNLOCK_CODES[code];
    if (!match) {
      res.status(404).json({
        error:
          'Unlock code not recognized. Try ONLINEWORK-2026, WALKER9TO5, or JAMESWALKER-PRO.',
      });
      return;
    }
    res.json({
      valid: true,
      code,
      unlockedSlugs: match.slugs,
      label: match.label,
    });
  });

  // 6. Server-Side Prompt Boss Evaluator (GEMINI_API_KEY stays strictly on server)
  app.post('/api/evaluate', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many evaluation requests. Please wait 30 seconds.' });
      return;
    }

    const promptText = String(req.body?.promptText ?? '').trim().slice(0, 8000);
    const challengeTitle = String(req.body?.challengeTitle ?? 'Prompt Challenge').trim().slice(0, 160);
    const roleBrief = String(req.body?.roleBrief ?? '').trim().slice(0, 1200);
    const constraints = Array.isArray(req.body?.constraints)
      ? req.body.constraints.slice(0, 12).map((s: unknown) => String(s).slice(0, 240))
      : [];
    const rubricFocus = Array.isArray(req.body?.rubricFocus)
      ? req.body.rubricFocus.slice(0, 12).map((s: unknown) => String(s).slice(0, 240))
      : [];
    const passingScore = clampInt(req.body?.passingScore ?? 70, 0, 100, 70);
    const xpReward = clampInt(req.body?.xpReward ?? 75, 0, 500, 75);

    if (promptText.length < 15) {
      res.status(400).json({
        error: 'Prompt is too short. Write at least 15 characters specifying role, task, or rules.',
      });
      return;
    }

    try {
      const evaluation = await evaluatePromptChallenge({
        promptText,
        challengeTitle,
        roleBrief,
        constraints,
        rubricFocus,
        passingScore,
        xpReward,
      });
      res.json(evaluation);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // 7. Server-Side SSE Streaming Prompt Sandbox
  app.post('/api/sandbox/stream', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many sandbox runs. Please wait 30 seconds.' });
      return;
    }

    const userPrompt = String(req.body?.userPrompt ?? '').trim().slice(0, 8000);
    const sampleInput = String(req.body?.sampleInput ?? '').trim().slice(0, 12000);

    if (userPrompt.length < 10) {
      res.status(400).json({ error: 'Enter a prompt of at least 10 characters to test.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    try {
      const meta = await streamSandboxPrompt(userPrompt, sampleInput, (textChunk) => {
        res.write(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`);
      });
      res.write(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`);
      res.end();
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.write(`data: ${JSON.stringify({ error: formatted.message })}\n\n`);
      res.end();
    }
  });

  // 8. Lightweight Debounced Progress Sync
  app.get('/api/progress/:readerId', (req: Request, res: Response) => {
    const readerId = String(req.params.readerId ?? '').trim();
    if (!READER_ID_RE.test(readerId)) {
      res.status(400).json({ error: 'Invalid reader identifier.' });
      return;
    }
    const existing = progressStore.get(readerId);
    if (!existing) {
      res.status(404).json({ error: 'No synced progress found.' });
      return;
    }
    res.json({ progress: existing });
  });

  app.post('/api/progress', (req: Request, res: Response) => {
    if (isRateLimited(getClientIp(req), 40, 60_000)) {
      res.status(429).json({ error: 'Too many sync requests. Please wait a moment.' });
      return;
    }
    const sanitized = sanitizeReaderProgress(req.body);
    if (!sanitized) {
      res.status(400).json({ error: 'Invalid progress payload.' });
      return;
    }
    const saved = progressStore.upsert(sanitized);
    res.json({ ok: true, updatedAt: saved.updatedAt });
  });

  // 9. Living AI Dispatch (Weekly/Monthly Updates + PDF QR Exercise Kit)
  app.get('/api/dispatches', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      dispatches: dispatchStore.getAllDispatches(),
      qrExercises: QR_EXERCISES,
      revampChecklist: PDF_REVAMP_CHECKLIST,
      subscriberCount: dispatchStore.getSubscriberCount(),
    });
  });

  app.get('/api/dispatches/auth-status', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(getAuthorAuthStatus());
  });

  app.post('/api/dispatches/claim-author', (req: Request, res: Response) => {
    if (isRateLimited(getClientIp(req), 5, 60_000)) {
      res.status(429).json({ error: 'Too many setup attempts. Please wait a minute.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    const result = claimAuthorPasscode(passcode);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ ok: true, token: result.token });
  });

  app.post('/api/dispatches/verify', (req: Request, res: Response) => {
    if (isRateLimited(getClientIp(req), 10, 60_000)) {
      res.status(429).json({ error: 'Too many verification attempts. Please wait a minute.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    const result = verifyAuthorPasscode(passcode);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true, token: result.token });
  });

  app.post('/api/dispatches', (req: Request, res: Response) => {
    if (!verifyAuthorBearerHeader(req.headers.authorization)) {
      res.status(401).json({
        error: 'Author sign-in required to publish Living Dispatch issues.',
      });
      return;
    }
    if (isRateLimited(getClientIp(req), 10, 60_000)) {
      res.status(429).json({ error: 'Too many publish requests. Please wait a minute.' });
      return;
    }
    const title = String(req.body?.title ?? '').trim().slice(0, 160);
    const summary = String(req.body?.summary ?? '').trim().slice(0, 1200);
    const cadenceRaw = String(req.body?.cadence ?? 'Weekly Update').trim();
    const cadence: DispatchIssue['cadence'] =
      cadenceRaw === 'Monthly Deep Dive' || cadenceRaw === 'Policy Alert'
        ? cadenceRaw
        : 'Weekly Update';
    const replacesPdfPages = String(req.body?.replacesPdfPages ?? '').trim().slice(0, 80);
    const highlights = Array.isArray(req.body?.highlights)
      ? req.body.highlights.slice(0, 8).map(String).map((s: string) => s.trim().slice(0, 240)).filter(Boolean)
      : [];
    const bookSlug = req.body?.bookSlug ? String(req.body.bookSlug).trim().slice(0, 80) : undefined;
    const chapterNum = req.body?.chapterNum ? Number(req.body.chapterNum) : undefined;

    if (title.length < 5 || summary.length < 15) {
      res.status(400).json({ error: 'Provide a clear title (5+ chars) and summary (15+ chars).' });
      return;
    }

    const issue = dispatchStore.publishDispatch({
      title,
      cadence,
      replacesPdfPages,
      summary,
      highlights,
      bookSlug,
      chapterNum,
    });
    res.status(201).json({ issue });
  });

  app.post('/api/newsletter/subscribe', (req: Request, res: Response) => {
    if (isRateLimited(getClientIp(req), 10, 60_000)) {
      res.status(429).json({ error: 'Too many subscribe requests. Please wait a minute.' });
      return;
    }
    const email = String(req.body?.email ?? '').trim().slice(0, 254);
    const chosenPath = String(req.body?.chosenPath ?? 'Digital Products').trim().slice(0, 80);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    const result = dispatchStore.subscribe(email, chosenPath);
    res.json({
      ok: true,
      alreadySubscribed: result.alreadySubscribed,
      subscriberCount: result.total,
      message: result.alreadySubscribed
        ? 'You are already subscribed to the free Living AI Dispatch.'
        : 'Subscribed! You will receive weekly/monthly 2026 AI updates and interactive drills.',
    });
  });

  // Vite dev middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '1h',
        setHeaders: (res, filePath) => {
          if (filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`James Walker AI Game-Book listening on http://localhost:${PORT}`);
  });

  // WebSocket bridge for Gemini 3.8 Live API real-time voice conversations
  const wss = new WebSocketServer({
    server,
    path: '/api/live',
    maxPayload: 512 * 1024,
  });
  attachLiveBridge(wss);

  const shutdown = () => {
    progressStore.flushSync();
    wss.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
