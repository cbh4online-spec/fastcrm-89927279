import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { CreditDashboard } from "@/modules/credit-intermediation/components/CreditDashboard";
import { CreditProposalsList } from "@/modules/credit-intermediation/components/CreditProposalsList";
import { BankPartnersList } from "@/modules/credit-intermediation/components/BankPartnersList";
import { CreditSimulator } from "@/modules/credit-intermediation/components/CreditSimulator";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { 
  LayoutDashboard, 
  FileText, 
  Building2, 
  Calculator,
  CreditCard 
} from "lucide-react";

export default function CreditIntermediationPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <ModuleGuard moduleSlug="credit-intermediation" moduleName="Intermediação de Crédito">
      <div className="space-y-6">
        <PageBreadcrumbs 
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Intermediação de Crédito", href: "/dashboard/credit" },
          ]}
        />

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Intermediação de Crédito</h1>
            <p className="text-muted-foreground">
              Gestão completa de propostas de crédito com IA
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="proposals" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Propostas</span>
            </TabsTrigger>
            <TabsTrigger value="banks" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bancos</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className="gap-2">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Simulador</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <CreditDashboard />
          </TabsContent>

          <TabsContent value="proposals" className="space-y-6">
            <CreditProposalsList />
          </TabsContent>

          <TabsContent value="banks" className="space-y-6">
            <BankPartnersList />
          </TabsContent>

          <TabsContent value="simulator" className="space-y-6">
            <CreditSimulator />
          </TabsContent>
        </Tabs>
      </div>
    </ModuleGuard>
  );
}
