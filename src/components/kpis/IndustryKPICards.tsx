import { useMemo } from "react";
import { 
  GraduationCap, 
  Stethoscope, 
  Briefcase, 
  Home,
  FileCheck,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { KPICard } from "./KPICard";
import { Badge } from "@/components/ui/badge";
import { 
  IndustryType, 
  IndustrySpecificKPIs,
  EducationKPIs,
  HealthKPIs,
  ServicesKPIs,
  RealEstateKPIs,
} from "@/types/kpis";
import { cn } from "@/lib/utils";

interface IndustryKPICardsProps {
  industryType: IndustryType;
  kpis?: IndustrySpecificKPIs;
  isLoading?: boolean;
}

const industryConfig: Record<IndustryType, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
}> = {
  general: { label: "Geral", icon: <TrendingUp className="h-4 w-4" />, color: "bg-gray-100" },
  education: { label: "Educação", icon: <GraduationCap className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  health: { label: "Saúde", icon: <Stethoscope className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  services: { label: "Serviços", icon: <Briefcase className="h-4 w-4" />, color: "bg-purple-100 text-purple-700" },
  real_estate: { label: "Imobiliário", icon: <Home className="h-4 w-4" />, color: "bg-amber-100 text-amber-700" },
  marketing: { label: "Marketing", icon: <TrendingUp className="h-4 w-4" />, color: "bg-pink-100 text-pink-700" },
  consulting: { label: "Consultoria", icon: <Briefcase className="h-4 w-4" />, color: "bg-indigo-100 text-indigo-700" },
  ecommerce: { label: "E-commerce", icon: <DollarSign className="h-4 w-4" />, color: "bg-orange-100 text-orange-700" },
};

function EducationKPICards({ kpis }: { kpis: EducationKPIs }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
      <KPICard
        label="Matrículas confirmadas"
        value={kpis.enrollmentsConfirmed}
        format="number"
        icon={<FileCheck className="h-4 w-4" />}
        description="Total de matrículas fechadas"
        highlight
      />
      <KPICard
        label="Taxa visita → matrícula"
        value={kpis.visitToEnrollmentRate}
        format="percentage"
        icon={<TrendingUp className="h-4 w-4" />}
        description="Conversão de visitas em matrículas"
      />
      <KPICard
        label="Valor por aluno"
        value={kpis.valuePerStudent}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
        description="Receita média por matrícula"
      />
      <KPICard
        label="Tempo até matrícula"
        value={kpis.avgTimeToEnrollmentDays}
        format="days"
        icon={<Clock className="h-4 w-4" />}
        description="Dias médios até confirmar matrícula"
      />
      <KPICard
        label="Documentos pendentes"
        value={kpis.pendingDocuments}
        format="number"
        icon={<AlertCircle className="h-4 w-4" />}
        description="Processos à espera de documentação"
        highlight={kpis.pendingDocuments > 0}
      />
    </div>
  );
}

function HealthKPICards({ kpis }: { kpis: HealthKPIs }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
      <KPICard
        label="Consultas marcadas"
        value={kpis.appointmentsScheduled}
        format="number"
        icon={<Calendar className="h-4 w-4" />}
        description="Total de consultas agendadas"
        highlight
      />
      <KPICard
        label="Taxa pedido → consulta"
        value={kpis.requestToAppointmentRate}
        format="percentage"
        icon={<TrendingUp className="h-4 w-4" />}
        description="Conversão de pedidos em consultas"
      />
      <KPICard
        label="Taxa no-show"
        value={kpis.noShowRate}
        format="percentage"
        icon={<AlertCircle className="h-4 w-4" />}
        description="Pacientes que faltam às consultas"
        highlight={kpis.noShowRate > 10}
      />
      <KPICard
        label="Tempo até consulta"
        value={kpis.avgTimeToFirstAppointmentDays}
        format="days"
        icon={<Clock className="h-4 w-4" />}
        description="Dias até primeira consulta"
      />
      <KPICard
        label="Em tratamento"
        value={kpis.treatmentsInProgress}
        format="number"
        icon={<Stethoscope className="h-4 w-4" />}
        description="Tratamentos ativos"
      />
    </div>
  );
}

function ServicesKPICards({ kpis }: { kpis: ServicesKPIs }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
      <KPICard
        label="Propostas enviadas"
        value={kpis.proposalsSent}
        format="number"
        icon={<FileCheck className="h-4 w-4" />}
        description="Total de propostas enviadas"
      />
      <KPICard
        label="Taxa de ganho"
        value={kpis.proposalWinRate}
        format="percentage"
        icon={<TrendingUp className="h-4 w-4" />}
        description="Propostas ganhas vs fechadas"
        highlight
      />
      <KPICard
        label="Ticket médio"
        value={kpis.avgTicket}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
        description="Valor médio por projeto"
      />
      <KPICard
        label="Receita recorrente"
        value={kpis.activeRecurringRevenue}
        format="currency"
        icon={<TrendingUp className="h-4 w-4" />}
        description="Valor de contratos ativos"
        highlight
      />
      <KPICard
        label="Projetos ativos"
        value={kpis.projectsInProgress}
        format="number"
        icon={<Briefcase className="h-4 w-4" />}
        description="Projetos em execução"
      />
    </div>
  );
}

function RealEstateKPICards({ kpis }: { kpis: RealEstateKPIs }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
      <KPICard
        label="Visitas agendadas"
        value={kpis.visitsScheduled}
        format="number"
        icon={<Calendar className="h-4 w-4" />}
        description="Visitas marcadas"
      />
      <KPICard
        label="Taxa visita → reserva"
        value={kpis.visitToReservationRate}
        format="percentage"
        icon={<TrendingUp className="h-4 w-4" />}
        description="Conversão de visitas"
        highlight
      />
      <KPICard
        label="Valor médio imóvel"
        value={kpis.avgPropertyValue}
        format="currency"
        icon={<Home className="h-4 w-4" />}
        description="Preço médio dos imóveis"
      />
      <KPICard
        label="Em negociação"
        value={kpis.propertiesInNegotiation}
        format="number"
        icon={<Users className="h-4 w-4" />}
        description="Imóveis em fase de proposta"
      />
      <KPICard
        label="Tempo até fecho"
        value={kpis.avgTimeToCloseDays}
        format="days"
        icon={<Clock className="h-4 w-4" />}
        description="Dias médios até escritura"
      />
    </div>
  );
}

export function IndustryKPICards({ industryType, kpis, isLoading }: IndustryKPICardsProps) {
  const config = industryConfig[industryType];

  if (industryType === "general" || !kpis) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("gap-1", config.color)}>
            {config.icon}
            {config.label}
          </Badge>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={cn("gap-1", config.color)}>
          {config.icon}
          KPIs de {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Métricas adaptadas ao teu tipo de negócio
        </span>
      </div>

      {industryType === "education" && <EducationKPICards kpis={kpis as EducationKPIs} />}
      {industryType === "health" && <HealthKPICards kpis={kpis as HealthKPIs} />}
      {industryType === "services" && <ServicesKPICards kpis={kpis as ServicesKPIs} />}
      {industryType === "real_estate" && <RealEstateKPICards kpis={kpis as RealEstateKPIs} />}
    </div>
  );
}
