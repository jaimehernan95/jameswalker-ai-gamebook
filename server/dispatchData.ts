import fs from 'fs';
import path from 'path';
import type {
  DispatchIssue,
  PdfRevampItem,
  QrExerciseSpec,
} from '../src/types/gamebook.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DISPATCHES_FILE = path.join(DATA_DIR, 'dispatches.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'newsletter_subscribers.json');

export interface SubscriberRecord {
  email: string;
  chosenPath: string;
  subscribedAt: string;
}

const DEFAULT_DISPATCHES: DispatchIssue[] = [
  {
    id: 'disp_03_2026_stack',
    issueNumber: 3,
    publishedDate: '2026-11-22',
    cadence: 'Monthly Deep Dive',
    title: '2026 Free AI Starter Stack Refresh (Replacing Legacy PDF Tool Tables)',
    replacesPdfPages: 'Replaces PDF pp. 11 & 52 (Free Tiers & AI Tools Reference)',
    summary:
      'The original edition of AI for Online Work referenced older free tiers like GPT-4o mini and DALL-E 3. Here is the zero-cost 2026 stack every beginner should use today—plus an interactive drill to test it.',
    highlights: [
      'Language & Multimodal Reasoning: Free tiers of Gemini, Claude, and ChatGPT now handle file uploads, structured tables, and image analysis directly—no paid add-ons needed for Month 1.',
      'Research & Fact-Checking: Pair Perplexity with Google NotebookLM to ground every chapter outline and citation in verified source PDFs before drafting.',
      'Visual & Product Layout: Canva Free + built-in AI layout tools remain the fastest path to 6x9 KDP interiors, Gumroad product covers, and 2:3 vertical Pinterest pins.',
      'Automation Starter: n8n self-hosted/free tiers and Make free scenarios offer far more multi-step flexibility than 2-step legacy zaps once you reach Weeks 9–12.',
    ],
    updatedTools: [
      {
        category: 'Primary Writing & Research LLM',
        previousInPdf: 'ChatGPT (GPT-4o mini) / Claude Sonnet',
        updated2026: 'Gemini / Claude / ChatGPT Current Free Multimodal Tiers',
        whyItChanged: 'Free tiers now support document grounding, strict JSON/table output, and faster reasoning.',
      },
      {
        category: 'Visual & Cover Generation',
        previousInPdf: 'DALL-E 3 via ChatGPT Plus ($20/mo)',
        updated2026: 'Native Multimodal Image Models + Canva Free Templates',
        whyItChanged: 'Zero-cost crisp typography layouts and commercial-safe assets without a $20/mo gate.',
      },
      {
        category: 'Grounded Research & Study',
        previousInPdf: 'Perplexity Free only',
        updated2026: 'Perplexity + NotebookLM Source Grounding',
        whyItChanged: 'Upload your notes or competitor reviews to prevent AI hallucinations before drafting.',
      },
      {
        category: 'No-Code Automation',
        previousInPdf: 'Zapier (100 tasks, 2-step Zaps)',
        updated2026: 'Make Free / n8n Workflows + MailerLite Automation',
        whyItChanged: 'Multi-step branching and newsletter onboarding automations without early paywalls.',
      },
    ],
    actionDrill: {
      label: 'Play Chapter 1: 2026 Stack & 30-Day Path Drill',
      targetRoute: 'player',
      bookSlug: 'ai-for-online-work',
      chapterNum: 1,
    },
  },
  {
    id: 'disp_02_compliance',
    issueNumber: 2,
    publishedDate: '2026-11-15',
    cadence: 'Policy Alert',
    title: 'Updated Platform AI Disclosure & Compliance Checklist (KDP, Medium, YouTube & FTC)',
    replacesPdfPages: 'Updates PDF pp. 26, 28, 30 & 53 (Platform Policy Reference)',
    summary:
      'Chapter 1 & 6 emphasize that one account ban erases months of work. Before uploading your revamped eBook or affiliate pins, run this updated 2026 disclosure check.',
    highlights: [
      'Amazon KDP: You must declare AI-generated text/images during upload, while AI-assisted editing still requires genuine original human curation to clear KDP low-content scrutiny.',
      'Medium Partner Program: Stories generated purely by AI are ineligible for Partner Program paywall distribution. Use AI strictly for outlining, research, and structural critique—keep personal voice and real examples.',
      'YouTube & TikTok Faceless Channels: Enable the altered/synthetic content disclosure checkbox whenever using realistic AI voiceovers or synthetic B-roll, and stick strictly to commercial-licensed stock (Pexels/Pixabay).',
      'FTC Affiliate Links (Pinterest & Blogs): Place a plain-English disclosure ("Contains affiliate links—I may earn a small commission at no extra cost to you") at the very top of every pin caption, email, and article.',
    ],
    actionDrill: {
      label: 'Play Chapter 2: RCTS Launch & Compliance Drill',
      targetRoute: 'player',
      bookSlug: 'ai-for-online-work',
      chapterNum: 2,
    },
  },
  {
    id: 'disp_01_living_book',
    issueNumber: 1,
    publishedDate: '2026-11-08',
    cadence: 'Weekly Update',
    title: 'Why Static PDFs Go Stale—and How QR Drills + an 80/20 Newsletter Fix It',
    replacesPdfPages: 'Extends PDF Ch. 4 (Digital Products) & Ch. 14 (Email List Building)',
    summary:
      'In Chapter 14, James calls your email list your most valuable long-term owned asset. Pairing a downloadable Gumroad PDF with scannable QR exercises and a free weekly web dispatch turns a one-time reader into a lifelong subscriber.',
    highlights: [
      'Keep the PDF evergreen: teach decision frameworks (RCTS, Client-First Proposals, 90-Day Planner, 80/20 email rule) that never expire.',
      'Move fast-changing tool lists and hands-on practice drills to this free companion site—linked via QR codes at the end of every chapter.',
      'Every weekly or monthly dispatch delivers 80% pure skill value (a fresh prompt workflow or tool update) and 20% natural discovery of the full Gumroad catalog.',
    ],
    actionDrill: {
      label: 'Practice the RCTS Framework in Prompt Arena',
      targetRoute: 'arena',
    },
  },
];

