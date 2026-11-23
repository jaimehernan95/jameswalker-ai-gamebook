import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, ShieldCheck } from 'lucide-react';
import type { EvaluationResult, SandboxPreset } from '../types/gamebook.ts';

interface PromptArenaProps {
  onAwardXp: (xp: number) => void;
}

export const PromptArena: React.FC<PromptArenaProps> = ({ onAwardXp }) => {
  const [presets, setPresets] = useState<SandboxPreset[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [promptText, setPromptText] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [streamOutput, setStreamOutput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<EvaluationResult | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/sandbox/presets')
      .then((r) => r.json())
      .then((data: { presets: SandboxPreset[] }) => {
        if (!active || !data.presets?.length) return;
        setPresets(data.presets);
        const first = data.presets[0];
        setSelectedId(first.id);
        setPromptText(first.starterPrompt);
        setSampleInput(first.inputSample);
      })
      .catch(() => {
        // Handled cleanly if offline
      });
    return () => {
      active = false;
    };
  }, []);

  const currentPreset = presets.find((p) => p.id === selectedId) ?? presets[0];

  const handleSelectPreset = (preset: SandboxPreset) => {
    setSelectedId(preset.id);
    setPromptText(preset.starterPrompt);
    setSampleInput(preset.inputSample);
    setStreamOutput('');
    setStreamError(null);
    setGradeResult(null);
    setGradeError(null);
  };

  const handleStreamRun = async () => {
    setStreaming(true);
    setStreamOutput('');
    setStreamError(null);

    try {
      const res = await fetch('/api/sandbox/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: promptText,
          sampleInput,
        }),
      });

      if (!res.ok || !res.body) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || 'Streaming request failed.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.replace(/^data:\s*/, '').trim();
          if (!trimmed) continue;
          try {
            const payload = JSON.parse(trimmed) as {
              chunk?: string;
              error?: string;
              done?: boolean;
            };
            if (payload.error) {
              setStreamError(payload.error);
            } else if (payload.chunk) {
              setStreamOutput((prev) => prev + payload.chunk);
            }
          } catch {
            // Skip malformed partial frame
          }
        }
      }
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : 'Unable to stream response.');
    } finally {
      setStreaming(false);
    }
  };

  const handleScoreRubric = async () => {
    if (!currentPreset) return;
    setGrading(true);
    setGradeError(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          challengeTitle: currentPreset.title,
          roleBrief: currentPreset.scenario,
          constraints: currentPreset.constraints,
          rubricFocus: currentPreset.rubricFocus,
          passingScore: 72,
          xpReward: 40,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Evaluation failed.');
      }
      const result = data as EvaluationResult;
      setGradeResult(result);
      if (result.passed) {
        onAwardXp(result.xpEarned);
      }
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Unable to score prompt.');
    } finally {
      setGrading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="border-b border-[#E2E0D8] pb-6 mb-8">
        <p className="text-xs font-mono uppercase tracking-wider text-[#57554F] mb-2">
          Live Prompt Sandbox · Server-Proxied Streaming
        </p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#141413] mb-2">
              Prompt Arena
            </h1>
            <p className="text-[16px] text-[#57554F] max-w-[65ch]">
              Test workplace prompts against real sample inputs with live streaming output, then
              score your prompt structure against the chapter rubric.
            </p>
          </div>

          {/* Preset switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map((preset) => {
              const active = preset.id === currentPreset?.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                      : 'bg-white text-[#57554F] border-[#E2E0D8] hover:border-[#141413] hover:text-[#141413]'
                  }`}
                >
                  {preset.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {currentPreset && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone: Scenario Brief & Sample Input */}
          <section className="lg:col-span-5 space-y-5">
            <div className="border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6">
              <div className="text-xs font-mono text-[#D94E1F] mb-1">
                {currentPreset.bookTitle}
              </div>
              <h2 className="font-serif text-xl font-semibold text-[#141413] mb-2">
                {currentPreset.title}
              </h2>
              <p className="text-sm text-[#57554F] leading-relaxed mb-4">
                {currentPreset.scenario}
              </p>

              <div className="pt-4 border-t border-[#E2E0D8]">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#57554F] mb-2.5">
                  Target Rubric Constraints
                </h3>
                <ul className="space-y-1.5 text-sm text-[#141413]">
                  {currentPreset.constraints.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-xs text-[#D94E1F] mt-0.5">0{idx + 1}.</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6">
              <label
                htmlFor="arena-sample-input"
                className="block text-xs font-mono uppercase tracking-wider text-[#57554F] mb-2"
              >
                Editable Test Input Sample
              </label>
              <textarea
                id="arena-sample-input"
                rows={5}
                value={sampleInput}
                onChange={(e) => setSampleInput(e.target.value)}
                className="w-full p-3 font-mono text-xs leading-relaxed bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none"
              />
            </div>
          </section>

          {/* Right Zone: Prompt Workbench + Live Output + Rubric Score */}
          <section className="lg:col-span-7 space-y-5">
            <div className="border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-2">
                <label htmlFor="arena-prompt-editor" className="text-sm font-semibold text-[#141413]">
                  Prompt Under Test
                </label>
                <button
                  type="button"
                  onClick={() => setPromptText(currentPreset.starterPrompt)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#57554F] hover:text-[#141413] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Template</span>
                </button>
              </div>

              <textarea
                id="arena-prompt-editor"
                rows={6}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full p-4 font-mono text-sm leading-relaxed bg-[#FAF9F6] border border-[#E2E0D8] rounded-md text-[#141413] focus:border-[#D94E1F] focus:outline-none mb-4"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleStreamRun}
                  disabled={streaming || promptText.trim().length < 10}
                  className="min-h-[44px] px-4 py-2.5 bg-[#D94E1F] text-[#FAF9F6] text-sm font-semibold rounded-md hover:bg-[#B83E16] active:scale-[0.99] transition-all inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>{streaming ? 'Streaming...' : 'Run Live Stream'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleScoreRubric}
                  disabled={grading || promptText.trim().length < 15}
                  className="min-h-[44px] px-4 py-2.5 bg-[#141413] text-[#FAF9F6] text-sm font-medium rounded-md hover:bg-[#141413]/85 active:scale-[0.99] transition-all inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{grading ? 'Scoring...' : 'Score Against Rubric'}</span>
                </button>
              </div>
            </div>

            {/* Live Stream Output Box */}
            <div className="border border-[#E2E0D8] bg-white rounded-lg p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-[#57554F]">
                  Model Output Stream
                </span>
                {streaming && (
                  <span className="text-xs font-mono text-[#D94E1F]">Streaming response...</span>
                )}
              </div>

              {streamError && (
                <div role="alert" className="p-3 border border-[#D94E1F] bg-[#FAF9F6] rounded text-sm text-[#141413] mb-3">
                  {streamError}
                </div>
              )}

              <pre className="min-h-[140px] max-h-[320px] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#141413] bg-[#FAF9F6] border border-[#E2E0D8] rounded-md p-4">
                {streamOutput || 'Click "Run Live Stream" to test your prompt on the sample input.'}
              </pre>
            </div>

            {/* Rubric Evaluation Card */}
            {gradeError && (
              <div role="alert" className="p-4 border border-[#D94E1F] bg-white rounded-md text-sm text-[#141413]">
                {gradeError}
              </div>
            )}

            {gradeResult && (
              <div className="border border-[#141413] bg-white rounded-lg p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-4 pb-3 mb-3 border-b border-[#E2E0D8]">
                  <div>
                    <div className="text-xs font-mono text-[#57554F] mb-0.5">
                      {gradeResult.source === 'gemini' ? gradeResult.model : 'Offline Rubric'}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[#141413]">
                      {gradeResult.verdict}
                    </h3>
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#D94E1F] tabular-nums">
                    {gradeResult.score} / 100
                  </div>
                </div>
                <p className="text-sm text-[#141413] mb-3">{gradeResult.strengths}</p>
                <ul className="space-y-1 text-sm text-[#57554F]">
                  {gradeResult.improvements.map((imp, idx) => (
                    <li key={idx}>• {imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
};
