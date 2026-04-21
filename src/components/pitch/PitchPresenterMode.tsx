import { useEffect } from 'react';
import { PitchTokens } from '@/lib/pitch/tokens';
import { getActiveSlides } from './slides';
import { PitchSlideCanvas } from './PitchSlideCanvas';

interface Props {
  tokens: PitchTokens;
  index: number;
  setIndex: (i: number) => void;
  onExit: () => void;
}

export function PitchPresenterMode({ tokens, index, setIndex, onExit }: Props) {
  const slides = getActiveSlides(tokens.enabledSlides);
  const total = slides.length;
  const safeIndex = Math.min(index, total - 1);
  const Slide = slides[safeIndex].component;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (safeIndex < total - 1) setIndex(safeIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (safeIndex > 0) setIndex(safeIndex - 1);
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safeIndex, total, setIndex, onExit]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="w-full h-full">
        <PitchSlideCanvas bare>
          <Slide tokens={tokens} pageNumber={safeIndex + 1} total={total} />
        </PitchSlideCanvas>
      </div>
      <div className="absolute bottom-4 right-6 text-white/40 text-sm font-mono select-none">
        {safeIndex + 1} / {total} · ESC para sair
      </div>
    </div>
  );
}
