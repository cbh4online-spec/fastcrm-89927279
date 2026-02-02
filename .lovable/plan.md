
# Plano: Activar Funcionalidades de Workspace & Equipa

## Análise da Situação Actual

Após explorar o código, identifiquei o que está **implementado** vs **faltando**:

| Funcionalidade | Estado Actual | O que Falta |
|----------------|---------------|-------------|
| Informação do Workspace | Formulário estático | Botão "Guardar" não funciona |
| Utilizadores | Funcional | OK |
| Cargos & Permissões | Informativo | OK (só leitura) |
| Upload de Logótipo | Botão inactivo | Upload para bucket "company-logos" |
| Cores da Marca | Botão inactivo | Campos de cor + colunas na BD |
| Layout do CRM | Funcional | OK |
| Portal de Clientes B2B | Funcional | OK |

## Alterações Necessárias

### 1. Adicionar Colunas de Cores à Tabela `workspaces`
A tabela já tem `logo_url`, mas faltam colunas para as cores da marca.

**Migração SQL:**
```sql
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#8b5cf6';
```

### 2. Criar Hook `useWorkspaceSettings`
Novo hook para gerir upload de logo e cores do workspace.

**Ficheiro:** `src/hooks/useWorkspaceSettings.ts`

```typescript
// Funções principais:
- uploadWorkspaceLogo(file: File) → string (URL)
- saveWorkspaceSettings({ name, slug, primary_color, secondary_color, logo_url })
- Usar bucket "company-logos" existente
```

### 3. Actualizar WorkspaceSettings.tsx

**Secção "Informação do Workspace":**
- Converter inputs em estado controlado
- Botão "Guardar alterações" funcional (actualiza nome e slug)

**Secção "Marca & Aparência":**
- Substituir botões estáticos por componentes funcionais:
  - Upload de logo (usando supabase storage)
  - Pré-visualização do logo actual
  - Color pickers para cores primária e secundária

### Estrutura do Componente de Branding

```
┌─────────────────────────────────────────────────────────────────┐
│ MARCA & APARÊNCIA                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌────────────────────────────────────────┐ │
│  │              │    │ Logótipo                               │ │
│  │   [LOGO]     │    │ Arraste uma imagem ou clique para     │ │
│  │              │    │ selecionar                             │ │
│  │              │    │ Formatos: PNG, JPG, SVG (máx. 2MB)     │ │
│  └──────────────┘    └────────────────────────────────────────┘ │
│                                                                  │
│  Cores da Marca                                                  │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │ [■] Cor Primária        │ │ [■] Cor Secundária          │   │
│  │     #6366f1             │ │     #8b5cf6                 │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
│                                                                  │
│                                    [Guardar Aparência]          │
└─────────────────────────────────────────────────────────────────┘
```

## Ficheiros a Criar/Modificar

| Ficheiro | Acção | Descrição |
|----------|-------|-----------|
| `src/hooks/useWorkspaceSettings.ts` | **Criar** | Hook para gestão de definições do workspace |
| `src/components/settings/sections/WorkspaceSettings.tsx` | **Modificar** | Tornar formulários funcionais |
| Migração SQL | **Executar** | Adicionar colunas primary_color e secondary_color |

## Implementação Detalhada

### Hook useWorkspaceSettings

```typescript
export function useWorkspaceSettings() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  
  // 1. Actualizar nome/slug
  const updateWorkspaceInfo = async (name: string, slug: string) => {
    await supabase.from("workspaces").update({ name, slug })
      .eq("id", currentWorkspace.id);
    refreshWorkspaces();
  };
  
  // 2. Upload de logo
  const uploadLogo = async (file: File): Promise<string> => {
    const path = `${currentWorkspace.id}/logo.${ext}`;
    await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
    return getPublicUrl(path);
  };
  
  // 3. Actualizar branding
  const updateBranding = async (logo_url, primary_color, secondary_color) => {
    await supabase.from("workspaces").update({
      logo_url, primary_color, secondary_color
    }).eq("id", currentWorkspace.id);
  };
  
  return { updateWorkspaceInfo, uploadLogo, updateBranding };
}
```

### WorkspaceSettings - Secção Branding Funcional

```tsx
{/* Branding Section */}
<SettingsSection title="Marca & Aparência" icon={<Palette />}>
  <div className="space-y-6">
    {/* Logo Upload */}
    <div className="flex items-start gap-6">
      <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted">
        {logoUrl ? (
          <img src={logoUrl} className="w-full h-full object-contain" />
        ) : (
          <ImagePlus className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <Label>Logótipo</Label>
        <Input type="file" accept="image/*" onChange={handleLogoUpload} />
        <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máximo 2MB.</p>
      </div>
    </div>
    
    {/* Color Pickers */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Cor Primária</Label>
        <div className="flex gap-2">
          <Input type="color" value={primaryColor} onChange={...} />
          <Input value={primaryColor} onChange={...} />
        </div>
      </div>
      <div>
        <Label>Cor Secundária</Label>
        <div className="flex gap-2">
          <Input type="color" value={secondaryColor} onChange={...} />
          <Input value={secondaryColor} onChange={...} />
        </div>
      </div>
    </div>
    
    <Button onClick={handleSaveBranding}>Guardar Aparência</Button>
  </div>
</SettingsSection>
```

## Resultado Esperado

Após a implementação:

1. **Informação do Workspace** - Botão "Guardar" actualiza nome e URL
2. **Logótipo** - Upload funcional para o bucket "company-logos"
3. **Cores da Marca** - Color pickers que guardam na BD
4. O logo/cores ficarão disponíveis para uso em:
   - Propostas comerciais (já usa `workspace.logo_url`)
   - Emails de convite para portal
   - Documentos PDF exportados

## Complexidade

Média - Requer migração de BD + novo hook + refactor do componente existente

## Dependências

- Bucket `company-logos` já existe no storage
- Tabela `workspaces` já tem coluna `logo_url`
- Apenas faltam as colunas de cores
