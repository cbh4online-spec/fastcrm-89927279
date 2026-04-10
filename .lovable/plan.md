

# Plano: Reescrever PlansSection para personalização completa

## Diagnóstico

O componente `PlansSection.tsx` tem dois problemas críticos:

1. **Schema mismatch**: A BD usa schema key-value (`plan` + `feature_key` + `enabled` + `limit_value`), mas o componente tenta ler colunas flat (`leads_limit`, `contacts_limit`, etc.) que não existem. Isto causa erros de runtime.

2. **Features em falta**: A BD tem 23 feature_keys por plano, mas o componente só mostra 13 limites + 8 features = 21. Faltam: `ai_insights_enabled`, `dashboard_customization`, `sidebar_customization`, `white_label`.

3. **Sem criação de novas features**: Não é possível adicionar novos feature_keys dinamicamente.

## Alterações

### Ficheiro: `src/components/super-admin/PlansSection.tsx` (reescrever)

**Query**: Alterar para ler correctamente da tabela key-value:
```typescript
// Agrupar por plano: { free: [{feature_key, enabled, limit_value}], ... }
const { data } = await supabase
  .from("plan_features")
  .select("*")
  .order("plan")
  .order("feature_key");
```

**Transformação**: Agrupar rows por `plan` e construir mapa de features/limites.

**UI melhorada**:
1. **Cards de plano** — mostrar resumo com todas as features, não apenas 4
2. **Tabela de comparação** — dinâmica, baseada nos feature_keys reais da BD (não hardcoded)
3. **Funcionalidades em falta** — adicionar `ai_insights_enabled`, `dashboard_customization`, `sidebar_customization`, `white_label`
4. **Dialog de edição** — separar em tabs/secções: Limites (numéricos), Módulos (toggles), Personalização (toggles), com labels legíveis
5. **Adicionar nova feature_key** — botão para criar um novo feature_key em todos os planos de uma vez
6. **Valores -1 como "Ilimitado"** — toggle no input para alternar entre valor numérico e ilimitado
7. **Bulk edit** — permitir editar o mesmo feature_key em todos os planos lado a lado (vista inline na tabela)
8. **Histórico** — mostrar `updated_at` no tooltip de cada feature

**Mapeamento de labels** (para display legível):
```typescript
const featureLabels: Record<string, string> = {
  max_users: "Utilizadores",
  max_leads: "Leads",
  max_contacts: "Contactos",
  // ... todos os 23 keys
  white_label: "White Label",
  dashboard_customization: "Personalização Dashboard",
  sidebar_customization: "Personalização Sidebar",
};
```

**Categorização**:
- **Limites de dados**: max_leads, max_contacts, max_companies, max_opportunities
- **Limites de comunicação**: max_emails_month, max_whatsapp_month, max_instagram_month
- **Limites de plataforma**: max_users, max_templates, max_automations, max_ai_calls
- **Módulos**: inbox, automations, form_studio, templates, proposals, landing_pages, integrations
- **IA**: ai_suggestions, ai_insights
- **Personalização**: dashboard_customization, sidebar_customization, white_label

## Secção técnica

- Query usa schema real key-value da tabela `plan_features`
- Update individual por `id` (row-level), mantendo compatibilidade com RLS
- Sugestões IA adaptadas ao novo formato (enviar feature_keys em vez de campos flat)
- Mutação de update usa `.eq("id", row.id)` para cada feature_key alterada
- Tipo `subscription_plan` do enum: `free | basic | pro | agency`

## Critérios de aceitação
- Todas as 23 feature_keys visíveis e editáveis
- Categorização clara por secção
- Toggle ilimitado (-1) funcional
- Possibilidade de adicionar nova feature_key
- Build sem erros (sem referências a colunas inexistentes)
- Sugestões IA continuam a funcionar

