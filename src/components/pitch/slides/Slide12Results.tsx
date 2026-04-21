import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

const kpis = [
  { v: '+38%', l: 'Receita por comercial', sub: 'média nos primeiros 6 meses' },
  { v: '−65%', l: 'Tempo em tarefas operacionais', sub: 'follow-ups, propostas, faturação' },
  { v: '×3,1', l: 'Conversão lead → cliente', sub: 'graças ao AI SDR e ao PARE Score' },
  { v: '4,9/5', l: 'Satisfação das equipas', sub: 'após 90 dias de uso' },
];

export function Slide12Results({ tokens, pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  return (
    <SlideShell variant="dark">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader dark eyebrow="Resultados esperados" title={`O que ${company} pode esperar`} subtitle="Indicadores médios em PME com 5 a 50 utilizadores nos primeiros 90 dias." />
        <div className="grid grid-cols-4 gap-6 mt-12">
          {kpis.map((k) => (
            <div key={k.l} className="rounded-2xl p-10 bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="font-black text-[#22D3EE]" style={{ fontSize: 88, lineHeight: 1 }}>{k.v}</div>
              <div className="font-semibold mt-4 text-white" style={{ fontSize: 26 }}>{k.l}</div>
              <div className="text-white/60 mt-2" style={{ fontSize: 18 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter dark pageNumber={pageNumber} total={total} label="Resultados" />
    </SlideShell>
  );
}
