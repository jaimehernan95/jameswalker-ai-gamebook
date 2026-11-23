export type SkillKey = 'clarity' | 'context' | 'constraint' | 'verification';

export type SkillStats = Record<SkillKey, number>;

export interface HudState {
  trust: number; // 0-100%
  minsLeft: number; // minutes remaining to deadline
  leverage: number; // 0-100 AI Leverage Score
}

export interface HudDelta {
  trust: number;
  mins: number;
  leverage: number;
}

export interface TerminalPreview {
  promptSent: string;
  tokenEfficiency: number; // 0-100%
  simulatedOutput: string;
  bossReaction: string;
}

export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  gumroad_url: string;
  cover_thumb_url: string;
  total_chapters: number;
  free_chapters: number;
  est_minutes: number;
  difficulty: string;
  category: string;
  version: number;
}

export interface ChoiceOption {
  id: string;
  moveTitle: string;
  riskRewardTag: string;
  label: string;
  tacticTag: string;
  nextNodeId: string;
  xpDelta: number;
  hudDelta: HudDelta;
  skillDelta?: Partial<SkillStats>;
  consequence: string;
  terminalPreview: TerminalPreview;
}

export interface LiveConstraintCheck {
  id: string;
  label: string;
  pattern: string;
}

export interface PromptChallengeSpec {
  id: string;
  title: string;
  roleBrief: string;
  inputContext: string;
  constraints: string[];
  liveChecks: LiveConstraintCheck[];
  starterPrompt: string;
  rubricFocus: string[];
  passingScore: number;
  passNextNodeId: string;
  retryHint: string;
  xpReward: number;
}

export interface ScenarioNode {
  id: string;
  stepLabel: string;
  title: string;
  narrative: string[];
  callout?: {
    label: string;
    body: string;
  };
  kind: 'choice' | 'prompt_boss' | 'ending';
  choices?: ChoiceOption[];
  promptChallenge?: PromptChallengeSpec;
  endingRank?: {
    title: string;
    stampText: string;
    summary: string;
    badgeCode: string;
    nextChapterHint: string;
  };
}

export interface ChapterMeta {
  chapter_num: number;
  title: string;
  is_free: boolean;
  est_minutes: number;
  summary: string;
}

export interface ChapterBundle {
  book_id: string;
  book_slug: string;
  book_title: string;
  gumroad_url: string;
  version: number;
  chapter_num: number;
  title: string;
  is_free: boolean;
  initial_hud: HudState;
  start_node_id: string;
  nodes: Record<string, ScenarioNode>;
  chapters_toc: ChapterMeta[];
}

export interface BookBundleResponse {
  book: BookSummary;
  chapters_toc: ChapterMeta[];
  initial_chapter: ChapterBundle;
}

export interface EvaluationResult {
  score: number;
  passed: boolean;
  verdict: string;
  stampLabel?: 'APPROVED FOR PROD' | 'PROMOTED' | 'NEEDS REVISION';
  strengths: string;
  improvements: [string, string];
  mentorNote: string;
  xpEarned: number;
  source: 'gemini' | 'offline-rubric';
  model: string;
}

export interface SandboxPreset {
  id: string;
  bookSlug: string;
  bookTitle: string;
  title: string;
  scenario: string;
  inputSample: string;
  constraints: string[];
  starterPrompt: string;
  rubricFocus: string[];
}

export interface ReaderProgress {
  readerId: string;
  xp: number;
  streakDays: number;
  lastActiveDate: string;
  skills: SkillStats;
  unlockedBooks: string[];
  unlockedCodes: string[];
  completedChapters: string[];
  earnedRanks: Array<{
    bookSlug: string;
    chapterNum: number;
    rankTitle: string;
    badgeCode: string;
    earnedAt: string;
  }>;
  bookStates: Record<
    string,
    {
      chapterNum: number;
      currentNodeId: string;
      hud: HudState;
      history: Array<{
        nodeId: string;
        choiceLabel: string;
        consequence: string;
        xpDelta: number;
        hudDelta?: HudDelta;
      }>;
      lastBossScore?: number;
      updatedAt: string;
    }
  >;
  updatedAt: string;
}

export interface DispatchIssue {
  id: string;
  issueNumber: number;
  publishedDate: string;
  cadence: 'Weekly Update' | 'Monthly Deep Dive' | 'Policy Alert';
  title: string;
  replacesPdfPages: string;
  summary: string;
  highlights: string[];
  updatedTools?: Array<{
    category: string;
    previousInPdf: string;
    updated2026: string;
    whyItChanged: string;
  }>;
  actionDrill: {
    label: string;
    targetRoute: 'player' | 'arena';
    bookSlug?: string;
    chapterNum?: number;
  };
}

export interface QrExerciseSpec {
  id: string;
  placementLabel: string;
  pdfPages: string;
  title: string;
  exercisePrompt: string;
  queryPath: string;
  targetRoute: 'player' | 'arena' | 'dispatch';
  bookSlug?: string;
  chapterNum?: number;
}

export interface PdfRevampItem {
  id: string;
  pdfPage: string;
  section: string;
  currentText: string;
  recommendedUpdate: string;
}

export interface DispatchesResponse {
  dispatches: DispatchIssue[];
  qrExercises: QrExerciseSpec[];
  revampChecklist: PdfRevampItem[];
  subscriberCount: number;
}

