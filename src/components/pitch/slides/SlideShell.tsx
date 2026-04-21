import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SlideShellProps {
  children: ReactNode;
  variant?: 'light' | 'dark' | 'accent';
  className?: string;
}

const variantStyles: Record<NonNullable<SlideShellProps['variant']>, string> = {
  light: 'bg-white text-[#0B1220]',
  dark: 'bg-[#0F172A] text-white',
  accent: 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white',
};

export function SlideShell({ children, variant = 'light', className }: SlideShellProps) {
  return (
    <div
      className={cn(
        'w-full h-full relative overflow-hidden',
        variantStyles[variant],
        className
      )}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}

export function SlideHeader({ eyebrow, title, subtitle, dark }: { eyebrow?: string; title: string; subtitle?: string; dark?: boolean }) {
  return (
    <div className="mb-12">
      {eyebrow && (
        <div
          className={cn(
            'text-sm font-semibold uppercase tracking-[0.2em] mb-4',
            dark ? 'text-[#22D3EE]' : 'text-[#1E293B]/60'
          )}
        >
          {eyebrow}
        </div>
      )}
      <h2 className={cn('font-bold leading-tight', dark ? 'text-white' : 'text-[#0F172A]')} style={{ fontSize: 64 }}>
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-4 max-w-[1400px]', dark ? 'text-white/70' : 'text-[#475569]')} style={{ fontSize: 28 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function SlideFooter({ pageNumber, total, label, dark }: { pageNumber: number; total: number; label?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        'absolute bottom-10 left-20 right-20 flex items-center justify-between text-xs tracking-[0.25em]',
        dark ? 'text-white/40' : 'text-[#0F172A]/40'
      )}
      style={{ fontSize: 16 }}
    >
      <div className="uppercase">FastCRM{label ? ` · ${label}` : ''}</div>
      <a
        href="https://fastcrm.lovable.app"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold tracking-normal hover:underline transition-colors text-[#22D3EE]"
        style={{ fontSize: 18 }}
      >
        fastcrm.metodopare.ai
      </a>
      <div className="uppercase">
        {pageNumber} / {total}
      </div>
    </div>
  );
}
