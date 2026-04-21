import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { resolveSlideContent, interpolate } from '@/lib/pitch/slideContent';
import { SlideShell } from './SlideShell';
import { Mail, Phone, Sparkles } from 'lucide-react';

export function Slide15Next({ tokens }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  const presenter = fillToken(tokens.presenterName, 'Equipa FastCRM');
  const c = resolveSlideContent('next', tokens.slideOverrides);
  const heroText = interpolate(c.heroText, { company });
  const items = c.items || [];
  return (
    <SlideShell variant="accent">
      <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, #22D3EE33 0%, transparent 70%)' }} />
      <div className="absolute top-20 left-20 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#22D3EE' }}>
          <Sparkles className="w-9 h-9 text-[#0F172A]" />
        </div>
        <div className="font-black text-white" style={{ fontSize: 36, lineHeight: 1 }}>FastCRM</div>
      </div>
      <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: '120px' }}>
        <div className="text-[#22D3EE] font-semibold uppercase tracking-[0.3em] mb-6" style={{ fontSize: 24 }}>{c.eyebrow}</div>
        <h1 className="font-black leading-[1.05]" style={{ fontSize: 110 }}>{heroText}</h1>
        <div className="grid grid-cols-3 gap-6 mt-16">
          {items.map((s, i) => (
            <div key={i} className="rounded-2xl p-8 bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-[#22D3EE] font-black" style={{ fontSize: 56 }}>{String(i + 1).padStart(2, '0')}</div>
              <div className="font-bold text-white mt-2" style={{ fontSize: 30 }}>{s.title}</div>
              <div className="text-white/70 mt-2" style={{ fontSize: 22 }}>{s.text}</div>
            </div>
          ))}
        </div>
        <div className="mt-16 rounded-2xl p-10 bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-between">
          <div>
            <div className="text-white/60 uppercase tracking-[0.2em]" style={{ fontSize: 16 }}>Falar com</div>
            <div className="font-bold text-white mt-2" style={{ fontSize: 40 }}>{presenter}</div>
          </div>
          <div className="flex gap-10">
            {tokens.presenterEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-[#22D3EE]" />
                <span className="text-white" style={{ fontSize: 26 }}>{tokens.presenterEmail}</span>
              </div>
            )}
            {tokens.presenterPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-8 h-8 text-[#22D3EE]" />
                <span className="text-white" style={{ fontSize: 26 }}>{tokens.presenterPhone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <a href="https://fastcrm.metodopare.ai" target="_blank" rel="noopener noreferrer" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#22D3EE] font-semibold hover:underline" style={{ fontSize: 18 }}>
        fastcrm.metodopare.ai
      </a>
    </SlideShell>
  );
}
