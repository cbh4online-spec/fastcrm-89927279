import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { Check, X } from 'lucide-react';

const rows = [
  { feature: 'CRM + Faturação + Loja num só produto', us: true, them: false },
  { feature: 'AI SDR nativo (sem integrações externas)', us: true, them: false },
  { feature: 'Pensado para o mercado e legislação PT', us: true, them: false },
  { feature: 'Inbox omnichannel (WhatsApp, Email, SMS, IG, FB)', us: true, them: true },
  { feature: 'Marketplace C2C / Portal B2B incluídos', us: true, them: false },
  { feature: 'Ebooks & Lead Magnets nativos', us: true, them: false },
  { feature: 'Pricing transparente, sem custos por contacto', us: true, them: false },
  { feature: 'Onboarding com método estruturado (PARE)', us: true, them: false },
];

export function Slide11Differentiators({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Diferenciadores" title="Porque é que o FastCRM ganha" />
        <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden mt-8">
          <div className="grid grid-cols-12 bg-[#0F172A] text-white" style={{ fontSize: 22 }}>
            <div className="col-span-8 p-6 font-semibold">Funcionalidade</div>
            <div className="col-span-2 p-6 text-center font-bold text-[#22D3EE]">FastCRM</div>
            <div className="col-span-2 p-6 text-center font-semibold text-white/60">CRM genérico</div>
          </div>
          {rows.map((r, i) => (
            <div key={r.feature} className={`grid grid-cols-12 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`} style={{ fontSize: 22 }}>
              <div className="col-span-8 p-5 text-[#0F172A]">{r.feature}</div>
              <div className="col-span-2 p-5 flex justify-center">
                {r.us ? <Check className="w-9 h-9" style={{ color: '#0E7490' }} /> : <X className="w-9 h-9 text-[#94A3B8]" />}
              </div>
              <div className="col-span-2 p-5 flex justify-center">
                {r.them ? <Check className="w-9 h-9" style={{ color: '#0E7490' }} /> : <X className="w-9 h-9 text-[#94A3B8]" />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Diferenciadores" />
    </SlideShell>
  );
}
