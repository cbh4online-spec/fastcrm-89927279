import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Building2, FileText, TrendingUp, Plus, ArrowUpRight, ArrowDownRight, Briefcase, Target, Loader2 } from "lucide-react";
import { useLeads } from "@/hooks/useLeads";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";

export default function Dashboard() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  
  const { data: leads, isLoading: leadsLoading } = useLeads();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { companies, isLoading: companiesLoading } = useCompanies();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities();

  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showCreateOpportunity, setShowCreateOpportunity] = useState(false);

  const isLoading = leadsLoading || contactsLoading || companiesLoading || opportunitiesLoading;

  const totalLeads = leads?.length || 0;
  const totalContacts = contacts?.length || 0;
  const totalCompanies = companies?.length || 0;
  const totalOpportunities = opportunities?.length || 0;

  const stats = [
    {
      name: "Leads",
      value: totalLeads,
      icon: Target,
      href: "/dashboard/leads",
    },
    {
      name: "Contactos",
      value: totalContacts,
      icon: Users,
      href: "/dashboard/contacts",
    },
    {
      name: "Empresas",
      value: totalCompanies,
      icon: Building2,
      href: "/dashboard/companies",
    },
    {
      name: "Oportunidades",
      value: totalOpportunities,
      icon: Briefcase,
      href: "/dashboard/opportunities",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Bem-vindo! 👋
            </h1>
            <p className="text-muted-foreground">
              Aqui está o resumo do {currentWorkspace?.name}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card 
              key={stat.name} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(stat.href)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Tarefas comuns ao seu alcance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowCreateLead(true)}
              >
                <Target className="mr-2 h-4 w-4" />
                Adicionar lead
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowCreateContact(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Adicionar contacto
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowCreateCompany(true)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Adicionar empresa
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowCreateOpportunity(true)}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Criar oportunidade
              </Button>
            </CardContent>
          </Card>

          {/* Navigation shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle>Navegação</CardTitle>
              <CardDescription>Acesso rápido às áreas principais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/dashboard/crm")}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                CRM / Pipeline
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/dashboard/inbox")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Inbox
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/dashboard/proposals")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Propostas
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/dashboard/automations")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Automações
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateLeadDialog open={showCreateLead} onOpenChange={setShowCreateLead} />
      <CreateContactDialog open={showCreateContact} onOpenChange={setShowCreateContact} />
      <CreateCompanyDialog open={showCreateCompany} onOpenChange={setShowCreateCompany} />
      <CreateOpportunityDialog open={showCreateOpportunity} onOpenChange={setShowCreateOpportunity} />
    </DashboardLayout>
  );
}
