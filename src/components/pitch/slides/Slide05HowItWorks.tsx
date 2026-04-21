import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

const steps = [
  { n: '01', title: 'Captar', text: 'Leads chegam de formulários, loja, WhatsApp, importação ou enriquecimento automático.' },
  { n: '02', title: 'Qualificar', text: 'IA classifica, enriquece e atribui ao gestor certo conforme regras de capacidade.' },
  { n: '03', title: 'Engajar', text: 'AI SDR envia sequências multi-canal (Email, WhatsApp, SMS) personalizadas.' },
  { n: '04', title: 'Fechar', text: 'Propostas, faturas e renovações geradas em segundos — tudo registado no CRM.' },
];

export function Slide05HowItWorks({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Como funciona" title="Em 4 passos, do lead à fatura paga" />
        <div className="grid grid-cols-4 gap-6 mt-12">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="font-black text-[#22D3EE]" style={{ fontSize: 96, lineHeight: 1 }}>{s.n}</div>
              <div className="font-bold mt-4 text-[#0F172A]" style={{ fontSize: 36 }}>{s.title}</div>
              <div className="text-[#475569] mt-3" style={{ fontSize: 22 }}>{s.text}</div>
              {i < steps.length - 1 && (
                <div className="absolute top-12 -right-3 w-6 h-1 bg-[#E2E8F0] rounded" />
              )}
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Como funciona" />
    </SlideShell>
  );
}
