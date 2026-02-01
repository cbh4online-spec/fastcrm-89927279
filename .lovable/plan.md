
# Plano: Corrigir Loading Infinito no Portal do Cliente

## Diagnostico do Problema

O portal do cliente esta bloqueado em loading infinito porque as rotas `/client/*` estao dentro da arvore de providers do CRM principal:

```text
AuthProvider (CRM)
  └── WorkspaceProvider (CRM)
      └── ActivityProfileProvider (CRM)
          └── WorkspaceInstanceProvider (CRM)
              └── SubscriptionProvider (CRM)
                  └── ClientLoginPage  ← BLOQUEADO!
```

Estes providers fazem verificacoes e queries que:
1. Esperam por autenticacao do utilizador do CRM
2. Carregam workspaces, subscricoes, perfis
3. Bloqueiam o render enquanto carregam

O cliente B2B NAO precisa de nada disto - tem o seu proprio sistema de autenticacao (`useClientAuth`).

## Solucao

Mover as rotas do portal do cliente para FORA dos providers do CRM, mantendo apenas o `CartProvider` que e necessario.

### Estrutura Actual (App.tsx)

```text
<AuthProvider>
  <WorkspaceProvider>
    <...outros providers...>
      <Routes>
        <Route path="/client/login" ... />  ← dentro dos providers do CRM
        <Route path="/client/dashboard" ... />
        ...
      </Routes>
    </...>
  </WorkspaceProvider>
</AuthProvider>
```

### Nova Estrutura Proposta

```text
<Routes>
  {/* Client Portal Routes - FORA dos providers do CRM */}
  <Route path="/client/*" element={
    <CartProvider>
      <Routes>
        <Route path="login" element={<ClientLoginPage />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        ...
      </Routes>
    </CartProvider>
  } />
  
  {/* CRM Routes - dentro dos providers */}
  <Route path="*" element={
    <AuthProvider>
      <WorkspaceProvider>
        ...
      </WorkspaceProvider>
    </AuthProvider>
  } />
</Routes>
```

## Ficheiro a Modificar

### App.tsx

Reorganizar a estrutura de rotas para:

1. Criar um componente `ClientPortalRoutes` que agrupa todas as rotas `/client/*`
2. Criar um componente `CRMRoutes` que agrupa as rotas do CRM com os providers
3. No nivel raiz, usar routing condicional baseado no path

### Alteracoes Especificas

**1. Extrair rotas do portal do cliente para componente separado:**

```typescript
// Rotas do Portal do Cliente - SEM providers do CRM
function ClientPortalRoutes() {
  return (
    <CartProvider>
      <Routes>
        <Route path="login" element={<ClientLoginPage />} />
        <Route path="set-password" element={<ClientSetPasswordPage />} />
        <Route path="forgot-password" element={<ClientForgotPasswordPage />} />
        <Route path="reset-password" element={<ClientResetPasswordPage />} />
        <Route path="dashboard" element={<ClientDashboardPage />} />
        <Route path="catalog" element={<ClientCatalogPage />} />
        <Route path="cart" element={<ClientCartPage />} />
        <Route path="checkout" element={<ClientCheckoutPage />} />
        <Route path="orders" element={<ClientOrdersPage />} />
        <Route path="orders/:id" element={<ClientOrderDetailPage />} />
        <Route path="favorites" element={<ClientFavoritesPage />} />
        <Route path="assistant" element={<ClientAssistantPage />} />
      </Routes>
    </CartProvider>
  );
}
```

**2. Manter rotas do CRM com os providers:**

```typescript
// Rotas do CRM - COM providers
function CRMRoutes() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ActivityProfileProvider>
          <WorkspaceInstanceProvider>
            <SubscriptionProvider>
              <Routes>
                {/* Todas as rotas do CRM aqui */}
              </Routes>
            </SubscriptionProvider>
          </WorkspaceInstanceProvider>
        </ActivityProfileProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
```

**3. Estrutura raiz com routing condicional:**

```typescript
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GTMProvider containerId="GTM-WLVH4TJJ">
            <MetaPixelLoader />
            <Routes>
              {/* Portal do Cliente - isolado */}
              <Route path="/client/*" element={<ClientPortalRoutes />} />
              
              {/* Rotas publicas SEO */}
              <Route path="/keywords/*" element={...} />
              
              {/* CRM e restantes rotas */}
              <Route path="/*" element={<CRMRoutes />} />
            </Routes>
            <GDPRBanner />
          </GTMProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);
```

## Resultado Esperado

Apos as alteracoes:

| Cenario | Antes | Depois |
|---------|-------|--------|
| Acesso a `/client/login` | Loading infinito | Carrega instantaneamente |
| Login do cliente | Bloqueado | Funciona |
| Dashboard do cliente | Bloqueado | Funciona |
| CRM principal | Funciona | Continua a funcionar |

## Beneficios

1. **Performance**: Portal do cliente carrega instantaneamente
2. **Isolamento**: Sistemas de auth separados (cliente vs CRM)
3. **Manutencao**: Codigo mais organizado e facil de manter
4. **Sem regressoes**: CRM continua a funcionar exactamente igual

## Notas Tecnicas

- O `CartProvider` e mantido pois e necessario para o carrinho do cliente
- O `useClientAuth` hook ja esta preparado para funcionar de forma independente
- As rotas publicas SEO podem ficar fora de ambos os sistemas de providers
