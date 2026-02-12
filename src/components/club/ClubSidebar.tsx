import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFastClubMembership } from "@/hooks/useFastClubMembership";
import {
  Zap, Compass, Target, ClipboardList, BarChart3, Gauge, Play, Briefcase,
  TrendingUp, Users, BookOpen, UserCheck, ChevronDown, ChevronRight,
  CalendarClock, Brain, FlaskConical, Mic, Newspaper, Rocket, CreditCard,
  Crown, X, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ClubSidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof Zap;
}

interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  premium?: boolean;
}

const publicSections: NavSection[] = [
  {
    label: "Zona Pública",
    items: [
      { name: "Hub", href: "/club/fastclub", icon: Zap },
      { name: "Start Here", href: "/club/fastclub/start-here", icon: Compass },
    ],
  },
  {
    label: "Método PARE",
    collapsible: true,
    items: [
      { name: "Visão Geral", href: "/club/fastclub/metodo-pare", icon: Target },
      { name: "Planeamento", href: "/club/fastclub/metodo-pare/planeamento", icon: ClipboardList },
      { name: "Automação", href: "/club/fastclub/metodo-pare/automacao", icon: Zap },
      { name: "Resultados", href: "/club/fastclub/metodo-pare/resultados", icon: BarChart3 },
      { name: "Eficiência", href: "/club/fastclub/metodo-pare/eficiencia", icon: Gauge },
    ],
  },
  {
    label: "FastCRM em Ação",
    collapsible: true,
    items: [
      { name: "Visão Geral", href: "/club/fastclub/demos", icon: Play },
      { name: "Demonstrações", href: "/club/fastclub/demos/demonstracoes", icon: Play },
      { name: "Casos Práticos", href: "/club/fastclub/demos/casos-praticos", icon: Briefcase },
      { name: "Roadmap", href: "/club/fastclub/demos/roadmap", icon: TrendingUp },
    ],
  },
  {
    label: "Resultados",
    items: [
      { name: "Resultados", href: "/club/fastclub/resultados", icon: TrendingUp },
    ],
  },
];

const redePrivadaSection: NavSection = {
  label: "Rede Privada",
  collapsible: true,
  items: [
    { name: "Visão Geral", href: "/club/fastclub/rede-privada", icon: Users },
    { name: "Como Funciona", href: "/club/fastclub/rede-privada/como-funciona", icon: BookOpen },
    { name: "Otimizar Perfil", href: "/club/fastclub/rede-privada/otimizar-perfil", icon: UserCheck },
    { name: "Indicadores", href: "/club/fastclub/rede-privada/indicadores", icon: BarChart3 },
    { name: "Negócios Fechados", href: "/club/fastclub/rede-privada/negocios-fechados", icon: Briefcase },
    { name: "Estratégias", href: "/club/fastclub/rede-privada/estrategias", icon: Target },
  ],
};

const premiumSections: NavSection[] = [
  {
    label: "Zona Premium",
    premium: true,
    items: [
      { name: "Missão da Semana", href: "/club/fastclub/missao-semana", icon: CalendarClock },
      { name: "Implementação Guiada", href: "/club/fastclub/implementacao", icon: BookOpen },
      { name: "IA Avançada", href: "/club/fastclub/ia-avancada", icon: Brain },
      { name: "Laboratório Fast", href: "/club/fastclub/laboratorio", icon: FlaskConical },
      { name: "Hot Seats", href: "/club/fastclub/hot-seats", icon: Mic },
    ],
  },
];

const institucionalSection: NavSection = {
  label: "Institucional",
  items: [
    { name: "Anúncios Oficiais", href: "/club/fastclub/anuncios", icon: Newspaper },
    { name: "Atualizações", href: "/club/fastclub/atualizacoes", icon: Rocket },
  ],
};

function CollapsibleSection({ section, pathname }: { section: NavSection; pathname: string }) {
  const isActive = section.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
  const [open, setOpen] = useState(isActive);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
        <span>{section.label}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5">
          {section.items.map(item => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href;
  return (
    <Link
      to={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function ClubSidebar({ open, onClose }: ClubSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { tier } = useFastClubMembership();

  const renderSection = (section: NavSection) => {
    if (section.collapsible) {
      return <CollapsibleSection key={section.label} section={section} pathname={pathname} />;
    }

    return (
      <div key={section.label}>
        {section.items.length > 1 && (
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {section.label}
          </p>
        )}
        <div className="space-y-0.5">
          {section.items.map(item => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">FastClub</h2>
            <p className="text-[10px] text-muted-foreground">Ecossistema FastCRM</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="lg:hidden h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {publicSections.map(renderSection)}

        <div className="border-t pt-3">
          {renderSection(redePrivadaSection)}
        </div>

        {(tier === "premium") && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <Crown className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Premium</span>
            </div>
            {premiumSections.map(section => (
              <div key={section.label} className="space-y-0.5">
                {section.items.map(item => (
                  <SidebarLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3">
          {renderSection(institucionalSection)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Abrir FastCRM
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-64 border-r bg-card/50 flex-col fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-card z-50 lg:hidden shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
