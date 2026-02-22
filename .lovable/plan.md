
# Adicionar tom de conversa por defeito na Prospeccao Profissional

## Resumo

Permitir ao utilizador definir o tom de conversa por defeito (Formal, Casual, Direto) para a geracao de mensagens de prospeccao. A preferencia e guardada na base de dados por workspace e usada automaticamente ao abrir o dialog de mensagem.

## Alteracoes

### 1. Migracao SQL

Adicionar coluna `default_prospecting_tone` a tabela `lead_enricher_settings` (ja existe por workspace):

```sql
ALTER TABLE lead_enricher_settings 
ADD COLUMN default_prospecting_tone text NOT NULL DEFAULT 'casual';
```

### 2. Hook useLeadEnricherSettings

Actualizar `src/hooks/useLeadEnricherSettings.ts`:
- Adicionar `default_prospecting_tone` ao tipo `LeadEnricherSettings`
- Incluir o campo nos defaults e no fetch/upsert

### 3. Pagina ProfessionalProspecting

Actualizar `src/pages/ProfessionalProspecting.tsx`:
- Importar e usar `useLeadEnricherSettings` para obter o tom por defeito
- Passar `defaultTone` como prop ao componente `ProspectingResults` (que abre o dialog de mensagem)

### 4. ProspectingResults

Actualizar `src/components/professional-prospecting/ProspectingResults.tsx`:
- Aceitar prop `defaultTone` e passa-la ao `ProspectingMessageDialog`

### 5. ProspectingMessageDialog

Actualizar `src/components/professional-prospecting/ProspectingMessageDialog.tsx`:
- Aceitar prop `defaultTone` opcional
- Inicializar `tone` com `defaultTone` em vez de `"casual"` hardcoded
- Usar `useEffect` para actualizar o tone quando `defaultTone` muda

### 6. Adicionar selector de tom por defeito na UI

Na pagina de prospeccao (ou nas configuracoes do Lead Enricher), adicionar um pequeno selector junto ao header ou nas configuracoes para definir o tom por defeito. A opcao mais integrada e adicionar um dropdown discreto no header da pagina de prospeccao com os 3 tons, que ao mudar faz upsert na tabela de settings.

## Ficheiros a modificar

- **SQL migration**: adicionar coluna `default_prospecting_tone`
- **`src/hooks/useLeadEnricherSettings.ts`**: incluir novo campo
- **`src/pages/ProfessionalProspecting.tsx`**: usar hook, passar defaultTone, adicionar selector no header
- **`src/components/professional-prospecting/ProspectingResults.tsx`**: passar defaultTone ao dialog
- **`src/components/professional-prospecting/ProspectingMessageDialog.tsx`**: usar defaultTone como valor inicial
