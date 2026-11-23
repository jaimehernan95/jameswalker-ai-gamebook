import { GoogleGenAI, type LiveServerMessage, Modality } from '@google/genai';
import type { IncomingMessage } from 'http';
import type { WebSocket, WebSocketServer } from 'ws';
import { getProjectedBooks } from './booksData.ts';

const ALLOWED_VOICES = new Set(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir']);

function getConfiguredApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY?.trim();
  if (
    !raw ||
    /^(MY_GEMINI_API_KEY|demo|test|placeholder|your[_-].*)$/i.test(raw)
  ) {
    return null;
  }
  return raw;
}

function buildMentorInstruction(bookSlug: string, xp: number): string {
  const books = getProjectedBooks();
  const focusBook = books.find((b) => b.slug === bookSlug);
  const focusContext = focusBook
    ? `The reader is currently focusing on "${focusBook.title}" (${focusBook.category}): ${focusBook.subtitle}`
    : 'The reader is practicing across all four James Walker AI playbooks: AI for Online Work, ChatGPT for Your 9-to-5, AI Workflow Architect, and Prompt Engineering Field Manual.';

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

const wsConnectWindows = new Map<string, number[]>();
const activeSocketsPerIp = new Map<string, number>();
const MAX_WS_CONNECTS_PER_MIN = 10;
const MAX_CONCURRENT_WS_PER_IP = 2;
const MAX_TEXT_FRAME_CHARS = 2000;
const MAX_AUDIO_FRAME_CHARS = 262_144;

function getWsClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'local';
}

function isWsRateLimited(ip: string): boolean {
  const now = Date.now();
  if (wsConnectWindows.size > 1000) {
    for (const [key, list] of wsConnectWindows.entries()) {
      const fresh = list.filter((t) => now - t < 60_000);
      if (fresh.length === 0) wsConnectWindows.delete(key);
      else wsConnectWindows.set(key, fresh);
    }
  }
  const stamps = (wsConnectWindows.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (stamps.length >= MAX_WS_CONNECTS_PER_MIN) {
    wsConnectWindows.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  wsConnectWindows.set(ip, stamps);
  return false;
}

export function attachLiveBridge(wss: WebSocketServer): void {
  wss.on('connection', async (clientWs: WebSocket, req: IncomingMessage) => {
    const ip = getWsClientIp(req);
    if (isWsRateLimited(ip)) {
      sendJson(clientWs, {
        type: 'error',
        message: 'Too many live voice connection attempts. Please wait a minute and retry.',
      });
      clientWs.close(1008, 'Rate limited');
      return;
    }

    const currentActive = activeSocketsPerIp.get(ip) ?? 0;
    if (currentActive >= MAX_CONCURRENT_WS_PER_IP) {
      sendJson(clientWs, {
        type: 'error',
        message: 'Only 2 simultaneous Live Voice Mentor sessions are allowed per connection.',
      });
      clientWs.close(1008, 'Too many concurrent sessions');
      return;
    }

    const apiKey = getConfiguredApiKey();
    if (!apiKey) {
      sendJson(clientWs, {
        type: 'error',
        message:
          'GEMINI_API_KEY is not configured in server secrets. Add a free Gemini API key in server environment variables to use Live Voice Mentor.',
      });
      clientWs.close(1011, 'Missing GEMINI_API_KEY');
      return;
    }

    activeSocketsPerIp.set(ip, currentActive + 1);

    const url = new URL(req.url || '/api/live', 'http://localhost');
    const requestedVoice = url.searchParams.get('voice') || 'Zephyr';
    const voiceName = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : 'Zephyr';
    const bookSlug = (url.searchParams.get('book') || 'all').slice(0, 64);
    const rawXp = Number(url.searchParams.get('xp') || 0);
    const xp = Number.isFinite(rawXp) ? Math.max(0, Math.min(1_000_000, Math.round(rawXp))) : 0;

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
      const count = activeSocketsPerIp.get(ip) ?? 1;
      if (count <= 1) activeSocketsPerIp.delete(ip);
      else activeSocketsPerIp.set(ip, count - 1);
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
            console.error('[LiveBridge] Session error:', msg);
            sendJson(clientWs, {
              type: 'error',
              message: 'Live Voice session encountered a temporary error. Please reconnect.',
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
      console.error('[LiveBridge] Connection failed:', raw);
      let friendly = 'Could not connect to the Live Voice service right now. Please retry shortly.';
      if (/PERMISSION_DENIED|403|API_KEY_INVALID|400/i.test(raw)) {
        friendly =
          'Gemini API key was rejected. Please verify GEMINI_API_KEY in server environment variables.';
      } else if (/RESOURCE_EXHAUSTED|429/i.test(raw)) {
        friendly = 'Live API rate limit reached. Please wait a moment and reconnect.';
      }
      sendJson(clientWs, { type: 'error', message: friendly });
      cleanup();
      clientWs.close(1011, 'Live connect failed');
      return;
    }

    clientWs.on('message', (rawData) => {
      if (closed || !session) return;
      try {
        const textPayload = rawData.toString();
        if (textPayload.length > MAX_AUDIO_FRAME_CHARS + 4096) return;
        const msg = JSON.parse(textPayload) as {
          type?: string;
          audio?: unknown;
          text?: unknown;
        };
        if (typeof msg.audio === 'string' && msg.audio.length > 0 && msg.audio.length <= MAX_AUDIO_FRAME_CHARS) {
          session.sendRealtimeInput({
            audio: {
              data: msg.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (typeof msg.text === 'string' && msg.text.trim()) {
          session.sendRealtimeInput({
            text: msg.text.trim().slice(0, MAX_TEXT_FRAME_CHARS),
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
