import { useCompanies } from "@/hooks/useCompanies";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import { useState } from "react";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";

export default function CompaniesTab() {
  const { companies, isLoading } = useCompanies();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">A carregar empresas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{companies?.length || 0} empresas</p>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Nome</span>
          <span>Website</span>
          <span>Contactos</span>
        </div>
        {companies?.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Nenhuma empresa encontrada</p>
          </div>
        ) : (
          companies?.map((company: any) => (
            <div
              key={company.id}
              className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/dashboard/companies/${company.id}`)}
            >
              <span className="font-medium truncate">{company.name}</span>
              <span className="text-sm text-muted-foreground truncate">{company.website || "—"}</span>
              <span className="text-sm text-muted-foreground">{company.contact_count || 0}</span>
            </div>
          ))
        )}
      </div>

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
