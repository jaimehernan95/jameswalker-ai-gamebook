import type {
  BookBundleResponse,
  BookSummary,
  ChapterBundle,
  ChapterMeta,
  SandboxPreset,
} from '../src/types/gamebook.ts';
import {
  AI_FOR_ONLINE_WORK_BOOK,
  AI_FOR_ONLINE_WORK_PRESET,
} from './aiForOnlineWorkBook.ts';

interface StoredBook {
  summary: BookSummary;
  chaptersToc: ChapterMeta[];
  chapters: Record<number, ChapterBundle>;
}

const GUMROAD_BASE = 'https://jameswalkerai.gumroad.com';

const BOOKS_STORE: StoredBook[] = [
  AI_FOR_ONLINE_WORK_BOOK,
  {
    summary: {
      id: 'book_9to5',
      slug: 'chatgpt-9-to-5',
      title: 'ChatGPT for Your 9-to-5',
      subtitle:
        'Turn chaotic Monday threads, dense stakeholder decks, and last-minute escalations into repeatable 90-second workflows.',
      gumroad_url: GUMROAD_BASE,
      cover_thumb_url: '/src/assets/images/cover_chatgpt_workplace_1795151502682.jpg',
      total_chapters: 3,
      free_chapters: 1,
      est_minutes: 15,
      difficulty: 'Practitioner',
      category: 'Workplace Operations',
      version: 2,
    },
    chaptersToc: [
      {
        chapter_num: 1,
        title: 'Chapter 1: The Monday Morning Inbox Triage',
        is_free: true,
        est_minutes: 6,
        summary: 'Extract commitments, owners, and risk flags from a 19-email VP escalation before the 9:30 standup.',
      },
      {
        chapter_num: 2,
        title: 'Chapter 2: The Executive Memo Compression',
        is_free: false,
        est_minutes: 5,
        summary: 'Convert rambling 14-page meeting transcripts into a 1-page decision memo with zero fabricated metrics.',
      },
      {
        chapter_num: 3,
        title: 'Chapter 3: The Sensitive Client De-escalation',
        is_free: false,
        est_minutes: 4,
        summary: 'Calibrate tone, legal boundaries, and concrete remediation timelines under tight account pressure.',
      },
    ],
    chapters: {
      1: {
        book_id: 'book_9to5',
        book_slug: 'chatgpt-9-to-5',
        book_title: 'ChatGPT for Your 9-to-5',
        gumroad_url: GUMROAD_BASE,
        version: 2,
        chapter_num: 1,
        title: 'Chapter 1: The Monday Morning Inbox Triage',
        is_free: true,
        initial_hud: { trust: 65, minsLeft: 18, leverage: 40 },
        start_node_id: 'n1_triage',
        chapters_toc: [],
        nodes: {
          n1_triage: {
            id: 'n1_triage',
            stepLabel: 'Scene 01 of 04',
            title: '8:42 AM — The Forwarded Avalanche',
            narrative: [
              'You open your laptop with 18 minutes left to brief your VP before the Monday operations standup. A 19-message email chain tagged "URGENT — NEED SUMMARY BEFORE 9:30" just landed.',
              'Buried inside are conflicting shipping dates from Logistics, an unapproved 12% discount offered by Sales, and an escalation from Acme Corp threatening to pause Q4 renewal unless a root-cause timeline lands by noon.',
            ],
            callout: {
              label: 'Field Principle · Frame Before Context',
              body: 'Pasting raw threads with "Summarize this" invites the model to smooth over contradictions and invent missing dates.',
            },
            kind: 'choice',
            choices: [
              {
                id: 'c_naive',
                moveTitle: 'Speed-First Summary',
                riskRewardTag: 'HIGH RISK · -5 TRUST · -4 MINS',
                label: 'Paste the thread and ask: "Summarize this email chain clearly for my VP."',
                tacticTag: 'Unconstrained',
                nextNodeId: 'n2_naive_trap',
                xpDelta: 10,
                hudDelta: { trust: -5, mins: -4, leverage: 5 },
                skillDelta: { clarity: 2 },
                consequence:
                  'Fast to type, but the model blended two conflicting dates into a single confident-sounding sentence.',
                terminalPreview: {
                  promptSent: 'Summarize this 19-email chain clearly for my VP before 9:30.',
                  tokenEfficiency: 42,
                  simulatedOutput:
                    'SUMMARY: Acme Corp shipment is confirmed for Wednesday and pricing has been adjusted to close Q4 renewal smoothly.',
                  bossReaction:
                    'VP Slack Ping: "Wait—did Finance approve that 12% discount? And why does Logistics say Thursday?"',
                },
              },
              {
                id: 'c_structured',
                moveTitle: 'Constraint-First Briefing',
                riskRewardTag: 'HIGH LEVERAGE · +15 TRUST · -3 MINS',
                label: 'Assign an Operations Analyst role, enforce a 4-column table (Decision, Owner, Deadline, Open Conflict), and ban guessing.',
                tacticTag: 'Schema Lock',
                nextNodeId: 'n2_structured_win',
                xpDelta: 35,
                hudDelta: { trust: 15, mins: -3, leverage: 25 },
                skillDelta: { clarity: 10, constraint: 12, context: 8 },
                consequence:
                  'Clean separation of facts vs. unresolved conflicts. The unapproved Sales discount jumps right to the top.',
                terminalPreview: {
                  promptSent:
                    'Act as Operations Analyst. Output 4-col table (Decision, Owner, Deadline, Open Conflict). Mark missing info [UNCONFIRMED]. Ban guessing.',
                  tokenEfficiency: 91,
                  simulatedOutput:
                    '| Topic | Owner | Deadline | Open Conflict |\n| Delivery | Logistics | [UNCONFIRMED] | Sales said Tue; Port says Thu |\n| 12% Discount | Sales | Friday | Unapproved by Finance |',
                  bossReaction:
                    'VP Reply: "Crystal clear. Forwarding the Finance flag right now—give me a client-safe version next."',
                },
              },
              {
                id: 'c_draft_reply',
                moveTitle: 'Premature Client Apology',
                riskRewardTag: 'HIGH RISK · -12 TRUST · -6 MINS',
                label: 'Skip analysis and ask the model to immediately draft an apology email to Acme Corp.',
                tacticTag: 'Action Bias',
                nextNodeId: 'n2_premature_reply',
                xpDelta: 5,
                hudDelta: { trust: -12, mins: -6, leverage: -5 },
                skillDelta: { context: 2 },
                consequence:
                  'Risky move: the model promised a Tuesday delivery window that Logistics explicitly ruled out in message #14.',
                terminalPreview: {
                  promptSent:
                    'Write a polite apology email to Acme Corp promising we will deliver early next week.',
                  tokenEfficiency: 34,
                  simulatedOutput:
                    'Dear Acme Team, We apologize for the confusion and confirm your Tuesday delivery along with your 12% credit...',
                  bossReaction:
                    'Legal Alert: "Do NOT send that—we cannot commit to Tuesday or an unapproved credit in writing."',
                },
              },
            ],
          },
          n2_naive_trap: {
            id: 'n2_naive_trap',
            stepLabel: 'Scene 02 of 04',
            title: 'The Smooth Hallucination',
            narrative: [
              'The summary smoothed over the conflict between Sales and Logistics. You caught it before standup, but the clock is ticking.',
              'You need a fast verification pass to isolate confirmed facts from assumptions.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'c_audit_quotes',
                moveTitle: 'Chain-of-Thought Audit',
                riskRewardTag: 'RECOVERY · +15 TRUST · -3 MINS',
                label: 'Run a follow-up verification prompt requiring verbatim quote citations and flagging every unverified claim.',
                tacticTag: 'Citation Audit',
                nextNodeId: 'n3_boss',
                xpDelta: 30,
                hudDelta: { trust: 15, mins: -3, leverage: 22 },
                skillDelta: { verification: 15, constraint: 8 },
                consequence:
                  'Recovered cleanly. Requiring verbatim citations exposed three silent assumptions before the VP saw them.',
                terminalPreview: {
                  promptSent:
                    'Audit your summary line by line. Attach exact sender quotes or tag [UNVERIFIED CLAIM].',
                  tokenEfficiency: 86,
                  simulatedOutput:
                    'AUDIT: "Wednesday delivery" -> [UNVERIFIED: Logistics #14 says "tentative pending customs"].',
                  bossReaction:
                    'VP Note: "Good catch. Lock this verification rule into our team template."',
                },
              },
              {
                id: 'c_manual_skim',
                moveTitle: 'Manual Notepad Skim',
                riskRewardTag: 'LOW LEVERAGE · +5 TRUST · -8 MINS',
                label: 'Discard AI output and skim all 19 messages manually with a notepad.',
                tacticTag: 'Manual Fallback',
                nextNodeId: 'n3_boss',
                xpDelta: 15,
                hudDelta: { trust: 5, mins: -8, leverage: -5 },
                skillDelta: { verification: 6 },
                consequence:
                  'Safe, though you burned 8 critical minutes doing extraction work that a constrained prompt handles in 20 seconds.',
                terminalPreview: {
                  promptSent: '[Manual browser search across 19 threads — no AI prompt executed]',
                  tokenEfficiency: 50,
                  simulatedOutput:
                    'Manual notes captured 3 dates and 2 owners, leaving 6 minutes before standup.',
                  bossReaction:
                    'VP Note: "Accurate, though we need a repeatable AI workflow before next week."',
                },
              },
            ],
          },
          n2_premature_reply: {
            id: 'n2_premature_reply',
            stepLabel: 'Scene 02 of 04',
            title: 'Unapproved Promises',
            narrative: [
              'The drafted apology committed your company to an unapproved 12% credit and a Tuesday arrival date. You stopped it at the outbox.',
              'Pivot back to extracting verified ground truth before building the team template.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'c_pivot_extract',
                moveTitle: 'Ground Truth Ledger',
                riskRewardTag: 'HIGH LEVERAGE · +18 TRUST · -3 MINS',
                label: 'Reset the context window and extract a strict fact-only ledger with [CONFIRMED] vs [UNCONFIRMED] tags.',
                tacticTag: 'Context Reset',
                nextNodeId: 'n3_boss',
                xpDelta: 30,
                hudDelta: { trust: 18, mins: -3, leverage: 25 },
                skillDelta: { verification: 12, clarity: 8 },
                consequence:
                  'Smart recovery. Isolating verified facts from open questions prevents costly external commitments.',
                terminalPreview: {
                  promptSent:
                    'Ignore previous draft. Extract facts only from thread with [CONFIRMED] or [UNCONFIRMED] tags.',
                  tokenEfficiency: 88,
                  simulatedOutput:
                    '[CONFIRMED] Acme noon deadline.\n[UNCONFIRMED] Port clearance date.\n[UNCONFIRMED] 12% discount authority.',
                  bossReaction:
                    'VP Note: "Much better—now turn this rule into a reusable team prompt."',
                },
              },
              {
                id: 'c_soften_tone',
                moveTitle: 'Diplomatic Hedging',
                riskRewardTag: 'MEDIUM RISK · +2 TRUST · -4 MINS',
                label: 'Ask the model to make the apology letter "vague enough to stay safe."',
                tacticTag: 'Hedging',
                nextNodeId: 'n3_boss',
                xpDelta: 12,
                hudDelta: { trust: 2, mins: -4, leverage: 4 },
                skillDelta: { clarity: 4 },
                consequence:
                  'Acme Corp reads vague language as stalling. Your VP still needs concrete dates and owners.',
                terminalPreview: {
                  promptSent: 'Rewrite the apology to sound reassuring without promising specific dates.',
                  tokenEfficiency: 58,
                  simulatedOutput:
                    'We value your partnership and are working diligently toward an expedited resolution soon...',
                  bossReaction:
                    'Account Lead: "Acme will see right through generic filler. Give me hard owners."',
                },
              },
            ],
          },
          n2_structured_win: {
            id: 'n2_structured_win',
            stepLabel: 'Scene 02 of 04',
            title: 'Signal Separated from Noise',
            narrative: [
              'Your structured prompt surfaced all three blockers in 12 seconds. Now your VP wants a repeatable template the whole ops team can run every Monday—without accidentally pasting internal friction into a client deck.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'c_two_stage',
                moveTitle: 'Audience Isolation Split',
                riskRewardTag: 'LOW RISK · +15 TRUST · -2 MINS',
                label: 'Specify two separate output blocks: Internal Risk Ledger (private) and Client-Safe Status Update.',
                tacticTag: 'Audience Split',
                nextNodeId: 'n3_boss',
                xpDelta: 35,
                hudDelta: { trust: 15, mins: -2, leverage: 20 },
                skillDelta: { context: 12, constraint: 10 },
                consequence:
                  'Excellent operational hygiene. Separating internal friction from external messaging eliminates accidental leaks.',
                terminalPreview: {
                  promptSent:
                    'Emit two distinct headers: ## INTERNAL RISK LEDGER and ## CLIENT-SAFE STATUS (zero internal blame).',
                  tokenEfficiency: 94,
                  simulatedOutput:
                    '## INTERNAL RISK LEDGER\n- Sales 12% discount unapproved.\n## CLIENT-SAFE STATUS\n- Named ops owner assigned; confirmed timeline arriving at 11:30 AM.',
                  bossReaction:
                    'VP Reply: "Ship this into the playbook. Build the final reusable prompt now."',
                },
              },
              {
                id: 'c_one_block',
                moveTitle: 'Single Combined List',
                riskRewardTag: 'MEDIUM RISK · +4 TRUST · -3 MINS',
                label: 'Keep one combined executive bullet list and tell team members to delete sensitive lines manually.',
                tacticTag: 'Manual Redaction',
                nextNodeId: 'n3_boss',
                xpDelta: 15,
                hudDelta: { trust: 4, mins: -3, leverage: 6 },
                skillDelta: { clarity: 5 },
                consequence:
                  'Works once, fails under Monday rush. Structural separation beats human willpower.',
                terminalPreview: {
                  promptSent: 'Output a single bullet summary combining internal risks and client updates.',
                  tokenEfficiency: 67,
                  simulatedOutput:
                    '• Sales offered unauthorized discount.\n• Logistics awaiting customs.\n• Acme renewal at risk.',
                  bossReaction:
                    'Ops Lead: "Careful—someone will copy-paste that first bullet straight into Slack."',
                },
              },
            ],
          },
          n3_boss: {
            id: 'n3_boss',
            stepLabel: 'Scene 03 of 04 · Live Prompt Duel',
            title: 'Build the Monday Triage Meta-Prompt',
            narrative: [
              'Your VP asks you to lock a reusable prompt into the team playbook right now. Write a prompt that turns ANY messy escalation thread into a reliable, hallucination-proof executive brief.',
              'Watch the 3-Constraint Checklist light up as you type, then click Execute Prompt for live evaluation.',
            ],
            kind: 'prompt_boss',
            promptChallenge: {
              id: 'boss_9to5_ch1',
              title: 'Executive Escalation Triage Prompt',
              roleBrief:
                'Design a reusable prompt for an Operations Analyst briefing a VP before a 9:30 AM standup.',
              inputContext:
                '[Placeholder: Paste raw multi-sender email thread with conflicting dates, owners, and client risks]',
              constraints: [
                'Define the AI role and executive audience (VP / Operations Lead)',
                'Mandate a structured output layout (Executive Summary, Action Table, Unresolved Conflicts)',
                'Include an explicit anti-hallucination rule ([UNCONFIRMED] or cite sender initials)',
                'Keep the brief scannable in under 220 words',
              ],
              liveChecks: [
                {
                  id: 'chk_role',
                  label: 'Role & Audience Defined',
                  pattern: '(act as|you are|role|analyst|operations|vp|executive|lead)',
                },
                {
                  id: 'chk_format',
                  label: 'Output Format Locked',
                  pattern: '(table|section|1\\)|bullet|column|schema|json|format|list)',
                },
                {
                  id: 'chk_guard',
                  label: 'Edge-Case / Hallucination Guardrail',
                  pattern: '(never|do not|ban|unconfirmed|cite|verbatim|guess|invent|missing|word|under|max)',
                },
              ],
              starterPrompt:
                'Act as a senior operations analyst briefing a VP before a 9:30 AM standup. Analyze the pasted email thread and output: 1) Three-sentence situation brief, 2) Action table (Owner, Commitment, Deadline, Status), and 3) Unresolved conflicts or unapproved promises. Rules: Do not invent dates or owners—mark missing info as [UNCONFIRMED] and cite sender initials for every claim. Keep total output under 220 words.',
              rubricFocus: [
                'Clear persona & target audience',
                'Explicit structured output sections',
                'Anti-hallucination / uncertainty handling',
                'Brevity or scannability constraint',
              ],
              passingScore: 70,
              passNextNodeId: 'n4_victory',
              retryHint:
                'Tighten your anti-hallucination rule (forbid guessing missing dates/owners) and enforce a scannable structure with clear word or bullet limits.',
              xpReward: 75,
            },
          },
          n4_victory: {
            id: 'n4_victory',
            stepLabel: 'Chapter Complete',
            title: '9:18 AM — Brief Delivered, Zero Surprises',
            narrative: [
              'You walk into the 9:30 AM standup ahead of schedule with a verified one-page ledger. Finance catches the unapproved discount before it reaches Acme, and Logistics gets port clearance prioritized.',
              'Your team now has a battle-tested prompt pattern: Role + Structure + Grounding Constraint + Brevity Cap.',
            ],
            kind: 'ending',
            endingRank: {
              title: 'Chief Inbox Tactician',
              stampText: 'APPROVED FOR PROD',
              summary:
                'Completed Chapter 1 of ChatGPT for Your 9-to-5 by replacing vague summarization with verified, schema-driven triage.',
              badgeCode: 'JW-9TO5-CH1',
              nextChapterHint:
                'Unlock Chapter 2 ("The Executive Memo Compression") with a Gumroad book code or continue to the next playbook.',
            },
          },
        },
      },
      2: {
        book_id: 'book_9to5',
        book_slug: 'chatgpt-9-to-5',
        book_title: 'ChatGPT for Your 9-to-5',
        gumroad_url: GUMROAD_BASE,
        version: 2,
        chapter_num: 2,
        title: 'Chapter 2: The Executive Memo Compression',
        is_free: false,
        initial_hud: { trust: 70, minsLeft: 22, leverage: 45 },
        start_node_id: 'c2_n1',
        chapters_toc: [],
        nodes: {
          c2_n1: {
            id: 'c2_n1',
            stepLabel: 'Scene 01 of 03',
            title: 'The 14-Page Transcript Problem',
            narrative: [
              'A 75-minute cross-functional product review just wrapped. You have a raw 9,200-word transcript filled with crosstalk, tangents, and half-finished revenue estimates.',
              'Leadership expects a crisp 1-page decision memo by 4:00 PM—and nobody wants speculative numbers presented as quarterly forecasts.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'c2_c1',
                moveTitle: 'Two-Pass Extraction',
                riskRewardTag: 'HIGH LEVERAGE · +15 TRUST · -4 MINS',
                label: 'Run a two-pass prompt: Pass 1 extracts verified decisions + quoted metrics; Pass 2 drafts the 1-page memo strictly from Pass 1.',
                tacticTag: 'Two-Pass',
                nextNodeId: 'c2_boss',
                xpDelta: 40,
                hudDelta: { trust: 15, mins: -4, leverage: 25 },
                skillDelta: { context: 12, verification: 14 },
                consequence:
                  'Isolating extraction from prose writing eliminates 90% of transcript compression hallucinations.',
                terminalPreview: {
                  promptSent:
                    'Pass 1: Extract quoted decisions & metrics only. Pass 2: Draft <=350w memo strictly from Pass 1.',
                  tokenEfficiency: 92,
                  simulatedOutput:
                    'DECISION: Q3 launch shifted to Oct 14 (Speaker: Maya). METRIC: "$180k pipeline [TENTATIVE]".',
                  bossReaction:
                    'Chief of Staff: "Clean separation. Zero rounded estimates."',
                },
              },
              {
                id: 'c2_c2',
                moveTitle: 'Single-Shot Compression',
                riskRewardTag: 'MEDIUM RISK · +2 TRUST · -3 MINS',
                label: 'Ask for a "punchy executive memo with exact KPIs" in a single shot.',
                tacticTag: 'Single Shot',
                nextNodeId: 'c2_boss',
                xpDelta: 15,
                hudDelta: { trust: 2, mins: -3, leverage: 8 },
                skillDelta: { clarity: 6 },
                consequence:
                  'Fast, but single-shot compression tends to round tentative estimates into hard commitments.',
                terminalPreview: {
                  promptSent: 'Turn this 9,200-word transcript into a punchy executive memo with KPIs.',
                  tokenEfficiency: 55,
                  simulatedOutput:
                    'Executive Memo: Revenue forecast locked at $200k with Q3 launch confirmed...',
                  bossReaction:
                    'Finance Lead: "Where did $200k come from? We only floated $180k as a rough range."',
                },
              },
            ],
          },
          c2_boss: {
            id: 'c2_boss',
            stepLabel: 'Scene 02 of 03 · Live Prompt Duel',
            title: 'Transcript-to-Decision Memo Prompt',
            narrative: [
              'Craft the production prompt that turns a noisy meeting transcript into an executive decision memo with explicit confidence tags on every number.',
            ],
            kind: 'prompt_boss',
            promptChallenge: {
              id: 'boss_9to5_ch2',
              title: 'Decision Memo Compressor',
              roleBrief: 'Convert a raw 75-minute meeting transcript into a 1-page leadership decision memo.',
              inputContext: '[Placeholder: Raw multi-speaker meeting transcript with tentative estimates and open debates]',
              constraints: [
                'Separate Confirmed Decisions, Open Debates, and Next Actions with owners',
                'Require every metric or date to carry a source quote or [TENTATIVE] tag',
                'Enforce a strict 350-word ceiling for 1-page readability',
                'Forbid filler introductions',
              ],
              liveChecks: [
                {
                  id: 'chk_role',
                  label: 'Role & Executive Audience Defined',
                  pattern: '(chief of staff|analyst|executive|leadership|you are|act as)',
                },
                {
                  id: 'chk_format',
                  label: 'Three-Section Format Locked',
                  pattern: '(decision|debate|action|section|owner|date)',
                },
                {
                  id: 'chk_guard',
                  label: 'Metric Grounding & Word Cap',
                  pattern: '(quote|tentative|estimate|350|word|preamble|filler|never)',
                },
              ],
              starterPrompt:
                'You are a Chief of Staff distilling a raw meeting transcript into a 1-page decision memo for executives. Output three sections only: Decisions Locked, Unresolved Debates, and Assigned Actions (Owner + Date). Every figure or date must include a brief speaker quote or be labeled [TENTATIVE]. Skip preamble and keep the entire memo under 350 words.',
              rubricFocus: [
                'Decision-first structural layout',
                'Metric grounding / tentative tagging',
                'Hard word/length budget',
                'Negative constraint against corporate filler',
              ],
              passingScore: 72,
              passNextNodeId: 'c2_end',
              retryHint:
                'Add an explicit rule requiring numbers to be quoted or tagged [TENTATIVE], and set a firm word limit.',
              xpReward: 90,
            },
          },
          c2_end: {
            id: 'c2_end',
            stepLabel: 'Chapter Complete',
            title: 'Decision Memo Approved in One Read',
            narrative: [
              'Your leadership team reads the memo in 90 seconds, confirms two tentative numbers, and signs off without a follow-up meeting.',
            ],
            kind: 'ending',
            endingRank: {
              title: 'Executive Signal Editor',
              stampText: 'PROMOTED',
              summary: 'Mastered two-pass transcript compression and grounded metric reporting.',
              badgeCode: 'JW-9TO5-CH2',
              nextChapterHint: 'Test advanced prompt chaining in AI Workflow Architect.',
            },
          },
        },
      },
    },
  },
  {
    summary: {
      id: 'book_architect',
      slug: 'ai-workflow-architect',
      title: 'AI Workflow Architect',
      subtitle:
        'Replace brittle mega-prompts with deterministic multi-step chains, JSON contracts, and human-in-the-loop gates.',
      gumroad_url: GUMROAD_BASE,
      cover_thumb_url: '/src/assets/images/cover_workflow_architect_1795151502421.jpg',
      total_chapters: 3,
      free_chapters: 1,
      est_minutes: 20,
      difficulty: 'Systems Builder',
      category: 'Automation & Chains',
      version: 2,
    },
    chaptersToc: [
      {
        chapter_num: 1,
        title: 'Chapter 1: Breaking the 4-Hour Weekly Report',
        is_free: true,
        est_minutes: 7,
        summary: 'Decompose a fragile 900-word mega-prompt into a 3-stage pipeline with typed handoffs.',
      },
      {
        chapter_num: 2,
        title: 'Chapter 2: Designing Human-in-the-Loop Gates',
        is_free: false,
        est_minutes: 7,
        summary: 'Insert confidence thresholds and escalation rules so automation fails loudly, never silently.',
      },
      {
        chapter_num: 3,
        title: 'Chapter 3: Zero-Drift Classification Pipelines',
        is_free: false,
        est_minutes: 6,
        summary: 'Lock down schema enums and edge-case routing for support and ops queues.',
      },
    ],
    chapters: {
      1: {
        book_id: 'book_architect',
        book_slug: 'ai-workflow-architect',
        book_title: 'AI Workflow Architect',
        gumroad_url: GUMROAD_BASE,
        version: 2,
        chapter_num: 1,
        title: 'Chapter 1: Breaking the 4-Hour Weekly Report',
        is_free: true,
        initial_hud: { trust: 60, minsLeft: 20, leverage: 35 },
        start_node_id: 'wa_n1',
        chapters_toc: [],
        nodes: {
          wa_n1: {
            id: 'wa_n1',
            stepLabel: 'Scene 01 of 04',
            title: 'The Brittle Mega-Prompt',
            narrative: [
              'Every Friday, your team spends four hours assembling a customer health report from support tickets, billing exports, and NPS comments.',
              'Someone tried stuffing all three raw files plus 18 formatting rules into a single 900-word prompt. Half the time it drops the churn risk section or invents ticket counts.',
            ],
            callout: {
              label: 'Architecture Rule · Single Responsibility Prompts',
              body: 'When one prompt extracts, calculates, classifies, and writes prose simultaneously, attention dilutes across constraints.',
            },
            kind: 'choice',
            choices: [
              {
                id: 'wa_c_chain',
                moveTitle: 'Hybrid 3-Stage Pipeline',
                riskRewardTag: 'HIGH LEVERAGE · +18 TRUST · -3 MINS',
                label: 'Split into 3 stages: 1) Code aggregates exact counts, 2) AI classifies themes into strict JSON, 3) AI writes brief from validated JSON.',
                tacticTag: 'Deterministic + LLM',
                nextNodeId: 'wa_n2_hybrid',
                xpDelta: 40,
                hudDelta: { trust: 18, mins: -3, leverage: 28 },
                skillDelta: { constraint: 14, context: 10, verification: 10 },
                consequence:
                  'Gold standard. Letting deterministic logic handle math while the LLM handles semantic tagging removes arithmetic errors entirely.',
                terminalPreview: {
                  promptSent:
                    'Stage 1 (Script): Compute ARR totals. Stage 2 (LLM): Emit strict JSON theme tags.',
                  tokenEfficiency: 94,
                  simulatedOutput:
                    '{ "total_arr_at_risk": 148000, "themes": [{ "category": "Reliability", "count": 11 }] }',
                  bossReaction:
                    'Engineering Lead: "Zero math drift. Now lock down the Stage-2 ambiguity policy."',
                },
              },
              {
                id: 'wa_c_longer',
                moveTitle: 'Prompt Shouting Escalation',
                riskRewardTag: 'HIGH RISK · -8 TRUST · -5 MINS',
                label: 'Keep one prompt, add ALL CAPS warnings ("NEVER FORGET CHURN RISK!"), and repeat the rules twice.',
                tacticTag: 'Mega-Prompt',
                nextNodeId: 'wa_n2_shouting',
                xpDelta: 10,
                hudDelta: { trust: -8, mins: -5, leverage: 2 },
                skillDelta: { clarity: 2 },
                consequence:
                  'Shouting in all-caps adds token noise without solving cognitive overload or math drift.',
                terminalPreview: {
                  promptSent: 'CRITICAL RULE: NEVER FORGET CHURN RISK OR MISCOUNT TICKETS!!!',
                  tokenEfficiency: 38,
                  simulatedOutput:
                    'Summary: ~14 tickets flagged (actual count in CSV: 19). Churn section omitted due to token focus.',
                  bossReaction:
                    'Head of CS: "Still dropping rows. We have to split classification from counting."',
                },
              },
              {
                id: 'wa_c_examples',
                moveTitle: 'Input Row Truncation',
                riskRewardTag: 'HIGH RISK · -10 TRUST · -4 MINS',
                label: 'Shrink the input by truncating support tickets to the first 10 rows so it fits cleanly.',
                tacticTag: 'Truncation',
                nextNodeId: 'wa_n2_shouting',
                xpDelta: 10,
                hudDelta: { trust: -10, mins: -4, leverage: 0 },
                skillDelta: { context: 2 },
                consequence:
                  'Silent bias: enterprise churn signals in rows 11–80 vanished completely.',
                terminalPreview: {
                  promptSent: 'Process tickets[0..10] and generate full account health scorecard.',
                  tokenEfficiency: 45,
                  simulatedOutput:
                    'All accounts healthy! (Rows 11-80 containing 3 enterprise outages were never read.)',
                  bossReaction:
                    'VP CS: "Why did this miss our $90k churn alert in row 34?!"',
                },
              },
            ],
          },
          wa_n2_hybrid: {
            id: 'wa_n2_hybrid',
            stepLabel: 'Scene 02 of 04',
            title: 'Designing the Stage-2 JSON Contract',
            narrative: [
              'Stage 1 now computes exact ticket totals and ARR exposure reliably in code. Now Stage 2 receives batches of raw customer feedback and must emit structured JSON for Stage 3.',
              'What happens when a ticket is ambiguous or contains sarcastic praise?',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'wa_c_unknown',
                moveTitle: 'Graceful Review Gate',
                riskRewardTag: 'LOW RISK · +15 TRUST · -2 MINS',
                label: 'Include an explicit "needs_human_review" boolean and "confidence" enum (high/medium/low) in the JSON schema.',
                tacticTag: 'Escalation Gate',
                nextNodeId: 'wa_n3_boss',
                xpDelta: 35,
                hudDelta: { trust: 15, mins: -2, leverage: 22 },
                skillDelta: { verification: 14, constraint: 10 },
                consequence:
                  'Clean fault boundary. Ambiguous accounts route to a 2-minute human review instead of corrupting executive metrics.',
                terminalPreview: {
                  promptSent:
                    'Return JSON with confidence enum + needs_human_review boolean for sarcasm/ambiguity.',
                  tokenEfficiency: 93,
                  simulatedOutput:
                    '{ "account": "Northstar", "confidence": "low", "needs_human_review": true }',
                  bossReaction:
                    'VP CS: "Love that it fails loudly. Write the Stage-2 production prompt."',
                },
              },
              {
                id: 'wa_c_force',
                moveTitle: 'Forced Binary Classifier',
                riskRewardTag: 'MEDIUM RISK · -4 TRUST · -3 MINS',
                label: 'Force the model to pick either "Happy" or "Churn Risk" with no neutral or review state.',
                tacticTag: 'Forced Binary',
                nextNodeId: 'wa_n3_boss',
                xpDelta: 12,
                hudDelta: { trust: -4, mins: -3, leverage: 5 },
                skillDelta: { constraint: 4 },
                consequence:
                  'Forcing binary classification creates false alarms and erodes stakeholder trust within two weeks.',
                terminalPreview: {
                  promptSent: 'Classify every ticket strictly as "Happy" or "Churn Risk". No other labels.',
                  tokenEfficiency: 62,
                  simulatedOutput:
                    '{ "account": "Northstar", "status": "Happy" } // Misread sarcastic complaint',
                  bossReaction:
                    'Ops Lead: "False positives are piling up. Add a human review fallback."',
                },
              },
            ],
          },
          wa_n2_shouting: {
            id: 'wa_n2_shouting',
            stepLabel: 'Scene 02 of 04',
            title: 'Silent Pipeline Failure',
            narrative: [
              'Testing on last Friday’s export confirms the single mega-prompt still miscounts billing escalations.',
              'You refactor Stage 2 into an isolated semantic classifier that outputs strict JSON with an explicit uncertainty flag.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'wa_c_refactor',
                moveTitle: 'Schema Isolation Refactor',
                riskRewardTag: 'RECOVERY · +16 TRUST · -3 MINS',
                label: 'Isolate classification into a JSON-only step with strict allowed category enums and a review flag.',
                tacticTag: 'Schema Refactor',
                nextNodeId: 'wa_n3_boss',
                xpDelta: 30,
                hudDelta: { trust: 16, mins: -3, leverage: 24 },
                skillDelta: { constraint: 12, verification: 10 },
                consequence:
                  'Much stronger. Separating semantic classification from narrative formatting stabilizes downstream outputs.',
                terminalPreview: {
                  promptSent: 'Refactor Stage 2: JSON-only output, closed enum categories, needs_human_review flag.',
                  tokenEfficiency: 89,
                  simulatedOutput:
                    '{ "items": [{ "category": "Reliability", "needs_human_review": false }] }',
                  bossReaction:
                    'Engineering Lead: "Clean contract. Lock in the Stage-2 classifier prompt."',
                },
              },
            ],
          },
          wa_n3_boss: {
            id: 'wa_n3_boss',
            stepLabel: 'Scene 03 of 04 · Live Prompt Duel',
            title: 'Write the Stage-2 JSON Classifier Prompt',
            narrative: [
              'Write the production system prompt for Stage 2 of your pipeline. It takes raw customer feedback items and outputs strictly valid JSON ready for Stage 3.',
            ],
            kind: 'prompt_boss',
            promptChallenge: {
              id: 'boss_arch_ch1',
              title: 'Stage-2 Semantic Classifier Contract',
              roleBrief:
                'Specify a deterministic JSON-emitting prompt for classifying customer health signals.',
              inputContext:
                '[Placeholder: Batch of support ticket excerpts + NPS verbatim comments + exact ARR from Stage 1]',
              constraints: [
                'Require JSON-only output with an explicit schema (category, severity/risk_level, evidence_quote, needs_human_review)',
                'Constrain categories to a fixed enum list',
                'Mandate verbatim evidence quotes from the input',
                'Define human-review fallback when intent is ambiguous',
              ],
              liveChecks: [
                {
                  id: 'chk_role',
                  label: 'Stage-2 Classifier Role & Enum Defined',
                  pattern: '(stage 2|classifier|classify|billing|reliability|onboarding|enum)',
                },
                {
                  id: 'chk_format',
                  label: 'Strict JSON Schema Locked',
                  pattern: '(json|only|evidence_quote|needs_human_review|risk_level)',
                },
                {
                  id: 'chk_guard',
                  label: 'Verbatim Quote & Ambiguity Guardrail',
                  pattern: '(verbatim|ambiguous|missing|do not|other|true|human)',
                },
              ],
              starterPrompt:
                'You are Stage 2 of a customer health pipeline. Classify each input record and return ONLY valid JSON matching: { "items": [{ "account": string, "category": "Billing"|"Reliability"|"Onboarding"|"Feature Gap"|"Other", "risk_level": "high"|"medium"|"low", "evidence_quote": string, "needs_human_review": boolean }] }. Rules: Do not calculate totals. Copy evidence_quote verbatim from the source text. If intent is ambiguous or text is missing, set needs_human_review to true and category to "Other".',
              rubricFocus: [
                'Strict JSON-only contract & named fields',
                'Closed enum category constraint',
                'Verbatim evidence grounding',
                'Explicit ambiguity / human-review fallback',
              ],
              passingScore: 72,
              passNextNodeId: 'wa_n4_end',
              retryHint:
                'Make sure your prompt specifies exact JSON keys, closed category enums, verbatim evidence quotes, and an explicit fallback when feedback is ambiguous.',
              xpReward: 85,
            },
          },
          wa_n4_end: {
            id: 'wa_n4_end',
            stepLabel: 'Chapter Complete',
            title: '4 Hours Reduced to 6 Minutes',
            narrative: [
              'Your Friday report now runs reliably across 120 accounts. Deterministic scripts count the numbers, Stage 2 classifies themes with quoted proof, and humans only inspect flagged edge cases.',
            ],
            kind: 'ending',
            endingRank: {
              title: 'Pipeline Systems Architect',
              stampText: 'APPROVED FOR PROD',
              summary:
                'Replaced brittle mega-prompts with typed JSON contracts, verbatim evidence, and human-in-the-loop escalation.',
              badgeCode: 'JW-ARCH-CH1',
              nextChapterHint:
                'Unlock Chapter 2 ("Designing Human-in-the-Loop Gates") with a Gumroad unlock code.',
            },
          },
        },
      },
      2: {
        book_id: 'book_architect',
        book_slug: 'ai-workflow-architect',
        book_title: 'AI Workflow Architect',
        gumroad_url: GUMROAD_BASE,
        version: 2,
        chapter_num: 2,
        title: 'Chapter 2: Designing Human-in-the-Loop Gates',
        is_free: false,
        initial_hud: { trust: 68, minsLeft: 18, leverage: 45 },
        start_node_id: 'wa2_n1',
        chapters_toc: [],
        nodes: {
          wa2_n1: {
            id: 'wa2_n1',
            stepLabel: 'Scene 01 of 03',
            title: 'The Silent Auto-Send Incident',
            narrative: [
              'Your automated refund-triage workflow accidentally issued two $1,400 credits because the model misread sarcastic praise as a valid SLA claim.',
              'You need a confidence gate and policy checklist before any financial action executes.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'wa2_c1',
                moveTitle: 'Dollar + Sarcasm Policy Gate',
                riskRewardTag: 'LOW RISK · +16 TRUST · -3 MINS',
                label: 'Add a Policy Gate prompt that outputs a structured pass/fail checklist and routes anything above $250 or low-confidence to a human queue.',
                tacticTag: 'Threshold Gate',
                nextNodeId: 'wa2_boss',
                xpDelta: 40,
                hudDelta: { trust: 16, mins: -3, leverage: 25 },
                skillDelta: { verification: 15, constraint: 12 },
                consequence:
                  'Hard dollar thresholds paired with policy checklist verification stop silent financial leaks.',
                terminalPreview: {
                  promptSent:
                    'Evaluate refund vs policy. Route >$250 or ambiguous/sarcastic intent to escalate_human.',
                  tokenEfficiency: 92,
                  simulatedOutput:
                    '{ "decision": "escalate_human", "reason": "Credit $1,400 exceeds $250 auto-approve limit" }',
                  bossReaction:
                    'Finance Controller: "Exactly the guardrail we needed. Finalize the gatekeeper prompt."',
                },
              },
            ],
          },
          wa2_boss: {
            id: 'wa2_boss',
            stepLabel: 'Scene 02 of 03 · Live Prompt Duel',
            title: 'Policy Gatekeeper Prompt',
            narrative: [
              'Write the gatekeeper prompt that evaluates a draft refund recommendation against company policy before execution.',
            ],
            kind: 'prompt_boss',
            promptChallenge: {
              id: 'boss_arch_ch2',
              title: 'Financial Policy Gatekeeper',
              roleBrief: 'Audit an automated refund recommendation against policy thresholds.',
              inputContext: '[Placeholder: Customer ticket + proposed credit amount + account tier]',
              constraints: [
                'Output JSON with decision ("approve" | "escalate_human" | "reject") and policy_checks array',
                'Mandate human escalation for any credit > $250 or sarcastic/unclear intent',
                'Require exact policy rule citation for the decision',
              ],
              liveChecks: [
                {
                  id: 'chk_role',
                  label: 'Compliance Gatekeeper Role Defined',
                  pattern: '(gatekeeper|compliance|billing|audit|you are|act as)',
                },
                {
                  id: 'chk_format',
                  label: 'JSON Decision Enum Locked',
                  pattern: '(json|approve|escalate_human|reject|policy_checks)',
                },
                {
                  id: 'chk_guard',
                  label: '$250 Threshold & Sarcasm Guardrail',
                  pattern: '(250|sarcas|ambiguous|confidence|cite)',
                },
              ],
              starterPrompt:
                'You are a billing compliance gatekeeper. Evaluate the proposed refund against policy and return JSON only: { "decision": "approve"|"escalate_human"|"reject", "confidence": "high"|"medium"|"low", "policy_checks": string[], "reason": string }. Rules: Automatically return "escalate_human" if credit_amount > 250, intent appears sarcastic/ambiguous, or confidence is not "high". Cite the exact policy check.',
              rubricFocus: [
                'Clear decision enum with human escalation path',
                'Explicit monetary and ambiguity thresholds',
                'Structured JSON audit trail',
              ],
              passingScore: 72,
              passNextNodeId: 'wa2_end',
              retryHint: 'Specify the exact JSON decision enum and hard escalation rules for > $250 or ambiguity.',
              xpReward: 95,
            },
          },
          wa2_end: {
            id: 'wa2_end',
            stepLabel: 'Chapter Complete',
            title: 'Zero Unaudited Payouts',
            narrative: [
              'False positives are caught at the gate in milliseconds while routine $25 credits continue flowing smoothly.',
            ],
            kind: 'ending',
            endingRank: {
              title: 'Fail-Safe Gatekeeper',
              stampText: 'PROMOTED',
              summary: 'Built verifiable human-in-the-loop checkpoints into high-stakes workflows.',
              badgeCode: 'JW-ARCH-CH2',
              nextChapterHint: 'Explore few-shot calibration in Prompt Engineering Field Manual.',
            },
          },
        },
      },
    },
  },
  {
    summary: {
      id: 'book_manual',
      slug: 'prompt-engineering-manual',
      title: 'Prompt Engineering Field Manual',
      subtitle:
        'Eliminate generic AI voice using calibrated few-shot pairs, negative style boundaries, and self-critique loops.',
      gumroad_url: GUMROAD_BASE,
      cover_thumb_url: '/src/assets/images/cover_prompt_manual_1795151502532.jpg',
      total_chapters: 3,
      free_chapters: 1,
      est_minutes: 18,
      difficulty: 'All Levels',
      category: 'Prompt Craft',
      version: 2,
    },
    chaptersToc: [
      {
        chapter_num: 1,
        title: 'Chapter 1: Killing Generic AI Proposal Fluff',
        is_free: true,
        est_minutes: 6,
        summary: 'Use 2-shot style anchors and negative constraints to match a sharp human consultant voice.',
      },
      {
        chapter_num: 2,
        title: 'Chapter 2: Chain-of-Critique Calibration',
        is_free: false,
        est_minutes: 6,
        summary: 'Make the model score and revise its own draft against reader objections before showing you.',
      },
      {
        chapter_num: 3,
        title: 'Chapter 3: Reusable System Templates',
        is_free: false,
        est_minutes: 6,
        summary: 'Parameterize prompts with clean {{variables}} for team-wide consistency.',
      },
    ],
    chapters: {
      1: {
        book_id: 'book_manual',
        book_slug: 'prompt-engineering-manual',
        book_title: 'Prompt Engineering Field Manual',
        gumroad_url: GUMROAD_BASE,
        version: 2,
        chapter_num: 1,
        title: 'Chapter 1: Killing Generic AI Proposal Fluff',
        is_free: true,
        initial_hud: { trust: 62, minsLeft: 16, leverage: 40 },
        start_node_id: 'pm_n1',
        chapters_toc: [],
        nodes: {
          pm_n1: {
            id: 'pm_n1',
            stepLabel: 'Scene 01 of 04',
            title: 'The "Unlock Synergy" Embarrassment',
            narrative: [
              'A junior consultant just handed you an AI-drafted client proposal opening with: "In today’s rapidly evolving digital landscape, unlocking seamless synergy is paramount..."',
              'Your client—a manufacturing CFO—will delete that email in four seconds. How do you fix the prompt that generated it?',
            ],
            callout: {
              label: 'Craft Principle · Show Over Adjectives',
              body: 'Adjectives like "professional and engaging" trigger generic clichés. Two concrete 3-line examples plus a banned-phrases list lock tone immediately.',
            },
            kind: 'choice',
            choices: [
              {
                id: 'pm_c_fewshot',
                moveTitle: 'Few-Shot + Negative Boundary',
                riskRewardTag: 'HIGH LEVERAGE · +16 TRUST · -2 MINS',
                label: 'Provide 2 short before/after writing samples from your real past proposals + a strict banned-cliché list.',
                tacticTag: 'Few-Shot Anchor',
                nextNodeId: 'pm_n2_calibration',
                xpDelta: 35,
                hudDelta: { trust: 16, mins: -2, leverage: 25 },
                skillDelta: { clarity: 12, constraint: 12, context: 8 },
                consequence:
                  'Precision tone lock. Real examples communicate sentence rhythm and cadence better than ten adjectives.',
                terminalPreview: {
                  promptSent:
                    'Match Sample A cadence. Ban: landscape, synergy, leverage, unlock, seamless.',
                  tokenEfficiency: 90,
                  simulatedOutput:
                    'Your Dayton plant loses 14 hrs/week to manual order re-entry. We cut that to 2 hrs in six weeks.',
                  bossReaction:
                    'Managing Partner: "Sounds like us. Now verify the payback numbers aren’t fabricated."',
                },
              },
              {
                id: 'pm_c_adjectives',
                moveTitle: 'Adjective Stacking',
                riskRewardTag: 'HIGH RISK · -6 TRUST · -4 MINS',
                label: 'Tell the model: "Write like a punchy, world-class McKinsey partner. Be super authentic and crisp."',
                tacticTag: 'Adjective Stack',
                nextNodeId: 'pm_n2_drift',
                xpDelta: 10,
                hudDelta: { trust: -6, mins: -4, leverage: 2 },
                skillDelta: { clarity: 3 },
                consequence:
                  'Still produces buzzword soup—"world-class" actually amplifies formal corporate clichés.',
                terminalPreview: {
                  promptSent: 'Write like a world-class McKinsey partner. Be super crisp and authentic.',
                  tokenEfficiency: 40,
                  simulatedOutput:
                    'Leveraging best-in-class digital transformation paradigms will drive transformative synergy...',
                  bossReaction:
                    'Managing Partner: "Still unusable fluff. Drop the adjectives and give real examples."',
                },
              },
            ],
          },
          pm_n2_calibration: {
            id: 'pm_n2_calibration',
            stepLabel: 'Scene 02 of 04',
            title: 'Calibrating the CFO Lens',
            narrative: [
              'The voice is sharp now—concrete verbs, short sentences, zero fluff. Next, you need the proposal to anticipate the CFO’s toughest objection: payback timeline.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'pm_c_objection',
                moveTitle: 'Placeholder Discipline',
                riskRewardTag: 'LOW RISK · +14 TRUST · -2 MINS',
                label: 'Require a "Payback & Risk" section written at an 8th-grade reading level with concrete numbers or [INSERT METRIC] placeholders.',
                tacticTag: 'Placeholder Rule',
                nextNodeId: 'pm_n3_boss',
                xpDelta: 35,
                hudDelta: { trust: 14, mins: -2, leverage: 20 },
                skillDelta: { verification: 12, clarity: 10 },
                consequence:
                  'Placeholder discipline prevents the model from inventing fake ROI statistics to satisfy a persuasive prompt.',
                terminalPreview: {
                  promptSent:
                    'Add Payback & Risk section. Never invent ROI numbers—emit [INSERT VERIFIED METRIC].',
                  tokenEfficiency: 92,
                  simulatedOutput:
                    'Payback: Eliminates 12 hrs/week re-entry; verified dollar impact [INSERT VERIFIED METRIC].',
                  bossReaction:
                    'Managing Partner: "Zero invented numbers. Save this into our proposal prompt deck."',
                },
              },
              {
                id: 'pm_c_invent',
                moveTitle: 'Synthetic ROI Estimates',
                riskRewardTag: 'HIGH RISK · -10 TRUST · -3 MINS',
                label: 'Ask the model to estimate typical industry ROI percentages so the draft looks complete.',
                tacticTag: 'Synthetic Stats',
                nextNodeId: 'pm_n3_boss',
                xpDelta: 8,
                hudDelta: { trust: -10, mins: -3, leverage: -4 },
                skillDelta: { context: 2 },
                consequence:
                  'Dangerous in front of a CFO—unverified percentages destroy credibility on the first call.',
                terminalPreview: {
                  promptSent: 'Estimate typical manufacturing ROI percentages so the proposal feels complete.',
                  tokenEfficiency: 48,
                  simulatedOutput: 'Projected 340% first-year ROI and $420,000 guaranteed savings...',
                  bossReaction:
                    'CFO Alert: "If an AI invented 340% ROI, the client will reject us in 10 seconds."',
                },
              },
            ],
          },
          pm_n2_drift: {
            id: 'pm_n2_drift',
            stepLabel: 'Scene 02 of 04',
            title: 'Buzzwords Reloaded',
            narrative: [
              'The revised draft still opens with "Leveraging cutting-edge paradigms..." because the model had no concrete sample of your actual plain-English style.',
              'Time to replace adjectives with real few-shot anchors and explicit negative constraints.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'pm_c_anchor',
                moveTitle: 'Style Anchor Reset',
                riskRewardTag: 'RECOVERY · +16 TRUST · -2 MINS',
                label: 'Add a 2-sentence style anchor + ban clichés ("delve", "landscape", "leverage", "synergy") + require [INSERT DATA] tags.',
                tacticTag: 'Style Anchor',
                nextNodeId: 'pm_n3_boss',
                xpDelta: 30,
                hudDelta: { trust: 16, mins: -2, leverage: 24 },
                skillDelta: { constraint: 14, clarity: 8 },
                consequence:
                  'Night-and-day difference. Banning top clichés plus anchoring sentence length snaps the prose into focus.',
                terminalPreview: {
                  promptSent: 'Use 2-sentence sample + ban clichés + insert [INSERT DATA] for missing numbers.',
                  tokenEfficiency: 88,
                  simulatedOutput:
                    'Your Dayton plant loses 14 hrs/week. Projected savings: [INSERT DATA].',
                  bossReaction: 'Partner: "Much sharper. Lock this into the final Boss Challenge."',
                },
              },
            ],
          },
          pm_n3_boss: {
            id: 'pm_n3_boss',
            stepLabel: 'Scene 03 of 04 · Live Prompt Duel',
            title: 'Craft the Zero-Fluff Proposal Prompt',
            narrative: [
              'Write a complete prompt that drafts a 150-word cold executive proposal for a manufacturing CFO—using voice constraints, negative cliché bans, and placeholder discipline.',
            ],
            kind: 'prompt_boss',
            promptChallenge: {
              id: 'boss_manual_ch1',
              title: 'Zero-Fluff CFO Proposal Prompt',
              roleBrief:
                'Draft a direct, plain-English proposal intro tailored for a skeptical manufacturing CFO.',
              inputContext:
                '[Placeholder: Engagement scope + client plant bottleneck + verified cost baseline]',
              constraints: [
                'Include a concrete style instruction or mini sample (short active sentences)',
                'Explicitly ban AI clichés (landscape, synergy, delve, leverage, seamless)',
                'Mandate [INSERT METRIC] placeholders instead of invented ROI numbers',
                'Enforce a strict length cap (under 150 words)',
              ],
              liveChecks: [
                {
                  id: 'chk_role',
                  label: 'CFO Audience & Style Sample Defined',
                  pattern: '(cfo|manufacturing|sample|short|active|plain)',
                },
                {
                  id: 'chk_format',
                  label: 'Word Cap & Banned Clichés Locked',
                  pattern: '(ban|landscape|synergy|leverage|150|word|max)',
                },
                {
                  id: 'chk_guard',
                  label: 'Placeholder Metric Guardrail',
                  pattern: '(insert|placeholder|never invent|verified metric)',
                },
              ],
              starterPrompt:
                'Write a direct proposal opening for a manufacturing CFO. Style sample: "Your Dayton plant loses 14 hours a week to manual order re-entry. We can cut that to 2 hours in six weeks." Rules: 1) Short active sentences, max 150 words. 2) Ban clichés: landscape, synergy, leverage, seamless, unlock, delve. 3) Never invent savings figures—use [INSERT VERIFIED METRIC] wherever client numbers are missing.',
              rubricFocus: [
                'Concrete style sample or rhythmic constraint',
                'Explicit negative banned-words list',
                'Placeholder rule against fabricated ROI',
                'Tight word-count ceiling',
              ],
              passingScore: 70,
              passNextNodeId: 'pm_n4_end',
              retryHint:
                'Add an explicit banned-cliché list, a short style sample or sentence rule, and a placeholder rule so no fake ROI numbers are invented.',
              xpReward: 80,
            },
          },
          pm_n4_end: {
            id: 'pm_n4_end',
            stepLabel: 'Chapter Complete',
            title: 'Reply Received in 11 Minutes',
            narrative: [
              'No fluff, no invented savings, and straight to the operational bottleneck. The CFO replies: "Clear and specific. Let’s review Tuesday at 10."',
            ],
            kind: 'ending',
            endingRank: {
              title: 'Precision Voice Crafter',
              stampText: 'APPROVED FOR PROD',
              summary:
                'Eliminated generic AI prose with few-shot cadence anchors, negative cliché bans, and placeholder discipline.',
              badgeCode: 'JW-MAN-CH1',
              nextChapterHint:
                'Unlock Chapter 2 ("Chain-of-Critique Calibration") with a Gumroad license code.',
            },
          },
        },
      },
      2: {
        book_id: 'book_manual',
        book_slug: 'prompt-engineering-manual',
        book_title: 'Prompt Engineering Field Manual',
        gumroad_url: GUMROAD_BASE,
        version: 2,
        chapter_num: 2,
        title: 'Chapter 2: Chain-of-Critique Calibration',
        is_free: false,
        initial_hud: { trust: 68, minsLeft: 18, leverage: 45 },
        start_node_id: 'pm2_n1',
        chapters_toc: [],
        nodes: {
          pm2_n1: {
            id: 'pm2_n1',
            stepLabel: 'Scene 01 of 03',
            title: 'Self-Critique Before Output',
            narrative: [
              'Even good first drafts miss subtle buyer objections. Instead of manually editing every draft, you can instruct the model to critique its own draft once before emitting the final version.',
            ],
            kind: 'choice',
            choices: [
              {
                id: 'pm2_c1',
                moveTitle: '3-Step Skeptic Critique Loop',
                riskRewardTag: 'HIGH LEVERAGE · +15 TRUST · -2 MINS',
                label: 'Build a 3-step internal loop: Draft -> Critique against 3 skeptic questions -> Emit revised final only.',
                tacticTag: 'Self-Critique',
                nextNodeId: 'pm2_boss',
                xpDelta: 40,
                hudDelta: { trust: 15, mins: -2, leverage: 24 },
                skillDelta: { verification: 12, clarity: 10 },
                consequence:
                  'Requiring a targeted critique against concrete skeptic questions noticeably sharpens final arguments.',
                terminalPreview: {
                  promptSent: 'Draft -> Audit against 3 skeptic tests -> Output Final Copy + 2-bullet audit.',
                  tokenEfficiency: 91,
                  simulatedOutput:
                    'Final Copy: Cuts QA triage by 35 mins/day. Changes Made: Replaced generic claims with workflow times.',
                  bossReaction: 'Editor: "Tight and defensible. Finalize the critique prompt."',
                },
              },
            ],
          },
          pm2_boss: {
            id: 'pm2_boss',
            stepLabel: 'Scene 02 of 03 · Live Prompt Duel',
            title: 'Critique-and-Revise Prompt',
            narrative: [
              'Write a prompt that forces a self-critique pass against skeptical buyer questions before outputting the clean final copy.',
            ],
            kind: 'prompt_boss',
            promptChallenge: {
              id: 'boss_manual_ch2',
              title: 'Skeptic-Tested Self-Critique',
              roleBrief: 'Generate a final product pitch only after passing a structured skeptic audit.',
              inputContext: '[Placeholder: Draft feature announcement + target buyer persona]',
              constraints: [
                'Define 2–3 concrete critique checks (vague claim check, proof check)',
                'Instruct the model to revise and output ONLY Final Copy + Changes Made',
                'Cap final copy at 140 words',
              ],
              liveChecks: [
                {
                  id: 'chk_role',
                  label: 'Buyer Persona & Word Cap Set',
                  pattern: '(director|buyer|140|word)',
                },
                {
                  id: 'chk_format',
                  label: 'Self-Critique Tests Defined',
                  pattern: '(critique|test|1\\)|2\\)|workflow|percentage|buzzword)',
                },
                {
                  id: 'chk_guard',
                  label: 'Clean Final Output Separation',
                  pattern: '(only|final copy|changes made|fix)',
                },
              ],
              starterPrompt:
                'Draft a 140-word product update for IT Directors. Before finalizing, critique your draft against three tests: 1) Is every benefit tied to a concrete workflow? 2) Are there any unverified percentages? 3) Are any AI buzzwords present? Fix every failure, then output ONLY: Final Copy (<=140 words) and Changes Made (2 bullets).',
              rubricFocus: [
                'Explicit multi-point critique criteria',
                'Revision step tied to critique',
                'Clean final output separation & length cap',
              ],
              passingScore: 72,
              passNextNodeId: 'pm2_end',
              retryHint: 'Include concrete critique tests and specify what the final output should contain.',
              xpReward: 90,
            },
          },
          pm2_end: {
            id: 'pm2_end',
            stepLabel: 'Chapter Complete',
            title: 'First Drafts That Read Like Third Drafts',
            narrative: [
              'Your self-critique template cuts manual editing time in half across the entire marketing and sales desk.',
            ],
            kind: 'ending',
            endingRank: {
              title: 'Self-Critique Editor',
              stampText: 'PROMOTED',
              summary: 'Built verifiable critique-and-revise loops into daily writing prompts.',
              badgeCode: 'JW-MAN-CH2',
              nextChapterHint: 'Practice live streaming tests inside the Prompt Arena.',
            },
          },
        },
      },
    },
  },
];

