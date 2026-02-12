import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { SubchannelLayout } from "@/components/fastclub/SubchannelLayout";

const correctExamples = [
  "Oferta: 'Implementação de CRM para equipas comerciais de 5-20 pessoas em B2B'",
  "Procura: 'Parceiros com acesso a PMEs no setor de tecnologia na região Norte'",
  "Bio: 'CEO de consultoria especializada em transformação digital para indústria'",
];

const incorrectExamples = [
  "Oferta: 'Fazemos tudo na área de marketing' — demasiado genérico",
  "Procura: 'Qualquer contacto que precise de algo' — sem filtro estratégico",
  "Bio: 'Empreendedor apaixonado por inovação' — não comunica valor",
];

export default function OtimizarPerfilPage() {
  return (
    <SubchannelLayout
      title="Otimizar Perfil"
      subtitle="Modelos de oferta, procura e exemplos concretos para maximizar o seu perfil."
      zoneBadge="Rede Privada"
      breadcrumbs={[
        { label: "FastClub", href: "/dashboard/fastclub" },
        { label: "Rede Privada", href: "/dashboard/fastclub/rede-privada" },
        { label: "Otimizar Perfil" },
      ]}
      backPath="/dashboard/fastclub/rede-privada"
      ctaLabel="Abrir FastMatch no CRM"
      ctaPath="/dashboard/fastmatch"
    >
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-lg">Exemplos Corretos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {correctExamples.map((ex) => (
                <div key={ex} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{ex}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50 border-destructive/20">
            <CardHeader><CardTitle className="text-lg">Exemplos a Evitar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {incorrectExamples.map((ex) => (
                <div key={ex} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive/60 mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">{ex}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </SubchannelLayout>
  );
}
