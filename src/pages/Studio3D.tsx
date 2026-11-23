import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Mic,
  RotateCcw,
} from 'lucide-react';
import { InteractiveBookSpread } from '../components/InteractiveBookSpread.tsx';
import {
  mountGamebookStudio3D,
  type CameraPresetId,
  type MaterialFinishId,
  type Studio3DController,
} from '../three/gamebookScene.ts';
import type { BookSummary } from '../types/gamebook.ts';

interface Studio3DProps {
  books: BookSummary[];
  unlockedBooks: string[];
  onLaunchBook: (slug: string, chapterNum?: number) => void;
  onOpenVoiceMentor: () => void;
  onOpenVault: () => void;
}

const CAMERA_OPTIONS: Array<{ id: CameraPresetId; label: string }> = [
  { id: 'overview', label: 'All Volumes' },
  { id: 'ai-for-online-work', label: 'AI for Online Work' },
  { id: 'chatgpt-9-to-5', label: '9-to-5' },
  { id: 'ai-workflow-architect', label: 'Architect' },
  { id: 'prompt-engineering-manual', label: 'Prompt Manual' },
  { id: 'plan', label: 'Top View' },
];

const FINISH_OPTIONS: Array<{ id: MaterialFinishId; label: string; swatch: string }> = [
  { id: 'gallery', label: 'Gallery', swatch: '#F4F6F9' },
  { id: 'obsidian', label: 'Obsidian', swatch: '#0D121C' },
  { id: 'atelier', label: 'Atelier', swatch: '#EFECE5' },
];

