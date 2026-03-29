import ReactMarkdown from "react-markdown";

export type FlipbookPageData =
  | { type: "cover"; title: string; subtitle?: string; author?: string; coverUrl?: string }
  | { type: "toc"; chapters: { title: string; pageStart: number }[] }
  | { type: "chapter-title"; chapterIndex: number; title: string; coverImage?: string }
  | { type: "content"; chapterIndex: number; chapterTitle: string; content: string; pageNumber: number; totalPages: number };

interface FlipbookPageProps {
  page: FlipbookPageData;
  pageWidth?: number;
  pageHeight?: number;
}

function useScaleFactor(pageHeight?: number) {
  const h = pageHeight ?? 600;
  const scale = h / 600;
  const baseFontSize = Math.max(12, Math.min(22, 14 * scale));
  return { baseFontSize, scale };
}

export function FlipbookPage({ page, pageWidth, pageHeight }: FlipbookPageProps) {
  const { baseFontSize } = useScaleFactor(pageHeight);
  const baseStyle = { fontSize: `${baseFontSize}px` };

  if (page.type === "cover") {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={baseStyle}>
        {page.coverUrl ? (
          <>
            <img src={page.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-slate-900 to-primary/10" />
        )}
        <div className="relative z-10 text-center px-[1.5em] max-w-full overflow-hidden">
          <div className="w-[4em] h-[0.15em] bg-amber-400/60 mx-auto mb-[1.2em]" />
          <h1 className="font-bold text-white font-serif leading-tight mb-[0.6em] drop-shadow-lg break-words" style={{ fontSize: '2.2em' }}>
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-white/70 font-serif italic mb-[0.8em] break-words" style={{ fontSize: '0.85em' }}>{page.subtitle}</p>
          )}
          {page.author && (
            <p className="text-amber-300/80 tracking-widest uppercase mt-[1em]" style={{ fontSize: '0.65em' }}>{page.author}</p>
          )}
          <div className="w-[4em] h-[0.15em] bg-amber-400/60 mx-auto mt-[1.2em]" />
        </div>
      </div>
    );
  }

  if (page.type === "toc") {
    return (
      <div className="w-full h-full flex flex-col px-[3em] py-[3em] bg-[#fefcf9]" style={baseStyle}>
        <div className="mb-[1.5em]">
          <span className="font-bold uppercase tracking-[0.3em] text-amber-700/60" style={{ fontSize: '0.65em' }}>Índice</span>
          <div className="w-[4em] h-[0.15em] bg-amber-700/30 mt-[0.5em]" />
        </div>
        <div className="flex-1 space-y-0">
          {page.chapters.map((ch, i) => (
            <div key={i} className="flex items-baseline gap-[0.6em] py-[0.5em] border-b border-amber-900/5 last:border-0">
              <span className="font-bold text-amber-700/40 w-[1.5em] text-right tabular-nums shrink-0" style={{ fontSize: '0.8em' }}>{i + 1}</span>
              <span className="font-serif text-slate-800 flex-1" style={{ fontSize: '1em' }}>{ch.title}</span>
              <span className="flex-shrink-0 tabular-nums text-amber-700/40 font-mono" style={{ fontSize: '0.8em' }}>{ch.pageStart}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (page.type === "chapter-title") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[#fefcf9]" style={baseStyle}>
        {page.coverImage ? (
          <>
            <img src={page.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#fefcf9] via-[#fefcf9]/60 to-[#fefcf9]/40" />
          </>
        ) : null}
        <div className="relative z-10 text-center px-[2em]">
          <span className="font-bold uppercase tracking-[0.35em] text-amber-700/50" style={{ fontSize: '0.65em' }}>
            Capítulo {page.chapterIndex + 1}
          </span>
          <div className="w-[3em] h-[0.15em] bg-amber-700/30 mx-auto mt-[0.6em] mb-[1em]" />
          <h2 className="font-bold text-slate-900 font-serif leading-tight" style={{ fontSize: '2em' }}>
            {page.title}
          </h2>
        </div>
      </div>
    );
  }

  // content page
  return (
    <div className="w-full h-full flex flex-col px-[1.2em] py-[1em] bg-[#fefcf9] relative overflow-hidden" style={baseStyle}>
      {/* Corner ornament */}
      <div className="absolute top-0 right-0 w-[4em] h-[4em] pointer-events-none opacity-[0.06]">
        <svg viewBox="0 0 100 100" className="w-full h-full text-amber-800">
          <path d="M100,0 C100,55 55,100 0,100 L0,85 C47,85 85,47 85,0 Z" fill="currentColor" />
          <path d="M100,0 C100,40 40,80 0,80 L0,70 C35,70 70,35 70,0 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-[4em] h-[4em] pointer-events-none opacity-[0.06] rotate-180">
        <svg viewBox="0 0 100 100" className="w-full h-full text-amber-800">
          <path d="M100,0 C100,55 55,100 0,100 L0,85 C47,85 85,47 85,0 Z" fill="currentColor" />
          <path d="M100,0 C100,40 40,80 0,80 L0,70 C35,70 70,35 70,0 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>

      {/* Header — no border, ornament instead */}
      <div className="flex items-center justify-between mb-[0.6em] pb-[0.3em]">
        <span className="font-semibold uppercase tracking-[0.2em] text-amber-700/40 truncate max-w-[70%]" style={{ fontSize: '0.65em' }}>
          {page.chapterTitle}
        </span>
        <span className="text-amber-600/20" style={{ fontSize: '0.7em' }}>✦</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto prose max-w-none font-serif text-slate-800
        [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-amber-900/10 [&::-webkit-scrollbar-track]:bg-transparent
        prose-p:leading-[1.65] prose-p:!text-slate-800 prose-p:mb-[0.5em]
        prose-headings:!text-slate-900 prose-headings:font-bold prose-headings:font-serif prose-headings:mb-[0.5em] prose-headings:mt-[0.7em]
        prose-blockquote:border-0 prose-blockquote:bg-transparent prose-blockquote:py-0 prose-blockquote:px-0
        prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto prose-img:my-[0.6em] prose-img:max-h-[10em]
        prose-strong:!text-slate-900
        prose-ul:!text-slate-800 prose-ol:!text-slate-800
        prose-code:bg-amber-50 prose-code:px-[0.3em] prose-code:py-[0.1em] prose-code:rounded
        [&>p:first-of-type]:first-letter:text-[2.5em] [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:text-amber-800 [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-[0.2em] [&>p:first-of-type]:first-letter:mt-[0.05em] [&>p:first-of-type]:first-letter:leading-none [&>p:first-of-type]:first-letter:font-serif
        [&_*]:!text-slate-800 [&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_strong]:!text-slate-900
      "
        style={{ fontSize: '1em' }}
      >
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ fontSize: '1em' }}>{children}</p>,
            h1: ({ children }) => <h1 style={{ fontSize: '1.4em' }}>{children}</h1>,
            h2: ({ children }) => (
              <h2 className="!border-0 !pl-0 bg-gradient-to-r from-amber-100/60 to-transparent px-[0.5em] py-[0.25em] rounded-md" style={{ fontSize: '1.2em' }}>
                <span className="text-amber-600/40 mr-[0.3em]" style={{ fontSize: '0.8em' }}>❧</span>
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ fontSize: '1.1em' }}>
                <span className="block w-[2em] h-[0.12em] bg-amber-500/30 rounded-full mb-[0.3em]" />
                {children}
              </h3>
            ),
            li: ({ children }) => <li style={{ fontSize: '1em' }}>{children}</li>,
            blockquote: ({ children }) => (
              <div className="relative my-[0.8em] px-[1.2em] py-[0.6em] bg-gradient-to-br from-amber-50/80 to-orange-50/40 rounded-lg">
                <span className="absolute top-[-0.1em] left-[0.2em] text-amber-400/25 font-serif leading-none select-none" style={{ fontSize: '3em' }}>"</span>
                <div className="relative text-slate-700 italic font-serif" style={{ fontSize: '0.9em' }}>
                  {children}
                </div>
                <span className="absolute bottom-[-0.4em] right-[0.4em] text-amber-400/25 font-serif leading-none select-none" style={{ fontSize: '3em' }}>"</span>
              </div>
            ),
            hr: () => (
              <div className="flex items-center justify-center gap-[0.5em] my-[1.2em] text-amber-700/25" style={{ fontSize: '0.9em' }}>
                <span className="block w-[1.5em] h-[1px] bg-amber-700/15" />
                <span>✦</span>
                <span className="block w-[1.5em] h-[1px] bg-amber-700/15" />
              </div>
            ),
            code: ({ children }) => <code style={{ fontSize: '0.85em' }}>{children}</code>,
            img: ({ node, ...props }) => (
              <figure className="my-[0.8em]">
                <img {...props} className="rounded-lg shadow-md mx-auto max-w-full max-h-[12em]" />
                {props.alt && <figcaption className="text-center text-slate-500 mt-[0.4em] italic" style={{ fontSize: '0.75em' }}>{props.alt}</figcaption>}
              </figure>
            ),
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>

      {/* Footer — no border, ornamental */}
      <div className="flex items-center justify-center mt-[0.4em] pt-[0.3em] gap-[0.4em]">
        <span className="block w-[1em] h-[1px] bg-amber-700/15" />
        <span className="tabular-nums text-amber-700/30" style={{ fontSize: '0.7em' }}>{page.pageNumber}</span>
        <span className="block w-[1em] h-[1px] bg-amber-700/15" />
      </div>
    </div>
  );
}
