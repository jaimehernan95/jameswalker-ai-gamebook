import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Layers, RotateCcw } from 'lucide-react';
import {
  mountGamebookStudio3D,
  type CameraPresetId,
  type MaterialFinishId,
  type Studio3DController,
} from '../three/gamebookScene.ts';
import type { BookSummary } from '../types/gamebook.ts';

interface Studio3DProps {
  books: BookSummary[];
  onLaunchBook: (slug: string) => void;
}

const CAMERA_OPTIONS: Array<{ id: CameraPresetId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'chatgpt-9-to-5', label: '9-to-5' },
  { id: 'ai-workflow-architect', label: 'Architect' },
  { id: 'prompt-engineering-manual', label: 'Manual' },
  { id: 'plan', label: 'Top Plan' },
];

const FINISH_OPTIONS: Array<{ id: MaterialFinishId; label: string; swatch: string }> = [
  { id: 'archival', label: 'Archival Ink', swatch: '#1C1B19' },
  { id: 'brass', label: 'Brass Press', swatch: '#D4A957' },
  { id: 'graphite', label: 'Graphite', swatch: '#6F7276' },
];

export const Studio3D: React.FC<Studio3DProps> = ({ books, onLaunchBook }) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Studio3DController | null>(null);

  const [contextStatus, setContextStatus] = useState<'ready' | 'lost' | 'unsupported'>('ready');
  const [explode, setExplode] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('overview');
  const [finish, setFinish] = useState<MaterialFinishId>('archival');
  const [selectedSlug, setSelectedSlug] = useState<string>('chatgpt-9-to-5');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Mount Three.js once in an isolated ref container
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const controller = mountGamebookStudio3D(mountEl, {
      onSelectBook: (slug) => {
        setSelectedSlug(slug);
        setCameraPreset(slug as CameraPresetId);
      },
      onContextStatus: (status) => {
        setContextStatus(status);
      },
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Keyboard shortcut 'H' to toggle Zen / Hide Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleExplodeChange = (val: number) => {
    setExplode(val);
    controllerRef.current?.setExplode(val);
  };

  const handleCameraChange = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    if (
      preset === 'chatgpt-9-to-5' ||
      preset === 'ai-workflow-architect' ||
      preset === 'prompt-engineering-manual'
    ) {
      setSelectedSlug(preset);
    }
    controllerRef.current?.setCameraPreset(preset);
  };

  const handleFinishChange = (nextFinish: MaterialFinishId) => {
    setFinish(nextFinish);
    controllerRef.current?.setFinish(nextFinish);
  };

  const selectedBook = books.find((b) => b.slug === selectedSlug) ?? books[0];

  return (
    <section
      aria-label="Interactive 3D Playbook Vault"
      className="relative w-full h-[calc(100vh-96px)] md:h-[calc(100vh-56px)] overflow-hidden bg-[#FAF9F6]"
    >
      {/* Dedicated WebGL Mount Container (isolated from React HUD re-renders) */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Fallback when WebGL is unavailable or lost */}
      {contextStatus !== 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#FAF9F6] p-6">
          <div className="max-w-md border border-[#141413] bg-white rounded-lg p-6 text-center">
            <h2 className="font-serif text-xl font-semibold text-[#141413] mb-2">
              {contextStatus === 'lost' ? '3D Graphics Context Paused' : 'WebGL Unavailable'}
            </h2>
            <p className="text-sm text-[#57554F] mb-4">
              Your browser paused hardware-accelerated 3D rendering. You can still launch any
              interactive playbook directly.
            </p>
            {selectedBook && (
              <button
                type="button"
                onClick={() => onLaunchBook(selectedBook.slug)}
                className="px-4 py-2 bg-[#D94E1F] text-[#FAF9F6] text-sm font-semibold rounded-md cursor-pointer"
              >
                Play {selectedBook.title}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Minimal Top-Left Title Spec (No backdrop-filter over WebGL; solid archival paper surface) */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 max-w-xs">
        <div className="pointer-events-auto bg-[#FAF9F6]/95 border border-[#E2E0D8] rounded-md px-3.5 py-2.5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#D94E1F]">
            Interactive 3D Press Vault
          </p>
          <p className="font-serif text-base font-semibold text-[#141413] leading-snug">
            Click any 3D volume to inspect or drag to orbit
          </p>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (<= 15% viewport height, NO backdrop-filter) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(940px,94vw)] flex flex-col items-center">
        {/* Collapse / Expand Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="mb-1.5 px-3 py-1 bg-[#FAF9F6] border border-[#141413] rounded-md text-[11px] font-mono font-medium text-[#141413] hover:border-[#D94E1F] hover:text-[#D94E1F] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {/* Compact Horizontal Dock */}
        <div
          className={`w-full bg-[#FAF9F6] border border-[#141413] rounded-lg px-4 py-3 transition-transform duration-200 ${
            dockCollapsed ? 'translate-y-[140%] pointer-events-none' : 'translate-y-0'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5">
            {/* Exploded View Slider */}
            <div className="flex items-center gap-2.5 min-w-[175px]">
              <Layers className="w-4 h-4 text-[#D94E1F] shrink-0" />
              <label
                htmlFor="studio-explode-slider"
                className="text-xs font-mono text-[#141413] whitespace-nowrap"
              >
                Explode {Math.round(explode * 100)}%
              </label>
              <input
                id="studio-explode-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(explode * 100)}
                onChange={(e) => handleExplodeChange(Number(e.target.value) / 100)}
                className="w-24 accent-[#D94E1F] cursor-pointer"
              />
            </div>

            {/* Camera View Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {CAMERA_OPTIONS.map((cam) => {
                const active = cameraPreset === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleCameraChange(cam.id)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#141413] text-[#FAF9F6] border-[#141413]'
                        : 'bg-white text-[#57554F] border-[#E2E0D8] hover:border-[#141413] hover:text-[#141413]'
                    }`}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>

            {/* Material Finishes */}
            <div className="flex items-center gap-1.5">
              {FINISH_OPTIONS.map((f) => {
                const active = finish === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFinishChange(f.id)}
                    title={f.label}
                    className={`px-2 py-1 text-xs font-medium rounded border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      active
                        ? 'border-[#D94E1F] bg-white text-[#141413]'
                        : 'border-[#E2E0D8] bg-[#F3F1EA] text-[#57554F] hover:border-[#141413]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm border border-[#141413]/20 shrink-0"
                      style={{ backgroundColor: f.swatch }}
                    />
                    <span className="hidden sm:inline">{f.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                aria-label="Reset 3D view"
                onClick={() => {
                  handleExplodeChange(0);
                  handleCameraChange('overview');
                  handleFinishChange('archival');
                }}
                className="p-1.5 border border-[#E2E0D8] bg-white rounded text-[#57554F] hover:border-[#141413] hover:text-[#141413] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selected Volume Action */}
            {selectedBook && (
              <button
                type="button"
                onClick={() => onLaunchBook(selectedBook.slug)}
                className="px-3.5 py-1.5 bg-[#D94E1F] text-[#FAF9F6] text-xs font-semibold rounded hover:bg-[#B83E16] active:scale-[0.99] transition-all inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Play {selectedBook.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
