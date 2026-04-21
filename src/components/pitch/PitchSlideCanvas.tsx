import { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PitchSlideCanvasProps {
  children: ReactNode;
  className?: string;
  /** When true, no padding around — used in fullscreen mode */
  bare?: boolean;
}

/**
 * Renders a fixed 1920x1080 slide and scales it to fit the parent container.
 */
export function PitchSlideCanvas({ children, className, bare }: PitchSlideCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.min(width / 1920, height / 1080);
      setScale(s > 0 ? s : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full overflow-hidden',
        !bare && 'rounded-xl shadow-2xl bg-white',
        className
      )}
      style={{ aspectRatio: bare ? undefined : '16 / 9' }}
    >
      <div
        className="slide-content absolute"
        style={{
          width: 1920,
          height: 1080,
          left: '50%',
          top: '50%',
          marginLeft: -960,
          marginTop: -540,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
