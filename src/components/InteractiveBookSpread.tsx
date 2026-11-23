import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Eraser,
  ExternalLink,
  Highlighter,
  Lock,
  LockOpen,
  Mic,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { BookSummary } from '../types/gamebook.ts';

type MarkerColor = 'amber' | 'vermilion' | 'sage' | 'erase';

interface HighlightPassage {
  id: string;
  text: string;
  marginNote: string;
}

interface TechCaseDemo {
  caseLabel: string;
  scenario: string;
  naivePrompt: string;
  naiveResult: string;
  naiveFlaw: string;
  proPrompt: string;
  proResult: string;
  proWin: string;
  exerciseQuestion: string;
  exerciseOptions: Array<{
    id: string;
    label: string;
    correct: boolean;
    feedback: string;
  }>;
}

interface BookInteractiveContent {
  slug: string;
  editionBadge: string;
  tagline: string;
  passagesLeft: HighlightPassage[];
  passagesRight: HighlightPassage[];
  techCase: TechCaseDemo;
  chapterLabels: [string, string, string];
  unlockHint: string;
}

const BOOK_SPREAD_CONTENT: Record<string, BookInteractiveContent> = {
  'ai-for-online-work': {
    slug: 'ai-for-online-work',
    editionBadge: '2026 Flagship Roadmap · 2 Free Chapters',
    tagline: 'From tutorial overload to one shipped digital product, freelance offer, or workflow in 30 days.',
    passagesLeft: [
      {
        id: 'ow_p1',
        text: 'Beginners rarely fail because AI tools are too weak; they stall inside the Tutorial Trap—bookmarking 40 tools without shipping one real asset.',
        marginNote: 'Highlight this rule: lock 1 of the 4 paths for 30 days before testing any new tool.',
      },
      {
        id: 'ow_p2',
        text: 'Earn your first $50 to $100 using free AI tiers before paying for a single $20/month subscription.',
        marginNote: 'Every core workflow in 2026 starts at $0 using Gemini Free, NotebookLM, Canva Free, and Gumroad.',
      },
      {
        id: 'ow_p3',
        text: 'Use the RCTS Prompt Formula—Role, Context, Task, Style—so your drafts sound like an experienced practitioner instead of generic filler.',
        marginNote: 'Practice RCTS live in Chapter 2 or the Prompt Arena for a 0–100 score.',
      },
    ],
    passagesRight: [
      {
        id: 'ow_p4',
        text: 'The 4 Beginner Online Work Paths: (1) Digital Products on Gumroad/KDP, (2) Client-First Freelancing, (3) Organic Content & Pinterest, (4) Productivity Systems.',
        marginNote: 'Pick the path that matches your current week—not all four at once.',
      },
      {
        id: 'ow_p5',
        text: 'Positioning Formula: "[Product] helps [specific audience] achieve [concrete outcome] without [main obstacle]."',
        marginNote: 'Clear positioning beats hype claims and protects platform compliance.',
      },
      {
        id: 'ow_p6',
        text: 'When selling globally, use a Merchant of Record like Gumroad so EU/UK VAT and sales taxes are handled automatically from sale #1.',
        marginNote: 'Updated 2026 policy rule covered in Chapter 2.',
      },
    ],
    techCase: {
      caseLabel: 'Tech Case 01 · Maria’s First Gumroad Product Launch',
      scenario:
        'Maria has zero audience and wants to publish a $12 "ATS-Friendly Resume Starter Guide" on Gumroad without sounding like spam.',
      naivePrompt: '"Write a killer sales page for my AI resume eBook that makes people buy immediately."',
      naiveResult:
        '"UNLOCK YOUR DREAM CAREER OVERNIGHT! Our revolutionary AI blueprint guarantees 6-figure remote job offers in 7 days..."',
      naiveFlaw: 'Over-promises guaranteed income, triggers buyer skepticism, and violates honest platform marketing guidelines.',
      proPrompt:
        'Role: Practical career editor. Context: $12 24-page ATS Resume Starter Guide for first-time remote applicants. Task: Write a 120-word Gumroad description using the Positioning Formula + 3 deliverables. Style: Plain English, zero income guarantees.',
      proResult:
        '"ATS-Friendly Resume Starter Guide helps first-time remote applicants pass automated screening without rewriting their career history from scratch. Includes 3 clean templates, a 15-minute keyword audit checklist, and 5 interactive QR drills."',
      proWin: 'Specific audience, concrete deliverables, transparent promise—ready to publish in 2 minutes.',
      exerciseQuestion:
        'Quick Tech Check: A beginner has 4 hours this weekend to launch their first Gumroad guide. What is the highest-leverage move?',
      exerciseOptions: [
        {
          id: 'ow_a',
          label: 'Subscribe to 3 paid AI tools and redesign the logo 5 times first.',
          correct: false,
          feedback: 'Classic Tutorial Trap—spending money and time before validating the problem.',
        },
        {
          id: 'ow_b',
          label: 'Use RCTS on free tiers to draft a focused 20-page checklist + interactive QR drill and publish via Gumroad.',
          correct: true,
          feedback: 'Spot on! Ship one focused solution on $0 tools, then iterate from real reader feedback.',
        },
        {
          id: 'ow_c',
          label: 'Promise buyers a guaranteed remote job within 14 days to boost conversions.',
          correct: false,
          feedback: 'Never make guaranteed-income or guaranteed-hire claims—honest specificity converts better long-term.',
        },
      ],
    },
    chapterLabels: [
      'Ch. 1: Escape the Tutorial Trap & Lock Your 30-Day Path',
      'Ch. 2: The RCTS Digital Product & Gumroad Launch',
      'Ch. 3: Client-First Freelancing & Organic Traffic Engine',
    ],
    unlockHint: 'Buyer key ONLINEWORK-2026 unlocks Ch. 3',
  },
  'chatgpt-9-to-5': {
    slug: 'chatgpt-9-to-5',
    editionBadge: 'Workplace Operations · 2 Free Chapters',
    tagline: 'Compress chaotic Monday email threads and 14-page transcripts into executive-ready memos in 90 seconds.',
    passagesLeft: [
      {
        id: 'c9_p1',
        text: 'Never paste a 19-email escalation and type "Summarize this"—unconstrained models smooth over contradictions and invent missing dates.',
        marginNote: 'Always force an "Open Conflicts & Unverified Claims" column.',
      },
      {
        id: 'c9_p2',
        text: 'Frame Before Context: declare Role, Audience, Output Schema, and Grounding Rule BEFORE pasting raw meeting transcripts.',
        marginNote: 'Reduces hallucinations by forcing strict extraction instead of creative guessing.',
      },
      {
        id: 'c9_p3',
        text: 'Use explicit bracket tags like [UNCONFIRMED] or [OWNER NEEDED] so missing facts jump off the page for your VP.',
        marginNote: 'Executives trust analysts who surface unknowns early.',
      },
    ],
    passagesRight: [
      {
        id: 'c9_p4',
        text: 'Audience Isolation: generate two separate outputs—an internal risk brief for leadership and a calm remediation timeline for the client.',
        marginNote: 'Prevents internal blame or unapproved discount notes from leaking externally.',
      },
      {
        id: 'c9_p5',
        text: 'Hard word ceilings (e.g., "Max 180 words, 4-column table") stop AI padding and force scannable decision briefs.',
        marginNote: 'Tested live in Chapter 1 & Chapter 2 simulations.',
      },
    ],
    techCase: {
      caseLabel: 'Tech Case 02 · 8:42 AM VP Escalation Triage',
      scenario:
        'A 19-message chain contains conflicting shipping dates (Wed vs Thu) and an unapproved 12% discount 18 minutes before standup.',
      naivePrompt: '"Summarize this email chain clearly for my VP before our 9:30 meeting."',
      naiveResult: '"Acme shipment is on track for Wednesday and Sales offered a 12% discount to secure Q4 renewal."',
      naiveFlaw: 'Hides the Logistics vs Sales date conflict and makes an unapproved discount look finalized.',
      proPrompt:
        'Act as Operations Analyst. Extract a 4-column table (Topic | Owner | Deadline | Open Conflict). Flag any missing approval as [UNCONFIRMED]. Max 160 words.',
      proResult:
        'Row 1: Shipment Date | Logistics vs Account Mgr | Conflict: Wed vs Thu [UNCONFIRMED]. Row 2: 12% Discount | Sales | Finance Approval: [UNCONFIRMED].',
      proWin: 'VP sees both risks in 12 seconds and enters standup fully protected.',
      exerciseQuestion:
        'Quick Tech Check: When compressing a messy 75-minute transcript into a 1-page decision memo, what guardrail prevents fabricated revenue numbers?',
      exerciseOptions: [
        {
          id: 'c9_a',
          label: 'Ask the model to "sound confident and executive."',
          correct: false,
          feedback: 'Confidence without grounding increases fabricated metrics.',
        },
        {
          id: 'c9_b',
          label: 'Require every number to cite its speaker/timestamp or be labeled [ESTIMATE — UNVERIFIED].',
          correct: true,
          feedback: 'Exactly right! Source-grounding labels keep executive memos audit-safe.',
        },
        {
          id: 'c9_c',
          label: 'Delete all numbers from the memo entirely.',
          correct: false,
          feedback: 'Leadership still needs the real figures—just separated cleanly from rough guesses.',
        },
      ],
    },
    chapterLabels: [
      'Ch. 1: The Monday Morning Inbox Triage',
      'Ch. 2: The Executive Memo Compression',
      'Ch. 3: The Sensitive Client De-escalation',
    ],
    unlockHint: 'Full 3-chapter edition on Gumroad',
  },
  'ai-workflow-architect': {
    slug: 'ai-workflow-architect',
    editionBadge: 'Automation & Chains · 2 Free Chapters',
    tagline: 'Replace fragile 900-word mega-prompts with modular 3-stage chains and human-in-the-loop safety gates.',
    passagesLeft: [
      {
        id: 'wa_p1',
        text: 'One giant prompt trying to extract, analyze, format, and email simultaneously fails silently the moment input data shifts.',
        marginNote: 'Break complex work into Extract → Validate → Format stages.',
      },
      {
        id: 'wa_p2',
        text: 'Every reliable AI automation uses a typed JSON handoff between steps so downstream tools never choke on conversational filler.',
        marginNote: 'No prose wrappers—strict schema keys only.',
      },
      {
        id: 'wa_p3',
        text: 'Human-in-the-Loop Gates route high-risk or low-confidence items (< 0.85) to Slack review before any external send fires.',
        marginNote: 'Automation should fail loudly, never silently.',
      },
    ],
    passagesRight: [
      {
        id: 'wa_p4',
        text: 'Enum Locking restricts classification pipelines to 4–6 exact labels plus an explicit "NEEDS_HUMAN_TRIAGE" fallback.',
        marginNote: 'Stops label drift across weekly support queues.',
      },
      {
        id: 'wa_p5',
        text: 'Start automations on free Make.com or n8n workflows before writing custom infrastructure—prove ROI on one recurring weekly report first.',
        marginNote: 'Saves 3–4 hours/week with zero server maintenance.',
      },
    ],
    techCase: {
      caseLabel: 'Tech Case 03 · Breaking a Fragile 4-Hour Weekly Report',
      scenario:
        'An ops team uses one giant prompt to parse 30 support tickets and auto-email clients—yesterday it misclassified a billing outage as "Feature Request."',
      naivePrompt: '"Read all 30 tickets, classify them, summarize priorities, and draft client replies in one go."',
      naiveResult: 'Dropped 4 urgent tickets, invented a refund timeline, and sent an auto-reply on an active outage.',
      naiveFlaw: 'No separation between extraction and external communication, and zero confidence gate.',
      proPrompt:
        'Stage 1 (JSON Extractor): Output {id, category: enum[OUTAGE|BILLING|BUG|FEATURE], severity: 1-5, confidence: 0-1}. Gate: If severity >= 4 OR confidence < 0.85 → route to human Slack queue.',
      proResult: '27 routine tickets drafted automatically; 3 billing/outage tickets held at the Slack gate for 2-minute human approval.',
      proWin: 'Zero silent auto-send disasters while still cutting weekly triage time by 75%.',
      exerciseQuestion:
        'Quick Tech Check: Where should a Human-in-the-Loop approval gate sit in a customer-facing AI workflow?',
      exerciseOptions: [
        {
          id: 'wa_a',
          label: 'After the email is already sent, inside a weekly audit log.',
          correct: false,
          feedback: 'Too late—damage to client trust happens before anyone reads the log.',
        },
        {
          id: 'wa_b',
          label: 'Between structured classification and external dispatch for high-severity or low-confidence cases.',
          correct: true,
          feedback: 'Correct! Gate high-risk/ambiguous items while letting low-risk routine work flow cleanly.',
        },
        {
          id: 'wa_c',
          label: 'Require manual approval for every single token generated.',
          correct: false,
          feedback: 'That removes the leverage of automation—use risk thresholds instead.',
        },
      ],
    },
    chapterLabels: [
      'Ch. 1: Breaking the 4-Hour Weekly Report',
      'Ch. 2: Designing Human-in-the-Loop Gates',
      'Ch. 3: Zero-Drift Classification Pipelines',
    ],
    unlockHint: 'Full 3-chapter edition on Gumroad',
  },
  'prompt-engineering-manual': {
    slug: 'prompt-engineering-manual',
    editionBadge: 'Prompt Craft Manual · 2 Free Chapters',
    tagline: 'Eliminate robotic AI voice with 2-shot style anchors, negative style boundaries, and self-critique loops.',
    passagesLeft: [
      {
        id: 'pm_p1',
        text: 'Telling a model "write professionally" triggers corporate cliché mode ("delve," "synergy," "in today’s fast-paced landscape").',
        marginNote: 'Show 2 short writing samples instead of vague adjectives.',
      },
      {
        id: 'pm_p2',
        text: 'Negative Style Boundaries explicitly ban filler phrases, passive openings, and exclamation-mark hype.',
        marginNote: 'Negative rules sharpen voice faster than positive adjectives.',
      },
      {
        id: 'pm_p3',
        text: 'Chain-of-Critique instructs the model to attack its own first draft from a skeptical buyer’s viewpoint before showing you the final text.',
        marginNote: 'Covered hands-on in Chapter 2 (Free).',
      },
    ],
    passagesRight: [
      {
        id: 'pm_p4',
        text: 'Parameterize winning prompts with clean {{audience}}, {{offer}}, and {{word_limit}} variables so your whole team gets consistent quality.',
        marginNote: 'Turns one lucky prompt into a repeatable business asset.',
      },
      {
        id: 'pm_p5',
        text: 'Two contrasting examples (1 Weak vs 1 Sharp) calibrate tone in fewer than 120 tokens.',
        marginNote: 'Far more reliable than writing 6 paragraphs of style instructions.',
      },
    ],
    techCase: {
      caseLabel: 'Tech Case 04 · Killing Generic AI Proposal Fluff',
      scenario:
        'A freelance consultant wants an authentic 90-word cold outreach email that sounds human and gets replies.',
      naivePrompt: '"Write a compelling, professional outreach email pitching my AI workflow audit service."',
      naiveResult:
        '"I hope this email finds you well! In today’s fast-paced digital landscape, I would love to delve into synergistic AI solutions..."',
      naiveFlaw: 'Instantly flagged as automated spam in the first 8 words.',
      proPrompt:
        'Match these 2 sample sentences (short, direct, observational). Ban: "hope this finds you well", "delve", "landscape", "synergy". Task: Write an 80-word email pointing out one concrete bottleneck + 10-min Loom offer.',
      proResult:
        '"Noticed your onboarding guide still asks new clients to fill out 3 separate PDFs. I recorded a 2-minute prototype showing how one form can auto-populate your welcome packet. Want the link?"',
      proWin: 'Zero fluff, specific observation, high reply rate.',
      exerciseQuestion:
        'Quick Tech Check: What is the fastest way to stop an AI draft from sounding like generic corporate prose?',
      exerciseOptions: [
        {
          id: 'pm_a',
          label: 'Paste 2 short examples of your real writing + a banned-phrase list.',
          correct: true,
          feedback: 'Bingo! Few-shot anchors + negative constraints immediately lock in authentic voice.',
        },
        {
          id: 'pm_b',
          label: 'Add "be super creative and human!!!" at the end.',
          correct: false,
          feedback: 'Vague emphasis usually produces louder clichés, not sharper prose.',
        },
        {
          id: 'pm_c',
          label: 'Ask for 1,200 words so you have more to edit.',
          correct: false,
          feedback: 'Longer outputs dilute clarity—tight word limits produce cleaner writing.',
        },
      ],
    },
    chapterLabels: [
      'Ch. 1: Killing Generic AI Proposal Fluff',
      'Ch. 2: Chain-of-Critique Calibration',
      'Ch. 3: Reusable System Templates',
    ],
    unlockHint: 'Full 3-chapter edition on Gumroad',
  },
};

