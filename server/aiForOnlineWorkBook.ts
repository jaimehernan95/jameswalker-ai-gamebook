import type {
  BookSummary,
  ChapterBundle,
  ChapterMeta,
  SandboxPreset,
} from '../src/types/gamebook.ts';

const GUMROAD_BASE = 'https://jameswalkerai.gumroad.com';

export interface StoredBookEntry {
  summary: BookSummary;
  chaptersToc: ChapterMeta[];
  chapters: Record<number, ChapterBundle>;
}

export const AI_FOR_ONLINE_WORK_PRESET: SandboxPreset = {
  id: 'arena_online_work',
  bookSlug: 'ai-for-online-work',
  bookTitle: 'AI for Online Work (2026 Edition)',
  title: 'RCTS Digital Product & Client-First Pitch Lab',
  scenario:
    'Apply James Walker’s RCTS Prompt Framework (Role, Context, Task, Style — PDF p. 21) and Positioning Formula (PDF p. 48) to draft an honest, zero-hype Gumroad product description for a beginner ATS-Resume guide.',
  inputSample:
    'Creator: Maria (zero audience, first digital product).\nProduct: 24-page "ATS-Friendly Resume Starter Guide" PDF + QR interactive checklist.\nTarget buyer: First-time remote job seekers frustrated by auto-rejections.\nConstraints: Honest tone (no income or job-offer guarantees), under 180 words.',
  constraints: [
    'Specify all 4 RCTS elements (Role, Context, Task, Style)',
    'Use the Positioning Formula: [Product] helps [Audience] achieve [Outcome] without [Obstacle]',
    'Ban exaggerated income or guaranteed-hire hype claims',
    'Keep output crisp (150–180 words max)',
  ],
  starterPrompt:
    'Role: Act as a practical digital education copywriter.\nContext: I am launching a 24-page Gumroad guide called "ATS-Friendly Resume Starter Guide" for first-time remote job seekers who keep getting filtered out by screening software.\nTask: Write a 160-word Gumroad product description opening with the Positioning Formula ("[Product] helps [audience] achieve [outcome] without [obstacle]") followed by 3 concrete deliverables.\nStyle: Warm, honest, jargon-free. Ban hype words and never promise guaranteed job offers or income.',
  rubricFocus: [
    'Complete Role–Context–Task–Style (RCTS) structure',
    'Clear Positioning Formula opening',
    'Honest, no-hype compliance guardrail',
    'Strict 150–180 word ceiling',
  ],
};

