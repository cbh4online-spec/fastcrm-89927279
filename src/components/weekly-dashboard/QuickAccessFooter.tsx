import { useNavigate } from "react-router-dom";
import { GitBranch, Brain, Bell, Download } from "lucide-react";

const LINKS = [
  { label: "Pipeline detalhado", icon: GitBranch, route: "/dashboard/opportunities" },
  { label: "Previsões IA", icon: Brain, route: "/dashboard/strategy" },
  { label: "Alertas", icon: Bell, route: "/dashboard/leads" },
  { label: "Exportar", icon: Download, route: "/dashboard/settings" },
];

export function QuickAccessFooter() {
  const navigate = useNavigate();
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <button
            key={link.label}
            onClick={() => navigate(link.route)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-border/50 bg-card hover:shadow-sm hover:border-border transition-all text-left group"
          >
            <div className="p-1.5 rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {link.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
