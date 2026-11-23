import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { EvaluationResult } from '../src/types/gamebook.ts';

let cachedClient: GoogleGenAI | null = null;

function getConfiguredApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw || raw === 'MY_GEMINI_API_KEY') return null;
  return raw;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

export interface EvaluateInput {
  promptText: string;
  challengeTitle: string;
  roleBrief: string;
  constraints: string[];
  rubricFocus: string[];
  passingScore: number;
  xpReward: number;
}

function deterministicFallbackEvaluation(input: EvaluateInput): EvaluationResult {
  const text = input.promptText.trim();
  const lower = text.toLowerCase();

  let score = 35;
  const misses: string[] = [];
  const hits: string[] = [];

  if (text.length >= 110) {
    score += 12;
    hits.push('Provides enough operational detail for consistent execution');
  } else {
    misses.push('Expand your instructions with explicit role, audience, and step expectations');
  }

  if (/(act as|you are|role|analyst|director|cfo|vp|gatekeeper|stage)/i.test(lower)) {
    score += 13;
    hits.push('Anchors persona and target audience');
  } else {
    misses.push('Define a clear AI role and target reader (e.g., "Act as an Operations Analyst briefing a VP")');
  }

  if (/(json|table|section|1\)|bullet|schema|format|only)/i.test(lower)) {
    score += 14;
    hits.push('Enforces a structured output contract');
  } else {
    misses.push('Specify an exact output format (numbered sections, markdown table, or strict JSON schema)');
  }

  if (/(do not|never|ban|avoid|unconfirmed|verbatim|cite|insert|escalate|human)/i.test(lower)) {
    score += 16;
    hits.push('Includes defensive constraints against hallucinations or clichés');
  } else {
    misses.push('Add an anti-hallucination or negative constraint (ban guessing, require [UNCONFIRMED] or verbatim quotes)');
  }

  if (/(word|max|under|limit|<=|sentence|concise|brief)/i.test(lower)) {
    score += 10;
    hits.push('Sets a clear length ceiling');
  } else {
    misses.push('Add a tight length budget (e.g., "under 180 words") to prevent rambling output');
  }

  const clamped = Math.max(0, Math.min(100, score));
  const passed = clamped >= input.passingScore;
  const stampLabel: EvaluationResult['stampLabel'] = !passed
    ? 'NEEDS REVISION'
    : clamped >= 88
      ? 'PROMOTED'
      : 'APPROVED FOR PROD';
  const improvements: [string, string] = [
    misses[0] ?? 'Test your prompt against a messy edge-case input to verify formatting holds.',
    misses[1] ?? 'Add one concrete miniature example to lock tone and cadence even tighter.',
  ];

  return {
    score: clamped,
    passed,
    verdict: passed ? 'Rubric Passed' : 'Revision Required',
    stampLabel,
    strengths:
      hits.length > 0
        ? hits.join('. ') + '.'
        : 'Prompt establishes a starting task direction.',
    improvements,
    mentorNote: passed
      ? 'Strong structural discipline. Ready for the next scenario branch.'
      : `Score ${clamped}/100 is below the ${input.passingScore} pass mark. Apply the two refinements above and resubmit.`,
    xpEarned: passed ? input.xpReward : 15,
    source: 'offline-rubric',
    model: 'deterministic-rubric-v1',
  };
}

export async function evaluatePromptChallenge(
  input: EvaluateInput,
): Promise<EvaluationResult> {
  const ai = getGenAIClient();
  if (!ai) {
    return deterministicFallbackEvaluation(input);
  }

  const systemInstruction = [
    'You are James Walker AI, a crisp, pragmatic prompt engineering mentor.',
    'Grade the user prompt strictly against the scenario constraints and rubric criteria.',
    'Be direct, fair, and concise—no fluff or generic praise.',
    'Return exactly 2 actionable, concrete bullet improvements in the improvements array.',
  ].join(' ');

  const evaluationPrompt = [
    `Challenge: ${input.challengeTitle}`,
    `Brief: ${input.roleBrief}`,
    `Constraints:\n- ${input.constraints.join('\n- ')}`,
    `Rubric Focus:\n- ${input.rubricFocus.join('\n- ')}`,
    `Passing Score Threshold: ${input.passingScore}/100`,
    '',
    'USER PROMPT SUBMISSION:',
    '"""',
    input.promptText,
    '"""',
  ].join('\n');

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: evaluationPrompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: {
                type: Type.INTEGER,
                description: 'Rubric score from 0 to 100 based strictly on constraint adherence.',
              },
              verdict: {
                type: Type.STRING,
                description: 'Short 2-3 word verdict such as "Rubric Passed" or "Needs Tighter Constraints".',
              },
              strengths: {
                type: Type.STRING,
                description: 'One concise sentence summarizing what the submitted prompt did well.',
              },
              improvements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 2 concrete, specific improvements the author should make.',
              },
              mentorNote: {
                type: Type.STRING,
                description: 'One crisp mentor takeaway sentence.',
              },
            },
            required: ['score', 'verdict', 'strengths', 'improvements', 'mentorNote'],
          },
        },
      });
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = /503|UNAVAILABLE|overloaded/i.test(msg);
      if (attempt === 0 && isTransient) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      throw err;
    }
  }

  const rawText = (response?.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as {
    score?: number;
    verdict?: string;
    strengths?: string;
    improvements?: string[];
    mentorNote?: string;
  };

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
  const passed = score >= input.passingScore;
  const stampLabel: EvaluationResult['stampLabel'] = !passed
    ? 'NEEDS REVISION'
    : score >= 88
      ? 'PROMOTED'
      : 'APPROVED FOR PROD';
  const impList = Array.isArray(parsed.improvements) ? parsed.improvements : [];
  const improvements: [string, string] = [
    impList[0] || 'Tighten explicit output schema constraints.',
    impList[1] || 'Add an anti-hallucination rule for missing facts.',
  ];

  return {
    score,
    passed,
    verdict: parsed.verdict || (passed ? 'Rubric Passed' : 'Revision Required'),
    stampLabel,
    strengths: parsed.strengths || 'Clear task intent established.',
    improvements,
    mentorNote:
      parsed.mentorNote ||
      (passed
        ? 'Prompt meets production standards for this workplace scenario.'
        : `Aim for at least ${input.passingScore}/100 to unlock the next branch.`),
    xpEarned: passed ? input.xpReward : 15,
    source: 'gemini',
    model: 'gemini-4-hydrogen',
  };
}

export async function streamSandboxPrompt(
  userPrompt: string,
  sampleInput: string,
  onChunk: (text: string) => void,
): Promise<{ usedFallback: boolean; model: string }> {
  const ai = getGenAIClient();
  if (!ai) {
    const simulated = [
      'Live Gemini streaming requires GEMINI_API_KEY in server environment secrets.',
      '',
      'To test rubric scoring offline, click "Score Against Rubric" — the deterministic evaluator works without a key.',
    ].join('\n');
    onChunk(simulated);
    return { usedFallback: true, model: 'offline-notice' };
  }

  const combinedContents = [
    'Follow the user prompt instructions strictly on the provided input sample.',
    '',
    'USER PROMPT:',
    userPrompt,
    '',
    'INPUT SAMPLE:',
    sampleInput,
  ].join('\n');

  const stream = await ai.models.generateContentStream({
    model: 'gemini-4-hydrogen',
    contents: combinedContents,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  for await (const chunk of stream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }

  return { usedFallback: false, model: 'gemini-4-hydrogen' };
}
