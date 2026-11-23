import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Header, type ActiveRoute } from './components/Header.tsx';
import {
  BookShelfSkeleton,
  ChapterPlayerSkeleton,
  PromptArenaSkeleton,
} from './components/Skeletons.tsx';
import {
  fetchBooksSummary,
  fetchChapterBundle,
  flushBeaconOnHide,
  getCachedBooksSummary,
  loadLocalProgress,
  prefetchBookBundle,
  saveLocalProgress,
  scheduleBackgroundSync,
} from './lib/storage.ts';
import type {
  BookSummary,
  ChapterBundle,
  ChoiceOption,
  EvaluationResult,
  HudDelta,
  HudState,
  ReaderProgress,
} from './types/gamebook.ts';

// Route-level code splitting for minimal initial JS payload
const BookShelf = lazy(() =>
  import('./pages/BookShelf.tsx').then((m) => ({ default: m.BookShelf })),
);
const ChapterPlayer = lazy(() =>
  import('./pages/ChapterPlayer.tsx').then((m) => ({ default: m.ChapterPlayer })),
);
const PromptArena = lazy(() =>
  import('./pages/PromptArena.tsx').then((m) => ({ default: m.PromptArena })),
);
const Studio3D = lazy(() =>
  import('./pages/Studio3D.tsx').then((m) => ({ default: m.Studio3D })),
);
const VoiceMentor = lazy(() =>
  import('./pages/VoiceMentor.tsx').then((m) => ({ default: m.VoiceMentor })),
);
const LivingDispatch = lazy(() =>
  import('./pages/LivingDispatch.tsx').then((m) => ({ default: m.LivingDispatch })),
);
const VaultModal = lazy(() =>
  import('./components/VaultModal.tsx').then((m) => ({ default: m.VaultModal })),
);

const DEFAULT_HUD: HudState = { trust: 65, minsLeft: 18, leverage: 40 };

function normalizeHud(hud?: Partial<HudState> | null): HudState {
  return {
    trust: typeof hud?.trust === 'number' && Number.isFinite(hud.trust) ? hud.trust : DEFAULT_HUD.trust,
    minsLeft:
      typeof hud?.minsLeft === 'number' && Number.isFinite(hud.minsLeft)
        ? hud.minsLeft
        : DEFAULT_HUD.minsLeft,
    leverage:
      typeof hud?.leverage === 'number' && Number.isFinite(hud.leverage)
        ? hud.leverage
        : DEFAULT_HUD.leverage,
  };
}

function normalizeDelta(delta?: Partial<HudDelta> | null): HudDelta {
  return {
    trust: typeof delta?.trust === 'number' && Number.isFinite(delta.trust) ? delta.trust : 0,
    mins: typeof delta?.mins === 'number' && Number.isFinite(delta.mins) ? delta.mins : 0,
    leverage:
      typeof delta?.leverage === 'number' && Number.isFinite(delta.leverage) ? delta.leverage : 0,
  };
}

