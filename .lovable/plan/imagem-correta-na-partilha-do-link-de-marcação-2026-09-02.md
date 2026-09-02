# Imagem correta na partilha do link de marcação

## Diagnóstico (verificado agora)

- A edge function `og-proxy` **já funciona**: chamada diretamente com user-agent de WhatsApp para `/mymya-hub/book/onboarding-formadores-mymia-academy`, devolve o título "Onboarding Formadores myMia Academy", a descrição "60 min · …" e a imagem carregada para o storage. A imagem responde 200 e é um PNG válido.
- O link real `https://fastcrm.metodopare.ai/mymya-hub/book/onboarding-formadores-mymia-academy`, pedido com o mesmo user-agent de crawler, devolve o HTML genérico da aplicação: título "FastCRM — CRM com IA para Equipas de Vendas em Portugal" e `og:image` = `/og/og-home.jpg`.

Conclusão: o problema não está no og-proxy nem na imagem, está no **encaminhamento**. O Worker do Cloudflare não está a intercetar caminhos `/{workspace}/book/{slug}` — ou a rota `fastcrm.metodopare.ai/*/book/*` não existe no painel, ou o Worker publicado ainda é a versão anterior ao código já presente no projeto (que contém o padrão de booking).

Defeito secundário encontrado: o og-proxy declara sempre `og:image:type = image/jpeg`, mesmo quando a imagem é PNG. Não impede a pré-visualização, mas é incorreto.

## Decisões

- Não alterar a lógica de marcação nem a página pública.
- Tornar o encaminhamento verificável: acrescentar ao og-proxy um modo de diagnóstico simples e documentar exatamente a rota em falta.
- Corrigir o tipo declarado da imagem para corresponder à extensão real.

## Estrutura técnica

1. `supabase/functions/og-proxy/index.ts`
   - Derivar `og:image:type` da extensão do URL da imagem (`.png` → `image/png`, caso contrário `image/jpeg`).
   - Sem mais alterações à lógica de booking, que já está correta.
2. `cloudflare-worker-og-rewrite.js`
   - Manter a lógica atual (já cobre `/book/` com e sem workspace) e reforçar o cabeçalho de configuração com a lista exata e completa de rotas a colar no painel Cloudflare, incluindo `fastcrm.metodopare.ai/*/book/*`.
3. Documentação curta no mesmo ficheiro sobre como confirmar que a rota está ativa (comparação entre o pedido ao domínio e o pedido direto à edge function).

## Ação necessária fora do código

No painel Cloudflare, o Worker tem de estar associado à rota `fastcrm.metodopare.ai/*/book/*` (além das já listadas) e ser republicado com a versão atual do ficheiro. Sem isto, nenhuma alteração no código muda o que o WhatsApp vê — o pedido nunca chega ao og-proxy.

## Critérios de aceitação

- Pedido ao link real com user-agent de crawler devolve o título da reunião e a imagem da página de marcação.
- Utilizadores reais continuam a abrir a página normalmente.
- `og:image:type` coincide com o formato real do ficheiro.

## Riscos

- WhatsApp e Facebook mantêm cache das pré-visualizações; após a rota ficar ativa, o link antigo só muda depois de novo scraping ou de forçar atualização no debugger de pré-visualização.
