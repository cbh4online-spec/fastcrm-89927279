
# Plano: Corrigir Problema de Acesso à Página de Detalhe de Encomenda (Cliente)

## Diagnóstico do Problema

Através da análise dos logs da consola e do session replay, identifiquei que:

1. **Erros 404 Falsos**: Os erros para `/react-router-dom` e `/components/InsightIcon` são causados pelo **editor do Lovable** quando se clica em nomes de ficheiros no painel de código - não são problemas da aplicação em si.

2. **A rota existe**: A página `/client/orders/:id` está corretamente definida em `App.tsx` e o componente `ClientOrderDetailPage.tsx` está implementado.

3. **Possíveis causas reais**:
   - O utilizador não está autenticado como cliente B2B
   - O cliente não tem encomendas na base de dados
   - A navegação está a ser feita incorretamente

## Solução Proposta

### Parte 1: Verificar se existe um cliente B2B de teste

Primeiro, vou verificar se existem `client_users` e `order_notes` na base de dados para confirmar que há dados para visualizar.

### Parte 2: Melhorar o fluxo de acesso

Se necessário, vou garantir que:
1. A página de histórico de encomendas (`/client/orders`) tem links corretos para os detalhes
2. A navegação após submissão de encomenda redireciona corretamente

### Parte 3: Teste end-to-end

Depois das correções, testar o fluxo completo:
1. Login como cliente B2B
2. Ver lista de encomendas
3. Clicar numa encomenda para ver detalhes

---

## Detalhes Técnicos

### Ficheiros Relevantes

| Ficheiro | Propósito |
|----------|-----------|
| `src/pages/client/ClientOrdersPage.tsx` | Lista de encomendas do cliente |
| `src/pages/client/ClientOrderDetailPage.tsx` | Página de detalhe individual |
| `src/components/client-portal/orders/OrderCard.tsx` | Card de encomenda com link para detalhe |
| `src/App.tsx` | Definição das rotas (linha 169) |

### Verificação de Rotas

A rota está correctamente definida:
```typescript
<Route path="/client/orders/:id" element={<CartProvider><ClientOrderDetailPage /></CartProvider>} />
```

### Verificação da Navegação

O `OrderCard` deve ter um `Link` para `/client/orders/${order.id}`. Vou confirmar que este link está correto.

---

## Próximos Passos

1. **Verificar dados na BD**: Confirmar que existem encomendas para o cliente
2. **Corrigir links se necessário**: Garantir que a navegação usa rotas válidas
3. **Testar no preview**: Navegar manualmente para `/client/orders` e clicar numa encomenda

---

## Nota Importante

Para testar a página de detalhe de encomenda do cliente:

1. Acede ao preview da aplicação (não ao editor de código)
2. Vai para: `https://[preview-url]/client/login`
3. Faz login com credenciais de cliente B2B
4. Navega para "Encomendas" no menu
5. Clica numa encomenda para ver os detalhes

Os erros 404 que viste no screenshot são do **editor do Lovable** quando clicas em ficheiros do código, não da aplicação real.
