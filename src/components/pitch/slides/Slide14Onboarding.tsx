import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

const weeks = [
  { w: 'Semana 1', t: 'Setup & Importação', d: 'Configuração do workspace, importação de contactos, ligação a WhatsApp/Email/Calendário.' },
  { w: 'Semana 2', t: 'Formação da equipa', d: 'Workshops práticos com comerciais e gestores. Vídeos e manuais personalizados ao processo.' },
  { w: 'Semana 3', t: 'Automações & AI SDR', d: 'Configuração de pipelines, sequências, templates e regras de atribuição automática.' },
  { w: 'Semana 4', t: 'Optimização & KPIs', d: 'Revisão de métricas, refinamento de templates e definição de cadência mensal.' },
];

export function Slide14Onboarding({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const presenter = fillToken(tokens.presenterName, 'a equipa de Customer Success');
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Roadmap" title="Onboarding em 4 semanas" subtitle={`${presenter} acompanha todo o processo do dia 1 ao dia 30.`} />
        <div className="grid grid-cols-4 gap-6 mt-12">
          {weeks.map((w, i) => (
            <div key={w.w} className="relative">
              <div className="rounded-full w-16 h-16 flex items-center justify-center font-black text-white" style={{ background: '#0F172A', fontSize: 28 }}>{i + 1}</div>
              <div className="text-[#0E7490] font-semibold uppercase tracking-wide mt-6" style={{ fontSize: 18 }}>{w.w}</div>
              <div className="font-bold text-[#0F172A] mt-2" style={{ fontSize: 32 }}>{w.t}</div>
              <div className="text-[#475569] mt-3" style={{ fontSize: 22 }}>{w.d}</div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Onboarding" />
    </SlideShell>
  );
}
