import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';

const stats = [
  { value: '€8B', label: 'Mercado SaaS B2B em PT', sub: 'crescimento médio anual de 12%' },
  { value: '74%', label: 'das PME ainda usam Excel ou ferramentas dispersas', sub: 'fonte: ANETIE 2024' },
  { value: '+38%', label: 'aumento médio de receita com CRM bem implementado', sub: 'estudos Forrester / Nucleus' },
  { value: '5x', label: 'ROI típico em 12 meses', sub: 'face ao custo da licença e onboarding' },
];

export function Slide03Opportunity({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="A Oportunidade" title="O mercado está a digitalizar — quem chega primeiro ganha quota" subtitle="A maioria das PME portuguesas ainda não tem CRM. Quem automatiza vende mais, com a mesma equipa." />
        <div className="grid grid-cols-2 gap-8 mt-12">
          {stats.map((s) => (
            <div key={s.value} className="rounded-2xl p-12 border-l-8 border-[#22D3EE] bg-[#F8FAFC]">
              <div className="font-black text-[#0F172A]" style={{ fontSize: 96, lineHeight: 1 }}>{s.value}</div>
              <div className="font-semibold mt-4 text-[#0F172A]" style={{ fontSize: 26 }}>{s.label}</div>
              <div className="text-[#64748B] mt-2" style={{ fontSize: 20 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Oportunidade" />
    </SlideShell>
  );
}
