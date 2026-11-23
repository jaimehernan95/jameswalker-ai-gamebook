import React, { useState } from 'react';
import { Award, ExternalLink, KeyRound, X } from 'lucide-react';
import { getRankTitle } from '../lib/storage.ts';
import type { BookSummary, ReaderProgress } from '../types/gamebook.ts';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: ReaderProgress;
  books: BookSummary[];
  onUnlockSuccess: (code: string, unlockedSlugs: string[]) => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  progress,
  books,
  onUnlockSuccess,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const rank = getRankTitle(progress.xp);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid unlock key.');
      }
      onUnlockSuccess(data.code, data.unlockedSlugs);
      setStatusMsg({ type: 'ok', text: `Unlocked: ${data.label}` });
      setCodeInput('');
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to verify unlock code.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F141E]/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-modal-title"
    >
      <div className="w-full max-w-lg bg-[#F6F7F9] border border-[#0F141E] rounded-lg p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-[#DDE2EA]">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-[#1D4ED8] mb-1">
              Reader Ledger & Gumroad Vault
            </p>
            <h2 id="vault-modal-title" className="font-serif text-2xl font-semibold text-[#0F141E]">
              {rank.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close vault dialog"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center border border-[#DDE2EA] rounded-md bg-white text-[#0F141E] hover:border-[#0F141E] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* XP & Streak Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-white border border-[#DDE2EA] rounded-md mb-6">
          <div>
            <div className="text-xs text-[#4E5869]">Total XP</div>
            <div className="font-mono text-lg font-semibold text-[#0F141E] tabular-nums">
              {progress.xp}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#4E5869]">Streak</div>
            <div className="font-mono text-lg font-semibold text-[#0F141E] tabular-nums">
              {progress.streakDays}d
            </div>
          </div>
          <div>
            <div className="text-xs text-[#4E5869]">Books Open</div>
            <div className="font-mono text-lg font-semibold text-[#0F141E] tabular-nums">
              {progress.unlockedBooks.length} / {books.length || 3}
            </div>
          </div>
        </div>

        {/* Earned Rank Badges */}
        <div className="mb-6">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#4E5869] mb-2.5">
            Earned Rank Badges
          </h3>
          {progress.earnedRanks.length === 0 ? (
            <p className="text-sm text-[#4E5869] p-3 border border-[#DDE2EA] bg-white rounded-md">
              Complete any Chapter Prompt Boss to earn your first verifiable Rank Badge.
            </p>
          ) : (
            <div className="space-y-2">
              {progress.earnedRanks.map((r, idx) => (
                <div
                  key={`${r.badgeCode}_${idx}`}
                  className="p-3 bg-white border border-[#DDE2EA] rounded-md flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span className="text-sm font-medium text-[#0F141E]">{r.rankTitle}</span>
                  </div>
                  <span className="text-xs font-mono text-[#4E5869]">{r.badgeCode}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gumroad Key Form */}
        <form onSubmit={handleSubmit} className="pt-5 border-t border-[#DDE2EA] space-y-3">
          <label htmlFor="gumroad-key-input" className="block text-sm font-semibold text-[#0F141E]">
            Redeem Gumroad License Key
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="gumroad-key-input"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="e.g. ONLINEWORK-2026 or JAMESWALKER-PRO"
              className="flex-1 min-h-[44px] px-3.5 py-2 font-mono text-sm bg-white border border-[#DDE2EA] rounded-md text-[#0F141E] focus:border-[#1D4ED8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !codeInput.trim()}
              className="min-h-[44px] px-4 py-2 bg-[#1D4ED8] text-[#F6F7F9] text-sm font-semibold rounded-md hover:bg-[#1E40AF] active:scale-[0.99] transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Checking...' : 'Redeem'}</span>
            </button>
          </div>

          <p className="text-xs text-[#4E5869]">
            Demo preview keys: <span className="font-mono text-[#0F141E]">ONLINEWORK-2026</span>,{' '}
            <span className="font-mono text-[#0F141E]">WALKER9TO5</span>,{' '}
            <span className="font-mono text-[#0F141E]">ARCHITECT-KEY</span>,{' '}
            <span className="font-mono text-[#0F141E]">MANUAL-2026</span>, or{' '}
            <span className="font-mono text-[#0F141E]">JAMESWALKER-PRO</span>.
          </p>

          {statusMsg && (
            <p
              role="status"
              className={`text-sm p-3 rounded border ${
                statusMsg.type === 'ok'
                  ? 'border-[#0F141E] bg-white text-[#0F141E]'
                  : 'border-[#1D4ED8] bg-white text-[#1D4ED8]'
              }`}
            >
              {statusMsg.text}
            </p>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-[#DDE2EA] flex items-center justify-between gap-4">
          <a
            href="https://jameswalkerai.gumroad.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#1D4ED8] hover:underline inline-flex items-center gap-1.5"
          >
            <span>Browse Full Editions on Gumroad</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[#4E5869] hover:text-[#0F141E] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
