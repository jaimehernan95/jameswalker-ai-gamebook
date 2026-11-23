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
import { evaluatePromptChallenge, streamSandboxPrompt } from './server/gemini.ts';
import { attachLiveBridge } from './server/liveBridge.ts';
import { progressStore } from './server/progressStore.ts';
import type { DispatchIssue, ReaderProgress } from './src/types/gamebook.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const CACHE_READ_HEADER = 'public, max-age=3600, stale-while-revalidate=86400';

// Lightweight sliding-window rate limiter per IP for AI endpoints
const rateWindows = new Map<string, number[]>();
function isRateLimited(ip: string, limit = 25, windowMs = 60_000): boolean {
  const now = Date.now();
  const stamps = (rateWindows.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (stamps.length >= limit) {
    rateWindows.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  rateWindows.set(ip, stamps);
  return false;
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
  return {
    status: 502,
    message: `Prompt evaluation service error: ${raw}`,
  };
}

async function startServer() {
  const app = express();
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
    const code = String(req.body?.code ?? '')
      .trim()
      .toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Please enter a Gumroad unlock code.' });
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

    const promptText = String(req.body?.promptText ?? '').trim();
    const challengeTitle = String(req.body?.challengeTitle ?? 'Prompt Challenge').trim();
    const roleBrief = String(req.body?.roleBrief ?? '').trim();
    const constraints = Array.isArray(req.body?.constraints)
      ? req.body.constraints.map(String)
      : [];
    const rubricFocus = Array.isArray(req.body?.rubricFocus)
      ? req.body.rubricFocus.map(String)
      : [];
    const passingScore = Number(req.body?.passingScore ?? 70);
    const xpReward = Number(req.body?.xpReward ?? 75);

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

    const userPrompt = String(req.body?.userPrompt ?? '').trim();
    const sampleInput = String(req.body?.sampleInput ?? '').trim();

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
    const existing = progressStore.get(req.params.readerId);
    if (!existing) {
      res.status(404).json({ error: 'No synced progress found.' });
      return;
    }
    res.json({ progress: existing });
  });

  app.post('/api/progress', (req: Request, res: Response) => {
    const body = req.body as Partial<ReaderProgress> | undefined;
    if (!body?.readerId || typeof body.xp !== 'number') {
      res.status(400).json({ error: 'Invalid progress payload.' });
      return;
    }
    const saved = progressStore.upsert(body as ReaderProgress);
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

  app.post('/api/dispatches', (req: Request, res: Response) => {
    const title = String(req.body?.title ?? '').trim();
    const summary = String(req.body?.summary ?? '').trim();
    const cadenceRaw = String(req.body?.cadence ?? 'Weekly Update').trim();
    const cadence: DispatchIssue['cadence'] =
      cadenceRaw === 'Monthly Deep Dive' || cadenceRaw === 'Policy Alert'
        ? cadenceRaw
        : 'Weekly Update';
    const replacesPdfPages = String(req.body?.replacesPdfPages ?? '').trim();
    const highlights = Array.isArray(req.body?.highlights)
      ? req.body.highlights.map(String).map((s: string) => s.trim()).filter(Boolean)
      : [];
    const bookSlug = req.body?.bookSlug ? String(req.body.bookSlug).trim() : undefined;
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
    const email = String(req.body?.email ?? '').trim();
    const chosenPath = String(req.body?.chosenPath ?? 'Digital Products').trim();
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
  const wss = new WebSocketServer({ server, path: '/api/live' });
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