export const UNLOCK_CODES: Record<string, { slugs: string[]; label: string }> = {
  WALKER9TO5: {
    slugs: ['chatgpt-9-to-5'],
    label: 'ChatGPT for Your 9-to-5 (Full Access)',
  },
  'ARCHITECT-KEY': {
    slugs: ['ai-workflow-architect'],
    label: 'AI Workflow Architect (Full Access)',
  },
  'ONLINEWORK-2026': {
    slugs: ['ai-for-online-work'],
    label: 'AI for Online Work — 2026 Interactive Edition (Full Access)',
  },
  'MANUAL-2026': {
    slugs: ['prompt-engineering-manual'],
    label: 'Prompt Engineering Field Manual (Full Access)',
  },
  'JAMESWALKER-PRO': {
    slugs: [
      'ai-for-online-work',
      'chatgpt-9-to-5',
      'ai-workflow-architect',
      'prompt-engineering-manual',
    ],
    label: 'Complete James Walker AI Vault',
  },
};

export const SANDBOX_PRESETS: SandboxPreset[] = [
  AI_FOR_ONLINE_WORK_PRESET,
  {
    id: 'arena_9to5',
    bookSlug: 'chatgpt-9-to-5',
    bookTitle: 'ChatGPT for Your 9-to-5',
    title: 'Monday Escalation Brief',
    scenario:
      'Summarize a chaotic client escalation thread for a VP before a 9:30 AM standup without inventing dates or hiding unapproved sales promises.',
    inputSample:
      'Email #1 (Sales, 8:05 AM): Told Acme Corp we might honor 12% off if they sign Friday.\nEmail #2 (Logistics, 8:14 AM): Port clearance not guaranteed until Thursday afternoon, Tuesday delivery is impossible.\nEmail #3 (Acme CFO, 8:31 AM): Unless we see a confirmed owner and realistic timeline by 12:00 PM today, we are pausing Q4 renewal.',
    constraints: [
      'Specify VP / Operations audience and structured sections',
      'Include an anti-hallucination rule (cite emails or mark [UNCONFIRMED])',
      'Highlight conflicting commitments explicitly',
      'Keep output concise (under 200 words)',
    ],
    starterPrompt:
      'Act as an Operations Analyst preparing a 9:30 AM brief for our VP. From the notes below, output:\n1) Situation Summary (max 2 sentences)\n2) Commitments & Owners Table\n3) Unresolved Conflicts / Unapproved Risks\nRules: Never invent missing dates or owners; tag unknowns [UNCONFIRMED] and cite Email # for each fact. Max 180 words.',
    rubricFocus: [
      'Role & executive audience framing',
      'Structured sections or table',
      'Explicit anti-hallucination & citation rule',
      'Length constraint',
    ],
  },
  {
    id: 'arena_arch',
    bookSlug: 'ai-workflow-architect',
    bookTitle: 'AI Workflow Architect',
    title: 'JSON Support Classifier',
    scenario:
      'Build a Stage-2 classifier that outputs strict JSON with closed enums, verbatim evidence, and a human-review flag for ambiguous tickets.',
    inputSample:
      'Ticket #408 ($48k ARR): "Great job breaking exports right before our board deck again. Should we even bother renewing?"\nTicket #409 ($12k ARR): "Quick question—where do I add a second billing contact?"',
    constraints: [
      'Enforce JSON-only output with named keys',
      'Restrict category to a closed enum list',
      'Require verbatim quote evidence from the ticket',
      'Flag sarcastic or ambiguous tickets for human review',
    ],
    starterPrompt:
      'Classify each support ticket and return ONLY valid JSON: { "tickets": [{ "id": string, "category": "Reliability"|"Billing"|"Onboarding"|"Other", "churn_risk": "high"|"medium"|"low", "evidence_quote": string, "needs_human_review": boolean }] }. Copy evidence_quote verbatim. Set needs_human_review=true if tone is sarcastic or risk is high.',
    rubricFocus: [
      'Strict JSON schema specification',
      'Closed category enums',
      'Verbatim evidence grounding',
      'Human-in-the-loop escalation rule',
    ],
  },
  {
    id: 'arena_manual',
    bookSlug: 'prompt-engineering-manual',
    bookTitle: 'Prompt Engineering Field Manual',
    title: 'Zero-Fluff CFO Outreach',
    scenario:
      'Rewrite a generic enterprise pitch into a sharp, plain-English 120-word note for a manufacturing CFO with zero clichés or invented ROI stats.',
    inputSample:
      'Client: Midwest Precision Parts (3 plants). Known bottleneck: 14 hrs/week manual ERP re-entry. Verified savings: not yet measured.',
    constraints: [
      'Provide a clear style rule or 2-sentence example',
      'Ban generic AI clichés (synergy, landscape, leverage, unlock)',
      'Mandate [INSERT METRIC] placeholders for unverified numbers',
      'Enforce a strict word cap (<= 130 words)',
    ],
    starterPrompt:
      'Write a 120-word email to a manufacturing CFO about eliminating 14 hours/week of manual ERP re-entry. Style: crisp, active verbs, plain English (like an internal ops memo). Banned words: landscape, synergy, leverage, seamless, unlock, delve. Never invent ROI percentages—insert [INSERT VERIFIED SAVINGS] where proof is needed.',
    rubricFocus: [
      'Concrete tone/style guidance',
      'Negative banned-cliché list',
      'Placeholder rule for missing metrics',
      'Word count ceiling',
    ],
  },
];

