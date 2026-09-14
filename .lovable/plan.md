# Redes sociais: escrever só o @perfil e abrir direto nas mensagens

## Diagnóstico

Hoje os campos sociais guardam texto livre e o link é montado de forma cega: se o valor não começar por `http`, é acrescentado `https://` à frente. Com `@diogotricologia` o link fica `https://@diogotricologia` e não abre nada. Os campos também pedem o endereço completo (`https://instagram.com/...`), o que dá trabalho a preencher.

Além disso, ao clicar no Instagram abre o perfil público; o objetivo é ir direto para a conversa (mensagens) desse perfil.

## Decisões de produto/UX

1. **Basta o @utilizador.** Nos formulários (criar/editar Lead, Contacto e Empresa) os campos passam a aceitar `@diogotricologia`, `diogotricologia` ou o endereço completo. O sistema normaliza e guarda sempre o endereço completo, mostrando por baixo do campo o perfil reconhecido.
2. **Clicar abre as mensagens.** Onde o perfil aparece (painel de detalhes de Lead, Contacto e Empresa e secções de redes sociais) o clique principal abre a conversa:
   - Instagram: `ig.me/m/utilizador`
   - Facebook: `m.me/pagina`
   - WhatsApp: `wa.me/numero` (já é assim hoje)
   - LinkedIn, X, TikTok, YouTube e Pinterest não têm ligação fiável para mensagens; abrem o perfil.
3. **Continua a dar para ver o perfil.** Ao lado do nome fica um pequeno ícone "Ver perfil" que abre a página pública.
4. **Apresentação mais limpa.** O valor mostrado passa a ser `@diogotricologia` em vez do endereço completo, mesmo quando está guardado o endereço.
5. Sem alterações na base de dados, nas permissões ou em dados existentes: valores antigos com endereço completo continuam a funcionar, porque a leitura extrai o utilizador a partir do endereço.

## Estrutura técnica

Novo ficheiro `src/lib/social/socialProfiles.ts`:

- `SOCIAL_NETWORKS`: definição por rede (domínios aceites, prefixo de perfil, prefixo de mensagens, se suporta mensagens).
- `parseSocialHandle(network, value)`: aceita handle com/sem `@` ou endereço completo (com ou sem `www`, com querystring) e devolve `{ handle, profileUrl }` ou `null` para valor inválido.
- `normalizeSocialValue(network, value)`: devolve o `profileUrl` canónico para gravar.
- `socialMessageUrl(network, value)`: devolve o link de mensagens quando existe, senão o perfil.

Alterações:

- `src/components/shared/SocialMediaFields.tsx` — placeholders passam a `@utilizador`; normaliza no `blur` antes de propagar; mostra o handle reconhecido ou aviso discreto de valor inválido.
- `src/components/entity/EntityDetailsPanel.tsx` — novo `linkType: 'social'` no `EditableFieldRow`, com o `renderValue` a mostrar `@handle`, link principal para mensagens e ícone secundário para o perfil; as linhas de Instagram/Facebook/LinkedIn/X/YouTube/TikTok/Pinterest passam a usá-lo. Edição inline também normaliza ao gravar.
- `src/components/leads/sections/SocialMediaSection.tsx` e `src/components/companies/sections/SocialMediaSection.tsx` — usam os mesmos helpers.
- Testes unitários em `src/test/social/social-profiles.test.ts` para a normalização (handle, endereço, endereço com querystring, valor inválido) e para os links de mensagens.

## Plano de implementação

1. Criar `socialProfiles.ts` com as definições e helpers.
2. Escrever os testes unitários dos helpers.
3. Atualizar `SocialMediaFields` (normalização + placeholders + handle reconhecido).
4. Adicionar `linkType: 'social'` ao `EntityDetailsPanel` e ligar as linhas sociais.
5. Alinhar as secções de redes sociais de Leads e Empresas.
6. Correr `bunx tsgo --noEmit -p tsconfig.app.json` e os testes.

## Critérios de aceitação

- Escrever `@diogotricologia` no Instagram guarda o perfil correto e mostra `@diogotricologia`.
- Clicar no Instagram abre a conversa desse perfil; o ícone ao lado abre o perfil público.
- Registos antigos com endereço completo continuam a mostrar `@handle` e a abrir corretamente.
- Um valor sem sentido não gera link quebrado: fica como texto com aviso.
- Facebook e WhatsApp abrem também nas mensagens; as restantes redes abrem o perfil.

## Riscos e pontos por validar

- Nas redes sem ligação a mensagens mantemos o perfil — confirma se preferes esconder a ação de mensagem nesses casos.
- O `ig.me/m/` abre a app Instagram no telemóvel e a web no computador; se a sessão não estiver ativa, o utilizador tem de entrar primeiro.
