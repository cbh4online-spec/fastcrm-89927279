

# Plano: Configuração de Acessos por Perfil (Menus + Campos)

## Diagnóstico

O sistema já tem uma infraestrutura completa de permissões de menu baseada em **workspace roles** (owner, admin, agent, viewer, agency). O que falta é:

1. **Ligação ao perfil comercial** (Vendedor, Gestor, Diretor, CEO) — quando o utilizador troca de perfil no dropdown da sidebar, os menus visíveis devem mudar
2. **Controlo de visibilidade de campos** — poder esconder campos específicos por perfil (ex: Vendedor não vê "Margem", CEO não vê detalhes operacionais)
3. **UI de configuração acessível** — painel para configurar isto sem ser super admin

## Decisões de Produto

- Manter as permissões por **workspace role** como base, e adicionar uma camada de **sales_function** que restringe ainda mais (intersecção — nunca expande)
- Campos configuráveis por perfil via nova tabela `field_permissions`
- UI de configuração integrada nas **Definições** do workspace (não apenas super-admin)

## Estrutura Técnica

### 1. Nova tabela `profile_menu_permissions`
```sql
CREATE TABLE public.profile_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_function TEXT NOT NULL, -- vendedor, gestor, diretor, ceo
  menu_key TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  UNIQUE(sales_function, menu_key)
);
```

### 2. Nova tabela `profile_field_permissions`
```sql
CREATE TABLE public.profile_field_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_function TEXT NOT NULL,
  page_key TEXT NOT NULL,     -- ex: 'leads', 'pipeline', 'dashboard'
  field_key TEXT NOT NULL,    -- ex: 'margin', 'cost', 'commission'
  visible BOOLEAN DEFAULT true,
  UNIQUE(sales_function, page_key, field_key)
);
```

### 3. Alterações no hook `useMenuPermissions`
- Adicionar consulta a `profile_menu_permissions` filtrada pela `salesFunction` activa
- `canAccessMenu()` passa a verificar **ambas** as camadas: role + profile

### 4. Novo hook `useFieldPermissions`
- Consulta `profile_field_permissions` pela `salesFunction`
- Exporta `canSeeField(pageKey, fieldKey): boolean`

### 5. UI de Configuração (nova secção em Definições)
- Tabs: **Menus por Perfil** | **Campos por Perfil**
- Matriz visual semelhante ao `MenuPermissionsSection` existente
- Colunas: Vendedor, Gestor, Diretor, CEO
- Linhas: menus/campos disponíveis
- Checkboxes de visibilidade
- Botão Guardar com contagem de alterações pendentes

### 6. Sidebar — aplicar filtro combinado
- `buildSidebarSections()` já recebe `canAccessMenu` — basta que o hook devolva o resultado combinado

## Ficheiros a Criar/Alterar

| Ficheiro | Acção |
|---|---|
| Migração SQL | Criar tabelas + seed de defaults + RLS |
| `src/hooks/useMenuPermissions.ts` | Adicionar consulta profile + lógica combinada |
| `src/hooks/useFieldPermissions.ts` | **Novo** — hook para campos |
| `src/components/settings/ProfilePermissionsSettings.tsx` | **Novo** — UI de configuração |
| `src/components/layout/AdaptiveSidebar.tsx` | Passa salesFunction ao hook |
| Rotas de Definições | Adicionar entrada para nova página |

## Critérios de Aceitação

- Ao mudar perfil (Vendedor→Diretor), menus visíveis mudam imediatamente
- Owner/Admin pode configurar quais menus cada perfil vê
- Campos sensíveis podem ser ocultados por perfil
- RLS protege as tabelas de permissões
- Defaults razoáveis no seed (Vendedor vê menos, CEO vê resumos)

