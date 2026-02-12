import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const sections = [
  {
    title: "Como Qualificar",
    items: [
      "Analise o perfil completo antes de enviar pedido de conexão",
      "Verifique se os serviços oferecidos complementam os seus",
      "Priorize membros verificados e com reputação elevada",
      "Considere o ticket range e o setor de atuação",
    ],
  },
  {
    title: "Como Comunicar",
    items: [
      "Primeira mensagem: apresente-se e explique o motivo do contacto",
      "Seja específico sobre o que procura e o que oferece",
      "Evite mensagens genéricas copiadas — personalização é chave",
      "Responda em até 48h para manter a taxa de resposta elevada",
    ],
  },
  {
    title: "Como Converter",
    items: [
      "Agende uma chamada de qualificação antes de propor negócio",
      "Prepare um mini-briefing com pontos de sinergia identificados",
      "Comece com um projeto piloto de baixo risco para construir confiança",
      "Documente resultados e partilhe na secção de Negócios Fechados",
    ],
  },
];

export default function EstrategiasPage() {
  return (
    <SubchannelLayout
      title="Estratégias de Abordagem"
      subtitle="Como qualificar, comunicar e converter conexões em negócios reais."
      zoneBadge="Rede Privada"
      breadcrumbs={[
        { label: "FastClub", href: "/club/fastclub" },
        { label: "Rede Privada", href: "/club/fastclub/rede-privada" },
        { label: "Estratégias" },
      ]}
      backPath="/club/fastclub/rede-privada"
      ctaLabel="Abrir FastMatch no CRM"
      ctaPath="/dashboard/fastmatch"
    >
      <div className="space-y-6">
        {sections.map((section, i) => (
          <motion.div key={section.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}>
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </SubchannelLayout>
  );
}
