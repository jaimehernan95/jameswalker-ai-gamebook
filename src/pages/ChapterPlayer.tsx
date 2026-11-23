import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { ChapterPlayerSkeleton } from '../components/Skeletons.tsx';
import type {
  ChapterBundle,
  ChoiceOption,
  EvaluationResult,
  HudDelta,
  HudState,
  ReaderProgress,
  SkillKey,
} from '../types/gamebook.ts';

interface ChapterPlayerProps {
  chapter: ChapterBundle | null;
  loading: boolean;
  error: string | null;
  progress: ReaderProgress;
  demoMode?: boolean;
  demoOverrideNodeId?: string | null;
  demoOverrideHud?: HudState | null;
  demoLastHudDelta?: HudDelta | null;
  demoPendingChoice?: ChoiceOption | null;
  demoHighlightedChoiceId?: string | null;
  demoTypedPrompt?: string | null;
  demoEvalResult?: EvaluationResult | null;
  onStartDemo?: () => void;
  onStopDemo?: () => void;
  onBackToShelf: () => void;
  onSwitchChapter: (slug: string, chapterNum: number) => void;
  onApplyChoice: (
    bookSlug: string,
    chapterNum: number,
    choice: ChoiceOption,
    initialHud: HudState,
  ) => void;
  onCompleteBoss: (
    bookSlug: string,
    chapterNum: number,
    nextNodeId: string,
    xpEarned: number,
    score: number,
    initialHud: HudState,
    endingRank?: { title: string; badgeCode: string },
  ) => void;
  onRestartChapter: (
    bookSlug: string,
    chapterNum: number,
    startNodeId: string,
    initialHud: HudState,
  ) => void;
  onOpenVault: () => void;
}

const SKILL_LABELS: Array<{ key: SkillKey; label: string }> = [
  { key: 'clarity', label: 'Clarity' },
  { key: 'context', label: 'Context' },
  { key: 'constraint', label: 'Constraint' },
  { key: 'verification', label: 'Verification' },
];

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

