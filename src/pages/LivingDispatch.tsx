import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Plus,
  Printer,
  QrCode,
  Sparkles,
} from 'lucide-react';
import type {
  BookSummary,
  DispatchesResponse,
  DispatchIssue,
  PdfRevampItem,
  QrExerciseSpec,
} from '../types/gamebook.ts';

interface LivingDispatchProps {
  books: BookSummary[];
  initialTab?: 'dispatch' | 'qr';
  onLaunchBook: (slug: string, chapterNum: number) => void;
  onOpenArena: () => void;
}

const BEGINNER_PATHS = [
  'Digital Products (Gumroad / KDP)',
  'Freelancing (Fiverr / Upwork)',
  'Content Creation (Medium / Affiliate)',
  'Productivity Systems & Workflows',
];

const REVAMP_CHECK_STORAGE_KEY = 'jwai_pdf_revamp_checks_v1';

function buildFullUrl(baseUrl: string, queryPath: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  if (!cleanBase) return queryPath;
  return `${cleanBase}/${queryPath}`;
}

export const LivingDispatch: React.FC<LivingDispatchProps> = ({
  books,
  initialTab = 'dispatch',
  onLaunchBook,
  onOpenArena,
}) => {
  const [activeTab, setActiveTab] = useState<'dispatch' | 'qr'>(initialTab);
  const [data, setData] = useState<DispatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Newsletter state
  const [email, setEmail] = useState('');
  const [chosenPath, setChosenPath] = useState(BEGINNER_PATHS[0]);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [subStatus, setSubStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Author Publish Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCadence, setNewCadence] = useState<DispatchIssue['cadence']>('Weekly Update');
  const [newReplaces, setNewReplaces] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newHighlights, setNewHighlights] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  // QR Kit state
  const [baseUrl, setBaseUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : 'https://jameswalkerai.gumroad.com',
  );
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkedRevampIds, setCheckedRevampIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(REVAMP_CHECK_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let mounted = true;
    fetch('/api/dispatches')
      .then(async (res) => {
        if (!res.ok) throw new Error('Unable to load Living Dispatch feed.');
        return (await res.json()) as DispatchesResponse;
      })
      .then((payload) => {
        if (!mounted) return;
        setData(payload);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load dispatches.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Generate real scannable QR PNG data URLs locally (0 network calls) whenever baseUrl or exercises change
  useEffect(() => {
    if (!data?.qrExercises?.length) return;
    let cancelled = false;

    Promise.all(
      data.qrExercises.map(async (item) => {
        const targetUrl = buildFullUrl(baseUrl, item.queryPath);
        const pngUrl = await QRCode.toDataURL(targetUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: '#141413',
            light: '#FFFFFF',
          },
        });
        return [item.id, pngUrl] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const [id, url] of entries) {
          next[id] = url;
        }
        setQrImages(next);
      })
      .catch(() => {
        // Ignore QR generation error for invalid temporary input
      });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, data?.qrExercises]);

  const completedChecklistCount = useMemo(() => {
    if (!data?.revampChecklist) return 0;
    return data.revampChecklist.filter((item) => checkedRevampIds.includes(item.id)).length;
  }, [checkedRevampIds, data?.revampChecklist]);

  const toggleRevampItem = (id: string) => {
    setCheckedRevampIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(REVAMP_CHECK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota
      }
      return next;
    });
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSub(true);
    setSubStatus(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, chosenPath }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Subscription failed.');
      setSubStatus({ type: 'ok', text: result.message });
      setEmail('');
      setData((prev) =>
        prev ? { ...prev, subscriberCount: result.subscriberCount ?? prev.subscriberCount } : prev,
      );
    } catch (err) {
      setSubStatus({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to subscribe right now.',
      });
    } finally {
      setSubmittingSub(false);
    }
  };

  const handlePublishDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublishing(true);
    setPublishMsg(null);
    try {
      const highlightsList = newHighlights
        .split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);

      const res = await fetch('/api/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          cadence: newCadence,
          replacesPdfPages: newReplaces || 'Living Edition Update · AI for Online Work',
          summary: newSummary,
          highlights: highlightsList,
          bookSlug: 'ai-for-online-work',
          chapterNum: 1,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Could not publish dispatch.');
      setData((prev) =>
        prev
          ? {
              ...prev,
              dispatches: [result.issue as DispatchIssue, ...prev.dispatches],
            }
          : prev,
      );
      setNewTitle('');
      setNewReplaces('');
      setNewSummary('');
      setNewHighlights('');
      setComposerOpen(false);
      setPublishMsg(`Published Issue #${result.issue.issueNumber} to the Living Dispatch.`);
    } catch (err) {
      setPublishMsg(err instanceof Error ? err.message : 'Unable to publish update.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadQrSvg = async (item: QrExerciseSpec) => {
    const targetUrl = buildFullUrl(baseUrl, item.queryPath);
    const svgString = await QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 2,
      color: { dark: '#141413', light: '#FFFFFF' },
    });
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${item.id}-qr.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleCopyCallout = async (item: QrExerciseSpec) => {
    const targetUrl = buildFullUrl(baseUrl, item.queryPath);
    const text = `INTERACTIVE EXERCISE — ${item.title}\n${item.exercisePrompt}\nScan the QR code or open: ${targetUrl}\nFull Editions & Companion Books: https://jameswalkerai.gumroad.com`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setCopiedId(null);
    }
  };

  const handleDownloadCompanionMarkdown = () => {
    if (!data) return;
    const lines: string[] = [
      '# AI FOR ONLINE WORK — 2026 Interactive Companion & QR Exercise Appendix',
      '',
      '> Ready to paste into Canva, Google Docs, or Notion and append to the revamped Gumroad PDF.',
      `> Companion Web Hub: ${baseUrl}`,
      '> Author Storefront: https://jameswalkerai.gumroad.com',
      '',
      '---',
      '',
      '## 1. Chapter-by-Chapter Interactive QR Exercises',
      '',
    ];

    for (const item of data.qrExercises) {
      const targetUrl = buildFullUrl(baseUrl, item.queryPath);
      lines.push(`### ${item.title}`);
      lines.push(`- **PDF Placement:** ${item.placementLabel} (${item.pdfPages})`);
      lines.push(`- **Exercise Brief:** ${item.exercisePrompt}`);
      lines.push(`- **Direct Link / QR Target:** ${targetUrl}`);
      lines.push(`- **QR Asset File:** Download \`${item.id}-qr.svg\` from the QR Exercise Kit tab.`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 2. 2026 Book Modernization Notes (Pages to Refresh)');
    lines.push('');
    for (const rev of data.revampChecklist) {
      lines.push(`- **${rev.pdfPage} (${rev.section}):** ${rev.recommendedUpdate}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 3. Reader Bonus Access Key');
    lines.push('');
    lines.push(
      'Include your Gumroad buyer unlock key (e.g., `ONLINEWORK-2026`) on Page 64 so readers unlock Chapter 3 (Client-First Freelancing & Organic Traffic Engine) and subscribe to the free weekly Living AI Dispatch.',
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI_FOR_ONLINE_WORK_2026_COMPANION_INSERT.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestDrill = (item: QrExerciseSpec) => {
    if (item.targetRoute === 'player' && item.bookSlug && item.chapterNum) {
      onLaunchBook(item.bookSlug, item.chapterNum);
    } else if (item.targetRoute === 'arena') {
      onOpenArena();
    } else {
      setActiveTab('dispatch');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Editorial Header */}
      <section className="border-b border-[#E2E0D8] pb-7 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-wider text-[#D94E1F] mb-2">
              Living Companion Hub · AI for Online Work (2026 Edition)
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141413] leading-tight mb-3">
              Keep the book evergreen. Update AI tools every month online.
            </h1>
            <p className="text-[16px] leading-[1.6] text-[#57554F]">
              Because AI platforms evolve faster than static PDFs, this free companion site pairs
              James Walker’s Gumroad eBook with a weekly/monthly Living Dispatch and printable QR
              exercises for every chapter.
            </p>
          </div>

          {/* 2-Tab Editorial Mode Switch */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-md border transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'dispatch'
                  ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                  : 'bg-white text-[#141413] border-[#E2E0D8] hover:border-[#141413]'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Living Dispatch & Newsletter</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`min-h-[44px] px-4 py-2.5 text-sm font-medium rounded-md border transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-[#D94E1F] text-[#FAF9F6] border-[#D94E1F]'
                  : 'bg-white text-[#141413] border-[#E2E0D8] hover:border-[#D94E1F] hover:text-[#D94E1F]'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>PDF Revamp & QR Kit</span>
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mb-6 p-4 border border-[#D94E1F] bg-white rounded-md text-sm text-[#141413]"
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-64 border border-[#E2E0D8] bg-white rounded-lg animate-pulse" />
          <div className="lg:col-span-4 h-64 border border-[#E2E0D8] bg-white rounded-lg animate-pulse" />
        </div>
      ) : activeTab === 'dispatch' ? (
        /* TAB 1: WEEKLY / MONTHLY LIVING DISPATCH + FREE NEWSLETTER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editorial Dispatch Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#141413]">
                  Latest Context Updates
                </h2>
                <p className="text-xs font-mono text-[#57554F] mt-0.5">
                  80% Practical AI Skills & Tool Refreshes · 20% Companion Book Releases
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen((v) => !v)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-medium bg-white text-[#141413] border border-[#E2E0D8] rounded-md hover:border-[#141413] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D94E1F]" />
                <span>{composerOpen ? 'Close Composer' : 'Post Weekly / Monthly Update'}</span>
              </button>
            </div>

            {publishMsg && (
              <div
                role="status"
                className="p-3.5 border border-[#141413] bg-white rounded-md text-sm text-[#141413]"
              >
                {publishMsg}
              </div>
            )}

            {/* Collapsible Author Dispatch Composer */}
            {composerOpen && (
              <form
                onSubmit={handlePublishDispatch}
                className="border border-[#141413] bg-white rounded-lg p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E0D8]">
                  <h3 className="font-serif text-lg font-semibold text-[#141413]">
                    Author Dispatch Composer
                  </h3>
                  <span className="text-xs font-mono text-[#57554F]">
                    Publishes instantly to free site
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="disp-title"
                      className="block text-xs font-medium text-[#57554F] mb-1"
                    >
                      Dispatch Title
                    </label>
                    <input
                      id="disp-title"
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. December Tool Refresh: Free Automation Workflows"
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="disp-cadence"
                      className="block text-xs font-medium text-[#57554F] mb-1"
                    >
                      Edition Type
                    </label>
                    <select
                      id="disp-cadence"
                      value={newCadence}
                      onChange={(e) =>
                        setNewCadence(e.target.value as DispatchIssue['cadence'])
                      }
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                    >
                      <option value="Weekly Update">Weekly Update</option>
                      <option value="Monthly Deep Dive">Monthly Deep Dive</option>
                      <option value="Policy Alert">Policy Alert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="disp-pages"
                    className="block text-xs font-medium text-[#57554F] mb-1"
                  >
                    PDF Chapter / Pages Updated
                  </label>
                  <input
                    id="disp-pages"
                    type="text"
                    value={newReplaces}
                    onChange={(e) => setNewReplaces(e.target.value)}
                    placeholder="e.g. Updates PDF Ch. 8 (Page 30) & Bonus Resource #2"
                    className="w-full min-h-[40px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="disp-summary"
                    className="block text-xs font-medium text-[#57554F] mb-1"
                  >
                    Summary Context
                  </label>
                  <textarea
                    id="disp-summary"
                    rows={3}
                    required
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    placeholder="Explain what changed in the AI landscape this week/month and what readers should do..."
                    className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="disp-bullets"
                    className="block text-xs font-medium text-[#57554F] mb-1"
                  >
                    Key Action Bullets (one per line)
                  </label>
                  <textarea
                    id="disp-bullets"
                    rows={3}
                    value={newHighlights}
                    onChange={(e) => setNewHighlights(e.target.value)}
                    placeholder="New free tier limit or tool recommendation&#10;Updated compliance step before publishing"
                    className="w-full p-3 text-sm font-mono bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="min-h-[42px] px-4 py-2 text-sm text-[#57554F] hover:text-[#141413] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="min-h-[42px] px-5 py-2 bg-[#D94E1F] text-[#FAF9F6] text-sm font-semibold rounded-md hover:bg-[#B83E16] disabled:opacity-50 cursor-pointer"
                  >
                    {publishing ? 'Publishing...' : 'Publish Dispatch Issue'}
                  </button>
                </div>
              </form>
            )}

            {/* Published Dispatch Cards */}
            {(data?.dispatches ?? []).map((issue) => (
              <article
                key={issue.id}
                className="border border-[#E2E0D8] bg-white rounded-lg p-6 sm:p-7"
              >
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#57554F] mb-2">
                  <span className="text-[#D94E1F] font-semibold">
                    Issue #{String(issue.issueNumber).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{issue.cadence}</span>
                  <span aria-hidden="true">·</span>
                  <span>{issue.publishedDate}</span>
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#141413] leading-snug mb-2">
                  {issue.title}
                </h3>
                <p className="text-xs font-mono text-[#57554F] mb-4">{issue.replacesPdfPages}</p>
                <p className="text-[15px] leading-[1.6] text-[#141413] mb-5">{issue.summary}</p>

                <ul className="space-y-2.5 mb-5">
                  {issue.highlights.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-[#141413] leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="font-mono text-[#D94E1F] text-xs mt-1 shrink-0">0{idx + 1}</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {issue.updatedTools && issue.updatedTools.length > 0 && (
                  <div className="mb-5 overflow-x-auto border border-[#E2E0D8] rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF9F6] border-b border-[#E2E0D8] font-mono text-[#57554F]">
                        <tr>
                          <th className="p-3 font-medium">Category</th>
                          <th className="p-3 font-medium">Previous PDF Ref</th>
                          <th className="p-3 font-medium text-[#141413]">2026 Living Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E0D8]">
                        {issue.updatedTools.map((row) => (
                          <tr key={row.category} className="align-top">
                            <td className="p-3 font-medium text-[#141413]">{row.category}</td>
                            <td className="p-3 text-[#57554F]">{row.previousInPdf}</td>
                            <td className="p-3 text-[#141413]">
                              <div className="font-semibold text-[#D94E1F] mb-0.5">
                                {row.updated2026}
                              </div>
                              <div className="text-[#57554F]">{row.whyItChanged}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pt-4 border-t border-[#E2E0D8] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        issue.actionDrill.targetRoute === 'player' &&
                        issue.actionDrill.bookSlug &&
                        issue.actionDrill.chapterNum
                      ) {
                        onLaunchBook(issue.actionDrill.bookSlug, issue.actionDrill.chapterNum);
                      } else {
                        onOpenArena();
                      }
                    }}
                    className="min-h-[42px] px-4 py-2 bg-[#141413] text-[#FAF9F6] text-xs sm:text-sm font-medium rounded-md hover:bg-[#D94E1F] transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{issue.actionDrill.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('qr')}
                    className="text-xs font-medium text-[#57554F] hover:text-[#141413] underline underline-offset-4 cursor-pointer"
                  >
                    Get QR Code for This Chapter
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Right Rail: Free Newsletter Signup + Gumroad Book Storefront Promo */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Free 80/20 Newsletter Card */}
            <div className="border border-[#141413] bg-white rounded-lg p-5 sm:p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-[#D94E1F] mb-1.5">
                Free Reader Newsletter
              </p>
              <h2 className="font-serif text-xl font-semibold text-[#141413] mb-2">
                The Living AI Dispatch
              </h2>
              <p className="text-sm text-[#57554F] leading-relaxed mb-4">
                One practical email per week or month: updated free AI stacks, policy alerts, and a
                new interactive drill—following Chapter 14’s 80% education / 20% book release rule.
              </p>

              <form onSubmit={handleSubscribe} className="space-y-3">
                <div>
                  <label htmlFor="nl-email" className="block text-xs font-medium text-[#57554F] mb-1">
                    Email Address
                  </label>
                  <input
                    id="nl-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="nl-path" className="block text-xs font-medium text-[#57554F] mb-1">
                    Your 30-Day Path (PDF Ch. 2)
                  </label>
                  <select
                    id="nl-path"
                    value={chosenPath}
                    onChange={(e) => setChosenPath(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                  >
                    {BEGINNER_PATHS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submittingSub}
                  className="w-full min-h-[44px] px-4 py-2.5 bg-[#D94E1F] text-[#FAF9F6] text-sm font-semibold rounded-md hover:bg-[#B83E16] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingSub ? 'Joining...' : 'Join Free Living Dispatch'}
                </button>
              </form>

              {subStatus && (
                <p
                  role="status"
                  className={`mt-3 text-xs p-2.5 rounded border ${
                    subStatus.type === 'ok'
                      ? 'border-[#141413] bg-[#FAF9F6] text-[#141413]'
                      : 'border-[#D94E1F] bg-[#FAF9F6] text-[#D94E1F]'
                  }`}
                >
                  {subStatus.text}
                </p>
              )}

              <p className="mt-3 text-[11px] font-mono text-[#57554F]">
                Zero spam · Unsubscribe anytime · Ready for MailerLite / Brevo / Gumroad Posts
              </p>
            </div>

            {/* James Walker AI Storefront & Cross-Promo Catalog */}
            <div className="border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-[#57554F] mb-1.5">
                More From James Walker AI
              </p>
              <h3 className="font-serif text-lg font-semibold text-[#141413] mb-3">
                Gumroad Playbook Catalog
              </h3>

              <div className="space-y-3 mb-5">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="pb-3 border-b border-[#E2E0D8] last:border-b-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onLaunchBook(book.slug, 1)}
                        className="text-left text-sm font-semibold text-[#141413] hover:text-[#D94E1F] transition-colors cursor-pointer"
                      >
                        {book.title}
                      </button>
                      <p className="text-xs text-[#57554F] mt-0.5">
                        {book.category} · {book.free_chapters} free ch.
                      </p>
                    </div>
                    <a
                      href={book.gumroad_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#D94E1F] hover:underline shrink-0 inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>Store</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-[#E2E0D8] text-xs">
                <a
                  href="https://jameswalkerai.gumroad.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[42px] px-4 py-2 bg-[#141413] text-[#FAF9F6] font-medium rounded-md hover:bg-[#D94E1F] transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <span>Visit jameswalkerai.gumroad.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[#57554F] font-mono">
                  <a
                    href="https://medium.com/@jameswalkerai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#141413] underline underline-offset-4"
                  >
                    Medium
                  </a>
                  <a
                    href="https://pinterest.com/jameswalkerai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#141413] underline underline-offset-4"
                  >
                    Pinterest
                  </a>
                  <a
                    href="https://github.com/jaimehernan95/jameswalker-ai-gamebook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#141413] underline underline-offset-4"
                  >
                    GitHub Companion
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* TAB 2: PDF REVAMP CHECKLIST & PRINTABLE QR CODE EXERCISE KIT */
        <div className="space-y-8">
          {/* Companion Base URL Configuration & Export Toolbar */}
          <section className="border border-[#141413] bg-white rounded-lg p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
              <div className="flex-1">
                <p className="text-xs font-mono uppercase tracking-wider text-[#D94E1F] mb-1">
                  Gumroad PDF QR Code Generator · Live Vector SVG
                </p>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#141413] mb-2">
                  Set Your Public Companion Website URL
                </h2>
                <p className="text-sm text-[#57554F] mb-3">
                  Every QR code below updates live. Paste your free public URL (Cloud Run, Vercel,
                  or GitHub Pages), download crisp SVGs, and drop them into Canva or Google Docs
                  before uploading the revamped PDF to Gumroad.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                  <input
                    type="url"
                    aria-label="Companion Website Base URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://your-companion-site.com"
                    className="flex-1 min-h-[44px] px-3.5 py-2 font-mono text-xs sm:text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setBaseUrl(
                        typeof window !== 'undefined' ? window.location.origin : baseUrl,
                      )
                    }
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium bg-[#FAF9F6] text-[#141413] border border-[#E2E0D8] rounded-md hover:border-[#141413] whitespace-nowrap cursor-pointer"
                  >
                    Use Current URL
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadCompanionMarkdown}
                  className="min-h-[44px] px-4 py-2.5 bg-[#D94E1F] text-[#FAF9F6] text-xs sm:text-sm font-semibold rounded-md hover:bg-[#B83E16] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Export 2026 PDF Appendix (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[44px] px-4 py-2.5 bg-white text-[#141413] border border-[#E2E0D8] text-xs sm:text-sm font-medium rounded-md hover:border-[#141413] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print QR Sheet</span>
                </button>
              </div>
            </div>
          </section>

          {/* 5 Scannable Chapter QR Exercise Cards */}
          <section aria-labelledby="qr-grid-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
              <h2 id="qr-grid-heading" className="font-serif text-2xl font-semibold text-[#141413]">
                5 Ready-to-Embed QR Exercises for the Revamped Book
              </h2>
              <span className="text-xs font-mono text-[#57554F]">
                Deep links open exact chapter simulations on mobile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(data?.qrExercises ?? []).map((item) => {
                const fullUrl = buildFullUrl(baseUrl, item.queryPath);
                const imgSrc = qrImages[item.id];
                return (
                  <article
                    key={item.id}
                    className="border border-[#E2E0D8] bg-white rounded-lg p-5 flex flex-col sm:flex-row gap-5 items-start"
                  >
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="w-32 h-32 border border-[#141413] bg-white rounded p-1.5 flex items-center justify-center">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={`QR code for ${item.title}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-10 h-10 text-[#57554F]" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDownloadQrSvg(item)}
                        className="mt-2 text-[11px] font-mono text-[#D94E1F] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download SVG</span>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#D94E1F] mb-1">
                        {item.placementLabel}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-[#141413] leading-snug mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#57554F] mb-2 font-mono">{item.pdfPages}</p>
                      <p className="text-sm text-[#141413] leading-relaxed mb-3">
                        {item.exercisePrompt}
                      </p>
                      <div className="p-2 bg-[#FAF9F6] border border-[#E2E0D8] rounded font-mono text-[11px] text-[#57554F] break-all mb-3">
                        {fullUrl}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestDrill(item)}
                          className="min-h-[38px] px-3 py-1.5 bg-[#141413] text-[#FAF9F6] text-xs font-medium rounded hover:bg-[#D94E1F] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Test Drill Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyCallout(item)}
                          className="min-h-[38px] px-3 py-1.5 bg-white text-[#141413] border border-[#E2E0D8] text-xs font-medium rounded hover:border-[#141413] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-[#D94E1F]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === item.id ? 'Copied Callout' : 'Copy PDF Text'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Page-by-Page 2026 PDF Modernization Checklist */}
          <section
            aria-labelledby="revamp-checklist-heading"
            className="border border-[#E2E0D8] bg-white rounded-lg p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 mb-5 border-b border-[#E2E0D8]">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#57554F] mb-1">
                  Editorial Audit of Your 64-Page PDF
                </p>
                <h2
                  id="revamp-checklist-heading"
                  className="font-serif text-2xl font-semibold text-[#141413]"
                >
                  2026 Book Revamp Checklist Before Re-Uploading to Gumroad
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-[#D94E1F] tabular-nums">
                {completedChecklistCount} / {data?.revampChecklist.length ?? 0} Updated
              </span>
            </div>

            <div className="space-y-4">
              {(data?.revampChecklist ?? []).map((item: PdfRevampItem) => {
                const isDone = checkedRevampIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`block p-4 rounded-md border transition-colors cursor-pointer ${
                      isDone
                        ? 'border-[#141413] bg-[#FAF9F6]'
                        : 'border-[#E2E0D8] bg-white hover:border-[#141413]/50'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleRevampItem(item.id)}
                        className="mt-1 h-4 w-4 accent-[#D94E1F] cursor-pointer shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                          <span className="text-xs font-mono font-semibold text-[#D94E1F]">
                            {item.pdfPage}
                          </span>
                          <span className="text-xs text-[#57554F]">·</span>
                          <span
                            className={`text-sm font-semibold ${
                              isDone ? 'line-through text-[#57554F]' : 'text-[#141413]'
                            }`}
                          >
                            {item.section}
                          </span>
                        </div>
                        <p className="text-xs text-[#57554F] mb-1.5">
                          <strong>Current PDF:</strong> {item.currentText}
                        </p>
                        <p className="text-sm text-[#141413] leading-relaxed">
                          <strong className="font-medium">2026 Upgrade:</strong>{' '}
                          {item.recommendedUpdate}
                        </p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
};
