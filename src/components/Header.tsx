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
    { id: 'shelf', label: 'Book Shelf' },
    { id: 'player', label: 'Chapter Player' },
    { id: 'arena', label: 'Prompt Arena' },
    { id: 'dispatch', label: 'Living Dispatch' },
    { id: 'studio3d', label: '3D Studio' },
    { id: 'voice', label: 'Voice Mentor' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF9F6] border-b border-[#E2E0D8]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('shelf')}
          className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 text-left cursor-pointer hover:text-[#D94E1F] transition-colors"
        >
          James Walker AI
        </button>

        {/* Zone 2: 6 clean single-line navigation links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-5">
          {navItems.map((item) => {
            const isActive = activeRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#141413] border-[#D94E1F]'
                    : 'text-[#57554F] border-transparent hover:text-[#141413] hover:border-[#E2E0D8]'
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
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-[#141413] text-[#FAF9F6] rounded-md hover:bg-[#D94E1F] active:scale-[0.99] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Unlock Vault
          </button>
        </div>
      </div>

      {/* Compact mobile route strip */}
      <nav
        aria-label="Mobile sections"
        className="flex md:hidden items-center justify-between overflow-x-auto border-t border-[#E2E0D8] bg-[#FAF9F6] h-10 px-2 gap-1"
      >
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`text-xs font-medium px-2 py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive ? 'text-[#D94E1F] font-semibold' : 'text-[#57554F]'
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
