import { ReactNode } from "react";
import { ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LeadChefBottomNav } from "./LeadChefBottomNav";
import { LeadChefFloatingActionButton } from "./LeadChefFloatingActionButton";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showFab?: boolean;
}

export function LeadChefMobileShell({ title, subtitle, children, showFab = true }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 backdrop-blur-xl bg-white/90">
        <div className="max-w-3xl mx-auto px-4 py-4 safe-area-pt">
          <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100 mb-2">
            <ChefHat className="h-3 w-3 mr-1" />
            LeadChef CRM
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">{children}</main>

      {showFab && <LeadChefFloatingActionButton />}
      <LeadChefBottomNav />
    </div>
  );
}
