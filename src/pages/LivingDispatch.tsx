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
import {
  buildCompanionTargetUrl,
  buildGumroadLaunchKitMarkdown,
  downloadTextFile,
  LIVE_RENDER_URL,
  ONLINE_WORK_UNLOCK_CODE,
} from '../lib/pdfCompanionExport.ts';
import {
  downloadBlob,
  generateCompanionPdfBlob,
  generatePublisherHandoverPdfBlob,
} from '../lib/pdfGenerator.ts';
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

function getDefaultCompanionBaseUrl(): string {
  if (typeof window === 'undefined') return LIVE_RENDER_URL;
  const { hostname, origin } = window.location;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('ais-dev-') ||
    hostname.includes('ais-pre-')
  ) {
    return LIVE_RENDER_URL;
  }
  return origin;
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

  // Author Publish Composer state (Bearer token kept strictly in component memory, never localStorage)
  const [composerOpen, setComposerOpen] = useState(false);
  const [authorMode, setAuthorMode] = useState<'env' | 'claimed' | 'unclaimed' | null>(null);
  const [authorToken, setAuthorToken] = useState<string | null>(null);
  const [authorPasscode, setAuthorPasscode] = useState('');
  const [authorAuthBusy, setAuthorAuthBusy] = useState(false);
  const [authorAuthError, setAuthorAuthError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCadence, setNewCadence] = useState<DispatchIssue['cadence']>('Weekly Update');
  const [newReplaces, setNewReplaces] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newHighlights, setNewHighlights] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  // QR Kit state (smart-defaults to live Render domain during dev previews)
  const [baseUrl, setBaseUrl] = useState<string>(getDefaultCompanionBaseUrl);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

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
        const targetUrl = buildCompanionTargetUrl(baseUrl, item.queryPath);
        const pngUrl = await QRCode.toDataURL(targetUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: '#0F141E',
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

  useEffect(() => {
    if (!composerOpen || authorMode !== null) return;
    fetch('/api/dispatches/auth-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { mode?: 'env' | 'claimed' | 'unclaimed' } | null) => {
        if (payload?.mode) setAuthorMode(payload.mode);
      })
      .catch(() => {
        setAuthorMode('claimed');
      });
  }, [composerOpen, authorMode]);

  const handleAuthorUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthorAuthBusy(true);
    setAuthorAuthError(null);
    try {
      const endpoint =
        authorMode === 'unclaimed'
          ? '/api/dispatches/claim-author'
          : '/api/dispatches/verify';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: authorPasscode }),
      });
      const result = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (!res.ok || !result.token) {
        throw new Error(result.error || 'Could not verify author passcode.');
      }
      setAuthorToken(result.token);
      setAuthorPasscode('');
      if (authorMode === 'unclaimed') setAuthorMode('claimed');
    } catch (err) {
      setAuthorAuthError(
        err instanceof Error ? err.message : 'Unable to verify author passcode.',
      );
    } finally {
      setAuthorAuthBusy(false);
    }
  };

  const handlePublishDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorToken) {
      setPublishMsg('Sign in with your author passcode before publishing.');
      return;
    }
    setPublishing(true);
    setPublishMsg(null);
    try {
      const highlightsList = newHighlights
        .split('\n')
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);

      const res = await fetch('/api/dispatches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authorToken}`,
        },
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
      if (res.status === 401) {
        setAuthorToken(null);
        throw new Error(result.error || 'Author session expired. Please verify your passcode again.');
      }
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
    const targetUrl = buildCompanionTargetUrl(baseUrl, item.queryPath);
    const svgString = await QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 2,
      color: { dark: '#0F141E', light: '#FFFFFF' },
    });
    downloadTextFile(`${item.id}-qr.svg`, svgString, 'image/svg+xml;charset=utf-8');
  };

  const handleCopyCallout = async (item: QrExerciseSpec) => {
    const targetUrl = buildCompanionTargetUrl(baseUrl, item.queryPath);
    const text = `INTERACTIVE EXERCISE — ${item.title}\n${item.exercisePrompt}\nScan the QR code or open: ${targetUrl}\nFull Editions & Companion Books: https://jameswalkerai.gumroad.com`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2200);
    } catch {
      setCopiedId(null);
    }
  };

  const handleDownloadCompanionPdf = () => {
    if (!data) return;
    const pdfBlob = generateCompanionPdfBlob(baseUrl, data.qrExercises, qrImages);
    downloadBlob('AI_for_Online_Work_2026_Interactive_Companion.pdf', pdfBlob);
    setExportNotice(
      'Downloaded AI_for_Online_Work_2026_Interactive_Companion.pdf (5 pages with all 5 scannable QR codes, clickable links, and unlock code ONLINEWORK-2026).',
    );
  };

  const handleDownloadHandoverPdf = () => {
    if (!data) return;
    const handoverBlob = generatePublisherHandoverPdfBlob(baseUrl, data.revampChecklist);
    downloadBlob('READ_FIRST_Publisher_Instructions_For_James.pdf', handoverBlob);
    setExportNotice(
      'Downloaded READ_FIRST_Publisher_Instructions_For_James.pdf with DO NOT CHANGE rules and 5-minute Gumroad upload steps.',
    );
  };

  const handleDownloadCompanionMarkdown = () => {
    if (!data) return;
    const text = buildGumroadLaunchKitMarkdown(baseUrl, data.qrExercises, data.revampChecklist);
    downloadTextFile('GUMROAD_COPY_PASTE_TEXT.txt', text, 'text/plain;charset=utf-8');
    setExportNotice(
      'Downloaded GUMROAD_COPY_PASTE_TEXT.txt with ready-to-paste Gumroad title, description, receipt email (ONLINEWORK-2026), and buyer upgrade post.',
    );
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
      <section className="border-b border-[#DDE2EA] pb-7 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-2">
              Living Companion Hub · AI for Online Work (2026 Edition)
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F141E] leading-tight mb-3">
              Keep the book evergreen. Update AI tools every month online.
            </h1>
            <p className="text-[16px] leading-[1.6] text-[#4E5869]">
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
                  ? 'bg-[#0F141E] text-[#F6F7F9] border-[#0F141E]'
                  : 'bg-white text-[#0F141E] border-[#DDE2EA] hover:border-[#0F141E]'
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
                  ? 'bg-[#1D4ED8] text-[#F6F7F9] border-[#1D4ED8]'
                  : 'bg-white text-[#0F141E] border-[#DDE2EA] hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
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
          className="mb-6 p-4 border border-[#1D4ED8] bg-white rounded-md text-sm text-[#0F141E]"
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-64 border border-[#DDE2EA] bg-white rounded-lg animate-pulse" />
          <div className="lg:col-span-4 h-64 border border-[#DDE2EA] bg-white rounded-lg animate-pulse" />
        </div>
      ) : activeTab === 'dispatch' ? (
        /* TAB 1: WEEKLY / MONTHLY LIVING DISPATCH + FREE NEWSLETTER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editorial Dispatch Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-[#0F141E]">
                  Latest Context Updates
                </h2>
                <p className="text-xs font-mono text-[#4E5869] mt-0.5">
                  80% Practical AI Skills & Tool Refreshes · 20% Companion Book Releases
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComposerOpen((v) => !v)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-medium bg-white text-[#0F141E] border border-[#DDE2EA] rounded-md hover:border-[#0F141E] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>{composerOpen ? 'Close Composer' : 'Post Weekly / Monthly Update'}</span>
              </button>
            </div>

            {publishMsg && (
              <div
                role="status"
                className="p-3.5 border border-[#0F141E] bg-white rounded-md text-sm text-[#0F141E]"
              >
                {publishMsg}
              </div>
            )}

            {/* Collapsible Author Dispatch Composer */}
            {composerOpen && !authorToken && (
              <form
                onSubmit={handleAuthorUnlock}
                className="border border-[#0F141E] bg-white rounded-lg p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DDE2EA]">
                  <h3 className="font-serif text-lg font-semibold text-[#0F141E]">
                    {authorMode === 'unclaimed'
                      ? 'Set Author Passcode (First-Time Setup)'
                      : 'Author Verification Required'}
                  </h3>
                  <span className="text-xs font-mono text-[#4E5869]">
                    Protected publishing
                  </span>
                </div>
                <p className="text-sm text-[#4E5869]">
                  {authorMode === 'unclaimed'
                    ? 'Choose an 8+ character author passcode to protect dispatch publishing on this server (or set AUTHOR_DISPATCH_SECRET in your server environment variables).'
                    : 'Enter your author passcode to unlock the dispatch composer for this session.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="password"
                    required
                    minLength={authorMode === 'unclaimed' ? 8 : 1}
                    value={authorPasscode}
                    onChange={(e) => setAuthorPasscode(e.target.value)}
                    placeholder={
                      authorMode === 'unclaimed'
                        ? 'Create author passcode (8+ chars)'
                        : 'Enter author passcode'
                    }
                    className="flex-1 min-h-[42px] px-3 py-2 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={authorAuthBusy}
                    className="min-h-[42px] px-5 py-2 bg-[#0F141E] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1D4ED8] disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {authorAuthBusy
                      ? 'Verifying...'
                      : authorMode === 'unclaimed'
                        ? 'Save Passcode & Unlock'
                        : 'Unlock Composer'}
                  </button>
                </div>
                {authorAuthError && (
                  <p role="alert" className="text-xs text-[#1D4ED8] font-medium">
                    {authorAuthError}
                  </p>
                )}
              </form>
            )}

            {composerOpen && authorToken && (
              <form
                onSubmit={handlePublishDispatch}
                className="border border-[#0F141E] bg-white rounded-lg p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DDE2EA]">
                  <h3 className="font-serif text-lg font-semibold text-[#0F141E]">
                    Author Dispatch Composer
                  </h3>
                  <span className="text-xs font-mono text-[#4E5869]">
                    Author session verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="disp-title"
                      className="block text-xs font-medium text-[#4E5869] mb-1"
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
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="disp-cadence"
                      className="block text-xs font-medium text-[#4E5869] mb-1"
                    >
                      Edition Type
                    </label>
                    <select
                      id="disp-cadence"
                      value={newCadence}
                      onChange={(e) =>
                        setNewCadence(e.target.value as DispatchIssue['cadence'])
                      }
                      className="w-full min-h-[42px] px-3 py-2 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
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
                    className="block text-xs font-medium text-[#4E5869] mb-1"
                  >
                    PDF Chapter / Pages Updated
                  </label>
                  <input
                    id="disp-pages"
                    type="text"
                    value={newReplaces}
                    onChange={(e) => setNewReplaces(e.target.value)}
                    placeholder="e.g. Updates PDF Ch. 8 (Page 30) & Bonus Resource #2"
                    className="w-full min-h-[40px] px-3 py-2 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="disp-summary"
                    className="block text-xs font-medium text-[#4E5869] mb-1"
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
                    className="w-full p-3 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="disp-bullets"
                    className="block text-xs font-medium text-[#4E5869] mb-1"
                  >
                    Key Action Bullets (one per line)
                  </label>
                  <textarea
                    id="disp-bullets"
                    rows={3}
                    value={newHighlights}
                    onChange={(e) => setNewHighlights(e.target.value)}
                    placeholder="New free tier limit or tool recommendation&#10;Updated compliance step before publishing"
                    className="w-full p-3 text-sm font-mono bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="min-h-[42px] px-4 py-2 text-sm text-[#4E5869] hover:text-[#0F141E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing}
                    className="min-h-[42px] px-5 py-2 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] disabled:opacity-50 cursor-pointer"
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
                className="border border-[#DDE2EA] bg-white rounded-lg p-6 sm:p-7"
              >
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#4E5869] mb-2">
                  <span className="text-[#1D4ED8] font-semibold">
                    Issue #{String(issue.issueNumber).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{issue.cadence}</span>
                  <span aria-hidden="true">·</span>
                  <span>{issue.publishedDate}</span>
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F141E] leading-snug mb-2">
                  {issue.title}
                </h3>
                <p className="text-xs font-mono text-[#4E5869] mb-4">{issue.replacesPdfPages}</p>
                <p className="text-[15px] leading-[1.6] text-[#0F141E] mb-5">{issue.summary}</p>

                <ul className="space-y-2.5 mb-5">
                  {issue.highlights.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-[#0F141E] leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="font-mono text-[#1D4ED8] text-xs mt-1 shrink-0">0{idx + 1}</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {issue.updatedTools && issue.updatedTools.length > 0 && (
                  <div className="mb-5 overflow-x-auto border border-[#DDE2EA] rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F6F7F9] border-b border-[#DDE2EA] font-mono text-[#4E5869]">
                        <tr>
                          <th className="p-3 font-medium">Category</th>
                          <th className="p-3 font-medium">Previous PDF Ref</th>
                          <th className="p-3 font-medium text-[#0F141E]">2026 Living Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DDE2EA]">
                        {issue.updatedTools.map((row) => (
                          <tr key={row.category} className="align-top">
                            <td className="p-3 font-medium text-[#0F141E]">{row.category}</td>
                            <td className="p-3 text-[#4E5869]">{row.previousInPdf}</td>
                            <td className="p-3 text-[#0F141E]">
                              <div className="font-semibold text-[#1D4ED8] mb-0.5">
                                {row.updated2026}
                              </div>
                              <div className="text-[#4E5869]">{row.whyItChanged}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pt-4 border-t border-[#DDE2EA] flex flex-wrap items-center justify-between gap-3">
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
                    className="min-h-[42px] px-4 py-2 bg-[#0F141E] text-[#F6F7F9] text-xs sm:text-sm font-medium rounded-md hover:bg-[#1D4ED8] transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{issue.actionDrill.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('qr')}
                    className="text-xs font-medium text-[#4E5869] hover:text-[#0F141E] underline underline-offset-4 cursor-pointer"
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
            <div className="border border-[#0F141E] bg-white rounded-lg p-5 sm:p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-1.5">
                Free Reader Newsletter
              </p>
              <h2 className="font-serif text-xl font-semibold text-[#0F141E] mb-2">
                The Living AI Dispatch
              </h2>
              <p className="text-sm text-[#4E5869] leading-relaxed mb-4">
                One practical email per week or month: updated free AI stacks, policy alerts, and a
                new interactive drill—following Chapter 14’s 80% education / 20% book release rule.
              </p>

              <form onSubmit={handleSubscribe} className="space-y-3">
                <div>
                  <label htmlFor="nl-email" className="block text-xs font-medium text-[#4E5869] mb-1">
                    Email Address
                  </label>
                  <input
                    id="nl-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="nl-path" className="block text-xs font-medium text-[#4E5869] mb-1">
                    Your 30-Day Path (PDF Ch. 2)
                  </label>
                  <select
                    id="nl-path"
                    value={chosenPath}
                    onChange={(e) => setChosenPath(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
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
                  className="w-full min-h-[44px] px-4 py-2.5 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingSub ? 'Joining...' : 'Join Free Living Dispatch'}
                </button>
              </form>

              {subStatus && (
                <p
                  role="status"
                  className={`mt-3 text-xs p-2.5 rounded border ${
                    subStatus.type === 'ok'
                      ? 'border-[#0F141E] bg-[#F6F7F9] text-[#0F141E]'
                      : 'border-[#1D4ED8] bg-[#F6F7F9] text-[#1D4ED8]'
                  }`}
                >
                  {subStatus.text}
                </p>
              )}

              <p className="mt-3 text-[11px] font-mono text-[#4E5869]">
                Zero spam · Unsubscribe anytime · Ready for MailerLite / Brevo / Gumroad Posts
              </p>
            </div>

            {/* James Walker AI Storefront & Cross-Promo Catalog */}
            <div className="border border-[#DDE2EA] bg-white rounded-lg p-5 sm:p-6">
              <p className="text-xs font-mono uppercase tracking-wider text-[#4E5869] mb-1.5">
                More From James Walker AI
              </p>
              <h3 className="font-serif text-lg font-semibold text-[#0F141E] mb-3">
                Gumroad Playbook Catalog
              </h3>

              <div className="space-y-3 mb-5">
                {books.map((book) => (
                  <div
                    key={book.id}
                    className="pb-3 border-b border-[#DDE2EA] last:border-b-0 last:pb-0 flex items-start justify-between gap-3"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => onLaunchBook(book.slug, 1)}
                        className="text-left text-sm font-semibold text-[#0F141E] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                      >
                        {book.title}
                      </button>
                      <p className="text-xs text-[#4E5869] mt-0.5">
                        {book.category} · {book.free_chapters} free ch.
                      </p>
                    </div>
                    <a
                      href={book.gumroad_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-[#1D4ED8] hover:underline shrink-0 inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>Store</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-[#DDE2EA] text-xs">
                <a
                  href="https://jameswalkerai.gumroad.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[42px] px-4 py-2 bg-[#0F141E] text-[#F6F7F9] font-medium rounded-md hover:bg-[#1D4ED8] transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <span>Visit jameswalkerai.gumroad.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[#4E5869] font-mono">
                  <a
                    href="https://medium.com/@jameswalkerai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#0F141E] underline underline-offset-4"
                  >
                    Medium
                  </a>
                  <a
                    href="https://pinterest.com/jameswalkerai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#0F141E] underline underline-offset-4"
                  >
                    Pinterest
                  </a>
                  <a
                    href="https://github.com/jaimehernan95/jameswalker-ai-gamebook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#0F141E] underline underline-offset-4"
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
          {/* Companion Base URL Configuration & Turnkey Gumroad v2 Export Toolbar */}
          <section className="border border-[#0F141E] bg-white rounded-lg p-5 sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="flex-1">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
                    Gumroad v2 PDF Launch Kit · Local Offline Export
                  </p>
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[#0F141E] mb-2">
                    Download Ready-to-Publish PDF &amp; Publisher Handover Pack
                  </h2>
                  <p className="text-sm text-[#4E5869] mb-3">
                    Generates the real 5-page Companion PDF (with all 5 scannable QR codes pointing
                    to your live Render site) plus a private Handover Guide telling James what not
                    to rename or change when uploading to Gumroad—100% locally in your browser with
                    zero cloud keys or third-party uploads.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                    <input
                      type="url"
                      aria-label="Companion Website Base URL"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={LIVE_RENDER_URL}
                      className="flex-1 min-h-[44px] px-3.5 py-2 font-mono text-xs sm:text-sm bg-[#F6F7F9] border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setBaseUrl(LIVE_RENDER_URL)}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-medium bg-[#F6F7F9] text-[#0F141E] border border-[#DDE2EA] rounded-md hover:border-[#0F141E] whitespace-nowrap cursor-pointer"
                    >
                      Use Live Render URL
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadCompanionPdf}
                    className="min-h-[44px] px-4 py-2.5 bg-[#1D4ED8] text-[#F6F7F9] text-xs sm:text-sm font-semibold rounded-md hover:bg-[#1E40AF] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Companion PDF (.pdf)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadHandoverPdf}
                    className="min-h-[44px] px-4 py-2.5 bg-[#0F141E] text-[#F6F7F9] text-xs sm:text-sm font-medium rounded-md hover:bg-[#1D4ED8] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Publisher Instructions (.pdf)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCompanionMarkdown}
                    className="min-h-[44px] px-3.5 py-2.5 bg-white text-[#0F141E] border border-[#DDE2EA] text-xs sm:text-sm font-medium rounded-md hover:border-[#0F141E] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Gumroad Copy (.txt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="min-h-[44px] px-3.5 py-2.5 bg-white text-[#0F141E] border border-[#DDE2EA] text-xs sm:text-sm font-medium rounded-md hover:border-[#0F141E] inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Sheet</span>
                  </button>
                </div>
              </div>

              {/* Offline Privacy Note */}
              <div className="p-4 rounded-md border border-[#DDE2EA] bg-[#F6F7F9] text-xs sm:text-sm text-[#4E5869]">
                All 3 files are generated directly in your browser using <span className="font-mono text-[#0F141E]">jsPDF</span>—download them locally above and drop the folder into Google Drive or email whenever you are ready to hand off to James.
              </div>

              {exportNotice && (
                <div className="p-3.5 rounded-md border border-[#0F141E] bg-[#F6F7F9] text-xs sm:text-sm text-[#0F141E] flex items-start justify-between gap-3">
                  <span>{exportNotice}</span>
                  <button
                    type="button"
                    onClick={() => setExportNotice(null)}
                    className="text-xs font-mono text-[#4E5869] hover:text-[#0F141E] shrink-0 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* 3-Step Gumroad 2-File Bundle Fast-Launch Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#DDE2EA]">
                <div className="p-3.5 rounded-md bg-[#F6F7F9] border border-[#DDE2EA]">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
                    Step 1 · Download Local Launch Pack
                  </p>
                  <p className="text-xs text-[#0F141E] leading-relaxed">
                    Click the buttons above to download all 3 files locally (generated offline in
                    your browser), then share the folder with James via Drive or email.
                  </p>
                </div>
                <div className="p-3.5 rounded-md bg-[#F6F7F9] border border-[#DDE2EA]">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
                    Step 2 · 2-File Gumroad Bundle
                  </p>
                  <p className="text-xs text-[#0F141E] leading-relaxed">
                    James keeps the 64-page main book AND uploads{' '}
                    <span className="font-mono">
                      AI_for_Online_Work_2026_Interactive_Companion.pdf
                    </span>{' '}
                    as File #2 on <span className="font-mono">jameswalkerai.gumroad.com</span>.
                  </p>
                </div>
                <div className="p-3.5 rounded-md bg-[#F6F7F9] border border-[#DDE2EA]">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
                    Step 3 · Keep Key &amp; URL Intact
                  </p>
                  <p className="text-xs text-[#0F141E] leading-relaxed">
                    James pastes the receipt email from <strong>GUMROAD_COPY_PASTE_TEXT.txt</strong>{' '}
                    keeping unlock code{' '}
                    <strong className="font-mono text-[#1D4ED8]">{ONLINE_WORK_UNLOCK_CODE}</strong>{' '}
                    and the live Render URL unchanged.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5 Scannable Chapter QR Exercise Cards */}
          <section aria-labelledby="qr-grid-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
              <h2 id="qr-grid-heading" className="font-serif text-2xl font-semibold text-[#0F141E]">
                5 Ready-to-Embed QR Exercises for the Revamped Book
              </h2>
              <span className="text-xs font-mono text-[#4E5869]">
                Deep links open exact chapter simulations on mobile
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(data?.qrExercises ?? []).map((item) => {
                const fullUrl = buildCompanionTargetUrl(baseUrl, item.queryPath);
                const imgSrc = qrImages[item.id];
                return (
                  <article
                    key={item.id}
                    className="border border-[#DDE2EA] bg-white rounded-lg p-5 flex flex-col sm:flex-row gap-5 items-start"
                  >
                    <div className="shrink-0 flex flex-col items-center">
                      <div className="w-32 h-32 border border-[#0F141E] bg-white rounded p-1.5 flex items-center justify-center">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={`QR code for ${item.title}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-10 h-10 text-[#4E5869]" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDownloadQrSvg(item)}
                        className="mt-2 text-[11px] font-mono text-[#1D4ED8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download SVG</span>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
                        {item.placementLabel}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-[#0F141E] leading-snug mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#4E5869] mb-2 font-mono">{item.pdfPages}</p>
                      <p className="text-sm text-[#0F141E] leading-relaxed mb-3">
                        {item.exercisePrompt}
                      </p>
                      <div className="p-2 bg-[#F6F7F9] border border-[#DDE2EA] rounded font-mono text-[11px] text-[#4E5869] break-all mb-3">
                        {fullUrl}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestDrill(item)}
                          className="min-h-[38px] px-3 py-1.5 bg-[#0F141E] text-[#F6F7F9] text-xs font-medium rounded hover:bg-[#1D4ED8] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Test Drill Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyCallout(item)}
                          className="min-h-[38px] px-3 py-1.5 bg-white text-[#0F141E] border border-[#DDE2EA] text-xs font-medium rounded hover:border-[#0F141E] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-[#1D4ED8]" />
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
            className="border border-[#DDE2EA] bg-white rounded-lg p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4 mb-5 border-b border-[#DDE2EA]">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-[#4E5869] mb-1">
                  Editorial Audit of Your 64-Page PDF
                </p>
                <h2
                  id="revamp-checklist-heading"
                  className="font-serif text-2xl font-semibold text-[#0F141E]"
                >
                  2026 Book Revamp Checklist Before Re-Uploading to Gumroad
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-[#1D4ED8] tabular-nums">
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
                        ? 'border-[#0F141E] bg-[#F6F7F9]'
                        : 'border-[#DDE2EA] bg-white hover:border-[#0F141E]/50'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleRevampItem(item.id)}
                        className="mt-1 h-4 w-4 accent-[#1D4ED8] cursor-pointer shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                          <span className="text-xs font-mono font-semibold text-[#1D4ED8]">
                            {item.pdfPage}
                          </span>
                          <span className="text-xs text-[#4E5869]">·</span>
                          <span
                            className={`text-sm font-semibold ${
                              isDone ? 'line-through text-[#4E5869]' : 'text-[#0F141E]'
                            }`}
                          >
                            {item.section}
                          </span>
                        </div>
                        <p className="text-xs text-[#4E5869] mb-1.5">
                          <strong>Current PDF:</strong> {item.currentText}
                        </p>
                        <p className="text-sm text-[#0F141E] leading-relaxed">
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
