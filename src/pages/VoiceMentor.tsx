import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Radio, Send, Volume2 } from 'lucide-react';
import type { BookSummary } from '../types/gamebook.ts';

interface VoiceMentorProps {
  books: BookSummary[];
  xp: number;
}

interface TranscriptEntry {
  id: string;
  role: 'reader' | 'mentor';
  text: string;
}

type ConnectionState = 'idle' | 'connecting' | 'live' | 'error';

const VOICE_OPTIONS = [
  { id: 'Zephyr', label: 'Zephyr · Calm Strategist' },
  { id: 'Kore', label: 'Kore · Crisp Editor' },
  { id: 'Puck', label: 'Puck · Fast Tactician' },
  { id: 'Charon', label: 'Charon · Executive Brief' },
  { id: 'Fenrir', label: 'Fenrir · Direct Reviewer' },
];

const QUICK_DRILLS = [
  'Critique my Monday inbox triage prompt and ask me one tough follow-up.',
  'Roleplay a skeptical manufacturing CFO reviewing my AI proposal.',
  'Drill me on adding a human-in-the-loop JSON guardrail.',
];

// Downsample Float32 audio buffer to 16kHz signed 16-bit PCM little-endian base64
function encodePcm16Base64(input: Float32Array, inputSampleRate: number): string {
  const targetRate = 16000;
  let samples: Float32Array;

  if (inputSampleRate === targetRate) {
    samples = input;
  } else {
    const ratio = inputSampleRate / targetRate;
    const newLength = Math.max(1, Math.round(input.length / ratio));
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += input[j];
        count++;
      }
      samples[i] = count > 0 ? sum / count : input[Math.min(start, input.length - 1)];
    }
  }

  const pcm16 = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Decode raw 24kHz signed 16-bit PCM little-endian base64 into Float32Array
