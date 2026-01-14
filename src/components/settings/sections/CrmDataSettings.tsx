import { SettingsSection, SettingsItem } from "../SettingsSection";
import { Button } from "@/components/ui/button";
import { CustomFieldsManager } from "@/components/custom-fields/CustomFieldsManager";
import {
  Users,
  SlidersHorizontal,
  Kanban,
  Tags,
  Copy,
  FileUp,
  FileDown,
  Database,
} from "lucide-react";

export function CrmDataSettings() {
  return (
    <div className="space-y-6">
      {/* Contacts & Opportunities Settings */}
      <SettingsSection
        title="Contactos & Oportunidades"
        description="Configurações gerais das entidades do CRM"
        icon={<Users className="h-5 w-5" />}
      >
        <SettingsItem
          title="Campos Obrigatórios"
          description="Definir quais campos são obrigatórios ao criar registos"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Valores Predefinidos"
          description="Definir valores padrão para novos registos"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Estados de Lead"
          description="Personalizar os estados disponíveis para leads"
          action={<Button variant="outline">Gerir Estados</Button>}
        />
      </SettingsSection>

      {/* Custom Fields */}
      <SettingsSection
        title="Campos Personalizados"
        description="Criar e gerir campos customizados para cada entidade"
        icon={<SlidersHorizontal className="h-5 w-5" />}
      >
        <CustomFieldsManager />
      </SettingsSection>

      {/* Pipelines */}
      <SettingsSection
        title="Pipelines"
        description="Configurar etapas do pipeline de vendas"
        icon={<Kanban className="h-5 w-5" />}
      >
        <SettingsItem
          title="Pipeline Principal"
          description="Configurar etapas e cores do pipeline"
          action={<Button variant="outline">Editar Pipeline</Button>}
        />
        <SettingsItem
          title="Pipelines Múltiplos"
          description="Criar pipelines adicionais para diferentes processos"
          action={<Button variant="outline">Gerir Pipelines</Button>}
        />
        <SettingsItem
          title="Probabilidades por Etapa"
          description="Definir % de probabilidade de fecho por etapa"
          action={<Button variant="outline">Configurar</Button>}
        />
      </SettingsSection>

      {/* Tags */}
      <SettingsSection
        title="Etiquetas (Tags)"
        description="Organizar registos com etiquetas coloridas"
        icon={<Tags className="h-5 w-5" />}
      >
        <SettingsItem
          title="Gerir Etiquetas"
          description="Criar, editar e eliminar etiquetas disponíveis"
          action={<Button variant="outline">Gerir Tags</Button>}
        />
        <SettingsItem
          title="Etiquetas Automáticas"
          description="Aplicar tags automaticamente com base em regras"
          action={<Button variant="outline">Configurar Regras</Button>}
        />
      </SettingsSection>

      {/* Deduplication */}
      <SettingsSection
        title="Deduplicação"
        description="Regras para evitar e fundir registos duplicados"
        icon={<Copy className="h-5 w-5" />}
        isPremium
      >
        <SettingsItem
          title="Regras de Duplicação"
          description="Definir campos para identificar duplicados"
          action={<Button variant="outline">Configurar</Button>}
        />
        <SettingsItem
          title="Fundir Duplicados"
          description="Encontrar e fundir registos duplicados"
          action={<Button variant="outline">Verificar Duplicados</Button>}
        />
      </SettingsSection>

      {/* Import / Export */}
      <SettingsSection
        title="Importação & Exportação"
        description="Importar dados de outras ferramentas ou exportar"
        icon={<Database className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Importar Dados</p>
                <p className="text-sm text-muted-foreground">CSV, Excel</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Importar
            </Button>
          </div>
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Exportar Dados</p>
                <p className="text-sm text-muted-foreground">CSV, Excel</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Exportar
            </Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
