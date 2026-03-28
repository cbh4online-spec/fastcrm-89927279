

# Templates IA Proativos — Recomendação Automática de Modelo

## Problema
O gerador de templates obriga o utilizador a escolher manualmente objetivo, público, canal e tom em 4 passos. O sistema não usa os dados que já tem (templates existentes, pipeline, contactos) para propor o que faz mais sentido.

## Solução
O sistema analisa o contexto do workspace e **propõe proativamente** o modelo de template ideal — estrutura (AIDA, PAS, FollowUp, etc.), tom, canal e objetivo — com uma explicação do porquê.

---

## Componentes

### 1. Hook `useTemplateRecommendations`
**Ficheiro novo: `src/hooks/useTemplateRecommendations.ts`**

Analisa:
- Templates existentes (que estruturas/canais já tem)
- Lacunas (ex: "não tem nenhum template de reativação")
- Pipeline ativo (muitos deals parados → sugere FollowUp)
- Últimos templates criados (evitar repetir)

Retorna array de recomendações ordenadas por relevância:
```ts
interface TemplateRecommendation {
  goal: string;
  channel: 'email' | 'whatsapp';
  tone: string;
  structure: TemplateStructure;
  reason: string; // "Não tem templates de reativação e há 12 leads inativos"
  priority: 'high' | 'medium' | 'low';
}
```

### 2. Smart Defaults no `AITemplateGeneratorDialog`
**Ficheiro modificado: `src/components/communication/AITemplateGeneratorDialog.tsx`**

- Ao abrir, mostra banner no topo: "💡 Recomendação: **Follow-up comercial** em **Email** com tom **Direto** — Tem 8 oportunidades sem follow-up esta semana"
- Pré-seleciona os campos com a recomendação (utilizador pode alterar)
- Botão "Aceitar recomendação" que preenche tudo e avança para gerar
- Se não há recomendação forte, mantém o wizard normal

### 3. Cards Proativos na `TemplatesListPage`
**Ficheiro modificado: `src/components/communication/TemplatesListPage.tsx`**

- Secção "Sugestões IA" no topo da página (colapsável)
- Cards com recomendações: "Falta-lhe um template de **Cold Outreach** para WhatsApp — Criar agora?"
- Ao clicar, abre o dialog já pré-preenchido com essa sugestão
- Mostra max 3 sugestões, desaparece quando todas são criadas

---

## Ficheiros a Criar/Modificar

| Ficheiro | Ação |
|---|---|
| `src/hooks/useTemplateRecommendations.ts` | **Novo** — Lógica de análise e recomendação |
| `src/components/communication/AITemplateGeneratorDialog.tsx` | **Modificar** — Smart defaults + banner de recomendação |
| `src/components/communication/TemplatesListPage.tsx` | **Modificar** — Cards proativos de sugestão |

## Lógica de Recomendação (regras base)
1. **Lacunas de canal**: Tem emails mas zero WhatsApp → sugere WhatsApp
2. **Lacunas de objetivo**: Sem template de reativação + leads inativos → sugere reativação
3. **Pipeline**: Deals sem atividade → sugere FollowUp
4. **Estrutura**: Só usa AIDA → sugere PAS para variação
5. **Sazonalidade**: Princípio do mês → sugere outreach; fim do mês → sugere fecho

