import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Calendar, Mail, RotateCcw } from "lucide-react";

export function WeeklyQuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Ligar Leads Hot", icon: Phone, onClick: () => navigate("/dashboard/leads?filter=hot") },
    { label: "Agendar Reunião", icon: Calendar, onClick: () => navigate("/dashboard/scheduling") },
    { label: "Enviar Follow-up", icon: Mail, onClick: () => navigate("/dashboard/inbox") },
    { label: "Reativar Deals", icon: RotateCcw, onClick: () => navigate("/dashboard/opportunities?filter=stalled") },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.label} variant="outline" size="sm" onClick={a.onClick} className="gap-2">
          <a.icon className="h-3.5 w-3.5" />
          {a.label}
        </Button>
      ))}
    </div>
  );
}
