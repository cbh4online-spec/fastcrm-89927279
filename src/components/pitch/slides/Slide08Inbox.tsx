import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { MessageSquare, Mail, Phone, Send, Instagram, Facebook } from 'lucide-react';

const ICONS = [MessageSquare, Mail, Phone, Send, Instagram, Facebook];

export function Slide08Inbox({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('inbox', tokens.slideOverrides);
  const items = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />
        <div className="grid grid-cols-3 gap-6 mt-8">
          {items.map((ch, i) => {
            const Icon = ICONS[i] || MessageSquare;
            return (
              <div key={i} className="rounded-2xl p-8 border border-[#E2E8F0] flex gap-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#0F172A' }}>
                  <Icon className="w-8 h-8 text-[#22D3EE]" />
                </div>
                <div>
                  <div className="font-bold text-[#0F172A]" style={{ fontSize: 26 }}>{ch.title}</div>
                  <div className="text-[#475569] mt-2" style={{ fontSize: 19 }}>{ch.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Inbox" />
    </SlideShell>
  );
}