export const QR_EXERCISES: QrExerciseSpec[] = [
  {
    id: 'qr_ch1_3',
    placementLabel: 'Insert at End of Ch. 1–3 (PDF Page 19)',
    pdfPages: 'Pages 10–19 · Ecosystem, Direction & Avoiding the Tutorial Trap',
    title: 'Interactive Drill 01: Escape the Tutorial Loop & Lock Your 30-Day Path',
    exercisePrompt:
      'Scan to launch the 5-minute interactive simulation: audit an outdated AI tool stack, pick one of the 4 beginner paths, and pass the Live RCTS Commitment Duel.',
    queryPath: '?book=ai-for-online-work&ch=1',
    targetRoute: 'player',
    bookSlug: 'ai-for-online-work',
    chapterNum: 1,
  },
  {
    id: 'qr_ch4_6_13',
    placementLabel: 'Insert at End of Ch. 4 & Ch. 6 (PDF Page 22 or 26)',
    pdfPages: 'Pages 20–26 & 39–40 · Digital Products, RCTS, KDP & Payments',
    title: 'Interactive Drill 02: The RCTS Digital Product & Gumroad Launch',
    exercisePrompt:
      'Scan to step into Maria’s workflow: apply the Role–Context–Task–Style framework, choose a Merchant of Record for global VAT, and stress-test your Gumroad positioning copy.',
    queryPath: '?book=ai-for-online-work&ch=2',
    targetRoute: 'player',
    bookSlug: 'ai-for-online-work',
    chapterNum: 2,
  },
  {
    id: 'qr_ch9_10_14',
    placementLabel: 'Insert at End of Ch. 9–14 (PDF Page 42)',
    pdfPages: 'Pages 31–34 & 41–42 · Freelancing, Pinterest & Email List',
    title: 'Interactive Drill 03: Client-First Freelance Hook & Organic Traffic Duel',
    exercisePrompt:
      'Scan to replay Marcus’s $140 first-client pitch and Aisha’s Pinterest affiliate launch—then write a real 2-sentence Client-First proposal graded live by AI.',
    queryPath: '?book=ai-for-online-work&ch=3',
    targetRoute: 'player',
    bookSlug: 'ai-for-online-work',
    chapterNum: 3,
  },
  {
    id: 'qr_bonus_rcts',
    placementLabel: 'Insert on Bonus Resource #1 (PDF Page 46)',
    pdfPages: 'Page 46 · AI Prompt Templates for Content Creation',
    title: 'Live RCTS Prompt Sandbox (AI-Graded Practice Lab)',
    exercisePrompt:
      'Don’t just copy static templates—scan to customize and run your RCTS prompts live with instant streaming output and a 0–100 rubric score.',
    queryPath: '?route=arena',
    targetRoute: 'arena',
  },
  {
    id: 'qr_back_cover',
    placementLabel: 'Insert on Page 64 (About the Author / Back Cover)',
    pdfPages: 'Page 64 · Living Updates, Free Newsletter & Full Book Catalog',
    title: 'Free Weekly/Monthly AI Updates + All James Walker AI Editions',
    exercisePrompt:
      'AI tools evolve every month. Scan to read the free Living AI Dispatch, get updated tool tables, and explore companion playbooks on jameswalkerai.gumroad.com.',
    queryPath: '?route=dispatch',
    targetRoute: 'dispatch',
  },
];