export function getProjectedBooks(): BookSummary[] {
  return BOOKS_STORE.map((b) => ({
    id: b.summary.id,
    slug: b.summary.slug,
    title: b.summary.title,
    subtitle: b.summary.subtitle,
    gumroad_url: b.summary.gumroad_url,
    cover_thumb_url: b.summary.cover_thumb_url,
    total_chapters: b.summary.total_chapters,
    free_chapters: b.summary.free_chapters,
    est_minutes: b.summary.est_minutes,
    difficulty: b.summary.difficulty,
    category: b.summary.category,
    version: b.summary.version,
  }));
}

export function getBookBundle(slug: string): BookBundleResponse | null {
  const found = BOOKS_STORE.find((b) => b.summary.slug === slug);
  if (!found) return null;
  const ch1 = found.chapters[1];
  return {
    book: { ...found.summary },
    chapters_toc: found.chaptersToc,
    initial_chapter: {
      ...ch1,
      chapters_toc: found.chaptersToc,
    },
  };
}

export function getChapterBundle(
  slug: string,
  chapterNum: number,
  unlockedBooks: string[] = [],
): { status: 200; data: ChapterBundle } | { status: 403 | 404; error: string; gumroad_url?: string } {
  const found = BOOKS_STORE.find((b) => b.summary.slug === slug);
  if (!found) {
    return { status: 404, error: `Playbook "${slug}" not found.` };
  }
  const chapter = found.chapters[chapterNum];
  if (!chapter) {
    return {
      status: 404,
      error: `Chapter ${chapterNum} is available in the full Gumroad edition.`,
      gumroad_url: found.summary.gumroad_url,
    };
  }
  const isUnlocked = chapter.is_free || unlockedBooks.includes(slug);
  if (!isUnlocked) {
    return {
      status: 403,
      error: `Chapter ${chapterNum} requires a Gumroad unlock code for "${found.summary.title}".`,
      gumroad_url: found.summary.gumroad_url,
    };
  }
  return {
    status: 200,
    data: {
      ...chapter,
      chapters_toc: found.chaptersToc,
    },
  };
}
