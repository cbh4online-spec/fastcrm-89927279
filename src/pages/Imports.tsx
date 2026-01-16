import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileSpreadsheet,
  Users,
  Building2,
  Package,
  FileText,
  ArrowRight,
} from "lucide-react";
import { SmartImportWizard } from "@/components/imports/SmartImportWizard";
import { ImportEntityType } from "@/types/import";

const importTypes = [
  {
    id: "contacts",
    title: "Contactos",
    description: "Importar lista de contactos via CSV ou Excel",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "companies",
    title: "Empresas",
    description: "Importar empresas e organizações",
    icon: Building2,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "products",
    title: "Produtos",
    description: "Importar catálogo de produtos e serviços",
    icon: Package,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "leads",
    title: "Leads",
    description: "Importar leads e oportunidades",
    icon: FileText,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

export default function ImportsPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleProcessImport = () => {
    if (selectedFile && selectedType) {
      setShowWizard(true);
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    setSelectedFile(null);
    setSelectedType(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageBreadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Importações" },
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Importações
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Importar dados para o CRM via ficheiros CSV ou Excel
            </p>
          </div>
        </div>

        {/* Show wizard when processing */}
        {showWizard && selectedFile && selectedType ? (
          <SmartImportWizard
            file={selectedFile}
            importType={selectedType as ImportEntityType}
            onClose={handleWizardClose}
            onComplete={handleWizardComplete}
          />
        ) : (
          <>
            {/* Import Types */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {importTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedType === type.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${type.bgColor}`}>
                          <Icon className={`h-6 w-6 ${type.color}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{type.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Upload Area */}
            {selectedType && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Importar {importTypes.find((t) => t.id === selectedType)?.title}
                  </CardTitle>
                  <CardDescription>
                    Arrasta um ficheiro CSV ou Excel, ou clica para selecionar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="border-2 border-primary/50 bg-primary/5 rounded-lg p-8 text-center">
                      <FileSpreadsheet className="h-12 w-12 mx-auto text-primary mb-4" />
                      <p className="font-medium text-foreground mb-1">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => setSelectedFile(null)}>
                          Alterar ficheiro
                        </Button>
                        <Button onClick={handleProcessImport}>
                          <Upload className="h-4 w-4 mr-2" />
                          Processar Importação
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Arrasta o ficheiro aqui ou clica para selecionar
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Formatos suportados: CSV, XLSX, XLS (máx. 10MB)
                      </p>
                      <Button className="mt-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Ficheiro
                      </Button>
                    </div>
                  )}

                  {/* Tips */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">💡 Dicas para importação</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• A primeira linha deve conter os nomes das colunas</li>
                      <li>• Campos obrigatórios: Nome, Email (para contactos)</li>
                      <li>• Duplicados serão identificados automaticamente</li>
                      <li>• Podes mapear as colunas após o upload</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Imports */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Importações Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma importação realizada</p>
                  <p className="text-xs mt-1">
                    As tuas importações aparecerão aqui
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