export const PDF_REVAMP_CHECKLIST: PdfRevampItem[] = [
  {
    id: 'rev_p11',
    pdfPage: 'Page 11 & 52',
    section: 'Free Tiers & AI Tools Reference Guide',
    currentText: 'Lists GPT-4o mini, DALL-E 3 via ChatGPT Plus, and Zapier 2-step Zaps.',
    recommendedUpdate:
      'Replace static version names with evergreen categories ("Current Free Multimodal LLMs", "Source-Grounded Research via NotebookLM + Perplexity", "Make/n8n Free Automation") and add the QR code pointing to the Living Dispatch Tool Table so the PDF never goes stale.',
  },
  {
    id: 'rev_p19',
    pdfPage: 'Page 19',
    section: 'End of Ch. 3 · AI Beginner Success Principles',
    currentText: 'Static checklist with no interactive path-commitment exercise.',
    recommendedUpdate:
      'Add QR Exercise 01 ("Escape the Tutorial Trap & Lock Your 30-Day Path") so readers actively commit to 1 of the 4 paths in a 5-minute game simulation before moving to Chapter 4.',
  },
  {
    id: 'rev_p21',
    pdfPage: 'Page 21 & 46',
    section: 'The RCTS Prompt Framework & Bonus Templates',
    currentText: 'Static copy-paste prompt boxes with bracketed placeholders.',
    recommendedUpdate:
      'Add QR Exercise 02 & the Live Prompt Arena QR code so readers test their RCTS prompts against a live AI mentor with a 3-constraint checklist and 0–100 score.',
  },
  {
    id: 'rev_p53',
    pdfPage: 'Page 53',
    section: 'Platform Policy Quick-Reference Guide',
    currentText: 'Static policy summary for KDP, Gumroad, Fourthwall, Pinterest, and Medium.',
    recommendedUpdate:
      'Add a 2026 note clarifying Medium Partner Program AI-content eligibility, YouTube synthetic voiceover disclosure toggles, and a link to the Living Dispatch Policy Alert feed.',
  },
  {
    id: 'rev_p57',
    pdfPage: 'Page 57',
    section: 'My First 90 Days: Personal Action Planner',
    currentText: 'Printable worksheet without digital progress tracking.',
    recommendedUpdate:
      'Keep the printable page AND add a companion note: readers can track their daily streak, Skill Profile (Clarity / Context / Constraint / Verification), and shareable Rank Badges on the free web companion.',
  },
  {
    id: 'rev_p64',
    pdfPage: 'Page 64',
    section: 'About the Author & Cross-Promotion',
    currentText: 'Links to Gumroad, Fourthwall, Medium, and Pinterest (note: duplicate footer text & page 60 typo at bottom).',
    recommendedUpdate:
      'Clean up the duplicate footer line on page 64, add the Free Living Dispatch Newsletter QR code, and include a Gumroad Reader Key box (e.g., ONLINEWORK-2026) unlocking bonus interactive chapters + promoting James’s other books on jameswalkerai.gumroad.com.',
  },
];

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

