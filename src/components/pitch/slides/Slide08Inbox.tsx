import { PitchTokens } from '@/lib/pitch/tokens';
import { SlideShell, SlideHeader, SlideFooter } from './SlideShell';
import { MessageSquare, Mail, Phone, Send, Instagram, Facebook } from 'lucide-react';

const channels = [
  { icon: MessageSquare, title: 'WhatsApp Business', text: 'QR + Evolution API. Templates aprovados, envio em 1 clique.' },
  { icon: Mail, title: 'Email integrado', text: 'Sequências, tracking de abertura e resposta unificada na inbox.' },
  { icon: Phone, title: 'SMS (Twilio)', text: 'Notificações transaccionais e campanhas com signature validation.' },
  { icon: Send, title: 'Telegram', text: 'Bot @ + grupos sincronizados, com webhook resiliente.' },
  { icon: Instagram, title: 'Instagram DM', text: 'Conversas geridas no mesmo inbox, via GoHighLevel.' },
  { icon: Facebook, title: 'Facebook Messenger', text: 'Atendimento centralizado, atribuído ao gestor certo.' },
];

export function Slide08Inbox({ pageNumber, total }: { tokens: PitchTokens; pageNumber: number; total: number }) {
  return (
    <SlideShell variant="light">
      <div className="absolute inset-0" style={{ padding: '100px 80px' }}>
        <SlideHeader eyebrow="Funcionalidade #3" title="Inbox omnichannel" subtitle="Todos os canais num só inbox — nada se perde, tudo fica registado no CRM." />
        <div className="grid grid-cols-3 gap-6 mt-8">
          {channels.map((c) => (
            <div key={c.title} className="rounded-2xl p-8 border border-[#E2E8F0] flex gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#0F172A' }}>
                <c.icon className="w-8 h-8 text-[#22D3EE]" />
              </div>
              <div>
                <div className="font-bold text-[#0F172A]" style={{ fontSize: 26 }}>{c.title}</div>
                <div className="text-[#475569] mt-2" style={{ fontSize: 19 }}>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter pageNumber={pageNumber} total={total} label="Inbox" />
    </SlideShell>
  );
}
