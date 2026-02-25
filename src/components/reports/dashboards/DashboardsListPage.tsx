import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, LayoutDashboard, MoreHorizontal, Trash2 } from "lucide-react";
import { ReportDashboard } from "@/hooks/useReportDashboards";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface DashboardsListPageProps {
  dashboards: ReportDashboard[];
  isLoading: boolean;
  onCreateClick: () => void;
  onDelete: (id: string) => void;
}

export function DashboardsListPage({ dashboards, isLoading, onCreateClick, onDelete }: DashboardsListPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboards</h1>
          <p className="text-muted-foreground text-sm">Relatórios personalizados com widgets configuráveis</p>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" /> Novo Dashboard
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[140px] rounded-lg" />)}
        </div>
      ) : dashboards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <LayoutDashboard className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Nenhum dashboard criado</p>
            <p className="text-xs mt-1">Crie o seu primeiro dashboard de relatórios</p>
            <Button className="mt-4" onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" /> Criar Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map(d => (
            <Link key={d.id} to={`/dashboard/reports/dashboards/${d.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{d.name}</CardTitle>
                    {d.description && <CardDescription className="text-xs mt-1 line-clamp-2">{d.description}</CardDescription>}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={e => { e.preventDefault(); onDelete(d.id); }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {d.is_default && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