function formatDeltaTick(val: number, unit: string): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val} ${unit}`;
}

export const ChapterPlayer: React.FC<ChapterPlayerProps> = ({
  chapter,
  loading,
  error,
  progress,
  demoMode = false,
  demoOverrideNodeId = null,
  demoOverrideHud = null,
  demoLastHudDelta = null,
  demoPendingChoice = null,
  demoHighlightedChoiceId = null,
  demoTypedPrompt = null,
  demoEvalResult = null,
  onStartDemo,
  onStopDemo,
  onBackToShelf,
  onSwitchChapter,
  onApplyChoice,
  onCompleteBoss,
  onRestartChapter,
  onOpenVault,
}) => {
  const [promptInput, setPromptInput] = useState('');
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [pendingChoice, setPendingChoice] = useState<ChoiceOption | null>(null);
  const [typedTerminal, setTypedTerminal] = useState('');
  const [terminalDone, setTerminalDone] = useState(false);
  const [lastHudDelta, setLastHudDelta] = useState<HudDelta | null>(null);
  const [copiedRank, setCopiedRank] = useState(false);

  const bookState = chapter ? progress.bookStates[chapter.book_slug] : undefined;
  const activeNodeId = demoMode && demoOverrideNodeId
    ? demoOverrideNodeId
    : bookState && bookState.chapterNum === chapter?.chapter_num
      ? bookState.currentNodeId
      : chapter?.start_node_id ?? '';

  const activeNode =
    chapter?.nodes[activeNodeId] ??
    (chapter ? chapter.nodes[chapter.start_node_id] : undefined);

  const baseHud: HudState = useMemo(() => {
    if (demoMode && demoOverrideHud) return normalizeHud(demoOverrideHud);
    if (bookState && bookState.chapterNum === chapter?.chapter_num && bookState.hud) {
      return normalizeHud(bookState.hud);
    }
    return normalizeHud(chapter?.initial_hud);
  }, [demoMode, demoOverrideHud, bookState, chapter]);

  const activePendingChoice = demoMode ? demoPendingChoice : pendingChoice;
  const activeDelta = demoMode ? demoLastHudDelta : lastHudDelta;

  const displayedHud: HudState = useMemo(() => {
    if (!activePendingChoice) return baseHud;
    const delta = normalizeDelta(activePendingChoice.hudDelta);
    return {
      trust: Math.max(0, Math.min(100, baseHud.trust + delta.trust)),
      minsLeft: Math.max(1, baseHud.minsLeft + delta.mins),
      leverage: Math.max(0, Math.min(100, baseHud.leverage + delta.leverage)),
    };
  }, [baseHud, activePendingChoice]);

  const effectivePromptText =
    demoMode && demoTypedPrompt !== null ? demoTypedPrompt : promptInput;
  const effectiveEvalResult = demoMode && demoEvalResult ? demoEvalResult : evalResult;

  // Typewriter simulation for Simulated AI Terminal Output Preview (0 network calls)
  useEffect(() => {
    if (!activePendingChoice) {
      setTypedTerminal('');
      setTerminalDone(false);
      return;
    }

    const fullText =
      activePendingChoice.terminalPreview?.simulatedOutput ??
      activePendingChoice.consequence ??
      '';
    setTypedTerminal('');
    setTerminalDone(false);

    if (!fullText) {
      setTerminalDone(true);
      return;
    }

    let index = 0;
    const step = demoMode ? 4 : 3;
    const intervalMs = demoMode ? 14 : 16;

    const timer = window.setInterval(() => {
      index = Math.min(fullText.length, index + step);
      setTypedTerminal(fullText.slice(0, index));
      if (index >= fullText.length) {
        window.clearInterval(timer);
        setTerminalDone(true);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [activePendingChoice, demoMode]);

  // Reset transient evaluation state when switching nodes/chapters
  useEffect(() => {
    if (demoMode) return;
    setEvalResult(null);
    setEvalError(null);
    setPendingChoice(null);
    if (activeNode?.kind === 'prompt_boss') {
      setPromptInput('');
    }
  }, [activeNode?.id, chapter?.book_slug, chapter?.chapter_num, demoMode]);

  // Real-time 0ms client-side constraint checker for Live Prompt Duel
  const liveChecklistStatus = useMemo(() => {
    const checks = activeNode?.promptChallenge?.liveChecks ?? [];
    return checks.map((chk) => {
      let matched = false;
      try {
        matched = new RegExp(chk.pattern, 'i').test(effectivePromptText);
      } catch {
        matched = false;
      }
      return { ...chk, matched };
    });
  }, [activeNode?.promptChallenge?.liveChecks, effectivePromptText]);

  if (loading && !chapter) {
    return <ChapterPlayerSkeleton />;
  }

  if (error || !chapter || !activeNode) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="border border-[#DDE2EA] bg-white rounded-lg p-6 sm:p-8">
          <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-2">
            Access Notice
          </p>
          <h1 className="font-serif text-2xl font-semibold text-[#0F141E] mb-3">
            {error || 'No active chapter selected.'}
          </h1>
          <p className="text-[16px] text-[#4E5869] mb-6 leading-relaxed">
            Chapter 1 of every playbook is free to play. Enter a Gumroad unlock code to access
            full-book chapters, or return to the shelf to start any free preview.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBackToShelf}
              className="min-h-[44px] px-4 py-2.5 bg-[#0F141E] text-[#F6F7F9] text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
            >
              Back to Book Shelf
            </button>
            <button
              type="button"
              onClick={onOpenVault}
              className="min-h-[44px] px-4 py-2.5 border border-[#DDE2EA] bg-white text-[#0F141E] text-sm font-medium rounded-md hover:border-[#0F141E] transition-colors whitespace-nowrap cursor-pointer"
            >
              Enter Unlock Code
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isBookUnlocked = progress.unlockedBooks.includes(chapter.book_slug);
  const nodeKeys = Object.keys(chapter.nodes);
  const currentIndex = Math.max(0, nodeKeys.indexOf(activeNode.id));
  const progressPct = Math.round(((currentIndex + 1) / Math.max(1, nodeKeys.length)) * 100);
  const history = bookState?.chapterNum === chapter.chapter_num ? bookState.history : [];

  const handleCardSelect = (choice: ChoiceOption) => {
    if (demoMode) return;
    setPendingChoice(choice);
    setLastHudDelta(normalizeDelta(choice.hudDelta));
  };

  const handleAdvanceFromTerminal = () => {
    if (!pendingChoice || demoMode) return;
    const chosen = pendingChoice;
    setPendingChoice(null);
    onApplyChoice(chapter.book_slug, chapter.chapter_num, chosen, normalizeHud(chapter.initial_hud));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEvaluatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNode.promptChallenge || demoMode) return;

    setEvalLoading(true);
    setEvalError(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: promptInput,
          challengeTitle: activeNode.promptChallenge.title,
          roleBrief: activeNode.promptChallenge.roleBrief,
          constraints: activeNode.promptChallenge.constraints,
          rubricFocus: activeNode.promptChallenge.rubricFocus,
          passingScore: activeNode.promptChallenge.passingScore,
          xpReward: activeNode.promptChallenge.xpReward,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Evaluation request failed.');
      }
      setEvalResult(data as EvaluationResult);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : 'Unable to evaluate prompt right now.');
    } finally {
      setEvalLoading(false);
    }
  };

  const handleAdvanceAfterPass = () => {
    if (!activeNode.promptChallenge || !effectiveEvalResult?.passed || demoMode) return;
    const nextNode = chapter.nodes[activeNode.promptChallenge.passNextNodeId];
    onCompleteBoss(
      chapter.book_slug,
      chapter.chapter_num,
      activeNode.promptChallenge.passNextNodeId,
      effectiveEvalResult.xpEarned,
      effectiveEvalResult.score,
      normalizeHud(chapter.initial_hud),
      nextNode?.endingRank
        ? {
            title: nextNode.endingRank.title,
            badgeCode: nextNode.endingRank.badgeCode,
          }
        : undefined,
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyRank = async () => {
    if (!activeNode.endingRank) return;
    const shareText = `${activeNode.endingRank.title} (${activeNode.endingRank.badgeCode}) — ${activeNode.endingRank.stampText} in "${chapter.title}" (${progress.xp} XP). Play at jameswalkerai.gumroad.com`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedRank(true);
      setTimeout(() => setCopiedRank(false), 2500);
    } catch {
      setCopiedRank(false);
    }
  };

  const passedLiveCount = liveChecklistStatus.filter((c) => c.matched).length;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
      {/* Top Breadcrumb + Chapter Tabs + Auto-Play Preview Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={onBackToShelf}
          className="min-h-[40px] inline-flex items-center gap-2 text-sm font-medium text-[#4E5869] hover:text-[#0F141E] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Book Shelf</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {demoMode ? (
            <button
              type="button"
              onClick={onStopDemo}
              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold bg-[#1D4ED8] text-[#F6F7F9] rounded border border-[#1D4ED8] hover:bg-[#1E40AF] transition-colors whitespace-nowrap cursor-pointer"
            >
              Stop Simulation Preview
            </button>
          ) : (
            onStartDemo && (
              <button
                type="button"
                onClick={onStartDemo}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-white text-[#0F141E] border border-[#DDE2EA] rounded hover:border-[#1D4ED8] hover:text-[#1D4ED8] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Auto-Play Simulation Preview</span>
              </button>
            )
          )}

          {!demoMode && (
            <button
              type="button"
              onClick={() => {
                setPendingChoice(null);
                setLastHudDelta(null);
                onRestartChapter(
                  chapter.book_slug,
                  chapter.chapter_num,
                  chapter.start_node_id,
                  normalizeHud(chapter.initial_hud),
                );
              }}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-white text-[#4E5869] border border-[#DDE2EA] rounded hover:border-[#0F141E] hover:text-[#0F141E] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. LIVE SIMULATION HUD (Replaces plain reading header) */}
      <section
        aria-label="Simulation HUD"
        className="border border-[#0F141E] bg-white rounded-lg p-4 sm:p-5 mb-7"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#DDE2EA]">
          <div>
            <div className="text-xs font-mono text-[#4E5869] mb-1">
              {chapter.book_title} · {activeNode.stepLabel} · {progress.xp} XP
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F141E]">
              {chapter.title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {chapter.chapters_toc.map((toc) => {
              const isCurrent = toc.chapter_num === chapter.chapter_num;
              const accessible = toc.is_free || isBookUnlocked;
              return (
                <button
                  key={toc.chapter_num}
                  type="button"
                  onClick={() => !demoMode && onSwitchChapter(chapter.book_slug, toc.chapter_num)}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#0F141E] text-[#F6F7F9] border-[#0F141E]'
                      : 'bg-[#F6F7F9] text-[#4E5869] border-[#DDE2EA] hover:border-[#0F141E] hover:text-[#0F141E]'
                  }`}
                >
                  {!accessible && <Lock className="w-3 h-3 text-[#1D4ED8]" />}
                  <span>Ch. {toc.chapter_num}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3 Live Telemetry Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Stakeholder Trust Meter */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-[#4E5869] inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F141E]" />
                <span>Stakeholder Trust</span>
              </span>
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                {activeDelta && activeDelta.trust !== 0 && (
                  <span
                    className={`text-[11px] font-semibold transition-opacity ${
                      activeDelta.trust > 0 ? 'text-[#1D4ED8]' : 'text-[#4E5869]'
                    }`}
                  >
                    {formatDeltaTick(activeDelta.trust, 'Trust')}
                  </span>
                )}
                <span className="text-sm font-bold text-[#0F141E]">{displayedHud.trust}%</span>
              </div>
            </div>
            <div className="h-2 w-full bg-[#ECEEF2] border border-[#DDE2EA] rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#0F141E] transition-all duration-300"
                style={{ width: `${displayedHud.trust}%` }}
              />
            </div>
          </div>

          {/* Time Remaining */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-[#4E5869] inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Time to Deadline</span>
              </span>
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                {activeDelta && activeDelta.mins !== 0 && (
                  <span className="text-[11px] font-semibold text-[#4E5869]">
                    {formatDeltaTick(activeDelta.mins, 'mins')}
                  </span>
                )}
                <span className="text-sm font-bold text-[#0F141E]">
                  {String(displayedHud.minsLeft).padStart(2, '0')}:00 mins
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-[#ECEEF2] border border-[#DDE2EA] rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#1D4ED8] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((displayedHud.minsLeft / 22) * 100))}%` }}
              />
            </div>
          </div>

          {/* AI Leverage Score */}
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xs font-medium text-[#4E5869] inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>AI Leverage Score</span>
              </span>
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                {activeDelta && activeDelta.leverage !== 0 && (
                  <span className="text-[11px] font-semibold text-[#1D4ED8]">
                    {formatDeltaTick(activeDelta.leverage, 'Lev')}
                  </span>
                )}
                <span className="text-sm font-bold text-[#0F141E]">{displayedHud.leverage}/100</span>
              </div>
            </div>
            <div className="h-2 w-full bg-[#ECEEF2] border border-[#DDE2EA] rounded-sm overflow-hidden">
              <div
                className="h-full bg-[#1D4ED8] transition-all duration-300"
                style={{ width: `${displayedHud.leverage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Scene progress strip */}
        <div
          className="mt-4 h-1 w-full bg-[#ECEEF2] rounded-sm overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[#0F141E] transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      {/* Main 2-Column Editorial Simulation Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          <article className="border border-[#DDE2EA] bg-white rounded-lg p-6 sm:p-8">
            <div className="text-xs font-mono text-[#4E5869] mb-2">{activeNode.stepLabel}</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0F141E] leading-snug mb-5">
              {activeNode.title}
            </h2>

            <div className="space-y-4 max-w-[65ch] text-[17px] leading-[1.65] text-[#0F141E]">
              {activeNode.narrative.map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {activeNode.callout && (
              <aside className="mt-6 p-4 sm:p-5 bg-[#F6F7F9] border border-[#DDE2EA] rounded-md max-w-[65ch]">
                <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-1.5">
                  {activeNode.callout.label}
                </p>
                <p className="text-sm text-[#0F141E] leading-relaxed">{activeNode.callout.body}</p>
              </aside>
            )}

            {/* 2. TACTILE PROMPT CARD DECK + SIMULATED AI TERMINAL PREVIEW */}
            {activeNode.kind === 'choice' && activeNode.choices && (
              <div id="scenario-choices" className="mt-8 pt-6 border-t border-[#DDE2EA]">
                {!activePendingChoice ? (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-[#4E5869]">
                        Prompt Card Deck · Select a Tactical Move
                      </p>
                      <span className="text-xs text-[#4E5869] font-mono">0ms Local Simulation</span>
                    </div>

                    <div
                      className={`grid grid-cols-1 gap-4 ${
                        activeNode.choices.length >= 3
                          ? 'md:grid-cols-3'
                          : activeNode.choices.length === 2
                            ? 'md:grid-cols-2'
                            : 'md:grid-cols-1'
                      }`}
                    >
                      {activeNode.choices.map((choice, idx) => {
                        const isHighlighted = demoHighlightedChoiceId === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => handleCardSelect(choice)}
                            className={`text-left p-5 rounded-md border bg-[#F6F7F9] flex flex-col justify-between gap-4 transition-all active:scale-[0.99] cursor-pointer group ${
                              isHighlighted
                                ? 'border-[#1D4ED8] bg-white ring-2 ring-[#1D4ED8]/25'
                                : 'border-[#DDE2EA] hover:border-[#0F141E] hover:bg-white'
                            }`}
                          >
                            <div>
                              {/* Unboxed Risk / Reward telemetry line */}
                              <div className="text-[11px] font-mono tracking-wide text-[#1D4ED8] mb-2">
                                {choice.riskRewardTag ?? choice.tacticTag}
                              </div>
                              <h3 className="font-serif text-lg font-semibold text-[#0F141E] leading-snug mb-2">
                                {choice.moveTitle ?? choice.label}
                              </h3>
                              <p className="text-sm text-[#4E5869] leading-relaxed">
                                {choice.label}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-[#DDE2EA] flex items-center justify-between text-xs font-medium text-[#0F141E]">
                              <span className="font-mono text-[#4E5869]">Card 0{idx + 1}</span>
                              <span className="inline-flex items-center gap-1 group-hover:text-[#1D4ED8] transition-colors">
                                <span>Execute Move</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Simulated AI Terminal Output Preview */
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8]">
                          Simulated Execution · {activePendingChoice.moveTitle ?? activePendingChoice.label}
                        </span>
                        <p className="text-xs font-mono text-[#4E5869] mt-0.5">
                          {activePendingChoice.riskRewardTag ?? activePendingChoice.tacticTag}
                        </p>
                      </div>
                      {!terminalDone && !demoMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setTypedTerminal(
                              activePendingChoice.terminalPreview?.simulatedOutput ??
                                activePendingChoice.consequence,
                            );
                            setTerminalDone(true);
                          }}
                          className="text-xs font-mono text-[#4E5869] hover:text-[#0F141E] underline cursor-pointer"
                        >
                          Skip Typing
                        </button>
                      )}
                    </div>

                    <div className="bg-[#0F141E] text-[#F6F7F9] rounded-md border border-[#0F141E] p-4 sm:p-5 font-mono text-xs leading-relaxed space-y-4">
                      {/* Dispatched prompt */}
                      <div className="pb-3 border-b border-[#F6F7F9]/15">
                        <div className="text-[#F6F7F9]/60 mb-1 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#1D4ED8]" />
                          <span>PROMPT DISPATCHED</span>
                        </div>
                        <div className="text-[#F6F7F9]">
                          &gt; {activePendingChoice.terminalPreview?.promptSent ?? activePendingChoice.label}
                        </div>
                      </div>

                      {/* Token Efficiency Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="text-[#F6F7F9]/70">TOKEN EFFICIENCY / SIGNAL RATIO</span>
                          <span className="text-[#1D4ED8] font-semibold tabular-nums">
                            {activePendingChoice.terminalPreview?.tokenEfficiency ?? 82}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F6F7F9]/15 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-[#1D4ED8] transition-all duration-300"
                            style={{
                              width: `${activePendingChoice.terminalPreview?.tokenEfficiency ?? 82}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Streaming Simulated AI Output */}
                      <div>
                        <div className="text-[#F6F7F9]/60 mb-1">MODEL OUTPUT</div>
                        <pre className="whitespace-pre-wrap text-[#F6F7F9] min-h-[48px]">
                          {typedTerminal}
                          {!terminalDone && <span className="text-[#1D4ED8]">_</span>}
                        </pre>
                      </div>

                      {/* Boss / Client Reaction */}
                      <div className="pt-3 border-t border-[#F6F7F9]/15 text-[#F6F7F9]/90">
                        <span className="text-[#1D4ED8] font-semibold">STAKEHOLDER REACTION: </span>
                        {activePendingChoice.terminalPreview?.bossReaction ?? activePendingChoice.consequence}
                      </div>
                    </div>

                    <div className="p-4 bg-[#F6F7F9] border border-[#DDE2EA] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <p className="text-sm text-[#0F141E]">
                        {activePendingChoice.consequence}
                      </p>
                      {!demoMode && (
                        <button
                          type="button"
                          onClick={handleAdvanceFromTerminal}
                          className="min-h-[44px] px-5 py-2.5 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Advance to Next Scene</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. BOSS ENCOUNTER — LIVE PROMPT DUEL MINI-GAME */}
            {activeNode.kind === 'prompt_boss' && activeNode.promptChallenge && (
              <div id="scenario-choices" className="mt-8 pt-6 border-t border-[#DDE2EA]">
                <div className="mb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h3 className="font-serif text-xl font-semibold text-[#0F141E]">
                      {activeNode.promptChallenge.title}
                    </h3>
                    <span className="text-xs font-mono text-[#1D4ED8] whitespace-nowrap tabular-nums">
                      Pass: {activeNode.promptChallenge.passingScore}/100 · +{activeNode.promptChallenge.xpReward} XP
                    </span>
                  </div>
                  <p className="text-sm text-[#4E5869] mb-4">
                    {activeNode.promptChallenge.roleBrief}
                  </p>

                  {/* Real-Time 3-Constraint Live Checklist (0ms per keystroke) */}
                  <div className="p-4 bg-[#F6F7F9] border border-[#0F141E] rounded-md mb-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-[#0F141E] font-semibold">
                        Live Duel Guardrails (0ms Keystroke Check)
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[#1D4ED8] font-semibold">
                        {passedLiveCount} / {liveChecklistStatus.length} Locked
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {liveChecklistStatus.map((item) => (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded border text-xs transition-colors flex items-start gap-2 ${
                            item.matched
                              ? 'border-[#1D4ED8] bg-white text-[#0F141E]'
                              : 'border-[#DDE2EA] bg-[#ECEEF2] text-[#4E5869]'
                          }`}
                        >
                          <span
                            className={`font-mono font-bold shrink-0 ${
                              item.matched ? 'text-[#1D4ED8]' : 'text-[#4E5869]'
                            }`}
                          >
                            {item.matched ? '[✓]' : '[ ]'}
                          </span>
                          <span className="leading-snug font-medium">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-[#ECEEF2] border border-[#DDE2EA] rounded font-mono text-xs text-[#4E5869]">
                    Input Context: {activeNode.promptChallenge.inputContext}
                  </div>
                </div>

                <form onSubmit={handleEvaluatePrompt} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label
                        htmlFor="boss-prompt-textarea"
                        className="text-sm font-medium text-[#0F141E]"
                      >
                        Your Prompt Draft
                      </label>
                      {!demoMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setPromptInput(activeNode.promptChallenge?.starterPrompt ?? '')
                          }
                          className="text-xs font-medium text-[#1D4ED8] hover:underline cursor-pointer"
                        >
                          Insert Reference Template
                        </button>
                      )}
                    </div>
                    <textarea
                      id="boss-prompt-textarea"
                      rows={6}
                      value={effectivePromptText}
                      onChange={(e) => !demoMode && setPromptInput(e.target.value)}
                      readOnly={demoMode}
                      placeholder="Write your role, locked output format, and anti-hallucination guardrail..."
                      className="w-full p-4 font-mono text-sm leading-relaxed bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>

                  {evalError && (
                    <div
                      role="alert"
                      className="p-3 border border-[#1D4ED8] bg-[#F6F7F9] rounded text-sm text-[#0F141E]"
                    >
                      {evalError}
                    </div>
                  )}

                  {!demoMode && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={evalLoading || effectivePromptText.trim().length < 15}
                        className="min-h-[46px] px-5 py-2.5 bg-[#0F141E] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1D4ED8] active:scale-[0.99] transition-all inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        <Terminal className="w-4 h-4" />
                        <span>{evalLoading ? 'Evaluating Prompt...' : 'Execute Prompt'}</span>
                      </button>
                    </div>
                  )}
                </form>

                {/* Evaluation Result + Tactile Ink Press Outcome Stamp */}
                {effectiveEvalResult && (
                  <div className="mt-6 p-5 sm:p-6 border border-[#0F141E] bg-[#F6F7F9] rounded-md">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-[#DDE2EA]">
                      <div>
                        <span className="text-xs font-mono text-[#4E5869] block mb-1">
                          {effectiveEvalResult.source === 'gemini'
                            ? `Evaluated via ${effectiveEvalResult.model}`
                            : 'Simulation Rubric Evaluator'}
                        </span>
                        <h4 className="font-serif text-xl font-semibold text-[#0F141E]">
                          {effectiveEvalResult.verdict} ·{' '}
                          <span className="font-mono text-[#1D4ED8] tabular-nums">
                            {effectiveEvalResult.score}/100
                          </span>
                        </h4>
                      </div>

                      {/* Ink Press Outcome Stamp */}
                      <div
                        className={`px-3.5 py-1.5 border-2 border-double font-mono text-xs font-bold tracking-widest uppercase -rotate-2 select-none ${
                          effectiveEvalResult.passed
                            ? 'border-[#1D4ED8] text-[#1D4ED8] bg-white'
                            : 'border-[#0F141E] text-[#0F141E] bg-[#ECEEF2]'
                        }`}
                      >
                        {effectiveEvalResult.stampLabel ??
                          (effectiveEvalResult.passed ? 'APPROVED FOR PROD' : 'NEEDS REVISION')}
                      </div>
                    </div>

                    <p className="text-sm text-[#0F141E] mb-4 leading-relaxed">
                      <strong className="font-semibold">What worked:</strong>{' '}
                      {effectiveEvalResult.strengths}
                    </p>

                    <div className="mb-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-[#4E5869] mb-2">
                        Two Concise Improvements
                      </p>
                      <ul className="space-y-1.5 text-sm text-[#0F141E]">
                        {effectiveEvalResult.improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="font-mono text-[#1D4ED8] text-xs mt-0.5">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-sm text-[#4E5869] italic mb-5">
                      {effectiveEvalResult.mentorNote}
                    </p>

                    {effectiveEvalResult.passed && !demoMode ? (
                      <button
                        type="button"
                        onClick={handleAdvanceAfterPass}
                        className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>
                          Claim +{effectiveEvalResult.xpEarned} XP & Complete Chapter
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      !effectiveEvalResult.passed && (
                        <p className="text-xs font-medium text-[#1D4ED8]">
                          {activeNode.promptChallenge.retryHint}
                        </p>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ENDING RANK NODE WITH INK PRESS STAMP */}
            {activeNode.kind === 'ending' && activeNode.endingRank && (
              <div className="mt-8 pt-6 border-t border-[#DDE2EA]">
                <div className="p-6 bg-[#F6F7F9] border border-[#0F141E] rounded-md mb-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
                        Rank Badge Earned · {activeNode.endingRank.badgeCode}
                      </p>
                      <h3 className="font-serif text-2xl font-semibold text-[#0F141E]">
                        {activeNode.endingRank.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3.5 py-1.5 border-2 border-double border-[#1D4ED8] text-[#1D4ED8] bg-white font-mono text-xs font-bold tracking-widest uppercase -rotate-2">
                        {activeNode.endingRank.stampText}
                      </span>
                      <Award className="w-7 h-7 text-[#1D4ED8] shrink-0" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-sm text-[#0F141E] leading-relaxed mb-4">
                    {activeNode.endingRank.summary}
                  </p>
                  <p className="text-xs text-[#4E5869]">
                    {activeNode.endingRank.nextChapterHint}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyRank}
                    className="min-h-[44px] px-4 py-2.5 bg-[#0F141E] text-[#F6F7F9] text-sm font-medium rounded-md hover:bg-[#1D4ED8] active:scale-[0.99] transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    {copiedRank ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedRank ? 'Rank Copied' : 'Share Rank Badge'}</span>
                  </button>

                  {!demoMode &&
                    (() => {
                      const nextToc = chapter.chapters_toc.find(
                        (t) => t.chapter_num === chapter.chapter_num + 1,
                      );
                      if (!nextToc) return null;
                      const canOpenNext = nextToc.is_free || isBookUnlocked;
                      return (
                        <button
                          type="button"
                          onClick={() =>
                            canOpenNext
                              ? onSwitchChapter(chapter.book_slug, nextToc.chapter_num)
                              : onOpenVault()
                          }
                          className="min-h-[44px] px-4 py-2.5 border border-[#0F141E] bg-white text-[#0F141E] text-sm font-medium rounded-md hover:bg-[#ECEEF2] transition-colors inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                          <span>
                            {canOpenNext
                              ? `Play Chapter ${nextToc.chapter_num}`
                              : `Unlock Chapter ${nextToc.chapter_num}`}
                          </span>
                        </button>
                      );
                    })()}

                  <a
                    href={chapter.gumroad_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-4 py-2.5 border border-[#DDE2EA] bg-white text-[#0F141E] text-sm font-medium rounded-md hover:border-[#0F141E] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Get Full Book on Gumroad</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </article>
        </div>

        {/* Right Margin Rail: Skill Stats & Decision Ledger */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-[#DDE2EA] bg-white rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold text-[#0F141E] mb-4">
              Skill Profile
            </h3>
            <div className="space-y-3">
              {SKILL_LABELS.map(({ key, label }) => {
                const val = Math.min(100, progress.skills[key] ?? 10);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#4E5869] font-medium">{label}</span>
                      <span className="font-mono text-[#0F141E] tabular-nums">{val}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#ECEEF2] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#0F141E] transition-all duration-200"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-[#DDE2EA] bg-white rounded-lg p-5">
            <h3 className="font-serif text-lg font-semibold text-[#0F141E] mb-3">
              Decision Trail
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-[#4E5869]">
                Your tactical moves and HUD shifts will appear here as you progress.
              </p>
            ) : (
              <ol className="space-y-3 text-sm">
                {history.map((item, idx) => (
                  <li
                    key={idx}
                    className="pb-3 border-b border-[#DDE2EA] last:border-b-0 last:pb-0"
                  >
                    <div className="text-xs font-mono text-[#1D4ED8] mb-0.5">
                      Step 0{idx + 1} · +{item.xpDelta} XP
                    </div>
                    <div className="font-medium text-[#0F141E] leading-snug">
                      {item.choiceLabel}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>

      {/* Compact Mobile Thumb Action Bar (<= 56px, well under 15% mobile viewport cap) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#F6F7F9]/95 backdrop-blur-sm border-t border-[#DDE2EA] h-14 px-4 flex items-center justify-between gap-3">
        <span className="text-xs font-mono text-[#4E5869] tabular-nums truncate">
          Trust {displayedHud.trust}% · {displayedHud.minsLeft}m left
        </span>
        <a
          href="#scenario-choices"
          className="px-4 py-2 bg-[#1D4ED8] text-[#F6F7F9] text-xs font-semibold rounded-md whitespace-nowrap shrink-0"
        >
          {activeNode.kind === 'ending' ? 'View Rank' : 'Jump to Action'}
        </a>
      </div>
    </main>
  );
};
