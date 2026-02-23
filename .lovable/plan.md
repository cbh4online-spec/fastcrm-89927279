

# Melhorar a mensagem inicial de prospecao para apresentar servicos

## Problema

A mensagem inicial (Etapa 1) gerada pela IA foca-se em "criar curiosidade" e "perguntas abertas", mas nao apresenta claramente os servicos que ofereces. Alem disso, no modo bulk (envio em massa), o contexto do servico (`serviceContext`) e enviado como `null`, ignorando completamente a oferta configurada nas definicoes.

## Alteracoes

### 1. Edge Function `generate-prospecting-message/index.ts`

Reescrever as instrucoes da Etapa 1 para seguir uma abordagem PAS (Problema-Agitacao-Solucao) em vez de AIDA puro:

**De:**
```
ETAPA 1 - ABERTURA (Dia 0):
- Método AIDA completo
- Primeiro contacto, criar curiosidade
- Referência directa ao trabalho do prospect
- Termina com pergunta aberta
```

**Para:**
```
ETAPA 1 - ABERTURA (Dia 0):
- Comeca por identificar uma DOR ou desafio real que o prospect enfrenta (baseado na profissao/bio)
- Apresenta brevemente quem es e o que fazes (nome da empresa + servico principal)
- Mostra como o teu servico resolve essa dor especifica (resultado concreto)
- Termina com CTA suave (pergunta ou convite para saber mais)
- A mensagem deve parecer uma apresentacao natural, nao um pitch agressivo
- Se tiveres contexto do servico, USA-O obrigatoriamente para personalizar
```

Tambem reforcar o bloco `serviceBlock` para ser mais explicito:

**De:**
```
IMPORTANTE: Foca a mensagem na DOR especifica deste prospect e como a tua oferta a resolve.
```

**Para:**
```
OBRIGATORIO: A mensagem DEVE mencionar o servico/oferta e como resolve a dor do prospect.
Estrutura: Dor do prospect -> O que fazes -> Como resolves -> CTA
```

### 2. Frontend `ProspectingResults.tsx` (linha 563)

Corrigir o envio do `serviceContext` no modo bulk. Atualmente envia `null`, deve enviar os dados configurados:

**De:** `serviceContext: null`
**Para:** Ler `settings.service_offer` e `settings.service_pain_points` e passar como `serviceContext`

### Resumo

| Ficheiro | Alteracao |
|---|---|
| `generate-prospecting-message/index.ts` | Reescrever instrucoes Etapa 1 para apresentar servicos + reforcar uso do serviceContext |
| `ProspectingResults.tsx` | Passar `serviceContext` real em vez de `null` no modo bulk |

