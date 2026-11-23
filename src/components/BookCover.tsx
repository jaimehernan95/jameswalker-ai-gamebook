import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  src: string;
  title: string;
  category: string;
}

export const BookCover: React.FC<BookCoverProps> = ({ src, title, category }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className="aspect-[3/4] w-full rounded-lg border border-[#DDE2EA] bg-[#F6F7F9] p-6 flex flex-col justify-between">
        <span className="text-xs font-mono tracking-wide text-[#4E5869]">{category}</span>
        <div>
          <BookOpen className="w-7 h-7 text-[#1D4ED8] mb-3" strokeWidth={1.5} />
          <p className="font-serif text-xl font-semibold text-[#0F141E] leading-snug">{title}</p>
        </div>
        <span className="text-xs text-[#4E5869]">James Walker AI Edition</span>
      </div>
    );
  }

  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-[#DDE2EA] bg-[#F6F7F9]">
      <img
        src={src}
        alt={`Editorial cover art for ${title}`}
        referrerPolicy="no-referrer"
        loading="eager"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