export const AI_FOR_ONLINE_WORK_BOOK: StoredBookEntry = {
  summary: {
    id: 'book_online_work_2026',
    slug: 'ai-for-online-work',
    title: 'AI for Online Work (2026 Interactive Edition)',
    subtitle:
      'Revamped interactive companion to James Walker’s 14-chapter roadmap—practice the 4 beginner paths, RCTS prompts, KDP/Gumroad launches, and Client-First freelance pitches.',
    gumroad_url: GUMROAD_BASE,
    cover_thumb_url: '/src/assets/images/cover_workflow_architect_1795151502421.jpg',
    total_chapters: 3,
    free_chapters: 2,
    est_minutes: 18,
    difficulty: 'Beginner → Builder',
    category: 'Digital Skills Roadmap',
    version: 3,
  },
  chaptersToc: [
    {
      chapter_num: 1,
      title: 'Chapter 1: Escape the Tutorial Trap & Lock Your 30-Day Path',
      is_free: true,
      est_minutes: 6,
      summary:
        'PDF Ch. 1–3 Interactive Drill: Audit your 2026 free AI stack, fact-check model output, and commit to one of the 4 beginner paths.',
    },
    {
      chapter_num: 2,
      title: 'Chapter 2: The RCTS Digital Product & Gumroad Launch',
      is_free: true,
      est_minutes: 6,
      summary:
        'PDF Ch. 4, 6 & 13 Interactive Drill: Replay Maria’s 24-page guide workflow, master RCTS prompting, and choose a Merchant of Record for global VAT.',
    },
    {
      chapter_num: 3,
      title: 'Chapter 3: Client-First Freelancing & Organic Traffic Engine',
      is_free: false,
      est_minutes: 6,
      summary:
        'PDF Ch. 9, 10 & 14 Interactive Drill: Apply Marcus’s $140 proposal hook, Aisha’s Pinterest FTC disclosure workflow, and 80/20 email capture.',
    },
  ],
  chapters: {
    1: {
      book_id: 'book_online_work_2026',
      book_slug: 'ai-for-online-work',
      book_title: 'AI for Online Work (2026 Interactive Edition)',
      gumroad_url: GUMROAD_BASE,
      version: 3,
      chapter_num: 1,
      title: 'Chapter 1: Escape the Tutorial Trap & Lock Your 30-Day Path',
      is_free: true,
      initial_hud: { trust: 60, minsLeft: 20, leverage: 35 },
      start_node_id: 'ow_c1_n1',
      chapters_toc: [],
      nodes: {
        ow_c1_n1: {
          id: 'ow_c1_n1',
          stepLabel: 'PDF Ch. 1–3 · Scene 01 of 04',
          title: 'Day 1 — Four Tools, Zero Shipped Work',
          narrative: [
            'You have spent three weeks bookmarking AI tutorials, testing random prompts, and comparing 15 paid subscriptions. You have 60 minutes a day, no existing audience, and zero ad budget.',
            'Just as Chapter 3 warns, your bottleneck isn’t AI know-how—it’s direction. Before touching another tutorial, you must pick your 2026 Free Starter Stack and commit to a single 30-day direction.',
          ],
          callout: {
            label: '2026 Living Update · PDF pp. 11 & 19',
            body: 'Focus beats tool collecting: master 2–3 free tools (1 modern multimodal LLM + Canva Free + NotebookLM/Perplexity for fact-checking) before paying for any subscription.',
          },
          kind: 'choice',
          choices: [
            {
              id: 'ow_c1_stack_free',
              moveTitle: 'Lock the 2026 Free 3-Tool Stack',
              riskRewardTag: 'HIGH LEVERAGE · +18 TRUST · -3 MINS',
              label:
                'Commit to 1 free LLM (Gemini or Claude), Canva Free for visuals, and Perplexity/NotebookLM to verify every factual claim before publishing.',
              tacticTag: 'Lean Stack',
              nextNodeId: 'ow_c1_n2_path',
              xpDelta: 35,
              hudDelta: { trust: 18, mins: -3, leverage: 25 },
              skillDelta: { clarity: 10, constraint: 10, verification: 8 },
              consequence:
                'Zero monthly burn and deep fluency in 3 tools that cover 90% of digital work tasks.',
              terminalPreview: {
                promptSent:
                  'Configure a zero-cost 2026 workflow: LLM (drafting) + Perplexity/NotebookLM (source verification) + Canva Free (layout). Lock scope for 30 days.',
                tokenEfficiency: 93,
                simulatedOutput:
                  'STACK LOCKED ($0/mo):\n1. Research & Grounding: Perplexity + NotebookLM\n2. Drafting & RCTS Prompts: Claude / Gemini Free\n3. Layout & Covers: Canva Free',
                bossReaction:
                  'Mentor Note: "Mistake #13 avoided—you are building skills before spending a single dollar on subscriptions."',
              },
            },
            {
              id: 'ow_c1_tool_hoard',
              moveTitle: 'Subscribe to 6 Paid AI Tools',
              riskRewardTag: 'HIGH RISK · -12 TRUST · -6 MINS',
              label:
                'Buy $120/mo in video, SEO, and writing subscriptions upfront so you feel ready to launch on every platform at once.',
              tacticTag: 'Tool Overload',
              nextNodeId: 'ow_c1_n2_recovery',
              xpDelta: 10,
              hudDelta: { trust: -12, mins: -6, leverage: -5 },
              skillDelta: { clarity: 2 },
              consequence:
                'Mistake #2 & #13 triggered: shallow familiarity across six tools and immediate financial pressure before your first deliverable.',
              terminalPreview: {
                promptSent: 'Compare 14 AI tools for YouTube, KDP, Dropshipping, and SEO simultaneously.',
                tokenEfficiency: 38,
                simulatedOutput:
                  'OUTPUT: 1,400-word feature matrix generated. 0 articles published. $120/mo billed on Day 1.',
                bossReaction:
                  'Mentor Note: "Stop—tutorial loops feel productive while producing zero evidence. Cut back to 2–3 free tools right now."',
              },
            },
            {
              id: 'ow_c1_unverified_post',
              moveTitle: 'Auto-Publish Unedited AI Facts',
              riskRewardTag: 'COMPLIANCE RISK · -15 TRUST · -2 MINS',
              label:
                'Ask an LLM for "10 statistics about remote work in 2026" and paste them straight into a public blog post without checking sources.',
              tacticTag: 'No Verification',
              nextNodeId: 'ow_c1_n2_recovery',
              xpDelta: 5,
              hudDelta: { trust: -15, mins: -2, leverage: 0 },
              skillDelta: { verification: 2 },
              consequence:
                'Chapter 1’s non-negotiable rule broken: two cited statistics were fabricated and readers called it out immediately.',
              terminalPreview: {
                promptSent: 'Give me 10 impressive remote-work statistics I can publish right now.',
                tokenEfficiency: 44,
                simulatedOutput:
                  'STAT #4: "78.4% of Gumroad creators earn $5k/mo within 30 days" -> [FABRICATED HALLUCINATION]',
                bossReaction:
                  'Reader Comment: "Where did that number come from? That study doesn’t exist."',
              },
            },
          ],
        },
        ow_c1_n2_recovery: {
          id: 'ow_c1_n2_recovery',
          stepLabel: 'PDF Ch. 1–3 · Scene 02 of 04',
          title: 'Breaking Out of the Beginner Loop',
          narrative: [
            'You caught the trap early—as James notes on Page 51, a mistake caught in week one costs you an afternoon; left unchecked it costs months.',
            'Now apply the Chapter 2 Decision Framework: choose ONE forgiving beginner path for the next 30 days (not a lifetime pledge—just 30 days of real output).',
          ],
          kind: 'choice',
          choices: [
            {
              id: 'ow_c1_rec_commit',
              moveTitle: '30-Day Single-Path Commitment',
              riskRewardTag: 'RECOVERY · +18 TRUST · -3 MINS',
              label:
                'Commit to Digital Products (a focused 20-page guide + interactive checklist on Gumroad) and schedule 1 non-negotiable hour daily (25m learn / 25m build / 10m review).',
              tacticTag: 'Direction Lock',
              nextNodeId: 'ow_c1_boss',
              xpDelta: 30,
              hudDelta: { trust: 18, mins: -3, leverage: 25 },
              skillDelta: { clarity: 10, constraint: 10 },
              consequence:
                'Clean reset. One direction, one daily block, and a measurable Day-30 deliverable.',
              terminalPreview: {
                promptSent:
                  'Draft my 30-Day Commitment Block: Path = Digital Products, Daily Window = 7:00–8:00 AM, Deliverable = 1 verified Gumroad PDF + QR drill.',
                tokenEfficiency: 90,
                simulatedOutput:
                  '30-DAY PLAN LOCKED:\n- Week 1: Niche & Perplexity research\n- Week 2: RCTS drafting + human editing\n- Week 3: Canva layout + Gumroad setup\n- Week 4: Pinterest & newsletter launch',
                bossReaction:
                  'Mentor Note: "Action creates clarity. Now prove your commitment in the Live Prompt Duel."',
              },
            },
          ],
        },
        ow_c1_n2_path: {
          id: 'ow_c1_n2_path',
          stepLabel: 'PDF Ch. 2 · Scene 02 of 04',
          title: 'Choosing One of the Four Beginner Paths',
          narrative: [
            'Your $0 stack is locked. Chapter 2 narrows online work to 4 forgiving paths with zero ad budget: Content Creation (Medium + Affiliate), Freelancing (Fiverr/Upwork), Productivity Systems, or Digital Products (Gumroad/KDP).',
            'Your friend urges you to launch a YouTube channel, a Medium blog, AND an Upwork agency all in Week 1. How do you respond?',
          ],
          kind: 'choice',
          choices: [
            {
              id: 'ow_c1_one_path',
              moveTitle: 'One Path, One Small Asset in 30 Days',
              riskRewardTag: 'HIGH LEVERAGE · +14 TRUST · -3 MINS',
              label:
                'Reject multi-channel chaos. Lock ONE path for 30 days with a verifiable Day-30 target (e.g., "Publish 1 practical 20-page PDF guide + 5 Pinterest pins").',
              tacticTag: 'Focus Rule',
              nextNodeId: 'ow_c1_boss',
              xpDelta: 30,
              hudDelta: { trust: 14, mins: -3, leverage: 22 },
              skillDelta: { clarity: 12, context: 8 },
              consequence:
                'You protected your 60-minute daily window and created a finish line you can actually cross in 30 days.',
              terminalPreview: {
                promptSent:
                  'Audit my 30-day goal for specificity: replace "learn AI" with one verifiable shipped deliverable and weekly milestones.',
                tokenEfficiency: 94,
                simulatedOutput:
                  'VERIFIABLE DAY-30 GOAL: Publish 1 edited 20-page beginner guide on Gumroad + 1 interactive companion drill. Zero secondary projects until Day 31.',
                bossReaction:
                  'Mentor Note: "That is the exact shift from consuming information to building real evidence."',
              },
            },
            {
              id: 'ow_c1_four_paths',
              moveTitle: 'Run All Four Paths Simultaneously',
              riskRewardTag: 'BURNOUT RISK · -10 TRUST · -6 MINS',
              label:
                'Split your 1 hour/day across Medium, Pinterest, Fiverr, and faceless YouTube so you hedge your bets.',
              tacticTag: 'Scattered Effort',
              nextNodeId: 'ow_c1_boss',
              xpDelta: 10,
              hudDelta: { trust: -10, mins: -6, leverage: -5 },
              skillDelta: { clarity: 2 },
              consequence:
                'Fifteen minutes per channel meant zero finished assets by Day 30. Narrow your scope in the Boss Duel.',
              terminalPreview: {
                promptSent: 'Make a 1-hour daily schedule covering YouTube, Medium, Upwork, and KDP.',
                tokenEfficiency: 45,
                simulatedOutput:
                  'WARNING: 15 min/channel leaves 0 minutes for editing, fact-checking, or platform compliance review.',
                bossReaction:
                  'Mentor Note: "Learn one workflow end-to-end before ten. Narrow it down in the next prompt."',
              },
            },
          ],
        },
        ow_c1_boss: {
          id: 'ow_c1_boss',
          stepLabel: 'PDF Ch. 1–3 · Live Prompt Duel (03 of 04)',
          title: 'Boss Duel: Build Your 30-Day AI Action Plan Prompt',
          narrative: [
            'Turn Chapter 2 & Page 57 (Personal Action Planner) into a sharp, constraint-locked prompt you can run in any 2026 LLM.',
            'Light up all 3 Live Guardrails below, then hit Execute Prompt to get graded by the AI mentor.',
          ],
          kind: 'prompt_boss',
          promptChallenge: {
            id: 'boss_ow_ch1',
            title: '30-Day Direction & Free Stack Planner Prompt',
            roleBrief:
              'Write a prompt instructing an AI coach to generate a realistic 4-week daily learning plan (60 minutes/day) for ONE chosen beginner path using only free tools, with a mandatory fact-checking rule.',
            inputContext:
              'Beginner profile: 1 hour/day available, $0 budget, zero audience, wants 1 verifiable shipped asset by Day 30.',
            constraints: [
              'Define the AI role and ONE specific path (Content Creation, Freelancing, Productivity Systems, or Digital Products)',
              'Specify the 4-week structure or 3-block daily format (Input / Practice / Review)',
              'Include an honesty/fact-checking guardrail (no income promises, verify all facts)',
            ],
            liveChecks: [
              {
                id: 'chk_ow1_role',
                label: 'Role + Single Path Locked',
                pattern: '(act as|role|coach|strategist|mentor).*(freelanc|digital product|content|productivity|medium|gumroad|ebook)|(freelanc|digital product|content|productivity).*(act as|role|coach)',
              },
              {
                id: 'chk_ow1_format',
                label: '4-Week or Daily Time-Block Structure',
                pattern: '(week 1|4-week|4 week|30-day|30 day|table|daily|60 min|block)',
              },
              {
                id: 'chk_ow1_guardrail',
                label: 'Fact-Check / No-Hype Guardrail',
                pattern: '(fact-check|verify|free tier|free tool|no income|no hype|realistic|unverified)',
              },
            ],
            starterPrompt:
              'Role: Act as a practical AI digital skills coach.\nContext: I am a beginner with 60 minutes/day and a $0 budget committing for 30 days to ONE path: Digital Products (a starter Gumroad guide).\nTask: Build a 4-week roadmap organized as a table using the 3-block daily structure (20m Learning Input, 30m Active Practice, 10m Review) using only free tools (Gemini/Claude Free, Canva Free, Perplexity).\nRules: Keep goals verifiable (shipped assets only), make no income promises, and include a mandatory fact-checking step before publishing.',
            rubricFocus: [
              'Single focused beginner path with role framing',
              'Concrete 4-week or daily time-block format',
              'Zero-budget free tool stack constraint',
              'Realistic no-hype and fact-checking guardrail',
            ],
            passingScore: 70,
            passNextNodeId: 'ow_c1_ending',
            retryHint:
              'Include a clear Role + 1 specific path, a 4-week/daily structure, and an explicit fact-check or no-hype rule.',
            xpReward: 75,
          },
        },
        ow_c1_ending: {
          id: 'ow_c1_ending',
          stepLabel: 'Chapter 1 Complete · Rank Stamped',
          title: 'Direction Locked — Out of the Tutorial Trap',
          narrative: [
            'You replaced endless tool-hopping with a verified $0 stack, one 30-day path, and a repeatable daily execution block.',
            'Continue to Free Chapter 2 to step inside Maria’s Gumroad Digital Product Launch and master the RCTS Prompt Framework.',
          ],
          kind: 'ending',
          endingRank: {
            title: '30-Day Path Architect',
            stampText: 'DIRECTION LOCKED',
            summary:
              'Escaped the beginner tutorial loop by committing to a lean 2026 free tool stack and a verifiable 30-day shipping schedule.',
            badgeCode: 'JWAI-OW-CH1',
            nextChapterHint:
              'Chapter 2 (Free Preview) covers PDF Chapters 4, 6 & 13: RCTS Prompting, KDP/Gumroad Compliance & Merchant of Record VAT protection.',
          },
        },
      },
    },
    2: {
      book_id: 'book_online_work_2026',
      book_slug: 'ai-for-online-work',
      book_title: 'AI for Online Work (2026 Interactive Edition)',
      gumroad_url: GUMROAD_BASE,
      version: 3,
      chapter_num: 2,
      title: 'Chapter 2: The RCTS Digital Product & Gumroad Launch',
      is_free: true,
      initial_hud: { trust: 65, minsLeft: 16, leverage: 45 },
      start_node_id: 'ow_c2_n1',
      chapters_toc: [],
      nodes: {
        ow_c2_n1: {
          id: 'ow_c2_n1',
          stepLabel: 'PDF Ch. 4 & 6 · Scene 01 of 04',
          title: 'Maria’s 24-Page Guide — Drafting Without Sounding Like a Robot',
          narrative: [
            'Following Maria’s Case Study on Page 22, you picked a focused problem you know firsthand: writing an ATS-friendly resume for remote roles. You researched real questions via Perplexity.',
            'Now it’s time to draft Chapter 1 of your eBook and prepare it for Gumroad & Amazon KDP. How do you prompt and edit the draft?',
          ],
          callout: {
            label: 'PDF Page 21 · The RCTS Prompt Framework',
            body: 'Role — Context — Task — Style. Treat every AI output as a first draft only, and budget equal time for human editing, voice, and fact-checking.',
          },
          kind: 'choice',
          choices: [
            {
              id: 'ow_c2_rcts',
              moveTitle: 'RCTS Section-by-Section + Human Edit',
              riskRewardTag: 'HIGH LEVERAGE · +16 TRUST · -3 MINS',
              label:
                'Use RCTS (Role, Context, Task, Style) to draft one section at a time, weave in your own real job-search examples, and verify every ATS claim.',
              tacticTag: 'RCTS + QA',
              nextNodeId: 'ow_c2_n2_payments',
              xpDelta: 35,
              hudDelta: { trust: 16, mins: -3, leverage: 24 },
              skillDelta: { clarity: 12, context: 10, verification: 10 },
              consequence:
                'Reads like a knowledgeable mentor, passes KDP quality review, and earns real reader trust.',
              terminalPreview: {
                promptSent:
                  'Role: Career editor. Context: 24-page ATS resume guide for beginners. Task: Outline Section 1 with 3 real formatting fixes. Style: Direct, practical, zero fluff.',
                tokenEfficiency: 92,
                simulatedOutput:
                  'SECTION 1 DRAFTED -> Human edit pass added 2 real before/after resume bullets + verified ATS parser rules. Ready for Canva 6x9 layout.',
                bossReaction:
                  'Beta Reader Feedback: "This actually sounds like a real person who went through job interviews—way clearer than generic articles."',
              },
            },
            {
              id: 'ow_c2_one_shot',
              moveTitle: 'One-Shot "Write Whole Book" Prompt',
              riskRewardTag: 'REJECTION RISK · -14 TRUST · -2 MINS',
              label:
                'Type "Write a 24-page ebook about resumes" in a single prompt, export raw text to PDF, and upload straight to KDP without disclosing or editing.',
              tacticTag: 'Raw Slop',
              nextNodeId: 'ow_c2_n2_payments',
              xpDelta: 5,
              hudDelta: { trust: -14, mins: -2, leverage: -5 },
              skillDelta: { verification: 2 },
              consequence:
                'Mistake #1 & #3 triggered: repetitive generic filler gets flagged by KDP low-content scrutiny and receives 1-star Gumroad reviews.',
              terminalPreview: {
                promptSent: 'Write a complete 24-page ebook on ATS resumes in one response.',
                tokenEfficiency: 31,
                simulatedOutput:
                  'OUTPUT: "In today’s fast-paced digital landscape, delving into resumes unlocks synergy..." (Flagged for low-value repetition).',
                bossReaction:
                  'Platform Compliance Alert: "Amazon KDP requires disclosure of AI-generated content and rejects generic unedited low-value books."',
              },
            },
          ],
        },
        ow_c2_n2_payments: {
          id: 'ow_c2_n2_payments',
          stepLabel: 'PDF Ch. 13 · Scene 02 of 04',
          title: 'Going Global — Payments, VAT & Living Companion Strategy',
          narrative: [
            'Your 24-page guide is designed in Canva with embedded fonts and QR codes linking to interactive web exercises. Buyers from the US, UK, EU, and Brazil want to purchase it.',
            'Chapter 13 highlights a critical infrastructure choice: Payment Processor vs. Merchant of Record (MoR). How do you ship?',
          ],
          kind: 'choice',
          choices: [
            {
              id: 'ow_c2_mor',
              moveTitle: 'Merchant of Record + QR Companion',
              riskRewardTag: 'COMPLIANT · +15 TRUST · -2 MINS',
              label:
                'Launch on Gumroad or Fourthwall (Merchant of Record handles global VAT/GST), verify identity early, and embed QR codes linking to the free Living Dispatch website.',
              tacticTag: 'MoR + Living PDF',
              nextNodeId: 'ow_c2_boss',
              xpDelta: 35,
              hudDelta: { trust: 15, mins: -2, leverage: 24 },
              skillDelta: { constraint: 10, verification: 10 },
              consequence:
                'Global VAT compliance handled automatically, and your PDF stays evergreen because tool updates live on your companion web page.',
              terminalPreview: {
                promptSent:
                  'Configure Gumroad checkout: MoR global VAT enabled + unique license key per buyer + PDF with embedded chapter QR links.',
                tokenEfficiency: 95,
                simulatedOutput:
                  'LAUNCH READY:\n- Global EU/UK VAT collected & remitted by MoR\n- Buyer receives PDF + Companion License Key\n- Back cover QR feeds weekly Living Dispatch list',
                bossReaction:
                  'Launch Check: "Zero tax headaches, clean checkout, and every buyer automatically discovers your other Gumroad playbooks."',
              },
            },
            {
              id: 'ow_c2_diy_tax',
              moveTitle: 'Custom Checkout Without VAT Setup',
              riskRewardTag: 'COMPLIANCE RISK · -12 TRUST · -5 MINS',
              label:
                'Build a raw custom payment form with no VAT handling and wait until your first payout to verify your identity.',
              tacticTag: 'Tax Exposure',
              nextNodeId: 'ow_c2_boss',
              xpDelta: 10,
              hudDelta: { trust: -12, mins: -5, leverage: 0 },
              skillDelta: { constraint: 2 },
              consequence:
                'Mistake #18 & #20: payout frozen pending KYC verification and manual EU VAT compliance burden.',
              terminalPreview: {
                promptSent: 'Skip Merchant of Record and accept international card payments directly.',
                tokenEfficiency: 48,
                simulatedOutput:
                  'ALERT: Payout delayed—identity verification pending. International VAT remittance required in 14 jurisdictions.',
                bossReaction:
                  'Mentor Note: "Verify identity on Day 1 and let a Merchant of Record (Gumroad/Fourthwall) handle global VAT while you focus on product value."',
              },
            },
          ],
        },
        ow_c2_boss: {
          id: 'ow_c2_boss',
          stepLabel: 'PDF Ch. 4 & Bonus #3 · Live Prompt Duel (03 of 04)',
          title: 'Boss Duel: RCTS Gumroad Product Positioning Prompt',
          narrative: [
            'Combine Chapter 4’s RCTS Prompt Framework (Page 21) with Bonus Resource #3’s Positioning Formula (Page 48) to generate an honest, high-converting Gumroad product listing.',
            'Lock all 3 Live Guardrails before clicking Execute Prompt.',
          ],
          kind: 'prompt_boss',
          promptChallenge: {
            id: 'boss_ow_ch2',
            title: 'RCTS + Positioning Formula Gumroad Copy Prompt',
            roleBrief:
              'Write a complete RCTS prompt that generates a 150–180 word Gumroad product description using James Walker’s Positioning Formula ("[Product] helps [Audience] achieve [Outcome] without [Obstacle]") with zero income hype.',
            inputContext:
              'Product: "AI for Online Work (2026 Interactive Edition)" — 14-chapter PDF + QR interactive drills + free weekly web dispatch.',
            constraints: [
              'Explicitly define Role and Target Buyer Context',
              'Require the Positioning Formula structure and a word limit (<= 200 words)',
              'Ban hype claims and unsubstantiated income guarantees',
            ],
            liveChecks: [
              {
                id: 'chk_ow2_rcts',
                label: 'Role + Target Buyer Context',
                pattern: '(role|act as|copywriter|writer).*(buyer|beginner|audience|creator|reader)',
              },
              {
                id: 'chk_ow2_formula',
                label: 'Positioning Formula + Word Cap',
                pattern: '(positioning|helps.*without|outcome.*obstacle).*(word|150|180|200)|(word|150|180|200).*(positioning|helps.*without)',
              },
              {
                id: 'chk_ow2_honest',
                label: 'No-Hype / Honest Guardrail',
                pattern: '(no hype|no income|honest|ban|unsubstantiated|guarantee)',
              },
            ],
            starterPrompt:
              'Role: Act as a direct, honest digital product copywriter.\nContext: I am publishing "AI for Online Work (2026 Interactive Edition)" on Gumroad for non-technical beginners who want practical digital skills and interactive QR practice drills.\nTask: Write a 160-word Gumroad description that opens with the Positioning Formula ("[Product] helps [specific audience] achieve [outcome] without [obstacle]"), then lists 3 concrete items included.\nStyle: Clear, encouraging, plain English. Strict rule: No hype, no inflated claims, and no income guarantees.',
            rubricFocus: [
              'Clear Role and buyer Context (RCTS)',
              'Explicit Positioning Formula requirement',
              'Strict length cap (150–200 words)',
              'Anti-hype / no-income-guarantee compliance rule',
            ],
            passingScore: 72,
            passNextNodeId: 'ow_c2_ending',
            retryHint:
              'Make sure your prompt states the Role + target buyer, references the Positioning Formula + word limit, and bans hype/income guarantees.',
            xpReward: 85,
          },
        },
        ow_c2_ending: {
          id: 'ow_c2_ending',
          stepLabel: 'Chapter 2 Complete · Rank Stamped',
          title: 'Product Launch Ready — Living PDF + Gumroad Bridge',
          narrative: [
            'You mastered RCTS prompting, protected yourself with Merchant of Record VAT compliance, and built an honest Gumroad positioning prompt.',
            'Unlock Chapter 3 (code: ONLINEWORK-2026) to play Marcus’s $140 Client-First Proposal Duel and Aisha’s Pinterest + Newsletter traffic simulation.',
          ],
          kind: 'ending',
          endingRank: {
            title: 'RCTS Digital Publisher',
            stampText: 'APPROVED FOR PROD',
            summary:
              'Applied the RCTS Prompt Framework, Positioning Formula, and Merchant of Record compliance to launch an evergreen PDF + interactive QR companion.',
            badgeCode: 'JWAI-OW-CH2',
            nextChapterHint:
              'Redeem ONLINEWORK-2026 in the Unlock Vault to unlock Chapter 3: Client-First Freelancing & Organic Traffic Engine.',
          },
        },
      },
    },
    3: {
      book_id: 'book_online_work_2026',
      book_slug: 'ai-for-online-work',
      book_title: 'AI for Online Work (2026 Interactive Edition)',
      gumroad_url: GUMROAD_BASE,
      version: 3,
      chapter_num: 3,
      title: 'Chapter 3: Client-First Freelancing & Organic Traffic Engine',
      is_free: false,
      initial_hud: { trust: 70, minsLeft: 15, leverage: 55 },
      start_node_id: 'ow_c3_n1',
      chapters_toc: [],
      nodes: {
        ow_c3_n1: {
          id: 'ow_c3_n1',
          stepLabel: 'PDF Ch. 9 · Scene 01 of 04',
          title: 'Marcus’s First Client — Why Long Resume Pitches Get Ignored',
          narrative: [
            'Inspired by Marcus’s Case Study on Page 60, you reframed your background into a specific service: "AI-assisted internal onboarding documentation for SaaS teams."',
            'A founder named Priya just posted a $140 project: their help center hasn’t been updated since their last release and users keep asking the same three questions. What do you send?',
          ],
          callout: {
            label: 'PDF Page 32 & 60 · The Client-First Proposal Framework',
            body: 'Shift from "here is my resume" to "here is what I noticed about your specific problem and a concrete no-commitment next step."',
          },
          kind: 'choice',
          choices: [
            {
              id: 'ow_c3_client_first',
              moveTitle: '2-Sentence Client-First Hook + Micro-Sample',
              riskRewardTag: 'HIGH LEVERAGE · +18 TRUST · -3 MINS',
              label:
                'Open by referencing her exact outdated onboarding guide and top 3 support questions, then attach a quick 1-section rewrite sample with zero obligation.',
              tacticTag: 'Client-First',
              nextNodeId: 'ow_c3_n2_traffic',
              xpDelta: 40,
              hudDelta: { trust: 18, mins: -3, leverage: 25 },
              skillDelta: { clarity: 12, context: 12 },
              consequence:
                'Priya replied within two hours. You landed the $140 job—and created a reusable proposal blueprint for the next 10 prospects.',
              terminalPreview: {
                promptSent:
                  'Draft a 2-sentence Client-First pitch to Priya referencing her outdated onboarding guide + offering a 1-section sample rewrite. Ban generic resume intros.',
                tokenEfficiency: 96,
                simulatedOutput:
                  '"Hi Priya — I noticed your onboarding guide hasn’t been updated since your last release, and the same three setup questions keep appearing in your forum. I rewrote just the first section as a quick example, no commitment—let me know if it’s useful."',
                bossReaction:
                  'Client Reply (Priya): "Finally someone who actually read our docs. Sending the $140 milestone offer now."',
              },
            },
            {
              id: 'ow_c3_resume_wall',
              moveTitle: '400-Word Generic AI Cover Letter',
              riskRewardTag: 'IGNORED · -10 TRUST · -4 MINS',
              label:
                'Ask an LLM to write a polished 4-paragraph cover letter listing all your degrees, enthusiasm, and generic AI skills.',
              tacticTag: 'Self-Focused',
              nextNodeId: 'ow_c3_n2_traffic',
              xpDelta: 10,
              hudDelta: { trust: -10, mins: -4, leverage: -5 },
              skillDelta: { context: 2 },
              consequence:
                'Buried alongside 40 identical AI-written proposals. Clients skim for proof that you understood their exact bottleneck.',
              terminalPreview: {
                promptSent: 'Write an impressive freelance cover letter highlighting my AI expertise.',
                tokenEfficiency: 35,
                simulatedOutput:
                  '"Dear Hiring Manager, I am thrilled to apply for your esteemed role with my passion for leveraging cutting-edge AI..."',
                bossReaction:
                  'Client Status: Proposal archived unread after 3 seconds.',
              },
            },
          ],
        },
        ow_c3_n2_traffic: {
          id: 'ow_c3_n2_traffic',
          stepLabel: 'PDF Ch. 10 & 14 · Scene 02 of 04',
          title: 'Aisha’s Pinterest Pin & Your Owned Email Flywheel',
          narrative: [
            'Now you want steady organic traffic that compounds over 6–12 months without paying for ads. Following Aisha’s Case Study (Page 61) and Chapter 14 (Page 42), you are launching 2:3 vertical Pinterest pins linking to your free interactive guide + affiliate tools.',
            'How do you structure the traffic-to-newsletter funnel?',
          ],
          kind: 'choice',
          choices: [
            {
              id: 'ow_c3_funnel_8020',
              moveTitle: 'FTC-Compliant Pins -> Free Lead Magnet -> 80/20 Newsletter',
              riskRewardTag: 'COMPOUNDING · +15 TRUST · -3 MINS',
              label:
                'Design consistent 1000x1500px Canva pins with prominent FTC affiliate disclosures, send traffic to your free interactive Chapter 1 + email signup, and send 1 helpful 80/20 email per week.',
              tacticTag: 'Owned Audience',
              nextNodeId: 'ow_c3_boss',
              xpDelta: 40,
              hudDelta: { trust: 15, mins: -3, leverage: 25 },
              skillDelta: { constraint: 10, verification: 12 },
              consequence:
                'You turned rented Pinterest discovery into an owned email list—protected from algorithm shifts and fully FTC compliant.',
              terminalPreview: {
                promptSent:
                  'Generate 5 Pinterest SEO descriptions (180–260 chars) for small-space workflow templates, lead with benefit, include mandatory FTC disclosure.',
                tokenEfficiency: 94,
                simulatedOutput:
                  'PIN 01: "5-Minute AI Weekly Planner (Free Interactive Drill) — Save This For Later -> | Disclosure: Contains affiliate links to tools I personally use."',
                bossReaction:
                  'Analytics (Month 4): 340 pin saves -> 62 new newsletter subscribers -> 9 Gumroad full-edition sales.',
              },
            },
            {
              id: 'ow_c3_spam_links',
              moveTitle: 'Rapid-Fire Undisclosed Affiliate Pins',
              riskRewardTag: 'BAN RISK · -18 TRUST · -2 MINS',
              label:
                'Blast 40 near-identical AI pins in one afternoon directly to affiliate links without FTC disclosure or email capture.',
              tacticTag: 'Policy Violation',
              nextNodeId: 'ow_c3_boss',
              xpDelta: 5,
              hudDelta: { trust: -18, mins: -2, leverage: -10 },
              skillDelta: { verification: 2 },
              consequence:
                'Mistake #3 & #10 triggered: Pinterest spam filters throttled reach and missing FTC disclosures created compliance risk.',
              terminalPreview: {
                promptSent: 'Duplicate 40 identical affiliate links for rapid Pinterest posting.',
                tokenEfficiency: 25,
                simulatedOutput:
                  'WARNING: Near-identical pins flagged by Pinterest spam filter; FTC disclosure missing.',
                bossReaction:
                  'Compliance Alert: "Never sacrifice long-term trust or account health for short-term clicks."',
              },
            },
          ],
        },
        ow_c3_boss: {
          id: 'ow_c3_boss',
          stepLabel: 'PDF Ch. 9 & 14 · Live Prompt Duel (03 of 04)',
          title: 'Boss Duel: Client-First Proposal + 80/20 Newsletter Prompt',
          narrative: [
            'Prove you can apply the Client-First Proposal Framework (Page 32 & 60) with surgical precision.',
            'Write a prompt that instructs an LLM to craft a short, client-first freelance outreach message grounded in a specific client pain point—with strict anti-cliché rules.',
          ],
          kind: 'prompt_boss',
          promptChallenge: {
            id: 'boss_ow_ch3',
            title: 'Client-First Outreach Prompt',
            roleBrief:
              'Write a prompt instructing an AI to draft a 3-sentence Client-First proposal for a SaaS founder whose help documentation is outdated, leading with their exact problem and offering a concrete micro-sample.',
            inputContext:
              'Client: Small B2B SaaS team. Pain point: Support tickets spiked 30% after v2 UI update because onboarding docs still show old screenshots.',
            constraints: [
              'Specify the Client-First rule (open with the client’s specific pain point, NOT your resume)',
              'Require a concise length limit (max 3–4 sentences or <= 90 words) and a low-friction next step',
              'Ban generic AI cover-letter clichés ("thrilled to apply", "esteemed", "synergy")',
            ],
            liveChecks: [
              {
                id: 'chk_ow3_client',
                label: 'Opens With Client Pain Point',
                pattern: '(client-first|pain point|specific problem|onboarding|support ticket|not.*resume|before.*background)',
              },
              {
                id: 'chk_ow3_cta',
                label: 'Short Limit + Micro-Sample / Next Step',
                pattern: '(sentence|word|short|brief|90|100).*(sample|rewrite|example|next step|commitment)|(sample|rewrite|example|next step).*(sentence|word|short|brief)',
              },
              {
                id: 'chk_ow3_ban',
                label: 'Anti-Cliché / Honest Tone Guardrail',
                pattern: '(ban|avoid|no cliché|no generic|no fluff|thrilled|plain|colleague|honest)',
              },
            ],
            starterPrompt:
              'Role: Act as a specialist SaaS documentation freelancer.\nContext: A SaaS founder’s support tickets spiked after a UI release because their onboarding docs still show old screenshots.\nTask: Write a 3-sentence Client-First proposal (under 80 words) that opens with their exact onboarding-ticket bottleneck—NOT my resume—and offers a free 1-section rewrite sample with zero commitment.\nStyle: Conversational, colleague-to-colleague tone. Strictly ban generic cover-letter clichés ("I am thrilled to apply", "esteemed", "leverage", "synergy").',
            rubricFocus: [
              'Client-First opening focused on the client’s exact bottleneck',
              'Concrete micro-sample or actionable low-friction next step',
              'Tight sentence/word ceiling',
              'Explicit ban on generic AI cover-letter clichés',
            ],
            passingScore: 75,
            passNextNodeId: 'ow_c3_ending',
            retryHint:
              'Tell the model to open with the client’s specific problem (not your bio), cap it at 3 sentences/80 words with a micro-sample CTA, and ban AI clichés.',
            xpReward: 100,
          },
        },
        ow_c3_ending: {
          id: 'ow_c3_ending',
          stepLabel: 'Campaign Complete · Rank Stamped',
          title: '90-Day Builder — Full Roadmap Mastered',
          narrative: [
            'You completed the full interactive campaign for AI for Online Work (2026 Edition)—from escaping the tutorial trap to RCTS product launches, Merchant of Record compliance, Client-First freelancing, and owned newsletter flywheels.',
            'Share your rank badge, subscribe to the free Living Dispatch for monthly tool updates, or explore James Walker’s full catalog on Gumroad.',
          ],
          kind: 'ending',
          endingRank: {
            title: '90-Day Digital Systems Builder',
            stampText: 'PROMOTED',
            summary:
              'Completed all 3 interactive simulations of AI for Online Work (2026 Edition), demonstrating RCTS prompting, compliance awareness, and Client-First execution.',
            badgeCode: 'JWAI-OW-PRO',
            nextChapterHint:
              'Visit Living Dispatch for monthly 2026 AI stack updates and printable QR exercises for your PDF.',
          },
        },
      },
    },
  },
};
