

# Separar Alertas e Incidentes no Super Admin

## Diagnóstico

O sidebar tem dois itens separados ("Alertas" e "Incidentes") mas ambos apontam para o mesmo `AlertsSection` sem distinção. O componente actual mistura tudo numa só vista focada em incidentes, ignorando os alertas de uso (`usage_alerts`). Ambas as tabelas existem e têm 0 registos, mas a UI deve estar preparada.

## Solução

Adicionar prop `initialTab` ao `AlertsSection` (padrão igual ao Billing) para separar as duas vistas.

## Alterações

| Ficheiro | Acção |
|---|---|
| `src/components/super-admin/AlertsSection.tsx` | Adicionar tabs "Alertas" e "Incidentes" com prop `initialTab`; criar tab de Alertas de Uso com dados de `usage_alerts` |
| `src/pages/SuperAdmin.tsx` | Passar `initialTab` diferente para cada caso |

### Detalhe

1. **`SuperAdmin.tsx`**: 
   - `case "alerts"` → `<AlertsSection initialTab="alerts" />`
   - `case "incidents"` → `<AlertsSection initialTab="incidents" />`

2. **`AlertsSection.tsx`** — reorganizar com Tabs:
   - **Tab "Alertas de Uso"**: Query a `usage_alerts` (workspace_id, alert_type, resource_type, threshold_percent, current_usage, limit_value, message, is_dismissed). Mostrar tabela com: tipo de recurso, % uso, mensagem, data. Acção para dispensar alerta. KPIs movidos para reflectir alertas activos.
   - **Tab "Incidentes"**: Manter a lista actual de `system_incidents` com filtros, resolução e dialog — tudo o que já existe.
   - **KPIs no header**: Ajustar — Alertas Activos (usage_alerts não dispensados), Incidentes Abertos, Críticos, Resolvidos 24h.

3. **Estado vazio**: Mensagens informativas em cada tab quando sem dados.

