import type { VerticalConfig } from "@/config/verticalConfigs";
import { getIconByName } from "@/lib/icons";

interface Props {
  config: VerticalConfig;
}

const verticalLeads: Record<string, { name: string; detail: string }[]> = {
  clinicas: [
    { name: "Maria Costa", detail: "Consulta Dermatologia" },
    { name: "João Ferreira", detail: "Check-up Anual" },
    { name: "Ana Ribeiro", detail: "Fisioterapia" },
    { name: "Pedro Santos", detail: "Ortodontia" },
    { name: "Sofia Lopes", detail: "Nutrição Clínica" },
    { name: "Carlos Mendes", detail: "Consulta Geral" },
  ],
  ginasios: [
    { name: "João Silva", detail: "Plano Premium" },
    { name: "Rita Oliveira", detail: "Personal Training" },
    { name: "Miguel Costa", detail: "Plano Anual" },
    { name: "Inês Martins", detail: "Aulas de Grupo" },
    { name: "Tiago Alves", detail: "Plano Família" },
    { name: "Beatriz Sousa", detail: "CrossFit" },
  ],
  imobiliarias: [
    { name: "André Pereira", detail: "T3 Expo - 285k€" },
    { name: "Carla Nunes", detail: "Moradia V4 - 420k€" },
    { name: "Hugo Vieira", detail: "T2 Centro - 195k€" },
    { name: "Marta Dias", detail: "Terreno 500m²" },
    { name: "Rui Gomes", detail: "T1 Investimento" },
    { name: "Filipa Rocha", detail: "Loja Comercial" },
  ],
  consultoras: [
    { name: "Paulo Marques", detail: "Consultoria Digital" },
    { name: "Teresa Lima", detail: "Reestruturação" },
    { name: "Ricardo Faria", detail: "Estratégia Go-to-Market" },
    { name: "Sandra Pinto", detail: "Auditoria Processos" },
    { name: "Nuno Braga", detail: "M&A Advisory" },
    { name: "Clara Santos", detail: "Due Diligence" },
  ],
};

const pipelineColumns = ["Novo Lead", "Em Contacto", "Proposta", "Fechado"];

function getLeads(slug: string, nome: string) {
  if (verticalLeads[slug]) return verticalLeads[slug];
  return [
    { name: "Ana Silva", detail: `Serviço ${nome}` },
    { name: "Pedro Costa", detail: `Pacote Premium` },
    { name: "Maria Santos", detail: `Consulta Inicial` },
    { name: "João Ferreira", detail: `Proposta Activa` },
    { name: "Sofia Lopes", detail: `Renovação` },
    { name: "Carlos Dias", detail: `Novo Projecto` },
  ];
}

export function DashboardMockup({ config }: Props) {
  const leads = getLeads(config.slug, config.nome);
  const primaryColor = config.cores.primaria;

  const columnLeads = [
    [leads[0], leads[1]],
    [leads[2]],
    [leads[3], leads[4]],
    [leads[5]],
  ];

  const stats = [
    { label: "Contactos", value: "1.247" },
    { label: "Oportunidades", value: "83" },
    { label: "Pipeline", value: "€124.5k" },
  ];

  return (
    <div
      className="w-full select-none pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{ fontSize: "10px" }}
    >
      <div className="rounded-lg overflow-hidden border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)]">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-[110px] sm:w-[140px] shrink-0 border-r border-[hsl(217,33%,17%)] bg-[hsl(222,47%,5%)] p-3 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-bold text-white"
                style={{ background: primaryColor }}
              >
                F
              </div>
              <span className="text-[9px] font-semibold text-[hsl(210,40%,98%)]">
                FastCRM
              </span>
            </div>

            <div
              className="rounded-md px-2 py-1 text-[8px] font-medium truncate"
              style={{
                background: `${primaryColor.replace(")", "/0.15)")}`,
                color: primaryColor,
              }}
            >
              📊 {config.nome}
            </div>

            <div className="flex flex-col gap-1 mt-1">
              {config.modulos_ativos.slice(0, 5).map((mod, i) => {
                const Icon = getIconByName(mod.icon);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[8px] text-[hsl(215,20%,55%)] hover:bg-transparent"
                  >
                    <Icon className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{mod.nome}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top stats bar */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[hsl(217,33%,17%)]">
              <span className="text-[9px] font-semibold text-[hsl(210,40%,98%)]">
                Pipeline — {config.nome}
              </span>
              <div className="flex gap-4 ml-auto">
                {stats.map((s, i) => (
                  <div key={i} className="text-center">
                    <div
                      className="text-[10px] font-bold"
                      style={{ color: primaryColor }}
                    >
                      {s.value}
                    </div>
                    <div className="text-[7px] text-[hsl(215,20%,50%)]">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kanban columns */}
            <div className="flex gap-2 p-3 min-h-[180px]">
              {pipelineColumns.map((col, ci) => (
                <div
                  key={col}
                  className="flex-1 min-w-0 rounded-lg bg-[hsl(222,47%,8%)] p-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] font-semibold text-[hsl(215,20%,65%)] uppercase tracking-wider">
                      {col}
                    </span>
                    <span
                      className="text-[7px] font-medium rounded-full px-1.5 py-0.5"
                      style={{
                        background: `${primaryColor.replace(")", "/0.15)")}`,
                        color: primaryColor,
                      }}
                    >
                      {columnLeads[ci]?.length || 0}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {columnLeads[ci]?.map((lead, li) => (
                      <div
                        key={li}
                        className="rounded-md border border-[hsl(217,33%,17%)] bg-[hsl(222,47%,6%)] p-2"
                      >
                        <div className="text-[8px] font-medium text-[hsl(210,40%,98%)] truncate">
                          {lead.name}
                        </div>
                        <div className="text-[7px] text-[hsl(215,20%,50%)] truncate mt-0.5">
                          {lead.detail}
                        </div>
                        {ci === 3 && (
                          <div className="mt-1 text-[7px] font-medium text-emerald-400">
                            ✓ Ganho
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
