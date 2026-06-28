import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Settings, Pencil, Trash2, Upload, Download, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DealViewSelectorDropdown } from "../DealViewSelectorDropdown";
import { OpportunitiesModuleState } from "./useOpportunitiesModule";
import { PipelineSelector } from "@/components/crm/PipelineSelector";
import Papa from "papaparse";
import { toast } from "sonner";
import { exportToExcel } from "@/utils/excelUtils";

interface Props {
  state: OpportunitiesModuleState;
}

export function OpportunitiesHeader({ state }: Props) {
  const { t } = useTranslation("crm");

  const handleExportCSV = () => {
    const exportData = state.filteredOpportunities.map((opp: any) => ({
      title: opp.title,
      value: opp.value,
      status: opp.status,
      stage_id: opp.stage_id,
      created_at: opp.created_at,
      updated_at: opp.updated_at,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `deals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("exportComplete"));
  };

  const handleExportExcel = async () => {
    const exportData = state.filteredOpportunities.map((opp: any) => ({
      title: opp.title,
      value: opp.value,
      status: opp.status,
      stage_id: opp.stage_id,
      created_at: opp.created_at,
      updated_at: opp.updated_at,
    }));
    await exportToExcel(exportData, "Deals", `deals_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(t("exportComplete"));
  };

  const activeView = state.activeView;

  const handleRenameView = () => {
    if (!activeView) return;
    const name = window.prompt(t("renameView") || "Renomear vista", activeView.name);
    if (name && name.trim()) {
      state.updateView.mutate({ id: activeView.id, entity_type: "opportunities", updates: { name: name.trim() } });
    }
  };

  const handleDeleteView = () => {
    if (!activeView) return;
    if (window.confirm(t("deleteViewConfirm") || `Eliminar a vista "${activeView.name}"?`)) {
      state.deleteViewMut.mutate({ id: activeView.id, entity_type: "opportunities" });
      if (state.activeViewId === activeView.id) state.setActiveViewId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between flex-shrink-0">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("pipelineTitle", "Pipeline")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("pipelineSubtitle", "Negócios em curso e desempenho comercial")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PipelineSelector />
          <DealViewSelectorDropdown
            activeViewId={state.activeViewId}
            onSelectView={state.handleSelectView}
            onCreateView={() => state.setShowCreateViewDialog(true)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => state.setIsCreateDialogOpen(true)}
          className="h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("newOpportunity")}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("exportData", "Exportar")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              {t("exportCSV", "Exportar CSV")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {t("exportExcel", "Exportar Excel")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => state.setIsSettingsDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              {t("managePipelines", "Gerir Pipelines")}
            </DropdownMenuItem>
            {activeView && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{activeView.name}</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleRenameView}>
                  <Pencil className="w-4 h-4 mr-2" />
                  {t("renameView", "Renomear vista")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteView} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("deleteView", "Eliminar vista")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
