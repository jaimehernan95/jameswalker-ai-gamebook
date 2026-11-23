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
      <div className="aspect-[3/4] w-full rounded border border-[#E2E0D8] bg-[#F3F1EA] p-6 flex flex-col justify-between">
        <span className="text-xs font-mono tracking-wide text-[#57554F]">{category}</span>
        <div>
          <BookOpen className="w-7 h-7 text-[#D94E1F] mb-3" strokeWidth={1.5} />
          <p className="font-serif text-xl font-semibold text-[#141413] leading-snug">{title}</p>
        </div>
        <span className="text-xs text-[#57554F]">James Walker AI Edition</span>
      </div>
    );
  }

  return (
    <div className="aspect-[3/4] w-full overflow-hidden rounded border border-[#E2E0D8] bg-[#F3F1EA]">
      <img
        src={src}
        alt={`Letterpress cover art for ${title}`}
        referrerPolicy="no-referrer"
        loading="eager"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};