class DispatchStore {
  private customDispatches: DispatchIssue[] = [];
  private subscribers: SubscriberRecord[] = [];

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(DISPATCHES_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(DISPATCHES_FILE, 'utf-8')) as DispatchIssue[];
        if (Array.isArray(parsed)) this.customDispatches = parsed;
      }
    } catch {
      this.customDispatches = [];
    }

    try {
      if (fs.existsSync(SUBSCRIBERS_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8')) as SubscriberRecord[];
        if (Array.isArray(parsed)) this.subscribers = parsed;
      }
    } catch {
      this.subscribers = [];
    }
  }

  getAllDispatches(): DispatchIssue[] {
    return [...this.customDispatches, ...DEFAULT_DISPATCHES];
  }

  publishDispatch(input: {
    title: string;
    cadence: DispatchIssue['cadence'];
    replacesPdfPages: string;
    summary: string;
    highlights: string[];
    bookSlug?: string;
    chapterNum?: number;
  }): DispatchIssue {
    const existing = this.getAllDispatches();
    const maxNum = existing.reduce((m, d) => Math.max(m, d.issueNumber), 0);
    const created: DispatchIssue = {
      id: `disp_custom_${Date.now()}`,
      issueNumber: maxNum + 1,
      publishedDate: new Date().toISOString().slice(0, 10),
      cadence: input.cadence,
      title: input.title,
      replacesPdfPages: input.replacesPdfPages || 'Living Companion Bonus Update',
      summary: input.summary,
      highlights: input.highlights.length > 0 ? input.highlights : [input.summary],
      actionDrill:
        input.bookSlug && input.chapterNum
          ? {
              label: `Launch Chapter ${input.chapterNum} Interactive Drill`,
              targetRoute: 'player',
              bookSlug: input.bookSlug,
              chapterNum: input.chapterNum,
            }
          : {
              label: 'Practice in Prompt Arena',
              targetRoute: 'arena',
            },
    };
    this.customDispatches.unshift(created);
    try {
      ensureDataDir();
      fs.writeFileSync(DISPATCHES_FILE, JSON.stringify(this.customDispatches, null, 2));
    } catch {
      // Ignore ephemeral disk write errors
    }
    return created;
  }

  subscribe(email: string, chosenPath: string): { alreadySubscribed: boolean; total: number } {
    const normalized = email.trim().toLowerCase();
    const exists = this.subscribers.some((s) => s.email === normalized);
    if (!exists) {
      this.subscribers.push({
        email: normalized,
        chosenPath,
        subscribedAt: new Date().toISOString(),
      });
      try {
        ensureDataDir();
        fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(this.subscribers, null, 2));
      } catch {
        // Ignore ephemeral disk write errors
      }
    }
    return { alreadySubscribed: exists, total: this.subscribers.length };
  }

  getSubscriberCount(): number {
    return this.subscribers.length;
  }
}

export const dispatchStore = new DispatchStore();
