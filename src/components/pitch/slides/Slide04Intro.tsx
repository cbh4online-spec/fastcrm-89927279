import { PitchTokens, fillToken } from '@/lib/pitch/tokens';
import { SlideShell } from './SlideShell';

export function Slide04Intro({ tokens }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  const company = fillToken(tokens.companyName, 'a sua empresa');
  return (
    <SlideShell variant="dark">
      <div className="absolute -bottom-40 -left-40 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, #22D3EE22 0%, transparent 70%)' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ padding: '120px' }}>
        <div className="text-[#22D3EE] font-semibold uppercase tracking-[0.3em] mb-8" style={{ fontSize: 24 }}>O que é o FastCRM</div>
        <h1 className="font-black leading-[1.05] max-w-[1700px]" style={{ fontSize: 96 }}>
          O <span className="text-[#22D3EE]">copiloto comercial</span> que ajuda {company} a vender mais, com a mesma equipa.
        </h1>
        <p className="mt-12 text-white/70 max-w-[1500px]" style={{ fontSize: 32 }}>
          CRM, AI SDR, Inbox omnichannel, Faturação, Loja Online e Marketplace — tudo numa única plataforma desenhada em Portugal, para PME portuguesas.
        </p>
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
