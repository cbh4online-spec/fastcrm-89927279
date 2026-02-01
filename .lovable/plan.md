

# Plano: Corrigir Bugs de Navegacao no Portal do Cliente

## Diagnostico Detalhado

Foram identificados multiplos problemas de logica no ficheiro `ClientLoginPage.tsx` que causam falhas na navegacao apos login.

### Problema 1: Condicao de Corrida no useEffect

```text
Fluxo Actual (ERRADO):

1. isAuthenticated muda para TRUE
   ↓
2. checkPasswordChangeRequired() executa
   ↓
3. .then() SEMPRE executa (independentemente do resultado)
   ↓
4. checkAgain() navega para /dashboard
   ↓
5. CONFLITO: Se o passo 2 navegou para /set-password,
   o passo 4 navega imediatamente para /dashboard
```

O codigo actual no `useEffect` tem esta estrutura problematica:

```typescript
// PROBLEMA: .then() sempre executa apos checkPasswordChangeRequired
checkPasswordChangeRequired().then(() => {
  // Este bloco executa SEMPRE, mesmo que a funcao anterior
  // tenha navegado para /client/set-password
  checkAgain();
});
```

### Problema 2: Navegacao Dupla

O `handleSubmit` navega apos login bem sucedido (linhas 67-71), mas o `useEffect` tambem dispara porque `isAuthenticated` muda para `true`. Isto causa duas tentativas de navegacao.

### Problema 3: Logica de Return Ineficaz

O `return` dentro de `checkPasswordChangeRequired` (linha 27) apenas sai da funcao interna, nao impede a execucao do `.then()`.

## Solucao Proposta

Simplificar a logica de navegacao para evitar condicoes de corrida.

### Estrategia

1. **Remover a navegacao do `handleSubmit`**: Deixar apenas o `useEffect` tratar da navegacao apos login
2. **Usar flags de controlo**: Evitar multiplas navegacoes com uma variavel de estado
3. **Simplificar o useEffect**: Logica mais linear e previsivel

### Codigo Corrigido

```typescript
export default function ClientLoginPage() {
  const navigate = useNavigate();
  const { signIn, loading, error, isAuthenticated, user } = useClientAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle navigation when authenticated - simplified logic
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const handleAuthenticatedUser = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser?.user_metadata?.requires_password_change) {
          navigate("/client/set-password", { replace: true });
        } else {
          navigate("/client/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Error checking user status:", error);
        navigate("/client/dashboard", { replace: true });
      }
    };
    
    handleAuthenticatedUser();
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    if (!email || !password) {
      setLocalError("Por favor, preencha todos os campos");
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setLocalError("Credenciais invalidas. Verifique o seu email e palavra-passe.");
      setIsSubmitting(false);
      return;
    }
    
    // Navegacao sera tratada pelo useEffect quando isAuthenticated mudar
    // Nao navegar aqui para evitar duplicacao
    setIsSubmitting(false);
  };

  // ... resto do componente
}
```

### Alteracoes Chave

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Navegacao no handleSubmit | Sim (duplicada) | Nao (delegada ao useEffect) |
| Logica do useEffect | Complexa com .then() | Simples com async/await |
| Condicao de corrida | Presente | Eliminada |
| Return early | Ineficaz | Funcional |

## Ficheiro a Modificar

### src/pages/client/ClientLoginPage.tsx

**Alteracoes**:

1. **Linhas 21-44**: Substituir o useEffect complexo por versao simplificada
2. **Linhas 65-71**: Remover navegacao do handleSubmit (deixar useEffect tratar)

## Fluxo Corrigido

```text
Novo Fluxo:

1. Utilizador submete formulario
   ↓
2. signIn() executa
   ↓
3. Se sucesso: isAuthenticated muda para TRUE
   ↓
4. useEffect dispara (uma unica vez)
   ↓
5. Verifica requires_password_change
   ↓
6. Navega para destino correcto (apenas uma navegacao)
```

## Resultado Esperado

Apos as alteracoes:

| Cenario | Antes | Depois |
|---------|-------|--------|
| Login normal | Navegacao dupla/conflitante | Navegacao unica para dashboard |
| Login com password temporaria | Conflito de rotas | Navega para set-password |
| Utilizador ja autenticado | Pode ficar preso | Redireciona automaticamente |
| Refresh na pagina de login | Comportamento indefinido | Redireciona se autenticado |

## Detalhes Tecnicos

A correcao envolve:

1. Simplificar a logica async do useEffect para eliminar o `.then()` problematico
2. Usar um unico ponto de navegacao (useEffect) em vez de dois (useEffect + handleSubmit)
3. Adicionar tratamento de erro para casos extremos

