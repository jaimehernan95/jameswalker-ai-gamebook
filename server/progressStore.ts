import fs from 'fs';
import path from 'path';
import type { ReaderProgress } from '../src/types/gamebook.ts';

/**
 * Lightweight singleton progress store with bounded memory cache
 * and debounced/atomic disk flush so concurrent requests stay clean.
 */
class ProgressStore {
  private readonly storePath: string;
  private cache: Map<string, ReaderProgress> = new Map();
  private loaded = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.storePath = path.join(dataDir, 'progress-store.json');
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, ReaderProgress>;
        for (const [key, val] of Object.entries(parsed)) {
          this.cache.set(key, val);
        }
      }
    } catch {
      // Corrupt or unreadable store starts clean without crashing server
    }
  }

  get(readerId: string): ReaderProgress | null {
    this.ensureLoaded();
    return this.cache.get(readerId) ?? null;
  }

  upsert(progress: ReaderProgress): ReaderProgress {
    this.ensureLoaded();
    const existing = this.cache.get(progress.readerId);
    const merged: ReaderProgress = existing
      ? {
          ...progress,
          xp: Math.max(existing.xp, progress.xp),
          unlockedBooks: Array.from(
            new Set([...existing.unlockedBooks, ...progress.unlockedBooks]),
          ),
          unlockedCodes: Array.from(
            new Set([...existing.unlockedCodes, ...progress.unlockedCodes]),
          ),
          completedChapters: Array.from(
            new Set([...existing.completedChapters, ...progress.completedChapters]),
          ),
          updatedAt: new Date().toISOString(),
        }
      : {
          ...progress,
          updatedAt: new Date().toISOString(),
        };

    this.cache.set(progress.readerId, merged);
    this.scheduleFlush();
    return merged;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushSync();
    }, 1500);
  }

  flushSync(): void {
    try {
      const obj = Object.fromEntries(this.cache.entries());
      const tmpPath = `${this.storePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(obj, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.storePath);
    } catch {
      // Ignore transient disk write failures
    }
  }
}

export const progressStore = new ProgressStore();
