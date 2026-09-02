# Landing pages publicadas voltam a ser funcionais

## Causa

O sanitizador é aplicado **antes de gravar** o HTML na base de dados, não apenas na pré-visualização. Confirmado no código:

- `useBuilderAssets.ts` — linha 70 (criação) e linha 125 (update): `sanitizeBuilderHtml(input.html)` antes do insert/update.
- `useBuilderVersions.ts` — linha 60: sanitiza antes de gravar a versão.
- `useBuilderVariants.ts` — linhas 50 e 79: sanitiza antes de gravar/atualizar a variante.
- `useBuilderBlocks.ts` — linha 73: sanitiza antes de gravar o bloco.
- `sanitizeBuilderHtml.ts` — `FORBID_TAGS: ["script","iframe","object","embed","form"]` e remoção de `onclick`, `onsubmit`, `onload`, etc.

Consequência: `<script>`, `<form>` e handlers inline são destruídos permanentemente na gravação. Depois, `BuilderPublicPage.tsx` volta a sanitizar (linha 77) e o iframe usa `sandbox="allow-same-origin allow-popups"` — sem `allow-scripts` nem `allow-forms`. Ou seja, há dois pontos de falha, sendo o da persistência o mais grave.

## Estratégia

```text
HTML original  ->  guardado integralmente (sem sanitização destrutiva)
                    |
                    +-- Editor/Preview  -> sanitizado em tempo de render
                    |
                    +-- Página pública  -> iframe sandbox isolado, scripts permitidos
```

## Alterações

### 1. Camada de sanitização (`src/modules/builder/lib/sanitizeBuilderHtml.ts`)
- Manter `sanitizeBuilderHtml()` exatamente como está — é a versão de **preview/editor**.
- Acrescentar `sanitizeBuilderHtmlForPersistence()`: proteção mínima que **não remove** `script`, `form`, `onclick`, `onsubmit`, IDs, `data-*`, âncoras nem `target="_blank"`. Remove apenas vetores que não fazem sentido numa landing page (`javascript:` em `href/src`, tags aninhadas `<base>` maliciosas). Se preferir simplicidade máxima, esta função pode ser um passthrough documentado — a proteção real é o sandbox do iframe.
- Manter `slugify()` intacto.

### 2. Persistência (hooks)
Trocar `sanitizeBuilderHtml` por `sanitizeBuilderHtmlForPersistence` em:
- `useBuilderAssets.ts` (criação + update)
- `useBuilderVersions.ts`
- `useBuilderVariants.ts` (criação + update)
- `useBuilderBlocks.ts`

### 3. Editor / Preview (sem alteração de comportamento)
- `BuilderPreviewFrame.tsx` e `BuilderVisualEditor.tsx` continuam a usar `sanitizeBuilderHtml()` na renderização. O editor visual mantém o sandbox atual porque precisa da ponte `postMessage`.

### 4. Página publicada (`src/pages/builder/BuilderPublicPage.tsx`)
- Deixar de sanitizar: `srcDoc={data.html}`.
- `sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"` — **sem** `allow-same-origin`, pelo que a landing page fica em origem opaca e não acede a DOM, cookies nem storage do FastCRM.
- Garantir que o documento entregue ao iframe tem `<!doctype html>` e `<meta viewport>` quando o HTML gravado for apenas um fragmento (mesma normalização já usada no preview), para responsividade e `scroll-behavior: smooth`.

### Âncoras internas
Como o HTML corre dentro do iframe, `<a href="#servicos">` resolve contra o documento do iframe e faz scroll para `id="servicos"`. Não passa pelo React Router. `#inicio`, `#servicos`, `#como-funciona`, `#ia-whatsapp`, `#resultados`, `#contacto` ficam funcionais.

### Links externos
`target="_blank"` funciona com `allow-popups` + `allow-popups-to-escape-sandbox` (WhatsApp, calendários, CTAs).

## Landing pages já existentes
Assets antigos podem já ter perdido scripts/forms na gravação anterior. Não há recuperação automática nem código inventado: depois desta alteração basta colar/importar novamente o HTML original e guardar para restaurar as funcionalidades. Isto será indicado no relatório final.

## Testes
Criar um asset de teste com âncora `#servicos`, secções `100vh`, botão com `onclick`, `<form>` e link WhatsApp `target="_blank"`; guardar, publicar e abrir `/p/:slug`:
- confirmar que o HTML gravado em `builder_assets.html` mantém `<script>`, `<form>` e `onclick`;
- scroll da âncora, execução de JS, submissão do form, abertura do WhatsApp;
- refresh direto da URL pública;
- sem erros relevantes na consola;
- typecheck (`tsgo`) e testes existentes verdes.

## Fora de âmbito
Design do Builder, CRM, autenticação, email builder e restantes páginas ficam intocados.
