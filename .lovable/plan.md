

# Contexto de Servico + Sequencia de Mensagens AIDA

## Problema actual

O gerador de mensagens nao sabe o que o utilizador vende/oferece. Cria mensagens genericas sem foco na dor ou beneficio concreto. Alem disso, gera apenas 1 mensagem, sem guia para follow-ups.

## Solucao

### 1. Adicionar "Oferta/Servico" as configuracoes do workspace

Na tabela `lead_enricher_settings`, adicionar dois campos:

```sql
ALTER TABLE lead_enricher_settings
ADD COLUMN service_offer text,
ADD COLUMN service_pain_points text;
```

- `service_offer`: O que vendem (ex: "Marketing digital para clinicas")
- `service_pain_points`: Dores que resolvem (ex: "Falta de pacientes, redes sociais abandonadas")

### 2. UI para configurar na pagina de Prospeccao

No header da pagina `ProfessionalProspecting.tsx`, ao lado do selector de tom, adicionar um botao "Configurar Oferta" que abre um dialog simples com:
- Campo "O que oferece?" (textarea curta)
- Campo "Que dores resolve?" (textarea curta)
- Guardar no `lead_enricher_settings` via o hook existente

### 3. Passar contexto ao gerador de mensagem

No `ProspectingMessageDialog`, o `workspaceContext` ja e passado. Vamos enriquecer com `serviceOffer` e `painPoints` vindos das settings.

No `ProspectingResults`, buscar as settings e passar a info extra ao dialog.

### 4. Actualizar o prompt da Edge Function

No `generate-prospecting-message/index.ts`:
- Receber `serviceContext` (oferta + dores) no body
- Incluir no prompt do sistema para a IA focar a mensagem na dor especifica do prospect e na solucao oferecida
- Adicionar um campo `sequenceStep` (1, 2 ou 3) para gerar mensagens diferentes por etapa

### 5. Sequencia de 3 mensagens AIDA (Fast Workflow)

Em vez de gerar 1 mensagem, gerar 3 de uma vez (ou sob pedido):

| Step | Objectivo | Timing |
|------|-----------|--------|
| 1 - Abertura | AIDA completo, primeiro contacto | Dia 0 |
| 2 - Follow-up | Valor adicional, caso de estudo | Dia 3 |
| 3 - Fecho | Urgencia/escassez, CTA final | Dia 7 |

No dialog, mostrar as 3 mensagens em tabs (Msg 1 / Msg 2 / Msg 3), cada uma com botao "Enviar no Instagram".

### 6. Indicador visual de progresso

Na lista de resultados (`ProspectingResults`), mostrar junto a cada perfil em que step esta:
- Nenhum icone = nao contactado
- 1/3, 2/3, 3/3 = badges indicando o progresso

Guardar o progresso numa nova coluna `outreach_step` na tabela `professional_prospecting_profiles`.

```sql
ALTER TABLE professional_prospecting_profiles
ADD COLUMN outreach_step integer DEFAULT 0;
```

## Ficheiros a modificar

- **SQL migration**: 2 campos em `lead_enricher_settings` + 1 campo em `professional_prospecting_profiles`
- **`src/hooks/useLeadEnricherSettings.ts`**: Adicionar `service_offer` e `service_pain_points`
- **`src/pages/ProfessionalProspecting.tsx`**: Botao/dialog "Configurar Oferta"
- **`src/components/professional-prospecting/ProspectingMessageDialog.tsx`**: Receber serviceContext, gerar 3 mensagens em tabs, actualizar outreach_step ao enviar
- **`src/components/professional-prospecting/ProspectingResults.tsx`**: Passar serviceContext ao dialog, mostrar badge de progresso outreach
- **`supabase/functions/generate-prospecting-message/index.ts`**: Receber serviceContext e sequenceStep, ajustar prompt por etapa

## Fluxo do utilizador

1. Configura oferta uma vez (ex: "Gestao de redes sociais para clinicas")
2. Pesquisa profissionais (ex: "Fisioterapeuta, Lisboa")
3. Abre mensagem -> ve 3 mensagens pre-geradas focadas na dor
4. Clica "Enviar" na Msg 1 -> copia + abre Instagram -> perfil fica marcado 1/3
5. Dias depois, volta, clica na Msg 2 -> envia follow-up -> 2/3
6. Repete para Msg 3 -> 3/3 (sequencia completa)