export const Studio3D: React.FC<Studio3DProps> = ({
  books,
  unlockedBooks,
  onLaunchBook,
  onOpenVoiceMentor,
  onOpenVault,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Studio3DController | null>(null);

  const [contextStatus, setContextStatus] = useState<'ready' | 'lost' | 'unsupported'>('ready');
  const [explode, setExplode] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('overview');
  const [finish, setFinish] = useState<MaterialFinishId>('gallery');
  const [selectedSlug, setSelectedSlug] = useState<string>('ai-for-online-work');
  const [openSpreadSlug, setOpenSpreadSlug] = useState<string | null>(null);
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
      onOpenBook: (slug) => {
        setSelectedSlug(slug);
        setOpenSpreadSlug(slug);
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

  // Keyboard shortcut 'H' to toggle Zen / Hide Controls; Escape closes interactive book spread
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'Escape' && openSpreadSlug) {
        setOpenSpreadSlug(null);
        return;
      }
      if (e.key.toLowerCase() === 'h' && !openSpreadSlug) {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSpreadSlug]);

  const handleExplodeChange = (val: number) => {
    setExplode(val);
    controllerRef.current?.setExplode(val);
  };

  const handleCameraChange = (preset: CameraPresetId) => {
    setCameraPreset(preset);
    if (
      preset === 'ai-for-online-work' ||
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
  const openSpreadBook = openSpreadSlug
    ? books.find((b) => b.slug === openSpreadSlug) ?? selectedBook
    : null;
  const isSelectedUnlocked = selectedBook
    ? unlockedBooks.includes(selectedBook.slug)
    : false;
  const isDarkStage = finish === 'obsidian';

  return (
    <section
      aria-label="3D Virtual Reading Studio"
      className={`relative w-full h-[calc(100vh-96px)] md:h-[calc(100vh-56px)] overflow-hidden transition-colors duration-200 ${
        isDarkStage ? 'bg-[#0D121C]' : 'bg-[#F4F6F9]'
      }`}
    >
      {/* Dedicated WebGL Mount Container (isolated from React HUD re-renders) */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Fallback when WebGL is unavailable or lost */}
      {contextStatus !== 'ready' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#F6F7F9] p-6">
          <div className="max-w-md border border-[#DDE2EA] bg-white rounded-xl p-6 text-center shadow-sm">
            <h2 className="font-serif text-xl font-semibold text-[#0F141E] mb-2">
              {contextStatus === 'lost' ? '3D Graphics Context Paused' : 'WebGL Unavailable'}
            </h2>
            <p className="text-sm text-[#4E5869] mb-5 leading-relaxed">
              Hardware-accelerated 3D rendering is paused. Open the interactive book pages or launch
              Chapters 1 &amp; 2 free directly below.
            </p>
            {selectedBook && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setOpenSpreadSlug(selectedBook.slug)}
                  className="px-4 py-2.5 bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg hover:bg-[#1E40AF] transition-colors cursor-pointer"
                >
                  Open Interactive Pages
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchBook(selectedBook.slug, 1)}
                  className="px-4 py-2.5 bg-[#0F141E] text-white text-sm font-medium rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
                >
                  Play Free Ch. 1
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Minimal Top-Left Gallery Title Spec (Zero backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 z-10 max-w-sm">
        <div
          className={`pointer-events-auto rounded-lg px-4 py-3 border transition-colors ${
            isDarkStage
              ? 'bg-[#141B29]/95 border-[#253147] text-white'
              : 'bg-white/95 border-[#DDE2EA] text-[#0F141E] shadow-xs'
          }`}
        >
          <p
            className={`text-xs font-medium mb-0.5 ${
              isDarkStage ? 'text-[#93C5FD]' : 'text-[#1D4ED8]'
            }`}
          >
            3D Virtual Reading Studio · 2 Free Chapters Per Book
          </p>
          <p
            className={`font-serif text-[15px] font-semibold leading-snug ${
              isDarkStage ? 'text-white' : 'text-[#0F141E]'
            }`}
          >
            Click any volume to inspect, or open pages to highlight &amp; run tech demos
          </p>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero viewport center occlusion, NO backdrop-filter) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(1000px,95vw)] flex flex-col items-center">
        {/* Collapse / Expand Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className={`mb-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
            isDarkStage
              ? 'bg-[#141B29] border-[#29354D] text-[#CBD5E1] hover:border-[#60A5FA] hover:text-white'
              : 'bg-white border-[#DDE2EA] text-[#0F141E] hover:border-[#1D4ED8] hover:text-[#1D4ED8] shadow-xs'
          }`}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Studio Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {/* Compact Two-Tier Gallery Dock */}
        <div
          className={`w-full rounded-xl px-4 py-3.5 space-y-3 border transition-transform duration-200 ${
            isDarkStage
              ? 'bg-[#121826] border-[#253147] text-white'
              : 'bg-white border-[#DDE2EA] text-[#0F141E] shadow-md'
          } ${dockCollapsed ? 'translate-y-[140%] pointer-events-none' : 'translate-y-0'}`}
        >
          {/* Tier 1: Active Selected Volume & Direct Actions */}
          {selectedBook && (
            <div
              className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${
                isDarkStage ? 'border-[#253147]' : 'border-[#ECEEF2]'
              }`}
            >
              <div className="min-w-0">
                <div
                  className={`flex flex-wrap items-center gap-x-2 text-xs ${
                    isDarkStage ? 'text-[#94A3B8]' : 'text-[#4E5869]'
                  }`}
                >
                  <span
                    className={`font-semibold ${
                      isDarkStage ? 'text-[#93C5FD]' : 'text-[#1D4ED8]'
                    }`}
                  >
                    {selectedBook.free_chapters} Free Chapters
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedBook.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{isSelectedUnlocked ? 'Full Edition Unlocked' : 'Ch. 3 on Gumroad'}</span>
                </div>
                <p
                  className={`font-serif text-lg font-semibold truncate ${
                    isDarkStage ? 'text-white' : 'text-[#0F141E]'
                  }`}
                >
                  {selectedBook.title}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpenSpreadSlug(selectedBook.slug)}
                  className="min-h-[40px] px-4 py-2 bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Interactive Pages</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLaunchBook(selectedBook.slug, 1)}
                  className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg active:scale-[0.99] transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isDarkStage
                      ? 'bg-[#1E293B] text-white hover:bg-[#334155]'
                      : 'bg-[#0F141E] text-white hover:bg-[#1E293B]'
                  }`}
                >
                  <span>Play Ch. 1–2 Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onOpenVoiceMentor}
                  className={`min-h-[40px] px-3.5 py-2 border text-xs font-medium rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    isDarkStage
                      ? 'bg-[#182133] border-[#29354D] text-[#E2E8F0] hover:border-[#60A5FA]'
                      : 'bg-[#F6F7F9] border-[#DDE2EA] text-[#0F141E] hover:border-[#0F141E]'
                  }`}
                >
                  <Mic
                    className={`w-3.5 h-3.5 ${
                      isDarkStage ? 'text-[#93C5FD]' : 'text-[#1D4ED8]'
                    }`}
                  />
                  <span>Voice Mentor</span>
                </button>

                <a
                  href={selectedBook.gumroad_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`min-h-[40px] px-3.5 py-2 border text-xs font-medium rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    isDarkStage
                      ? 'bg-transparent border-[#29354D] text-[#CBD5E1] hover:border-[#D4AF6A] hover:text-[#D4AF6A]'
                      : 'bg-white border-[#DDE2EA] text-[#0F141E] hover:border-[#1D4ED8] hover:text-[#1D4ED8]'
                  }`}
                >
                  <span>Buy Full PDF</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Tier 2: Book Focus Picker, Anatomy Explode Slider & Studio Lighting Mood */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
            {/* Book Camera Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {CAMERA_OPTIONS.map((cam) => {
                const active = cameraPreset === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => handleCameraChange(cam.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                        : isDarkStage
                          ? 'bg-[#182133] text-[#CBD5E1] border-[#29354D] hover:border-[#60A5FA] hover:text-white'
                          : 'bg-[#F6F7F9] text-[#4E5869] border-[#DDE2EA] hover:border-[#0F141E] hover:text-[#0F141E]'
                    }`}
                  >
                    {cam.label}
                  </button>
                );
              })}
            </div>

            {/* Exploded Anatomy Slider */}
            <div className="flex items-center gap-2 min-w-[170px]">
              <Layers
                className={`w-3.5 h-3.5 shrink-0 ${
                  isDarkStage ? 'text-[#93C5FD]' : 'text-[#1D4ED8]'
                }`}
              />
              <label
                htmlFor="studio-explode-slider"
                className={`text-xs font-mono whitespace-nowrap tabular-nums ${
                  isDarkStage ? 'text-[#CBD5E1]' : 'text-[#0F141E]'
                }`}
              >
                Layers {Math.round(explode * 100)}%
              </label>
              <input
                id="studio-explode-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(explode * 100)}
                onChange={(e) => handleExplodeChange(Number(e.target.value) / 100)}
                className="w-20 accent-[#1D4ED8] cursor-pointer"
              />
            </div>

            {/* Studio Lighting / Material Mood & Reset */}
            <div className="flex items-center gap-1.5">
              {FINISH_OPTIONS.map((f) => {
                const active = finish === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFinishChange(f.id)}
                    title={f.label}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md border inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? isDarkStage
                          ? 'border-[#60A5FA] bg-[#1E293B] text-white'
                          : 'border-[#1D4ED8] bg-[#EFF4FF] text-[#1D4ED8]'
                        : isDarkStage
                          ? 'border-[#29354D] bg-[#182133] text-[#94A3B8] hover:text-white'
                          : 'border-[#DDE2EA] bg-[#F6F7F9] text-[#4E5869] hover:border-[#0F141E]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-xs border border-black/20 shrink-0"
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
                  handleFinishChange('gallery');
                }}
                className={`p-1.5 border rounded-md transition-colors cursor-pointer ${
                  isDarkStage
                    ? 'border-[#29354D] bg-[#182133] text-[#94A3B8] hover:text-white'
                    : 'border-[#DDE2EA] bg-[#F6F7F9] text-[#4E5869] hover:border-[#0F141E] hover:text-[#0F141E]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tactile Interactive Open Book Spread Modal (Hand Highlighting + Page Turn + Tech Cases) */}
      {openSpreadBook && (
        <InteractiveBookSpread
          book={openSpreadBook}
          isUnlocked={unlockedBooks.includes(openSpreadBook.slug)}
          onClose={() => setOpenSpreadSlug(null)}
          onPlayChapter={(slug, ch) => {
            setOpenSpreadSlug(null);
            onLaunchBook(slug, ch);
          }}
          onOpenVoiceMentor={() => {
            setOpenSpreadSlug(null);
            onOpenVoiceMentor();
          }}
          onOpenVault={() => {
            setOpenSpreadSlug(null);
            onOpenVault();
          }}
        />
      )}
    </section>
  );
};
