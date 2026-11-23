import { GoogleGenAI, type LiveServerMessage, Modality } from '@google/genai';
import type { IncomingMessage } from 'http';
import type { WebSocket, WebSocketServer } from 'ws';
import { getProjectedBooks } from './booksData.ts';

const ALLOWED_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir']);

function getConfiguredApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (!raw || raw === 'MY_GEMINI_API_KEY') return null;
  return raw;
}

function buildMentorInstruction(bookSlug: string, xp: number): string {
  const books = getProjectedBooks();
  const focusBook = books.find((b) => b.slug === bookSlug);
  const focusContext = focusBook
    ? `The reader is currently focusing on "${focusBook.title}" (${focusBook.category}): ${focusBook.subtitle}`
    : 'The reader is practicing across all three James Walker AI playbooks: ChatGPT for Your 9-to-5, AI Workflow Architect, and Prompt Engineering Field Manual.';

  return [
    'You are James Walker AI, a sharp, pragmatic workplace AI and prompt-engineering voice mentor.',
    focusContext,
    `The reader currently has ${xp} XP.`,
    'Keep spoken responses concise (2 to 4 crisp sentences), practical, and free of corporate buzzwords.',
    'When the reader shares a prompt or workplace problem, give one immediate structural fix (Role, Output Schema, Anti-Hallucination Guardrail, or Length Cap) and ask one tight follow-up question to keep the drill moving.',
  ].join(' ');
}

function sendJson(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

export function attachLiveBridge(wss: WebSocketServer): void {
  wss.on('connection', async (clientWs: WebSocket, req: IncomingMessage) => {
    const apiKey = getConfiguredApiKey();
    if (!apiKey) {
      sendJson(clientWs, {
        type: 'error',
        message:
          'GEMINI_API_KEY is not configured in server secrets. Add a free Gemini API key in Settings > Secrets to use Live Voice Mentor.',
      });
      clientWs.close(1011, 'Missing GEMINI_API_KEY');
      return;
    }

    const url = new URL(req.url || '/api/live', 'http://localhost');
    const requestedVoice = url.searchParams.get('voice') || 'Zephyr';
    const voiceName = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : 'Zephyr';
    const bookSlug = url.searchParams.get('book') || 'all';
    const xp = Number(url.searchParams.get('xp') || 0) || 0;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let closed = false;
    let session: Awaited<ReturnType<typeof ai.live.connect>> | null = null;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      try {
        session?.close();
      } catch {
        // Ignore close race
      }
      session = null;
    };

    try {
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: buildMentorInstruction(bookSlug, xp),
        },
        callbacks: {
          onopen: () => {
            sendJson(clientWs, {
              type: 'ready',
              model: 'gemini-3.8-live',
              voice: voiceName,
            });
          },
          onmessage: (message: LiveServerMessage) => {
            if (closed) return;
            const content = message.serverContent;
            if (!content) return;

            if (content.interrupted) {
              sendJson(clientWs, { type: 'interrupted' });
            }

            if (content.inputTranscription?.text) {
              sendJson(clientWs, {
                type: 'inputTranscript',
                text: content.inputTranscription.text,
              });
            }

            if (content.outputTranscription?.text) {
              sendJson(clientWs, {
                type: 'outputTranscript',
                text: content.outputTranscription.text,
              });
            }

            for (const part of content.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                sendJson(clientWs, {
                  type: 'audio',
                  data: part.inlineData.data,
                });
              }
            }

            if (content.turnComplete) {
              sendJson(clientWs, { type: 'turnComplete' });
            }
          },
          onerror: (err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            sendJson(clientWs, {
              type: 'error',
              message: `Gemini Live session error: ${msg}`,
            });
          },
          onclose: () => {
            if (!closed) {
              sendJson(clientWs, { type: 'closed' });
              cleanup();
            }
          },
        },
      });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      let friendly = `Could not connect to Gemini Live API: ${raw}`;
      if (/PERMISSION_DENIED|403|API_KEY_INVALID|400/i.test(raw)) {
        friendly =
          'Gemini API key was rejected. Please verify your API key in Settings > Secrets.';
      } else if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
        friendly = 'Live API rate limit reached. Please wait a moment and reconnect.';
      }
      sendJson(clientWs, { type: 'error', message: friendly });
      clientWs.close(1011, 'Live connect failed');
      return;
    }

    clientWs.on('message', (rawData) => {
      if (closed || !session) return;
      try {
        const msg = JSON.parse(rawData.toString()) as {
          type?: string;
          audio?: string;
          text?: string;
        };
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.text && msg.text.trim()) {
          session.sendRealtimeInput({
            text: msg.text.trim(),
          });
        }
      } catch {
        // Ignore malformed client message frames
      }
    });

    clientWs.on('close', cleanup);
    clientWs.on('error', cleanup);
  });
}
