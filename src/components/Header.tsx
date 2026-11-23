import React from 'react';

export type ActiveRoute = 'shelf' | 'player' | 'arena' | 'dispatch' | 'studio3d' | 'voice';

interface HeaderProps {
  activeRoute: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  onOpenVault: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRoute,
  onNavigate,
  onOpenVault,
}) => {
  const navItems: Array<{ id: ActiveRoute; label: string }> = [
    { id: 'studio3d', label: '3D Studio' },
    { id: 'shelf', label: 'Book Shelf' },
    { id: 'player', label: 'Chapters' },
    { id: 'arena', label: 'Prompt Arena' },
    { id: 'dispatch', label: 'Living Dispatch' },
    { id: 'voice', label: 'Voice Mentor' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#DDE2EA]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('studio3d')}
          className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[#0F141E] whitespace-nowrap shrink-0 text-left cursor-pointer hover:text-[#1D4ED8] transition-colors"
        >
          James Walker AI
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#0F141E] border-[#1D4ED8]'
                    : 'text-[#4E5869] border-transparent hover:text-[#0F141E] hover:border-[#DDE2EA]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenVault}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#0F141E] text-white rounded-lg hover:bg-[#1D4ED8] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Unlock Vault
          </button>
        </div>
      </div>

      {/* Compact mobile route strip */}
      <nav
        aria-label="Mobile sections"
        className="flex md:hidden items-center justify-between overflow-x-auto border-t border-[#DDE2EA] bg-white h-10 px-2 gap-1"
      >
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`text-xs font-medium px-2.5 py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive ? 'text-[#1D4ED8] font-semibold' : 'text-[#4E5869]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
