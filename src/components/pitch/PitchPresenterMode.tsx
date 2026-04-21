import { useEffect, useRef, useState } from 'react';
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
  const slides = getActiveSlides(tokens.enabledSlides, tokens.slideOrder);
  const total = slides.length;
  const safeIndex = Math.min(index, total - 1);
  const current = slides[safeIndex];
  const Slide = current.component;
  const progress = total > 1 ? ((safeIndex + 1) / total) * 100 : 100;

  // Auto-hide chrome (progress bar + counter) after inactivity
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const showChrome = () => {
      setChromeVisible(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2500);
    };
    showChrome();
    window.addEventListener('mousemove', showChrome);
    window.addEventListener('keydown', showChrome);
    return () => {
      window.removeEventListener('mousemove', showChrome);
      window.removeEventListener('keydown', showChrome);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        if (safeIndex < total - 1) setIndex(safeIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (safeIndex > 0) setIndex(safeIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setIndex(total - 1);
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [safeIndex, total, setIndex, onExit]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Progress bar — top */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-white/10 transition-opacity duration-500 ${
          chromeVisible ? 'opacity-100' : 'opacity-0'
        }`}
        role="progressbar"
        aria-valuenow={safeIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Slide ${safeIndex + 1} de ${total}`}
      >
        <div
          className="h-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide */}
      <div className="w-full h-full">
        <PitchSlideCanvas bare>
          <Slide tokens={tokens} pageNumber={safeIndex + 1} total={total} />
        </PitchSlideCanvas>
      </div>

      {/* Bottom-left: current slide title */}
      <div
        className={`absolute bottom-5 left-6 text-white/70 text-sm font-medium select-none transition-opacity duration-500 max-w-[40vw] truncate ${
          chromeVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {current.title}
      </div>

      {/* Bottom-right: page counter */}
      <div
        className={`absolute bottom-4 right-6 flex items-center gap-3 text-white/70 select-none transition-opacity duration-500 ${
          chromeVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-mono text-base tabular-nums">
          <span className="text-white font-semibold">{String(safeIndex + 1).padStart(2, '0')}</span>
          <span className="text-white/40 mx-1">/</span>
          <span>{String(total).padStart(2, '0')}</span>
        </span>
        <span className="text-white/30 text-xs">ESC para sair</span>
      </div>
    </div>
  );
}