const HIGHLIGHTS_STORAGE_KEY = 'jwai_book_highlights_v1';

const MARKER_STYLES: Record<Exclude<MarkerColor, 'erase'>, { bg: string; label: string; swatch: string }> = {
  amber: { bg: 'bg-[#FEF08A]/80 text-[#0F141E]', label: 'Amber Marker', swatch: '#EAB308' },
  vermilion: { bg: 'bg-[#DBEAFE]/95 text-[#0F141E]', label: 'Cobalt Ink', swatch: '#1D4ED8' },
  sage: { bg: 'bg-[#D1FAE5]/85 text-[#0F141E]', label: 'Sage Note', swatch: '#059669' },
};

/** Procedural Web Audio soft paper-turn rustle (zero external audio files / zero 404s) */
function playPaperTurnSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const duration = 0.16;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const env = Math.sin((i / data.length) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.16;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + duration);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    source.onended = () => {
      void ctx.close();
    };
  } catch {
    // Audio optional
  }
}

interface InteractiveBookSpreadProps {
  book: BookSummary;
  isUnlocked: boolean;
  onClose: () => void;
  onPlayChapter: (slug: string, chapterNum: number) => void;
  onOpenVoiceMentor: () => void;
  onOpenVault: () => void;
}

export const InteractiveBookSpread: React.FC<InteractiveBookSpreadProps> = ({
  book,
  isUnlocked,
  onClose,
  onPlayChapter,
  onOpenVoiceMentor,
  onOpenVault,
}) => {
  const content = BOOK_SPREAD_CONTENT[book.slug] ?? BOOK_SPREAD_CONTENT['ai-for-online-work'];

  const [spreadIndex, setSpreadIndex] = useState<0 | 1 | 2>(0);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeMarker, setActiveMarker] = useState<MarkerColor>('amber');
  const [isDraggingHighlight, setIsDraggingHighlight] = useState(false);
  const [activeMarginNote, setActiveMarginNote] = useState<string | null>(
    content.passagesLeft[0]?.marginNote ?? null,
  );
  const [showHighlightsDrawer, setShowHighlightsDrawer] = useState(false);

  // Tech Case Demo state (Spread 2)
  const [demoMode, setDemoMode] = useState<'naive' | 'pro'>('pro');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Swipe / hand-drag page turn state
  const swipeStartX = useRef<number | null>(null);

  // Highlights persisted in localStorage per passage id
  const [highlights, setHighlights] = useState<Record<string, Exclude<MarkerColor, 'erase'>>>(() => {
    try {
      const raw = localStorage.getItem(HIGHLIGHTS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, Exclude<MarkerColor, 'erase'>>) : { ow_p1: 'amber' };
    } catch {
      return {};
    }
  });

  const applyHighlight = (passageId: string, marginNote: string) => {
    setActiveMarginNote(marginNote);
    setHighlights((prev) => {
      const next = { ...prev };
      if (activeMarker === 'erase') {
        delete next[passageId];
      } else if (next[passageId] === activeMarker) {
        delete next[passageId];
      } else {
        next[passageId] = activeMarker;
      }
      try {
        localStorage.setItem(HIGHLIGHTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota
      }
      return next;
    });
  };

  const turnPage = (dir: 'next' | 'prev') => {
    const nextIdx =
      dir === 'next'
        ? (Math.min(2, spreadIndex + 1) as 0 | 1 | 2)
        : (Math.max(0, spreadIndex - 1) as 0 | 1 | 2);
    if (nextIdx === spreadIndex) return;

    if (soundEnabled) playPaperTurnSound();
    setFlipDirection(dir);
    window.setTimeout(() => {
      setSpreadIndex(nextIdx);
      setFlipDirection(null);
    }, 170);
  };

  const handleBookPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, a, [data-highlightable="true"]')) {
      return;
    }
    swipeStartX.current = e.clientX;
  };

  const handleBookPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingHighlight(false);
    if (swipeStartX.current === null) return;
    const dx = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx < -55) {
      turnPage('next');
    } else if (dx > 55) {
      turnPage('prev');
    }
  };

  const bookHighlightEntries = useMemo(() => {
    const allPassages = [...content.passagesLeft, ...content.passagesRight];
    return allPassages.filter((p) => Boolean(highlights[p.id]));
  }, [content.passagesLeft, content.passagesRight, highlights]);

  const selectedExerciseOption = content.techCase.exerciseOptions.find(
    (o) => o.id === selectedOptionId,
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Interactive Book Reader for ${book.title}`}
      className="fixed inset-0 z-40 bg-[#0F141E]/80 flex flex-col items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onPointerUp={() => setIsDraggingHighlight(false)}
    >
      {/* Top Reader Bar */}
      <div className="w-full max-w-5xl bg-white border border-[#DDE2EA] rounded-t-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-3 py-1.5 bg-[#F6F7F9] border border-[#DDE2EA] rounded-lg text-xs font-medium text-[#0F141E] hover:border-[#0F141E] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to 3D Studio</span>
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#1D4ED8] truncate">{content.editionBadge}</p>
            <h2 className="font-serif text-sm sm:text-base font-semibold text-[#0F141E] truncate">
              {book.title}
            </h2>
          </div>
        </div>

        {/* Hand Highlighter & Sound Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#4E5869] mr-1 hidden sm:inline">
            Highlighter:
          </span>
          {(['amber', 'vermilion', 'sage'] as const).map((color) => {
            const meta = MARKER_STYLES[color];
            const active = activeMarker === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => setActiveMarker(color)}
                title={meta.label}
                className={`min-h-[34px] px-2.5 py-1 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active
                    ? 'border-[#1D4ED8] bg-[#EFF4FF] text-[#0F141E]'
                    : 'border-[#DDE2EA] bg-[#F6F7F9] text-[#4E5869] hover:border-[#0F141E]'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-xs border border-black/15"
                  style={{ backgroundColor: meta.swatch }}
                />
                <span className="hidden md:inline">{meta.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActiveMarker('erase')}
            title="Erase Highlight"
            className={`min-h-[34px] px-2.5 py-1 rounded-md border text-xs inline-flex items-center gap-1 cursor-pointer transition-colors ${
              activeMarker === 'erase'
                ? 'border-[#1D4ED8] bg-[#EFF4FF] text-[#1D4ED8]'
                : 'border-[#DDE2EA] bg-[#F6F7F9] text-[#4E5869] hover:border-[#0F141E]'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowHighlightsDrawer((v) => !v)}
            className="min-h-[34px] px-2.5 py-1 rounded-md border border-[#DDE2EA] bg-white text-xs font-medium text-[#0F141E] hover:border-[#1D4ED8] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Highlighter className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span className="tabular-nums">Notes ({bookHighlightEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            aria-label={soundEnabled ? 'Mute page turn sound' : 'Enable page turn sound'}
            className="min-h-[34px] px-2 py-1 rounded-md border border-[#DDE2EA] bg-white text-[#4E5869] hover:text-[#0F141E] cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close open book"
            className="min-h-[34px] px-2 py-1 rounded-md border border-[#DDE2EA] bg-white text-[#4E5869] hover:text-[#0F141E] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Physical Two-Page Open Book Spread with 3D Perspective Turn */}
      <div
        onPointerDown={handleBookPointerDown}
        onPointerUp={handleBookPointerUp}
        style={{ perspective: '1600px' }}
        className="w-full max-w-5xl bg-[#E6EAF0] border-x border-[#DDE2EA] p-3 sm:p-6 select-none"
      >
        <div
          style={{
            transform:
              flipDirection === 'next'
                ? 'rotateY(-12deg) scale(0.99)'
                : flipDirection === 'prev'
                  ? 'rotateY(12deg) scale(0.99)'
                  : 'rotateY(0deg) scale(1)',
            transition: 'transform 170ms cubic-bezier(0.16, 1, 0.3, 1)',
            transformStyle: 'preserve-3d',
          }}
          className="relative grid grid-cols-1 lg:grid-cols-2 bg-white border border-[#CFD6E2] rounded-lg shadow-xl overflow-hidden min-h-[490px]"
        >
          {/* Central Book Binding Gutter Shadow (Desktop) */}
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-10 bg-gradient-to-r from-black/0 via-[#0F141E]/10 to-black/0 z-10"
          />

          {spreadIndex === 0 && (
            <>
              {/* SPREAD 1 · LEFT PAGE */}
              <div className="p-6 sm:p-8 lg:pr-10 border-b lg:border-b-0 lg:border-r border-[#ECEEF2] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4E5869] mb-4 pb-2.5 border-b border-[#ECEEF2]">
                    <span className="font-mono tabular-nums">Page 01 · Field Principles</span>
                    <span className="font-medium text-[#1D4ED8]">Tap or drag to highlight</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F141E] mb-2">
                    Key Ideas Worth Marking
                  </h3>
                  <p className="text-xs text-[#4E5869] mb-5 leading-relaxed">{content.tagline}</p>

                  <div className="space-y-4">
                    {content.passagesLeft.map((p) => {
                      const color = highlights[p.id];
                      return (
                        <p
                          key={p.id}
                          data-highlightable="true"
                          onPointerDown={() => {
                            setIsDraggingHighlight(true);
                            applyHighlight(p.id, p.marginNote);
                          }}
                          onPointerEnter={() => {
                            if (isDraggingHighlight) applyHighlight(p.id, p.marginNote);
                          }}
                          className={`text-[15px] leading-[1.7] px-2.5 py-1.5 rounded-md transition-colors cursor-text ${
                            color
                              ? MARKER_STYLES[color].bg
                              : 'text-[#0F141E] hover:bg-[#F6F7F9]'
                          }`}
                        >
                          {p.text}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {activeMarginNote && (
                  <div className="mt-6 pt-3 border-t border-[#ECEEF2] text-xs text-[#4E5869] leading-relaxed">
                    <span className="font-semibold text-[#1D4ED8] mr-1.5">Margin note:</span>
                    <span>{activeMarginNote}</span>
                  </div>
                )}
              </div>

              {/* SPREAD 1 · RIGHT PAGE */}
              <div className="p-6 sm:p-8 lg:pl-10 flex flex-col justify-between relative">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4E5869] mb-4 pb-2.5 border-b border-[#ECEEF2]">
                    <span className="font-mono tabular-nums">Page 02 · Action Framework</span>
                    <span>Swipe or flip corner →</span>
                  </div>

                  <div className="space-y-4 mb-6">
                    {content.passagesRight.map((p) => {
                      const color = highlights[p.id];
                      return (
                        <p
                          key={p.id}
                          data-highlightable="true"
                          onPointerDown={() => {
                            setIsDraggingHighlight(true);
                            applyHighlight(p.id, p.marginNote);
                          }}
                          onPointerEnter={() => {
                            if (isDraggingHighlight) applyHighlight(p.id, p.marginNote);
                          }}
                          className={`text-[15px] leading-[1.7] px-2.5 py-1.5 rounded-md transition-colors cursor-text ${
                            color
                              ? MARKER_STYLES[color].bg
                              : 'text-[#0F141E] hover:bg-[#F6F7F9]'
                          }`}
                        >
                          {p.text}
                        </p>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-[#DDE2EA] bg-[#F6F7F9] flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#1D4ED8]">
                      Next Spread · Live Tech Demo
                    </p>
                    <p className="text-sm font-semibold text-[#0F141E]">
                      {content.techCase.caseLabel}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => turnPage('next')}
                    className="min-h-[40px] px-4 py-2 bg-[#0F141E] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    <span>Turn Page</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {spreadIndex === 1 && (
            <>
              {/* SPREAD 2 · LEFT PAGE: INTERACTIVE TECH CASE DEMO */}
              <div className="p-6 sm:p-8 lg:pr-10 border-b lg:border-b-0 lg:border-r border-[#ECEEF2] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4E5869] mb-4 pb-2.5 border-b border-[#ECEEF2]">
                    <span className="font-mono tabular-nums">Page 03 · Live Tech Case Demo</span>
                    <span className="font-medium text-[#1D4ED8]">Before / After</span>
                  </div>

                  <h3 className="font-serif text-xl font-semibold text-[#0F141E] mb-2">
                    {content.techCase.caseLabel}
                  </h3>
                  <p className="text-sm text-[#4E5869] mb-4 leading-relaxed">{content.techCase.scenario}</p>

                  {/* Interactive Naive vs Structured Toggle */}
                  <div className="inline-flex items-center gap-1 p-1 bg-[#F6F7F9] border border-[#DDE2EA] rounded-lg mb-4">
                    <button
                      type="button"
                      onClick={() => setDemoMode('naive')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        demoMode === 'naive'
                          ? 'bg-[#0F141E] text-white'
                          : 'text-[#4E5869] hover:text-[#0F141E]'
                      }`}
                    >
                      Naive Prompt (Fails)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoMode('pro')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        demoMode === 'pro'
                          ? 'bg-[#1D4ED8] text-white'
                          : 'text-[#4E5869] hover:text-[#0F141E]'
                      }`}
                    >
                      2026 Framework (Passes)
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg border border-[#DDE2EA] bg-[#F6F7F9]">
                      <p className="text-xs font-medium text-[#4E5869] mb-1">
                        Prompt sent
                      </p>
                      <p className="font-mono text-xs text-[#0F141E] leading-relaxed">
                        {demoMode === 'naive'
                          ? content.techCase.naivePrompt
                          : content.techCase.proPrompt}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-[#0F141E]/20 bg-white">
                      <p className="text-xs font-semibold text-[#1D4ED8] mb-1">
                        Simulated output
                      </p>
                      <p className="text-xs sm:text-sm text-[#0F141E] leading-relaxed mb-2">
                        {demoMode === 'naive'
                          ? content.techCase.naiveResult
                          : content.techCase.proResult}
                      </p>
                      <p className="text-xs font-medium text-[#4E5869] pt-2 border-t border-[#ECEEF2]">
                        {demoMode === 'naive'
                          ? `Why it fails: ${content.techCase.naiveFlaw}`
                          : `Why it wins: ${content.techCase.proWin}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SPREAD 2 · RIGHT PAGE: HANDS-ON MICRO-EXERCISE */}
              <div className="p-6 sm:p-8 lg:pl-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4E5869] mb-4 pb-2.5 border-b border-[#ECEEF2]">
                    <span className="font-mono tabular-nums">Page 04 · Interactive Exercise</span>
                    <span>Select your move</span>
                  </div>

                  <h3 className="font-serif text-xl font-semibold text-[#0F141E] mb-3">
                    Test Your Judgment on the Page
                  </h3>
                  <p className="text-sm text-[#0F141E] leading-relaxed mb-4">
                    {content.techCase.exerciseQuestion}
                  </p>

                  <div className="space-y-2.5">
                    {content.techCase.exerciseOptions.map((opt) => {
                      const picked = selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedOptionId(opt.id)}
                          className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm transition-colors cursor-pointer ${
                            picked
                              ? opt.correct
                                ? 'border-[#059669] bg-[#D1FAE5]/55 text-[#0F141E] font-medium'
                                : 'border-[#D97706] bg-[#FEF3C7]/70 text-[#0F141E]'
                              : 'border-[#DDE2EA] bg-[#F6F7F9] text-[#0F141E] hover:border-[#1D4ED8] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 font-mono text-xs text-[#1D4ED8]">
                              {picked && opt.correct ? <Check className="w-4 h-4 text-[#059669]" /> : '→'}
                            </span>
                            <span>{opt.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedExerciseOption && (
                    <div className="mt-4 p-3.5 rounded-lg border border-[#DDE2EA] bg-[#F6F7F9] text-xs sm:text-sm text-[#0F141E]">
                      <strong className="text-xs font-semibold text-[#1D4ED8] block mb-1">
                        {selectedExerciseOption.correct ? 'Verified Move' : 'Field Correction'}
                      </strong>
                      {selectedExerciseOption.feedback}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-2 pt-3 border-t border-[#ECEEF2]">
                  <button
                    type="button"
                    onClick={() => turnPage('prev')}
                    className="min-h-[38px] px-3 py-1.5 border border-[#DDE2EA] bg-white rounded-lg text-xs font-medium text-[#0F141E] hover:border-[#0F141E] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Pages 1–2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => turnPage('next')}
                    className="min-h-[38px] px-4 py-1.5 bg-[#1D4ED8] text-white rounded-lg text-xs font-semibold hover:bg-[#1E40AF] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Free Chapters &amp; Gumroad</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {spreadIndex === 2 && (
            <>
              {/* SPREAD 3 · LEFT PAGE: 2 FREE PLAYABLE CHAPTERS + CH. 3 UNLOCK */}
              <div className="p-6 sm:p-8 lg:pr-10 border-b lg:border-b-0 lg:border-r border-[#ECEEF2] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4E5869] mb-4 pb-2.5 border-b border-[#ECEEF2]">
                    <span className="font-mono tabular-nums">Page 05 · Playable Chapters</span>
                    <span className="font-medium text-[#1D4ED8]">2 Chapters Free</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F141E] mb-2">
                    Play Chapters 1 &amp; 2 Free Right Now
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4E5869] mb-5 leading-relaxed">
                    Test full branching workplace simulations and live AI-graded prompt duels before
                    deciding whether to pick up the complete Gumroad PDF edition.
                  </p>

                  <div className="space-y-3">
                    {content.chapterLabels.map((title, idx) => {
                      const chNum = idx + 1;
                      const freeOrOpen = chNum <= 2 || isUnlocked;
                      return (
                        <div
                          key={title}
                          className="p-3.5 rounded-lg border border-[#DDE2EA] bg-[#F6F7F9] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#1D4ED8]">
                              {chNum <= 2
                                ? 'Free Interactive Simulation'
                                : isUnlocked
                                  ? 'Unlocked Full Edition'
                                  : 'Gumroad Full Edition'}
                            </p>
                            <p className="text-sm font-semibold text-[#0F141E] truncate">{title}</p>
                          </div>

                          {freeOrOpen ? (
                            <button
                              type="button"
                              onClick={() => onPlayChapter(book.slug, chNum)}
                              className="min-h-[38px] px-3.5 py-1.5 bg-[#0F141E] text-white text-xs font-semibold rounded-lg hover:bg-[#1D4ED8] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Play Ch. {chNum}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onOpenVault}
                              className="min-h-[38px] px-3 py-1.5 border border-[#0F141E] bg-white text-[#0F141E] text-xs font-medium rounded-lg hover:border-[#1D4ED8] hover:text-[#1D4ED8] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Unlock Key</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SPREAD 3 · RIGHT PAGE: VOICE MENTOR & GUMROAD FULL EDITION */}
              <div className="p-6 sm:p-8 lg:pl-10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4E5869] mb-4 pb-2.5 border-b border-[#ECEEF2]">
                    <span className="font-mono tabular-nums">Page 06 · Full Edition &amp; Voice</span>
                    <span>{isUnlocked ? 'Unlocked' : 'Gumroad'}</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F141E] mb-2">
                    Own the Full Book or Practice Live by Voice
                  </h3>
                  <p className="text-sm text-[#4E5869] leading-relaxed mb-5">
                    Every James Walker AI playbook includes the downloadable PDF roadmap, printable
                    chapter QR exercises, and full-edition access keys for this interactive studio.
                  </p>

                  <div className="space-y-3">
                    <a
                      href={book.gumroad_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[44px] px-4 py-2.5 bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg hover:bg-[#1E40AF] transition-colors inline-flex items-center justify-center gap-2"
                    >
                      <span>Get Full PDF Edition on Gumroad</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={onOpenVoiceMentor}
                      className="w-full min-h-[44px] px-4 py-2.5 bg-[#0F141E] text-white text-sm font-medium rounded-lg hover:bg-[#1E293B] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Practice This Book With Voice Mentor</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenVault}
                      className="w-full min-h-[42px] px-4 py-2 bg-[#F6F7F9] text-[#0F141E] border border-[#DDE2EA] text-xs font-medium rounded-lg hover:border-[#0F141E] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <LockOpen className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      <span>Already Bought on Gumroad? Redeem Key ({content.unlockHint})</span>
                    </button>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-[#ECEEF2] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => turnPage('prev')}
                    className="min-h-[38px] px-3 py-1.5 border border-[#DDE2EA] bg-white rounded-lg text-xs font-medium text-[#0F141E] hover:border-[#0F141E] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Tech Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-[#1D4ED8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Browse Other 3D Books</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Highlights Summary Drawer (Optional Expand) */}
        {showHighlightsDrawer && (
          <div className="mt-3 p-4 rounded-lg border border-[#DDE2EA] bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#1D4ED8]">
                Your Highlighted Passages in {book.title} ({bookHighlightEntries.length})
              </p>
              <button
                type="button"
                onClick={() => setShowHighlightsDrawer(false)}
                className="text-xs text-[#4E5869] hover:text-[#0F141E] cursor-pointer"
              >
                Close
              </button>
            </div>
            {bookHighlightEntries.length === 0 ? (
              <p className="text-xs text-[#4E5869]">
                Tap or drag over any sentence on Pages 01–02 with the Hand Highlighter to save key
                insights here.
              </p>
            ) : (
              <ul className="space-y-2">
                {bookHighlightEntries.map((item) => (
                  <li key={item.id} className="text-xs text-[#0F141E] leading-relaxed">
                    <span className={`px-1.5 py-0.5 rounded ${MARKER_STYLES[highlights[item.id]].bg}`}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Bottom Page Navigation Bar */}
      <div className="w-full max-w-5xl bg-white border border-[#DDE2EA] rounded-b-xl px-4 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => turnPage('prev')}
          disabled={spreadIndex === 0}
          className="min-h-[38px] px-3.5 py-1.5 bg-[#F6F7F9] border border-[#DDE2EA] rounded-lg text-xs font-medium text-[#0F141E] hover:border-[#0F141E] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Prev Spread</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-[#4E5869]">
          {(['1–2 · Highlights', '3–4 · Tech Demo', '5–6 · Free Chapters'] as const).map(
            (label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (idx !== spreadIndex && soundEnabled) playPaperTurnSound();
                  setSpreadIndex(idx as 0 | 1 | 2);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  spreadIndex === idx
                    ? 'bg-[#0F141E] text-white'
                    : 'hover:text-[#0F141E] hover:bg-[#F6F7F9]'
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => turnPage('next')}
          disabled={spreadIndex === 2}
          className="min-h-[38px] px-3.5 py-1.5 bg-[#F6F7F9] border border-[#DDE2EA] rounded-lg text-xs font-medium text-[#0F141E] hover:border-[#0F141E] disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Next Spread</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
