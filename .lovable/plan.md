
# Polir Fases SDR

## 1. Seed para campanhas existentes
As campanhas criadas antes do trigger não têm fases. Criar botão "Gerar fases padrão" no `SDRStageSettings` que chama a função `seed_sdr_default_stages` via RPC quando não existem fases.

## 2. Drag-and-drop para reordenar fases
Usar `@dnd-kit/sortable` (já instalado) no `SDRStageSettings` para arrastar e reordenar fases, persistindo a nova ordem via `reorderStages`.

## 3. Melhorias UX no pipeline
- Mostrar estado vazio amigável no tab Pipeline quando não há campanha seleccionada
- Filtro por fase na tabela de prospects (clicar numa fase do pipeline filtra a tabela)
- Contador de fases no tab "Fases"
- Feedback visual no funil quando não há dados

## 4. Seed global de workspace
Se o workspace não tem fases globais (campaign_id = null), criar automaticamente ao entrar no `SDRStageSettings`. Isto garante que o fallback funciona.

## Ficheiros a modificar

| Ficheiro | Acção |
|---|---|
| `src/components/sdr/SDRStageSettings.tsx` | Drag-and-drop + botão seed + auto-seed |
| `src/hooks/useSDRPipelineStages.ts` | Adicionar `seedDefaults` mutation via RPC |
| `src/pages/SDRDashboardPage.tsx` | Filtro por fase + empty states melhorados |