function applyHudDelta(base: HudState, delta?: Partial<HudDelta> | null): HudState {
  const safeBase = normalizeHud(base);
  const safeDelta = normalizeDelta(delta);
  return {
    trust: Math.max(0, Math.min(100, safeBase.trust + safeDelta.trust)),
    minsLeft: Math.max(1, safeBase.minsLeft + safeDelta.mins),
    leverage: Math.max(0, Math.min(100, safeBase.leverage + safeDelta.leverage)),
  };
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>('shelf');
  const [books, setBooks] = useState<BookSummary[]>(() => getCachedBooksSummary() ?? []);
  const [booksLoading, setBooksLoading] = useState<boolean>(() => !getCachedBooksSummary());
  const [booksError, setBooksError] = useState<string | null>(null);

  const [progress, setProgress] = useState<ReaderProgress>(() => loadLocalProgress());
  const [activeChapter, setActiveChapter] = useState<ChapterBundle | null>(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [dispatchTab, setDispatchTab] = useState<'dispatch' | 'qr'>('dispatch');

  // Built-in 12-second Interactive Demo Preview state (?demo=1 or button click)
  const [demoMode, setDemoMode] = useState(false);
  const [demoHighlightBook, setDemoHighlightBook] = useState<string | null>(null);
  const [demoNodeId, setDemoNodeId] = useState<string | null>(null);
  const [demoHud, setDemoHud] = useState<HudState | null>(null);
  const [demoLastHudDelta, setDemoLastHudDelta] = useState<HudDelta | null>(null);
  const [demoPendingChoice, setDemoPendingChoice] = useState<ChoiceOption | null>(null);
  const [demoHighlightedChoiceId, setDemoHighlightedChoiceId] = useState<string | null>(null);
  const [demoTypedPrompt, setDemoTypedPrompt] = useState<string | null>(null);
  const [demoEvalResult, setDemoEvalResult] = useState<EvaluationResult | null>(null);
  const [demoBannerLabel, setDemoBannerLabel] = useState<string>('');
  const demoTimersRef = useRef<number[]>([]);
  const autoDemoStartedRef = useRef(false);

  const clearDemoTimers = useCallback(() => {
    for (const id of demoTimersRef.current) {
      window.clearTimeout(id);
      window.clearInterval(id);
    }
    demoTimersRef.current = [];
  }, []);

  const stopDemo = useCallback(() => {
    clearDemoTimers();
    setDemoMode(false);
    setDemoHighlightBook(null);
    setDemoNodeId(null);
    setDemoHud(null);
    setDemoLastHudDelta(null);
    setDemoPendingChoice(null);
    setDemoHighlightedChoiceId(null);
    setDemoTypedPrompt(null);
    setDemoEvalResult(null);
    setDemoBannerLabel('');
  }, [clearDemoTimers]);

  const commitProgress = useCallback((updater: (prev: ReaderProgress) => ReaderProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveLocalProgress(next);
      scheduleBackgroundSync(next);
      return next;
    });
  }, []);

  // Load projected book summary catalog (1 batched GET)
  useEffect(() => {
    let active = true;
    fetchBooksSummary()
      .then((list) => {
        if (!active) return;
        setBooks(list);
        setBooksError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (books.length === 0) {
          setBooksError(err instanceof Error ? err.message : 'Unable to load books.');
        }
      })
      .finally(() => {
        if (active) setBooksLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Flush pending progress quietly on tab hide
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushBeaconOnHide();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const openChapter = useCallback(
    async (slug: string, chapterNum = 1, unlockedOverride?: string[]): Promise<ChapterBundle | null> => {
      setRoute('player');
      setChapterError(null);
      const bookMeta = books.find((b) => b.slug === slug);
      const version = bookMeta?.version ?? 3;
      const unlockedList = unlockedOverride ?? progress.unlockedBooks;

      setChapterLoading(true);
      try {
        const bundle = await fetchChapterBundle(slug, chapterNum, version, unlockedList);
        setActiveChapter(bundle);
        return bundle;
      } catch (err) {
        setChapterError(err instanceof Error ? err.message : 'Unable to open chapter.');
        setActiveChapter(null);
        return null;
      } finally {
        setChapterLoading(false);
      }
    },
    [books, progress.unlockedBooks],
  );

  // 12-Second Deterministic Interactive Demo Showcase (?demo=1 or button click)
  const startDemo = useCallback(async () => {
    clearDemoTimers();
    setDemoMode(true);
    setRoute('shelf');
    setDemoHighlightBook('chatgpt-9-to-5');
    setDemoBannerLabel('Simulation Preview · Selecting Playbook');
    setDemoPendingChoice(null);
    setDemoHighlightedChoiceId(null);
    setDemoTypedPrompt(null);
    setDemoEvalResult(null);
    setDemoLastHudDelta(null);

    // Quietly fetch/load Chapter 1 bundle immediately
    const bundle = await fetchChapterBundle('chatgpt-9-to-5', 1, 2, progress.unlockedBooks).catch(
      () => null,
    );
    if (!bundle) {
      stopDemo();
      return;
    }

    const schedule = (ms: number, fn: () => void) => {
      const id = window.setTimeout(fn, ms);
      demoTimersRef.current.push(id);
    };

    const initialDemoHud = normalizeHud(bundle.initial_hud);
    const scene1Card = bundle.nodes.n1_triage?.choices?.[1]; // Constraint-First Briefing
    const scene2Card = bundle.nodes.n2_structured_win?.choices?.[0]; // Audience Isolation Split
    const scene1Delta = normalizeDelta(scene1Card?.hudDelta ?? { trust: 15, mins: -3, leverage: 25 });
    const scene2Delta = normalizeDelta(scene2Card?.hudDelta ?? { trust: 15, mins: -2, leverage: 20 });
    const hudAfterScene1 = applyHudDelta(initialDemoHud, scene1Delta);
    const hudAfterScene2 = applyHudDelta(hudAfterScene1, scene2Delta);
    const bossPromptText =
      bundle.nodes.n3_boss?.promptChallenge?.starterPrompt ??
      'Act as Operations Analyst briefing a VP. Output 4-col table. Mark missing info [UNCONFIRMED]. Max 200 words.';

    // 1.4s: Enter Chapter 1 Simulation HUD
    schedule(1400, () => {
      setActiveChapter(bundle);
      setRoute('player');
      setDemoHighlightBook(null);
      setDemoNodeId('n1_triage');
      setDemoHud({ ...initialDemoHud });
      setDemoBannerLabel('Simulation Preview · Scene 01 Decision Deck');
    });

    // 2.2s: Highlight Constraint-First Briefing Card
    schedule(2200, () => {
      if (scene1Card) setDemoHighlightedChoiceId(scene1Card.id);
    });

    // 2.9s: Execute Card & stream Simulated Terminal Output
    schedule(2900, () => {
      if (!scene1Card) return;
      setDemoHighlightedChoiceId(null);
      setDemoPendingChoice(scene1Card);
      setDemoLastHudDelta(scene1Delta);
      setDemoBannerLabel('Simulation Preview · Terminal Execution');
    });

    // 5.1s: Advance to Scene 02 & update HUD
    schedule(5100, () => {
      if (!scene1Card) return;
      setDemoPendingChoice(null);
      setDemoNodeId('n2_structured_win');
      setDemoHud(hudAfterScene1);
      setDemoBannerLabel('Simulation Preview · Scene 02 Escalation');
    });

    // 5.7s: Highlight Audience Isolation Split
    schedule(5700, () => {
      if (scene2Card) setDemoHighlightedChoiceId(scene2Card.id);
    });

    // 6.3s: Trigger Audience Isolation Split terminal preview
    schedule(6300, () => {
      if (!scene2Card) return;
      setDemoHighlightedChoiceId(null);
      setDemoPendingChoice(scene2Card);
      setDemoLastHudDelta(scene2Delta);
    });

    // 8.0s: Enter Live Prompt Duel Boss Encounter
    schedule(8000, () => {
      if (!scene1Card || !scene2Card) return;
      setDemoPendingChoice(null);
      setDemoNodeId('n3_boss');
      setDemoHud(hudAfterScene2);
      setDemoTypedPrompt('');
      setDemoBannerLabel('Simulation Preview · Live Prompt Duel');
    });

    // 8.3s – 10.1s: Rapid typewriter filling Boss Prompt & lighting up 3 Live Guardrails
    schedule(8300, () => {
      let idx = 0;
      const intervalId = window.setInterval(() => {
        idx = Math.min(bossPromptText.length, idx + 14);
        setDemoTypedPrompt(bossPromptText.slice(0, idx));
        if (idx >= bossPromptText.length) {
          window.clearInterval(intervalId);
        }
      }, 28);
      demoTimersRef.current.push(intervalId);
    });

    // 10.3s: Stamp Boss Duel Outcome ("PROMOTED · 94/100")
    schedule(10300, () => {
      setDemoEvalResult({
        score: 94,
        passed: true,
        verdict: 'Rubric Passed',
        stampLabel: 'PROMOTED',
        strengths:
          'Locked analyst role, 4-column table schema, explicit [UNCONFIRMED] grounding rule, and 220-word cap.',
        improvements: [
          'Add one miniature 2-line output sample to stabilize table formatting.',
          'Flag unapproved discounts explicitly as a top-level risk line.',
        ],
        mentorNote: 'Production-ready Monday triage prompt.',
        xpEarned: 75,
        source: 'gemini',
        model: 'gemini-4-hydrogen',
      });
      setDemoBannerLabel('Simulation Preview · Outcome Stamped');
    });

    // 11.6s: Final Chapter Complete Rank & Stamp Card
    schedule(11600, () => {
      setDemoNodeId('n4_victory');
      setDemoBannerLabel('Simulation Preview Complete');
    });
  }, [clearDemoTimers, progress.unlockedBooks, stopDemo]);

  // Trigger automatically when ?demo=1 or QR deep-link params (?book=...&ch=..., ?route=dispatch) are present
  useEffect(() => {
    if (autoDemoStartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') {
      autoDemoStartedRef.current = true;
      void startDemo();
      return;
    }

    const deepBook = params.get('book');
    const deepCh = Number(params.get('ch') ?? '1');
    const deepRoute = params.get('route');
    const deepTab = params.get('tab');

    if (deepBook) {
      autoDemoStartedRef.current = true;
      void openChapter(deepBook, Number.isInteger(deepCh) && deepCh >= 1 ? deepCh : 1);
      return;
    }

    if (deepRoute === 'dispatch') {
      autoDemoStartedRef.current = true;
      setDispatchTab(deepTab === 'qr' ? 'qr' : 'dispatch');
      setRoute('dispatch');
    } else if (deepRoute === 'arena') {
      autoDemoStartedRef.current = true;
      setRoute('arena');
    } else if (deepRoute === 'studio3d') {
      autoDemoStartedRef.current = true;
      setRoute('studio3d');
    } else if (deepRoute === 'voice') {
      autoDemoStartedRef.current = true;
      setRoute('voice');
    }
  }, [openChapter, startDemo]);

  const handleNavigate = (nextRoute: ActiveRoute) => {
    if (demoMode) stopDemo();
    setRoute(nextRoute);
    if (nextRoute === 'player' && !activeChapter) {
      const activeSlugs = Object.keys(progress.bookStates);
      const targetSlug = activeSlugs[0] || books[0]?.slug || 'chatgpt-9-to-5';
      const targetCh = progress.bookStates[targetSlug]?.chapterNum ?? 1;
      void openChapter(targetSlug, targetCh);
    }
  };

  const handleApplyChoice = (
    bookSlug: string,
    chapterNum: number,
    choice: ChoiceOption,
    initialHud: HudState,
  ) => {
    commitProgress((prev) => {
      const prevBookState = prev.bookStates[bookSlug];
      const existingHistory =
        prevBookState && prevBookState.chapterNum === chapterNum ? prevBookState.history : [];
      const currentHud = normalizeHud(
        prevBookState && prevBookState.chapterNum === chapterNum && prevBookState.hud
          ? prevBookState.hud
          : initialHud,
      );
      const safeDelta = normalizeDelta(choice.hudDelta);
      const nextHud = applyHudDelta(currentHud, safeDelta);

      const nextSkills = { ...prev.skills };
      if (choice.skillDelta) {
        for (const [k, delta] of Object.entries(choice.skillDelta)) {
          const key = k as keyof typeof nextSkills;
          nextSkills[key] = Math.min(100, (nextSkills[key] ?? 10) + (delta ?? 0));
        }
      }

      return {
        ...prev,
        xp: prev.xp + choice.xpDelta,
        skills: nextSkills,
        bookStates: {
          ...prev.bookStates,
          [bookSlug]: {
            chapterNum,
            currentNodeId: choice.nextNodeId,
            hud: nextHud,
            history: [
              ...existingHistory,
              {
                nodeId: choice.nextNodeId,
                choiceLabel: choice.moveTitle ?? choice.label,
                consequence: choice.consequence,
                xpDelta: choice.xpDelta,
                hudDelta: safeDelta,
              },
            ],
            updatedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleCompleteBoss = (
    bookSlug: string,
    chapterNum: number,
    nextNodeId: string,
    xpEarned: number,
    score: number,
    initialHud: HudState,
    endingRank?: { title: string; badgeCode: string },
  ) => {
    const chapterKey = `${bookSlug}:${chapterNum}`;
    commitProgress((prev) => {
      const prevBookState = prev.bookStates[bookSlug];
      const existingHistory =
        prevBookState && prevBookState.chapterNum === chapterNum ? prevBookState.history : [];
      const currentHud = normalizeHud(
        prevBookState && prevBookState.chapterNum === chapterNum && prevBookState.hud
          ? prevBookState.hud
          : initialHud,
      );
      const alreadyCompleted = prev.completedChapters.includes(chapterKey);
      const alreadyHasBadge =
        endingRank && prev.earnedRanks.some((r) => r.badgeCode === endingRank.badgeCode);

      return {
        ...prev,
        xp: prev.xp + xpEarned,
        skills: {
          ...prev.skills,
          clarity: Math.min(100, prev.skills.clarity + 5),
          constraint: Math.min(100, prev.skills.constraint + 5),
          verification: Math.min(100, prev.skills.verification + 5),
        },
        completedChapters: alreadyCompleted
          ? prev.completedChapters
          : [...prev.completedChapters, chapterKey],
        earnedRanks:
          endingRank && !alreadyHasBadge
            ? [
                ...prev.earnedRanks,
                {
                  bookSlug,
                  chapterNum,
                  rankTitle: endingRank.title,
                  badgeCode: endingRank.badgeCode,
                  earnedAt: new Date().toISOString(),
                },
              ]
            : prev.earnedRanks,
        bookStates: {
          ...prev.bookStates,
          [bookSlug]: {
            chapterNum,
            currentNodeId: nextNodeId,
            hud: currentHud,
            lastBossScore: score,
            history: [
              ...existingHistory,
              {
                nodeId: nextNodeId,
                choiceLabel: `Passed Live Prompt Duel (${score}/100)`,
                consequence: 'Verified against chapter rubric.',
                xpDelta: xpEarned,
              },
            ],
            updatedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleRestartChapter = (
    bookSlug: string,
    chapterNum: number,
    startNodeId: string,
    initialHud: HudState,
  ) => {
    commitProgress((prev) => ({
      ...prev,
      bookStates: {
        ...prev.bookStates,
        [bookSlug]: {
          chapterNum,
          currentNodeId: startNodeId,
          hud: normalizeHud(initialHud),
          history: [],
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUnlockSuccess = (code: string, unlockedSlugs: string[]) => {
    let mergedUnlocked: string[] = [];
    commitProgress((prev) => {
      mergedUnlocked = Array.from(new Set([...prev.unlockedBooks, ...unlockedSlugs]));
      return {
        ...prev,
        unlockedBooks: mergedUnlocked,
        unlockedCodes: Array.from(new Set([...prev.unlockedCodes, code])),
        updatedAt: new Date().toISOString(),
      };
    });

    if (route === 'player' && chapterError && activeChapter === null && unlockedSlugs[0]) {
      void openChapter(unlockedSlugs[0], 2, mergedUnlocked);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#141413]">
      <Header
        activeRoute={route}
        onNavigate={handleNavigate}
        onOpenVault={() => setVaultOpen(true)}
      />

      {/* Quiet Demo Preview Status Strip when ?demo=1 or Auto-Play is running */}
      {demoMode && (
        <div className="bg-[#141413] text-[#FAF9F6] border-b border-[#141413] px-4 py-1.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-xs font-mono">
            <span>{demoBannerLabel}</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => void startDemo()}
                className="text-[#FAF9F6]/80 hover:text-white underline cursor-pointer"
              >
                Replay 12s
              </button>
              <button
                type="button"
                onClick={stopDemo}
                className="text-[#D94E1F] font-semibold hover:underline cursor-pointer"
              >
                Exit Preview
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1">
        {route === 'shelf' && (
          <Suspense fallback={<BookShelfSkeleton />}>
            <BookShelf
              books={books}
              progress={progress}
              loading={booksLoading}
              error={booksError}
              demoHighlightSlug={demoHighlightBook}
              onStartDemo={() => void startDemo()}
              onSelectBook={(slug, ch) => void openChapter(slug, ch ?? 1)}
              onPrefetchBook={prefetchBookBundle}
              onOpenArena={() => setRoute('arena')}
              onOpenDispatch={(tab = 'dispatch') => {
                setDispatchTab(tab);
                setRoute('dispatch');
              }}
              onOpenVault={() => setVaultOpen(true)}
            />
          </Suspense>
        )}

        {route === 'player' && (
          <Suspense fallback={<ChapterPlayerSkeleton />}>
            <ChapterPlayer
              chapter={activeChapter}
              loading={chapterLoading}
              error={chapterError}
              progress={progress}
              demoMode={demoMode}
              demoOverrideNodeId={demoNodeId}
              demoOverrideHud={demoHud}
              demoLastHudDelta={demoLastHudDelta}
              demoPendingChoice={demoPendingChoice}
              demoHighlightedChoiceId={demoHighlightedChoiceId}
              demoTypedPrompt={demoTypedPrompt}
              demoEvalResult={demoEvalResult}
              onStartDemo={() => void startDemo()}
              onStopDemo={stopDemo}
              onBackToShelf={() => {
                if (demoMode) stopDemo();
                setRoute('shelf');
              }}
              onSwitchChapter={(slug, ch) => void openChapter(slug, ch)}
              onApplyChoice={handleApplyChoice}
              onCompleteBoss={handleCompleteBoss}
              onRestartChapter={handleRestartChapter}
              onOpenVault={() => setVaultOpen(true)}
            />
          </Suspense>
        )}

        {route === 'arena' && (
          <Suspense fallback={<PromptArenaSkeleton />}>
            <PromptArena
              onAwardXp={(xp) =>
                commitProgress((prev) => ({
                  ...prev,
                  xp: prev.xp + xp,
                  updatedAt: new Date().toISOString(),
                }))
              }
            />
          </Suspense>
        )}

        {route === 'dispatch' && (
          <Suspense fallback={<PromptArenaSkeleton />}>
            <LivingDispatch
              books={books}
              initialTab={dispatchTab}
              onLaunchBook={(slug, ch) => void openChapter(slug, ch)}
              onOpenArena={() => setRoute('arena')}
            />
          </Suspense>
        )}

        {route === 'studio3d' && (
          <Suspense
            fallback={
              <div className="w-full h-[calc(100vh-56px)] flex items-center justify-center bg-[#FAF9F6] font-mono text-xs text-[#57554F]">
                Initializing 3D Press Vault...
              </div>
            }
          >
            <Studio3D
              books={books}
              onLaunchBook={(slug) => void openChapter(slug, 1)}
            />
          </Suspense>
        )}

        {route === 'voice' && (
          <Suspense fallback={<PromptArenaSkeleton />}>
            <VoiceMentor books={books} xp={progress.xp} />
          </Suspense>
        )}
      </div>

      {route !== 'studio3d' && (
        <footer className="border-t border-[#E2E0D8] py-6 mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#57554F]">
            <span>James Walker AI · Interactive Game-Book Editions</span>
            <div className="flex items-center gap-4">
              <a
                href="https://jameswalkerai.gumroad.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#141413] underline underline-offset-4"
              >
                jameswalkerai.gumroad.com
              </a>
              <button
                type="button"
                onClick={() => setVaultOpen(true)}
                className="hover:text-[#141413] underline underline-offset-4 cursor-pointer"
              >
                Redeem License Key
              </button>
            </div>
          </div>
        </footer>
      )}

      {vaultOpen && (
        <Suspense fallback={null}>
          <VaultModal
            isOpen={vaultOpen}
            onClose={() => setVaultOpen(false)}
            progress={progress}
            books={books}
            onUnlockSuccess={handleUnlockSuccess}
          />
        </Suspense>
      )}
    </div>
  );
}
