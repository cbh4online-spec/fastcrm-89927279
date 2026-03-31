import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const HR_ROUTE_LABELS: Record<string, string> = {
  "/dashboard/hr": "Visão Geral",
  "/dashboard/hr/employees": "Funcionários",
  "/dashboard/hr/departments": "Departamentos",
  "/dashboard/hr/positions": "Cargos",
  "/dashboard/hr/time-tracking": "Controlo de Ponto",
  "/dashboard/hr/schedules": "Gestão de Turnos",
  "/dashboard/hr/absences": "Férias & Ausências",
  "/dashboard/hr/kiosk": "Terminal QR",
  "/dashboard/hr/settings": "Configurações",
  "/dashboard/hr/onboarding": "Onboarding",
  "/dashboard/hr/recruitment": "Recrutamento",
  "/dashboard/hr/recruitment/jobs": "Vagas",
  "/dashboard/hr/recruitment/candidates": "Candidatos",
  "/dashboard/hr/recruitment/interviews": "Entrevistas",
  "/dashboard/hr/okrs": "OKRs",
  "/dashboard/hr/feedback": "Feedback",
  "/dashboard/hr/checkins": "Check-ins",
  "/dashboard/hr/reviews": "Avaliações de Desempenho",
};

export function HRBreadcrumb() {
  const { pathname } = useLocation();

  // Build crumbs: Dashboard > People Operations > [current page]
  // For nested routes like /dashboard/hr/recruitment/jobs, show intermediate
  const crumbs: { label: string; href?: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "People Operations", href: "/dashboard/hr" },
  ];

  // Find matching label — try exact match first, then strip dynamic segments
  let currentLabel = HR_ROUTE_LABELS[pathname];
  if (!currentLabel) {
    // Try parent for dynamic routes like /employees/:id
    const parentPath = pathname.replace(/\/[^/]+$/, "");
    currentLabel = HR_ROUTE_LABELS[parentPath];
    if (currentLabel) {
      // Add parent as intermediate crumb
      crumbs.push({ label: currentLabel, href: parentPath });
      currentLabel = "Detalhe";
    }
  }

  // For recruitment sub-pages, add intermediate "Recrutamento"
  if (pathname.startsWith("/dashboard/hr/recruitment/") && currentLabel) {
    crumbs.push({ label: "Recrutamento", href: "/dashboard/hr/recruitment" });
  }

  if (currentLabel && pathname !== "/dashboard/hr") {
    crumbs.push({ label: currentLabel });
  } else if (pathname === "/dashboard/hr") {
    // Remove the href from last crumb (current page)
    crumbs[crumbs.length - 1] = { label: "People Operations" };
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          {crumb.href ? (
            <Link
              to={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
