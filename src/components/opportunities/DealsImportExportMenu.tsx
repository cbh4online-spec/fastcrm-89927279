import { useTranslation } from "react-i18next";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Opportunity } from "@/types/opportunity";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface DealsImportExportMenuProps {
  opportunities: Opportunity[];
}

export function DealsImportExportMenu({ opportunities }: DealsImportExportMenuProps) {
  const { t } = useTranslation("crm");

  const exportData = opportunities.map((opp) => ({
    Title: opp.title,
    Value: opp.value,
    Status: opp.status,
    Stage: opp.stage?.name || "",
    Contact: opp.contact?.name || opp.lead?.name || "",
    Company: opp.company?.name || "",
    Probability: opp.probability,
    "Expected Close": opp.expected_close_date || "",
    "Created At": opp.created_at,
  }));

  const handleExportCSV = () => {
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deals_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("exportComplete"));
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Deals");
    XLSX.writeFile(wb, `deals_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(t("exportComplete"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-3.5 w-3.5" />
          {t("importExport", "Import / Export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={handleExportCSV}>
          <Download className="h-3.5 w-3.5 mr-2" />
          {t("exportCSV")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
          {t("exportExcel", "Export Excel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
