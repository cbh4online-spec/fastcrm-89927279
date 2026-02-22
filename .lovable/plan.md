

# Corrigir layout responsivo das mensagens no painel de Outreach

## Problema

As mensagens no painel de Outreach em Massa estao a transbordar (overflow) dos seus cards. O texto das mensagens nao esta a respeitar os limites do container, causando problemas de layout visivel no screenshot.

## Causa

Na linha 392, o container de conteudo tem `min-w-0` e `flex-1` mas o paragrafo da mensagem (linha 415) usa apenas `line-clamp-2` sem `break-words` nem `overflow-hidden`. Alem disso, o layout flex dos items (linha 375) com os botoes de acao (linha 428) nao tem restricoes suficientes para impedir que o texto empurre o layout.

## Alteracoes

### Ficheiro: `BulkOutreachDialog.tsx`

1. **Linha 392** — Adicionar `overflow-hidden` ao container de conteudo:
   - De: `className="flex-1 min-w-0"`
   - Para: `className="flex-1 min-w-0 overflow-hidden"`

2. **Linha 415** — Adicionar `break-words` e `overflow-hidden` ao paragrafo da mensagem:
   - De: `className="text-xs text-muted-foreground mt-1 line-clamp-2"`
   - Para: `className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words overflow-hidden"`

3. **Linha 394** — Garantir que o nome tambem respeita limites, adicionando `max-w-[60%]` ao span do nome para nao empurrar os badges para fora.

4. **Linha 393** — Adicionar `flex-wrap` a div dos items de header para que os badges facam wrap quando o espaco e limitado:
   - De: `className="flex items-center gap-2"`
   - Para: `className="flex items-center gap-2 flex-wrap"`

Estas alteracoes simples resolvem o overflow sem alterar a estrutura do componente.
