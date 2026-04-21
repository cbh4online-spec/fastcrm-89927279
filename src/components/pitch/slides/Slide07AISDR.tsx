import { PitchTokens } from '@/lib/pitch/tokens';
import { resolveSlideContent } from '@/lib/pitch/slideContent';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Bot, MessageSquare, Mail, Send } from 'lucide-react';

const channels = [
  { icon: Mail, label: 'Email', color: '#3B82F6' },
  { icon: MessageSquare, label: 'WhatsApp', color: '#16A34A' },
  { icon: Send, label: 'SMS', color: '#F59E0B' },
  { icon: Bot, label: 'AI Voice', color: '#8B5CF6' },
];

export function Slide07AISDR({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const c = resolveSlideContent('ai-sdr', tokens.slideOverrides);
  const items = c.items || [];
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow={c.eyebrow} title={c.title || ''} subtitle={c.subtitle} />
        <div className="grid grid-cols-12 gap-8 mt-8">
          <div className="col-span-7 space-y-5">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl p-6 border border-[#E2E8F0] bg-white">
                <div className="font-bold text-[#0F172A]" style={{ fontSize: 26 }}>{it.title}</div>
                <div className="text-[#475569] mt-2" style={{ fontSize: 20 }}>{it.text}</div>
              </div>
            ))}
          </div>
          <div className="col-span-5 rounded-2xl p-10 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white">
            <div className="text-[#22D3EE] font-semibold uppercase tracking-wide" style={{ fontSize: 18 }}>Canais nativos</div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              {channels.map((ch) => (
                <div key={ch.label} className="rounded-xl p-6 bg-white/5 border border-white/10 flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: ch.color }}>
                    <ch.icon className="w-9 h-9 text-white" />
                  </div>
                  <div className="font-semibold" style={{ fontSize: 22 }}>{ch.label}</div>
                </div>
              ))}
            </div>
            {c.extraText && (
              <div className="mt-10 rounded-xl p-6 bg-[#22D3EE] text-[#0F172A]">
                <div className="font-bold" style={{ fontSize: 26 }}>{c.extraText}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="AI SDR" />
    </SlideShell>
  );
}
