import { PitchTokens, fillToken, formatMeetingDate } from '@/lib/pitch/tokens';
import { SlideShell } from './SlideShell';
import { Sparkles } from 'lucide-react';

export function Slide01Cover({ tokens }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  const contact = fillToken(tokens.contactName, '');
  const presenter = fillToken(tokens.presenterName, 'Equipa FastCRM');
  const date = formatMeetingDate(tokens.meetingDate);

  return (
    <SlideShell variant="accent">
      {/* Decorative blob */}
      <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, #22D3EE33 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-full h-2" style={{ background: 'linear-gradient(90deg, #22D3EE 0%, #22D3EE 30%, transparent 100%)' }} />

      <div className="absolute top-20 left-20 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: '#22D3EE' }}>
          <Sparkles className="w-12 h-12 text-[#0F172A]" />
        </div>
        <div>
          <div className="font-black text-white" style={{ fontSize: 48, lineHeight: 1 }}>FastCRM</div>
          <div className="text-white/60 mt-1" style={{ fontSize: 18 }}>by Método PARE</div>
        </div>
      </div>

      {tokens.companyLogoUrl && (
        <div className="absolute top-20 right-20 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <img src={tokens.companyLogoUrl} alt={company} className="max-h-24 max-w-[280px] object-contain" />
        </div>
      )}

      <div className="absolute left-20 right-20" style={{ top: 360 }}>
        <div className="text-[#22D3EE] font-semibold uppercase tracking-[0.3em] mb-6" style={{ fontSize: 22 }}>
          Proposta comercial
        </div>
        <h1 className="font-black leading-[1.05]" style={{ fontSize: 120 }}>
          Para <span className="text-[#22D3EE]">{company}</span>
        </h1>
        <p className="mt-8 text-white/70 max-w-[1400px]" style={{ fontSize: 34 }}>
          O CRM com IA que unifica vendas, marketing, faturação e atendimento — pensado para PME portuguesas que querem escalar com método.
        </p>
      </div>

      <div className="absolute bottom-20 left-20 right-20 flex items-end justify-between">
        <div>
          {contact && (
            <>
              <div className="text-white/50 uppercase tracking-[0.2em]" style={{ fontSize: 16 }}>Apresentado a</div>
              <div className="font-semibold mt-2" style={{ fontSize: 32 }}>{contact}</div>
              {tokens.contactRole && (
                <div className="text-white/60" style={{ fontSize: 22 }}>{tokens.contactRole}</div>
              )}
            </>
          )}
        </div>
        <div className="text-right">
          <div className="text-white/50 uppercase tracking-[0.2em]" style={{ fontSize: 16 }}>Apresentado por</div>
          <div className="font-semibold mt-2" style={{ fontSize: 32 }}>{presenter}</div>
          {date && <div className="text-white/60" style={{ fontSize: 22 }}>{date}</div>}
        </div>
      </div>
      <a
        href="https://fastcrm.metodopare.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#22D3EE] font-semibold hover:underline"
        style={{ fontSize: 18 }}
      >
        fastcrm.metodopare.ai
      </a>
    </SlideShell>
  );
}
