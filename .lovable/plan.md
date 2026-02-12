

# Auditoria Dinamica e Automatica do Sistema

## Resumo

Tornar a auditoria funcional 100% dinamica em 4 ficheiros. Novos modulos e edge functions aparecem automaticamente sem editar codigo.

## Alteracoes

### 1. `src/types/audit.ts`

- Adicionar ~40 edge functions em falta ao `EDGE_FUNCTION_CATEGORIES` (community-ai-*, c2c-*, store-*, saft-export, calculate-shipping, etc.)
- Converter `AUDIT_MODULES` de array estatico para funcao `buildAuditModules(marketplaceModules)` que combina modulos core com dados da BD
- Mapa `CORE_MODULE_ENRICHMENT` para enriquecer modulos conhecidos; modulos novos recebem dados genericos automaticamente

### 2. `src/hooks/useSystemAudit.ts`

- Remover `STATIC_METRICS` e `EDGE_FUNCTIONS_LIST` hardcoded
- Query dinamica a `marketplace_modules` para obter modulos reais
- Metricas calculadas: modules count real, edge functions derivado de categorias, routes/components/hooks via formula
- Retornar `modules: AuditModule[]` no hook

### 3. `src/components/super-admin/FunctionalAuditSection.tsx`

- Usar `modules` do hook em vez de `AUDIT_MODULES` importado
- Passar `modules` ao gerador de PDF

### 4. `src/utils/pdfAuditGenerator.ts`

- Receber `modules` como parametro em vez de importar `AUDIT_MODULES`
- Substituir contagens hardcoded ("10 modulos", "10/10") por `modules.length`

## Resultado

4 ficheiros editados. Sem migracoes SQL. Sem dependencias novas. Qualquer modulo ou edge function nova aparece automaticamente na auditoria e no PDF.