function decodePcm24Float32(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(byteLen / 2);
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

export const VoiceMentor: React.FC<VoiceMentorProps> = ({ books, xp }) => {
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [selectedBook, setSelectedBook] = useState('chatgpt-9-to-5');
  const [status, setStatus] = useState<ConnectionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [textNudge, setTextNudge] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Refs used inside audio callbacks & WS handlers (prevents stale closures)
  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mutedRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRafRef = useRef<number>(0);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const stopPlaybackQueue = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {
        // Already stopped
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextPlayTimeRef.current = outputCtxRef.current.currentTime;
    }
  }, []);

  const schedulePcm24Playback = useCallback((base64Audio: string) => {
    const outCtx = outputCtxRef.current;
    if (!outCtx) return;

    const floatSamples = decodePcm24Float32(base64Audio);
    if (floatSamples.length === 0) return;

    const audioBuffer = outCtx.createBuffer(1, floatSamples.length, 24000);
    audioBuffer.copyToChannel(new Float32Array(floatSamples), 0);

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    const startAt = Math.max(now + 0.015, nextPlayTimeRef.current);
    source.start(startAt);
    nextPlayTimeRef.current = startAt + audioBuffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
    };
  }, []);

  const appendTranscript = useCallback((role: 'reader' | 'mentor', deltaText: string) => {
    const clean = deltaText.trim();
    if (!clean) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${clean}`.replace(/\s+/g, ' ').trim() },
        ];
      }
      return [...prev, { id: `${Date.now()}_${Math.random()}`, role, text: clean }];
    });
  }, []);

  const disconnect = useCallback(() => {
    window.cancelAnimationFrame(waveRafRef.current);
    stopPlaybackQueue();

    try {
      processorRef.current?.disconnect();
    } catch {
      // Ignore
    }
    processorRef.current = null;
    analyserRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    void inputCtxRef.current?.close();
    inputCtxRef.current = null;

    void outputCtxRef.current?.close();
    outputCtxRef.current = null;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }

    setStatus('idle');
    setMuted(false);
  }, [stopPlaybackQueue]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Real-time canvas bar visualizer driven by live mic AnalyserNode
  const startWaveformLoop = useCallback(() => {
    const canvas = waveCanvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      waveRafRef.current = window.requestAnimationFrame(draw);
      analyser.getByteFrequencyData(data);

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, w, h);

      const barCount = 32;
      const gap = 4;
      const barW = (w - gap * (barCount - 1)) / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = mutedRef.current ? 4 : data[Math.min(data.length - 1, i * 2)];
        const barH = Math.max(4, (val / 255) * (h - 12));
        ctx.fillStyle = val > 95 ? '#D94E1F' : '#141413';
        ctx.fillRect(i * (barW + gap), (h - barH) / 2, barW, barH);
      }
    };
    draw();
  }, []);

  const connectLive = async () => {
    disconnect();
    setErrorMsg(null);
    setStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const qs = new URLSearchParams({
        voice: selectedVoice,
        book: selectedBook,
        xp: String(xp),
      });
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live?${qs.toString()}`);
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const analyser = inputCtx.createAnalyser();
        analyser.fftSize = 128;
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);

        source.connect(analyser);
        analyser.connect(processor);
        processor.connect(inputCtx.destination);

        analyserRef.current = analyser;
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (mutedRef.current) return;
          const socket = wsRef.current;
          if (!socket || socket.readyState !== WebSocket.OPEN) return;
          const channel = event.inputBuffer.getChannelData(0);
          const base64Pcm = encodePcm16Base64(channel, inputCtx.sampleRate);
          socket.send(JSON.stringify({ audio: base64Pcm }));
        };

        startWaveformLoop();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            data?: string;
            text?: string;
            message?: string;
          };
          if (msg.type === 'ready') {
            setStatus('live');
          } else if (msg.type === 'audio' && msg.data) {
            schedulePcm24Playback(msg.data);
          } else if (msg.type === 'interrupted') {
            stopPlaybackQueue();
          } else if (msg.type === 'inputTranscript' && msg.text) {
            appendTranscript('reader', msg.text);
          } else if (msg.type === 'outputTranscript' && msg.text) {
            appendTranscript('mentor', msg.text);
          } else if (msg.type === 'error') {
            setErrorMsg(msg.message || 'Live session encountered an error.');
            setStatus('error');
          } else if (msg.type === 'closed') {
            setStatus('idle');
          }
        } catch {
          // Ignore malformed server frame
        }
      };

      ws.onerror = () => {
        setErrorMsg('WebSocket connection to Live Voice Mentor failed.');
        setStatus('error');
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          setStatus((curr) => (curr === 'error' ? 'error' : 'idle'));
        }
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone access is required for real-time voice coaching.';
      setErrorMsg(msg);
      setStatus('error');
      disconnect();
    }
  };

  const sendTextPrompt = (text: string) => {
    const clean = text.trim();
    if (!clean || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text: clean }));
    appendTranscript('reader', clean);
    setTextNudge('');
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="border-b border-[#E2E0D8] pb-6 mb-8">
        <p className="text-xs font-mono uppercase tracking-wider text-[#57554F] mb-2">
          Real-Time Voice Coach · Gemini 3.8 Live API (16kHz / 24kHz PCM)
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#141413] mb-2">
          Live Voice Mentor
        </h1>
        <p className="text-[16px] text-[#57554F] max-w-[65ch]">
          Rehearse high-stakes workplace scenarios out loud or read your prompt drafts for instant
          spoken critique from James Walker AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Control Deck: Voice, Scenario Focus & Live Connection */}
        <section className="lg:col-span-5 space-y-5">
          <div className="border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6 space-y-5">
            <div>
              <label
                htmlFor="voice-book-select"
                className="block text-xs font-mono uppercase tracking-wider text-[#57554F] mb-2"
              >
                Coaching Playbook Context
              </label>
              <select
                id="voice-book-select"
                value={selectedBook}
                disabled={status === 'live' || status === 'connecting'}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none disabled:opacity-60"
              >
                {books.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.title}
                  </option>
                ))}
                <option value="all">All Playbooks · General Prompt Critique</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="voice-persona-select"
                className="block text-xs font-mono uppercase tracking-wider text-[#57554F] mb-2"
              >
                Mentor Voice
              </label>
              <select
                id="voice-persona-select"
                value={selectedVoice}
                disabled={status === 'live' || status === 'connecting'}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none disabled:opacity-60"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Waveform Monitor */}
            <div className="p-4 bg-[#FAF9F6] border border-[#E2E0D8] rounded-md">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-[#57554F]">AUDIO MONITOR</span>
                <span className="text-[#141413] font-semibold uppercase">
                  {status === 'live'
                    ? muted
                      ? 'MIC MUTED'
                      : 'LIVE · SPEAK NOW'
                    : status === 'connecting'
                      ? 'CONNECTING...'
                      : 'STANDBY'}
                </span>
              </div>
              <canvas
                ref={waveCanvasRef}
                width={360}
                height={64}
                className="w-full h-16 rounded border border-[#E2E0D8] bg-[#FAF9F6]"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 border border-[#D94E1F] bg-[#FAF9F6] rounded text-sm text-[#141413]"
              >
                {errorMsg}
              </div>
            )}

            {/* Primary Connect / End + Mute Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {status !== 'live' && status !== 'connecting' ? (
                <button
                  type="button"
                  onClick={() => void connectLive()}
                  className="flex-1 min-h-[46px] px-5 py-2.5 bg-[#D94E1F] text-[#FAF9F6] text-sm font-semibold rounded-md hover:bg-[#B83E16] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Start Voice Session</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className="flex-1 min-h-[46px] px-4 py-2.5 border border-[#141413] bg-white text-[#141413] text-sm font-medium rounded-md hover:bg-[#F3F1EA] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {muted ? <MicOff className="w-4 h-4 text-[#D94E1F]" /> : <Mic className="w-4 h-4" />}
                    <span>{muted ? 'Unmute Mic' : 'Mute Mic'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="min-h-[46px] px-4 py-2.5 bg-[#141413] text-[#FAF9F6] text-sm font-semibold rounded-md hover:bg-[#D94E1F] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Spoken Quick Drill Starters */}
          <div className="border border-[#E2E0D8] bg-white rounded-lg p-5">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#57554F] mb-3">
              Quick Voice Drill Starters
            </h2>
            <div className="space-y-2">
              {QUICK_DRILLS.map((drill, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={status !== 'live'}
                  onClick={() => sendTextPrompt(drill)}
                  className="w-full text-left p-3 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] hover:border-[#D94E1F] disabled:opacity-55 transition-colors cursor-pointer"
                >
                  {drill}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Live Conversation Transcript + Text Side-Channel */}
        <section className="lg:col-span-7 border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6 flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E2E0D8]">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#D94E1F]" />
              <h2 className="font-serif text-xl font-semibold text-[#141413]">
                Live Session Transcript
              </h2>
            </div>
            {transcript.length > 0 && (
              <button
                type="button"
                onClick={() => setTranscript([])}
                className="text-xs font-mono text-[#57554F] hover:text-[#141413] underline cursor-pointer"
              >
                Clear Log
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-5 max-h-[380px] pr-1">
            {transcript.length === 0 ? (
              <div className="p-6 bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-sm text-[#57554F] leading-relaxed">
                Click <strong className="text-[#141413]">Start Voice Session</strong>, grant
                microphone access, and speak naturally. You can interrupt the mentor mid-sentence
                at any time—playback clears automatically.
              </div>
            ) : (
              transcript.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-md border ${
                    entry.role === 'mentor'
                      ? 'bg-[#FAF9F6] border-[#141413]'
                      : 'bg-white border-[#E2E0D8]'
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#D94E1F] mb-1">
                    {entry.role === 'mentor' ? `James Walker AI (${selectedVoice})` : 'You'}
                  </div>
                  <p className="text-[15px] leading-relaxed text-[#141413]">{entry.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Optional text nudge while on live call */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendTextPrompt(textNudge);
            }}
            className="pt-4 border-t border-[#E2E0D8] flex items-center gap-2"
          >
            <input
              type="text"
              value={textNudge}
              disabled={status !== 'live'}
              onChange={(e) => setTextNudge(e.target.value)}
              placeholder={
                status === 'live'
                  ? 'Or paste a short prompt line to discuss aloud...'
                  : 'Connect voice session to talk or send a prompt line...'
              }
              className="flex-1 min-h-[44px] px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status !== 'live' || !textNudge.trim()}
              className="min-h-[44px] px-4 py-2 bg-[#141413] text-[#FAF9F6] text-sm font-medium rounded-md hover:bg-[#D94E1F] disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};
