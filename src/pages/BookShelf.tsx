import React from 'react';
import { ArrowRight, ExternalLink, LockOpen, Mail, Play, QrCode, RotateCcw } from 'lucide-react';
import { BookCover } from '../components/BookCover.tsx';
import { getRankTitle } from '../lib/storage.ts';
import type { BookSummary, ReaderProgress } from '../types/gamebook.ts';

interface BookShelfProps {
  books: BookSummary[];
  progress: ReaderProgress;
  loading: boolean;
  error: string | null;
  demoHighlightSlug?: string | null;
  onStartDemo?: () => void;
  onSelectBook: (slug: string, chapterNum?: number) => void;
  onPrefetchBook: (slug: string, version: number) => void;
  onOpenArena: () => void;
  onOpenDispatch: (tab?: 'dispatch' | 'qr') => void;
  onOpenVault: () => void;
}

export const BookShelf: React.FC<BookShelfProps> = ({
  books,
  progress,
  loading,
  error,
  demoHighlightSlug = null,
  onStartDemo,
  onSelectBook,
  onPrefetchBook,
  onOpenArena,
  onOpenDispatch,
  onOpenVault,
}) => {
  const rank = getRankTitle(progress.xp);
  const featuredBook = books.find((b) => b.slug === 'ai-for-online-work') ?? null;
  const companionBooks = featuredBook
    ? books.filter((b) => b.slug !== featuredBook.slug)
    : books;
  const activeBookSlugs = Object.keys(progress.bookStates);
  const lastActiveSlug = activeBookSlugs[0];
  const lastActiveBook = books.find((b) => b.slug === lastActiveSlug);
  const lastActiveState = lastActiveSlug ? progress.bookStates[lastActiveSlug] : undefined;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Editorial Hero Masthead */}
      <section className="border-b border-[#DDE2EA] pb-8 sm:pb-10 mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <p className="text-xs font-mono tracking-wider uppercase text-[#4E5869] mb-3">
              Interactive Field Simulations · Companion to jameswalkerai.gumroad.com
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#0F141E] leading-[1.12] mb-4 max-w-2xl">
              Master AI workflows by playing real workplace scenarios.
            </h1>
            <p className="text-[17px] leading-[1.6] text-[#4E5869] max-w-[65ch]">
              Step inside high-pressure office briefings, play tactical prompt cards against live
              trust and deadline meters, and test live prompts against a strict scoring rubric.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-2.5 lg:items-end">
            {lastActiveBook && lastActiveState ? (
              <button
                type="button"
                onClick={() => onSelectBook(lastActiveBook.slug, lastActiveState.chapterNum)}
                className="w-full min-h-[46px] px-5 py-3 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Resume {lastActiveBook.title}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => books[0] && onSelectBook(books[0].slug, 1)}
                disabled={books.length === 0}
                className="w-full min-h-[46px] px-5 py-3 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <span>Play Chapter 1 Free</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={onOpenArena}
                className="min-h-[42px] px-3 py-2 bg-white text-[#0F141E] border border-[#DDE2EA] text-xs font-medium rounded-md hover:border-[#0F141E] active:scale-[0.99] transition-all inline-flex items-center justify-center whitespace-nowrap cursor-pointer"
              >
                Prompt Arena
              </button>
              {onStartDemo && (
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="min-h-[42px] px-3 py-2 bg-white text-[#0F141E] border border-[#DDE2EA] text-xs font-medium rounded-md hover:border-[#1D4ED8] hover:text-[#1D4ED8] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 shrink-0" />
                  <span>Auto-Play Preview</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clean Unboxed Reader Ledger */}
        <div className="mt-8 pt-6 border-t border-[#DDE2EA] grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-[#4E5869] mb-1">Current Rank</div>
            <div className="text-sm sm:text-base font-semibold text-[#0F141E]">{rank.title}</div>
          </div>
          <div>
            <div className="text-xs text-[#4E5869] mb-1">Earned XP</div>
            <div className="text-sm sm:text-base font-mono font-semibold text-[#0F141E] tabular-nums">
              {progress.xp} XP
            </div>
          </div>
          <div>
            <div className="text-xs text-[#4E5869] mb-1">Reading Streak</div>
            <div className="text-sm sm:text-base font-mono font-semibold text-[#0F141E] tabular-nums">
              {progress.streakDays} {progress.streakDays === 1 ? 'Day' : 'Days'}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#4E5869] mb-1">Chapters Cleared</div>
            <div className="text-sm sm:text-base font-mono font-semibold text-[#0F141E] tabular-nums">
              {progress.completedChapters.length} /{' '}
              {books.reduce((acc, b) => acc + b.total_chapters, 0) || 9}
            </div>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="mb-8 p-4 border border-[#1D4ED8] bg-white rounded-md flex items-center justify-between gap-4"
        >
          <p className="text-sm text-[#0F141E]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs font-semibold text-[#1D4ED8] underline whitespace-nowrap cursor-pointer"
          >
            Reload Catalog
          </button>
        </div>
      )}

      {/* Flagship Featured Edition: AI for Online Work (2026 Interactive Edition) */}
      {featuredBook && (
        <section
          aria-labelledby="featured-edition-heading"
          onPointerEnter={() => onPrefetchBook(featuredBook.slug, featuredBook.version)}
          className="mb-12 border border-[#0F141E] bg-white rounded-lg p-6 sm:p-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4 max-w-[260px] mx-auto lg:mx-0 w-full">
              <BookCover
                src={featuredBook.cover_thumb_url}
                title={featuredBook.title}
                category="Revamped 2026 Edition"
              />
            </div>

            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#1D4ED8] mb-2">
                <span className="uppercase tracking-wider font-semibold">
                  Featured Interactive Revamp
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#4E5869]">
                  14-Chapter Roadmap · {featuredBook.free_chapters} Free Playable Drills
                </span>
              </div>

              <h2
                id="featured-edition-heading"
                className="font-serif text-2xl sm:text-3xl font-semibold text-[#0F141E] leading-snug mb-3"
              >
                {featuredBook.title}
              </h2>

              <p className="text-[16px] leading-[1.6] text-[#4E5869] mb-5 max-w-[65ch]">
                {featuredBook.subtitle} Includes printable chapter QR codes for the Gumroad PDF
                plus a free weekly/monthly Living Dispatch so tool lists never go out of date.
              </p>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    onSelectBook(
                      featuredBook.slug,
                      progress.bookStates[featuredBook.slug]?.chapterNum ?? 1,
                    )
                  }
                  className="min-h-[44px] px-5 py-2.5 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>Play Interactive Chapter 1</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDispatch('qr')}
                  className="min-h-[44px] px-4 py-2.5 bg-[#0F141E] text-[#F6F7F9] text-sm font-medium rounded-md hover:bg-[#1D4ED8] active:scale-[0.99] transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>PDF QR Exercise Kit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDispatch('dispatch')}
                  className="min-h-[44px] px-4 py-2.5 bg-white text-[#0F141E] border border-[#DDE2EA] text-sm font-medium rounded-md hover:border-[#0F141E] active:scale-[0.99] transition-all inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Mail className="w-4 h-4 shrink-0 text-[#1D4ED8]" />
                  <span>Free Living Newsletter</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Book Catalog Section */}
      <section aria-labelledby="shelf-heading">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
          <h2 id="shelf-heading" className="font-serif text-2xl font-semibold text-[#0F141E]">
            More James Walker AI Playbooks
          </h2>
          <p className="text-sm text-[#4E5869]">
            Chapters 1 &amp; 2 are free in every volume · Have a Gumroad key?{' '}
            <button
              type="button"
              onClick={onOpenVault}
              className="text-[#1D4ED8] font-medium underline underline-offset-4 cursor-pointer"
            >
              Redeem it here
            </button>
          </p>
        </div>

        {loading && books.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="border border-[#DDE2EA] bg-white rounded-lg p-5 min-h-[460px] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companionBooks.map((book) => {
              const isUnlocked = progress.unlockedBooks.includes(book.slug);
              const ch1Cleared = progress.completedChapters.includes(`${book.slug}:1`);
              const inProgress = progress.bookStates[book.slug];
              const isDemoFocused = demoHighlightSlug === book.slug;

              return (
                <article
                  key={book.id}
                  onPointerEnter={() => onPrefetchBook(book.slug, book.version)}
                  onFocus={() => onPrefetchBook(book.slug, book.version)}
                  className={`border bg-white rounded-lg p-5 flex flex-col justify-between transition-all ${
                    isDemoFocused
                      ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25'
                      : 'border-[#DDE2EA] hover:border-[#0F141E]/40'
                  }`}
                >
                  <div>
                    <div className="mb-5">
                      <BookCover
                        src={book.cover_thumb_url}
                        title={book.title}
                        category={book.category}
                      />
                    </div>

                    {/* Zero-pill typographic metadata line */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4E5869] mb-2">
                      <span>{book.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{book.total_chapters} Chapters</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{book.est_minutes} min</span>
                    </div>

                    <h3 className="font-serif text-xl font-semibold text-[#0F141E] leading-snug mb-2">
                      {book.title}
                    </h3>

                    <p className="text-[15px] leading-[1.55] text-[#4E5869] mb-4">
                      {book.subtitle}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#DDE2EA] space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#4E5869]">
                      <span>
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[#0F141E] font-medium">
                            <LockOpen className="w-3.5 h-3.5 text-[#1D4ED8]" />
                            Full Edition Unlocked
                          </span>
                        ) : (
                          <span>Chapters 1 &amp; 2 Free Preview</span>
                        )}
                      </span>
                      <span className="font-mono tabular-nums">
                        {ch1Cleared ? 'Ch. 1 Cleared' : book.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectBook(book.slug, inProgress?.chapterNum ?? 1)}
                        className="flex-1 min-h-[44px] px-4 py-2.5 bg-[#0F141E] text-[#F6F7F9] text-sm font-medium rounded-md hover:bg-[#1D4ED8] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <span>
                          {inProgress
                            ? `Continue Ch. ${inProgress.chapterNum}`
                            : ch1Cleared
                              ? 'Replay Chapter 1'
                              : 'Play Chapter 1'}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>

                      <a
                        href={book.gumroad_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Get ${book.title} on Gumroad`}
                        className="min-h-[44px] px-3.5 py-2.5 border border-[#DDE2EA] text-[#0F141E] text-sm font-medium rounded-md hover:border-[#0F141E] active:scale-[0.99] transition-all inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <span>Gumroad</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
