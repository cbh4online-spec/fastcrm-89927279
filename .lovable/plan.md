## Diagnóstico

A captura mostra três problemas claros no envio do produto por WhatsApp:

1. **Link duplicado** — o URL longo aparece na caption da imagem (`🛒 Comprar agora: https://…`) **e**, logo a seguir, é enviada uma segunda mensagem com o botão `Comprar Agora` apontando para o mesmo URL. Resultado: ruído visual e poluição da conversa.
2. **Segunda mensagem redundante** — o header dessa segunda bolha é literalmente `🛒 Comprar Agora` e o botão por baixo também diz `Comprar Agora`. Lê-se "Comprar Agora / Comprar Agora" duas vezes seguidas, parece bug/spam.
3. **Caption ainda fica truncada** — a descrição longa empurra o "Ler mais" para baixo, mesmo com o preço já no topo. Quando o utilizador é forçado a expandir, perde o impacto inicial.

A causa está em `supabase/functions/whatsapp-pro-send/index.ts` (linhas 101–155): o adapter Z-API não suporta botões inline numa mensagem de imagem, por isso o envio é feito em dois passos (imagem+caption → mensagem de botão), mas a caption e o segundo bubble não foram desenhados como um par coerente.

## Decisões de produto / UX

- **Uma única mensagem visualmente "rica"** + **uma única call-to-action limpa**. Sem repetição de URL nem de label.
- **Caption** = saudação + nome do produto + preço destacado (com indicação de IVA). **Sem URL inline** quando vai ser enviado o botão CTA.
- **Mensagem do botão** = frase curta e útil (ex.: `👇 Toque para finalizar a compra com segurança` ou personalizável), nunca repetir "Comprar Agora" como header.
- **Fallback sem CTA** (provider sem suporte / sem link válido) = manter o URL inline no texto.
- **Recomendações** continuam a ir no fim da caption (já implementado), mas curtas.

## Estrutura técnica

- `src/components/whatsapp-pro/SendProductByWhatsAppDialog.tsx`
  - `buildDefaultMessage()` ganha um parâmetro `embedLink: boolean`. Quando `true` (sem CTA), inclui a linha `🛒 Comprar agora: URL`. Quando `false` (vai haver botão CTA), omite essa linha — o botão trata da ação.
  - O componente passa `embedLink = !absoluteProductLink || !includeCTA`. Por defeito `includeCTA = true` quando há link válido.
  - Adicionar campo opcional `ctaPrompt` (string editável) com default `"👇 Toque para abrir a página segura do produto"`. Enviado para a edge function como `ctaPrompt`.
  - Atualizar a pré-visualização para refletir o novo formato (sem URL repetido).

- `supabase/functions/whatsapp-pro-send/index.ts`
  - Aceitar `ctaPrompt?: string` no body.
  - Substituir o header hardcoded `"🛒 Comprar Agora"` (linha 150) por `body.ctaPrompt || "👇 Toque para abrir a página do produto"`.
  - Manter o split em duas mensagens (limitação real do Z-API com media+buttons), mas garantir que o texto do segundo envio é distinto do label do botão.
  - Caso `mediaUrl` exista mas `ctaUrl` esteja inválido, não enviar segunda mensagem.

- `src/integrations/whatsapp/providers/types.ts`
  - Adicionar `ctaPrompt?: string` ao payload tipado.

## Plano de implementação

1. Atualizar `types.ts` com `ctaPrompt`.
2. Refatorar `buildDefaultMessage` no dialog para aceitar `embedLink` e omitir a linha de URL quando vai haver botão.
3. Adicionar estado `ctaPrompt` no dialog (com input pequeno opcional sob a secção de recomendações, escondido atrás de um "Personalizar CTA"), enviar junto do mutate.
4. Ajustar a pré-visualização: mostrar a caption sem o URL e a "segunda bolha" com `ctaPrompt` + botão.
5. Atualizar `whatsapp-pro-send/index.ts` para usar `ctaPrompt` no segundo invoke e tratar o caso sem CTA.

## Critérios de aceitação

- Ao enviar com imagem + link: chega **uma** mensagem com imagem + caption (sem URL repetido) e **uma** mensagem com texto do CTA + botão `Comprar Agora` funcional.
- Ao enviar sem imagem mas com link: chega **uma única** mensagem de texto com URL no corpo + botão CTA por baixo (comportamento atual da Z-API para text+buttons).
- Ao enviar sem link válido: chega só a mensagem (com ou sem imagem). Sem segunda bolha.
- A pré-visualização no dialog reflete fielmente os bubbles que serão entregues.
- Sem regressões no envio simples de texto, no logging, nem no `registerShare`.

## Riscos / pontos a validar

- Confirmar que a Z-API entrega corretamente `send-button-actions` apontando para um URL diferente do texto da mensagem (já é o que o código faz hoje, só muda o copy).
- Validar comportamento em conversas existentes do Inbox (mesmo `conversationId`) para garantir que ambas as mensagens ficam atribuídas à mesma thread.
- Caracteres no `ctaPrompt` — limitar a ~120 chars para evitar quebra de layout em alguns clientes WhatsApp.
