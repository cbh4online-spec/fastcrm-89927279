

# Conformidade Legal Portuguesa na Loja Online

## Diagnóstico

O que **já existe**:
- Footer com links para Termos, Privacidade, Cookies, RGPD
- Páginas legais completas com conteúdo RGPD-compliant e variáveis dinâmicas (NIF, morada, etc.)
- Menção de IVA nos preços (taxa e inclusão/exclusão)
- Prazo de devoluções mencionado (14 dias)
- Métodos de pagamento visíveis

O que **falta** para cumprir a legislação portuguesa (DL 7/2004, DL 24/2014, Lei 24/96, RGPD):

| Requisito Legal | Estado |
|---|---|
| Identificação completa do vendedor (nome, NIF, morada, contactos) visível na loja | Ausente |
| Livro de Reclamações Eletrónico (obrigatório desde 2017) | Ausente |
| Checkbox de aceitação de Termos + Direito de arrependimento no checkout | Ausente |
| Informação pré-contratual sobre direito de livre resolução (14 dias) no checkout | Ausente |
| Cookie consent banner (RGPD + Lei 41/2004) | Ausente |
| Link para entidade RAL (Resolução Alternativa de Litígios) no footer | Ausente |
| Informação sobre garantia legal (3 anos, DL 84/2021) | Ausente |

## Plano de Implementação

### 1. Identificação do Vendedor no Footer
Adicionar secção ao `StoreFooter.tsx` que consome `usePublicCompanyData` para mostrar: nome da empresa, NIF, morada, email e telefone. Obrigatório pelo DL 7/2004 (comércio eletrónico).

### 2. Cookie Consent Banner
Criar `StoreCookieConsent.tsx` — banner fixo no fundo com botões "Aceitar", "Rejeitar", "Personalizar". Guardar preferência em localStorage. Renderizar no layout da loja (dentro de `StoreRoutes` ou em cada página de loja).

### 3. Checkbox de Consentimento no Checkout
Alterar `CheckoutPaymentStep.tsx` para incluir:
- Checkbox obrigatória: "Li e aceito os Termos e Condições e a Política de Privacidade" (com links)
- Texto informativo: "Tem direito a desistir da compra no prazo de 14 dias sem necessidade de indicar motivo (DL 24/2014)"
- Desabilitar botão de pagamento se checkbox não marcada

### 4. Livro de Reclamações Eletrónico
Adicionar ao `StoreFooter.tsx` link externo obrigatório para o Livro de Reclamações Eletrónico (`https://www.livroreclamacoes.pt`). Legislação exige que seja visível e acessível.

### 5. Resolução Alternativa de Litígios (RAL)
Adicionar ao `StoreFooter.tsx` texto legal com link para plataforma europeia de resolução de litígios (`https://ec.europa.eu/consumers/odr`) e menção a entidades RAL aplicáveis. Obrigatório pelo DL 144/2015.

### 6. Garantia Legal (3 anos)
Adicionar ao `StoreFooter.tsx` (secção "Informação Legal") menção à garantia legal de 3 anos para bens de consumo (DL 84/2021). Pode ser link para uma secção nos Termos.

### 7. Actualizar Defaults das Páginas Legais
Adicionar ao `legalPageDefaults.ts` secções sobre direito de livre resolução (14 dias) e garantias nos Termos de Uso.

## Ficheiros a Criar/Alterar

| Ficheiro | Ação |
|---|---|
| `src/components/store/StoreCookieConsent.tsx` | Criar — banner RGPD de cookies |
| `src/components/store/StoreFooter.tsx` | Alterar — identificação vendedor, livro reclamações, RAL, garantia |
| `src/components/store/checkout/CheckoutPaymentStep.tsx` | Alterar — checkbox termos + info direito arrependimento |
| `src/components/store/checkout/checkoutSchema.ts` | Alterar — validação da checkbox |
| `src/pages/store/StorePage.tsx` | Alterar — renderizar cookie banner |
| `src/pages/store/StoreProductPage.tsx` | Alterar — renderizar cookie banner |
| `src/modules/growth-seo/components/admin/legalPageDefaults.ts` | Alterar — secções legais adicionais |

## Critérios de Aceitação

- Identificação completa do vendedor visível no footer de todas as páginas da loja
- Cookie banner apresentado na primeira visita, com opção de aceitar/rejeitar
- Checkout impossível sem aceitar termos (checkbox obrigatória)
- Informação sobre direito de arrependimento (14 dias) visível antes de finalizar compra
- Link para Livro de Reclamações Eletrónico visível no footer
- Link para plataforma RAL europeia visível no footer
- Menção a garantia legal de 3 anos no footer ou página de termos

