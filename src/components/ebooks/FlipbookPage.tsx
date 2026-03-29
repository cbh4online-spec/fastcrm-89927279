import ReactMarkdown from "react-markdown";
import { BookOpen } from "lucide-react";

export type FlipbookPageData =
  | { type: "cover"; title: string; subtitle?: string; author?: string; coverUrl?: string }
  | { type: "toc"; chapters: { title: string; pageStart: number }[] }
  | { type: "chapter-title"; chapterIndex: number; title: string; coverImage?: string }
  | { type: "content"; chapterIndex: number; chapterTitle: string; content: string; pageNumber: number; totalPages: number };

interface FlipbookPageProps {
  page: FlipbookPageData;
}

export function FlipbookPage({ page }: FlipbookPageProps) {
  if (page.type === "cover") {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {page.coverUrl ? (
          <>
            <img src={page.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-900 to-primary/10" />
        )}
        <div className="relative z-10 text-center px-10 max-w-full">
          <div className="w-16 h-0.5 bg-amber-400/60 mx-auto mb-8" />
          <h1 className="text-3xl md:text-4xl font-bold text-white font-serif leading-tight mb-4 drop-shadow-lg">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-base text-white/70 font-serif italic mb-6">{page.subtitle}</p>
          )}
          {page.author && (
            <p className="text-sm text-amber-300/80 tracking-widest uppercase mt-8">{page.author}</p>
          )}
          <div className="w-16 h-0.5 bg-amber-400/60 mx-auto mt-8" />
        </div>
      </div>
    );
  }

  if (page.type === "toc") {
    return (
      <div className="w-full h-full flex flex-col px-12 py-14 bg-[#fefcf9]">
        <div className="mb-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-700/60">Índice</span>
          <div className="w-12 h-0.5 bg-amber-700/30 mt-2" />
        </div>
        <div className="flex-1 space-y-0">
          {page.chapters.map((ch, i) => (
            <div key={i} className="flex items-baseline gap-3 py-2.5 border-b border-amber-900/5 last:border-0">
              <span className="text-xs font-bold text-amber-700/40 w-5 text-right tabular-nums shrink-0">{i + 1}</span>
              <span className="text-sm font-serif text-slate-800 flex-1">{ch.title}</span>
              <span className="flex-shrink-0 text-xs tabular-nums text-amber-700/40 font-mono">{ch.pageStart}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page.type === "chapter-title") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#fefcf9]">
        {page.coverImage ? (
          <>
            <img src={page.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#fefcf9] via-[#fefcf9]/60 to-[#fefcf9]/40" />
          </>
        ) : null}
        <div className="relative z-10 text-center px-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-700/50">
            Capítulo {page.chapterIndex + 1}
          </span>
          <div className="w-10 h-0.5 bg-amber-700/30 mx-auto mt-3 mb-5" />
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-serif leading-tight">
            {page.title}
          </h2>
        </div>
      </div>
    );
  }

  // content page
  return (
    <div className="w-full h-full flex flex-col px-6 md:px-8 py-6 bg-[#fefcf9] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-amber-900/8">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-700/40 truncate max-w-[70%]">
          {page.chapterTitle}
        </span>
        <span className="text-[9px] tabular-nums text-amber-700/30 font-mono">{page.pageNumber}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden prose prose-sm max-w-none font-serif text-slate-800
        prose-p:leading-[1.75] prose-p:!text-slate-800 prose-p:mb-3 prose-p:text-[12.5px]
        prose-headings:!text-slate-900 prose-headings:font-bold prose-headings:font-serif prose-headings:text-base prose-headings:mb-3 prose-headings:mt-4
        prose-h2:border-l-2 prose-h2:border-amber-600/30 prose-h2:pl-3
        prose-blockquote:border-amber-600/30 prose-blockquote:bg-amber-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-sm prose-blockquote:!text-slate-700
        prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto prose-img:my-4 prose-img:max-h-48
        prose-strong:!text-slate-900
        prose-ul:!text-slate-800 prose-ol:!text-slate-800 prose-li:text-[12.5px] prose-li:!text-slate-800
        prose-code:bg-amber-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        [&>p:first-of-type]:first-letter:text-4xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-amber-800 [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-2 [&>p:first-of-type]:first-letter:mt-0.5 [&>p:first-of-type]:first-letter:leading-none [&>p:first-of-type]:first-letter:font-serif
        [&_*]:!text-slate-800 [&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_strong]:!text-slate-900
      ">
        <ReactMarkdown
          components={{
            img: ({ node, ...props }) => (
              <figure className="my-4">
                <img {...props} className="rounded-lg shadow-md mx-auto max-w-full max-h-44" />
                {props.alt && <figcaption className="text-center text-[11px] text-slate-500 mt-2 italic">{props.alt}</figcaption>}
              </figure>
            ),
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center mt-4 pt-3 border-t border-amber-900/8">
        <span className="text-[10px] tabular-nums text-amber-700/30">{page.pageNumber} / {page.totalPages}</span>
      </div>
    </div>
  );
}
