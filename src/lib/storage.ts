import type {
  BookBundleResponse,
  BookSummary,
  ChapterBundle,
  ReaderProgress,
} from '../types/gamebook.ts';

const PROGRESS_STORAGE_KEY = 'jwai_reader_progress_v1';
const BOOKS_CACHE_KEY = 'jwai_books_summary_v4';
const CHAPTER_CACHE_PREFIX = 'jwai_chapter_v4_';
const API_SCHEMA_VERSION = 4;

const memoryChapterCache = new Map<string, ChapterBundle>();
const inflightPrefetches = new Set<string>();

function isValidHudState(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h.trust === 'number' &&
    Number.isFinite(h.trust) &&
    typeof h.minsLeft === 'number' &&
    Number.isFinite(h.minsLeft) &&
    typeof h.leverage === 'number' &&
    Number.isFinite(h.leverage)
  );
}

function isValidChapterBundle(value: unknown): value is ChapterBundle {
  if (!value || typeof value !== 'object') return false;
  const b = value as Partial<ChapterBundle>;
  if (!b.book_slug || !b.start_node_id || !b.nodes || typeof b.nodes !== 'object') {
    return false;
  }
  if (!isValidHudState(b.initial_hud)) {
    return false;
  }
  const startNode = b.nodes[b.start_node_id];
  if (!startNode) return false;
  if (startNode.kind === 'choice' && Array.isArray(startNode.choices) && startNode.choices.length > 0) {
    const firstChoice = startNode.choices[0];
    if (
      !firstChoice?.hudDelta ||
      typeof firstChoice.hudDelta.trust !== 'number' ||
      !firstChoice.terminalPreview ||
      typeof firstChoice.terminalPreview.simulatedOutput !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateReaderId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `reader_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `reader_${Math.random().toString(36).slice(2, 12)}`;
}

export function createInitialProgress(): ReaderProgress {
  return {
    readerId: generateReaderId(),
    xp: 0,
    streakDays: 1,
    lastActiveDate: todayIsoDate(),
    skills: {
      clarity: 10,
      context: 10,
      constraint: 10,
      verification: 10,
    },
    unlockedBooks: [],
    unlockedCodes: [],
    completedChapters: [],
    earnedRanks: [],
    bookStates: {},
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalProgress(): ReaderProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) {
      const fresh = createInitialProgress();
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as ReaderProgress;
    // Sanitize legacy v1 bookStates that may have missing or malformed HUD objects
    const sanitizedBookStates: ReaderProgress['bookStates'] = {};
    if (parsed.bookStates && typeof parsed.bookStates === 'object') {
      for (const [slug, state] of Object.entries(parsed.bookStates)) {
        if (!state || typeof state !== 'object') continue;
        sanitizedBookStates[slug] = {
          ...state,
          hud: isValidHudState(state.hud)
            ? state.hud
            : { trust: 65, minsLeft: 18, leverage: 40 },
        };
      }
    }
    const baseParsed: ReaderProgress = {
      ...parsed,
      bookStates: sanitizedBookStates,
    };
    const today = todayIsoDate();
    if (baseParsed.lastActiveDate !== today) {
      const prevDate = new Date(baseParsed.lastActiveDate);
      const currDate = new Date(today);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
      const nextStreak = diffDays === 1 ? baseParsed.streakDays + 1 : 1;
      const updated = {
        ...baseParsed,
        streakDays: nextStreak,
        lastActiveDate: today,
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    }
    return baseParsed;
  } catch {
    return createInitialProgress();
  }
}

export function saveLocalProgress(progress: ReaderProgress): void {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

// Debounced background sync: max 1 write per 10 seconds (never on every click)
let syncTimer: number | null = null;
let lastSyncAt = 0;
let pendingProgress: ReaderProgress | null = null;
const SYNC_INTERVAL_MS = 10_000;

async function flushProgressNow(progress: ReaderProgress): Promise<void> {
  lastSyncAt = Date.now();
  pendingProgress = null;
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
      keepalive: true,
    });
  } catch {
    // Offline-first: local state stays intact even when offline
  }
}

export function scheduleBackgroundSync(progress: ReaderProgress): void {
  pendingProgress = progress;
  const elapsed = Date.now() - lastSyncAt;

  if (elapsed >= SYNC_INTERVAL_MS && syncTimer === null) {
    void flushProgressNow(progress);
    return;
  }

  if (syncTimer === null) {
    const delay = Math.max(1000, SYNC_INTERVAL_MS - elapsed);
    syncTimer = window.setTimeout(() => {
      syncTimer = null;
      if (pendingProgress) {
        void flushProgressNow(pendingProgress);
      }
    }, delay);
  }
}

export function flushBeaconOnHide(): void {
  if (!pendingProgress || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
  const blob = new Blob([JSON.stringify(pendingProgress)], { type: 'application/json' });
  navigator.sendBeacon('/api/progress', blob);
  pendingProgress = null;
  lastSyncAt = Date.now();
}

// Books summary cache
export function getCachedBooksSummary(): BookSummary[] | null {
  try {
    const raw = localStorage.getItem(BOOKS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { books: BookSummary[] };
    return Array.isArray(parsed.books) ? parsed.books : null;
  } catch {
    return null;
  }
}

export async function fetchBooksSummary(): Promise<BookSummary[]> {
  const res = await fetch(`/api/books?v=${API_SCHEMA_VERSION}`);
  if (!res.ok) throw new Error('Unable to load playbook catalog.');
  const data = (await res.json()) as { books: BookSummary[] };
  try {
    localStorage.setItem(BOOKS_CACHE_KEY, JSON.stringify({ books: data.books }));
  } catch {
    // Ignore storage full
  }
  return data.books;
}

// Versioned chapter graph cache
function chapterCacheKey(slug: string, chapterNum: number, version: number): string {
  return `${CHAPTER_CACHE_PREFIX}${slug}_ch${chapterNum}_v${Math.max(API_SCHEMA_VERSION, version)}`;
}

export function getCachedChapter(
  slug: string,
  chapterNum: number,
  version: number,
): ChapterBundle | null {
  const key = chapterCacheKey(slug, chapterNum, version);
  const mem = memoryChapterCache.get(key);
  if (mem && isValidChapterBundle(mem)) return mem;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidChapterBundle(parsed)) {
      localStorage.removeItem(key);
      return null;
    }
    memoryChapterCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function storeCachedChapter(bundle: ChapterBundle): void {
  if (!isValidChapterBundle(bundle)) return;
  const key = chapterCacheKey(bundle.book_slug, bundle.chapter_num, bundle.version);
  memoryChapterCache.set(key, bundle);
  try {
    localStorage.setItem(key, JSON.stringify(bundle));
  } catch {
    // Ignore quota errors
  }
}

export async function fetchChapterBundle(
  slug: string,
  chapterNum: number,
  version: number,
  unlockedBooks: string[],
): Promise<ChapterBundle> {
  const targetVersion = Math.max(API_SCHEMA_VERSION, version);
  const cached = getCachedChapter(slug, chapterNum, targetVersion);
  if (cached) return cached;

  if (chapterNum === 1) {
    const res = await fetch(
      `/api/books/${encodeURIComponent(slug)}/bundle?v=${targetVersion}`,
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || 'Failed to load chapter bundle.');
    }
    const bundle = (await res.json()) as BookBundleResponse;
    storeCachedChapter(bundle.initial_chapter);
    return bundle.initial_chapter;
  }

  const res = await fetch(
    `/api/books/${encodeURIComponent(slug)}/chapters/${chapterNum}?v=${targetVersion}`,
    {
      headers: {
        'x-unlocked-books': unlockedBooks.join(','),
      },
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'This chapter requires an unlock code.');
  }
  const chapter = (await res.json()) as ChapterBundle;
  storeCachedChapter(chapter);
  return chapter;
}

export function prefetchBookBundle(slug: string, version: number): void {
  const targetVersion = Math.max(API_SCHEMA_VERSION, version);
  const key = chapterCacheKey(slug, 1, targetVersion);
  if (memoryChapterCache.has(key) || inflightPrefetches.has(key)) return;
  if (getCachedChapter(slug, 1, targetVersion)) return;

  inflightPrefetches.add(key);
  fetch(`/api/books/${encodeURIComponent(slug)}/bundle?v=${targetVersion}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data: BookBundleResponse | null) => {
      if (data?.initial_chapter) {
        storeCachedChapter(data.initial_chapter);
      }
    })
    .catch(() => {
      // Silent prefetch failure is harmless
    })
    .finally(() => {
      inflightPrefetches.delete(key);
    });
}

export function getRankTitle(xp: number): { title: string; nextThreshold: number | null } {
  if (xp >= 400) return { title: 'Master Prompt Strategist', nextThreshold: null };
  if (xp >= 220) return { title: 'Workflow Architect', nextThreshold: 400 };
  if (xp >= 100) return { title: 'Field Practitioner', nextThreshold: 220 };
  return { title: 'Apprentice Editor', nextThreshold: 100 };
}
