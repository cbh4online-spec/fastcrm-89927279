

# Plano: Aplicar Conceito AIDA e Traduzir para Português

## O que é AIDA?

O modelo AIDA é uma técnica de copywriting que guia o utilizador através de 4 fases:

| Fase | Objectivo | Aplicação na Landing |
|------|-----------|---------------------|
| **A**tenção | Captar o olhar imediatamente | Headline impactante e visual forte |
| **I**nteresse | Despertar curiosidade | Benefícios e features relevantes |
| **D**esejo | Criar vontade de ter | Prova social, resultados, urgência |
| **A**cção | Levar ao passo seguinte | CTA claro (formulário de login) |

## Alterações Planeadas

### 1. AuthLayout.tsx - Painel Esquerdo com AIDA

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo] FastCRM                                                         │  ← Branding
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ATENÇÃO (Headline)                                                     │
│  ──────────────────                                                     │
│  "Transforme leads em clientes"                                         │
│  "com o CRM mais inteligente"                                           │
│                                                                         │
│  INTERESSE (Benefícios)                                                 │
│  ───────────────────────                                                │
│  ✓ Gestão de contactos simplificada                                    │
│  ✓ Automação de vendas com IA                                          │
│  ✓ Relatórios em tempo real                                            │
│  ✓ Integrações com WhatsApp e Email                                    │
│                                                                         │
│  DESEJO (Prova social)                                                  │
│  ───────────────────────                                                │
│  "Mais de 500 empresas já confiam no FastCRM"                          │
│  [★★★★★] "Aumentámos as vendas em 40%" - João Silva, CEO               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
│  © 2024 FastCRM  •  Privacidade  •  Termos                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Login.tsx - Textos em Português

```typescript
<AuthLayout
  title="Bem-vindo de volta"
  subtitle="Inicie sessão na sua conta para continuar"
>
```

### 3. LoginForm.tsx - Tradução Completa

| Inglês | Português |
|--------|-----------|
| Email address | Endereço de email |
| Password | Palavra-passe |
| Forgot password? | Esqueceu a palavra-passe? |
| Sign in | Entrar |
| Don't have an account? | Não tem conta? |
| Sign up | Criar conta |
| Invalid email or password | Email ou palavra-passe inválidos |
| Welcome back! | Bem-vindo de volta! |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/auth/AuthLayout.tsx` | Redesenhar painel esquerdo com estrutura AIDA, traduzir para PT |
| `src/pages/Login.tsx` | Traduzir props title/subtitle |
| `src/components/auth/LoginForm.tsx` | Traduzir labels, placeholders, mensagens e links |

## Estrutura AIDA no Código

```typescript
// AuthLayout.tsx - Painel Esquerdo
<div className="space-y-8">
  {/* ATENÇÃO - Headline impactante */}
  <div>
    <h1 className="text-4xl font-bold">
      Transforme leads em clientes
    </h1>
    <p className="text-xl opacity-90">
      com o CRM mais inteligente de Portugal
    </p>
  </div>

  {/* INTERESSE - Lista de benefícios */}
  <ul className="space-y-3">
    <li className="flex items-center gap-3">
      <CheckCircle className="text-green-300" />
      Gestão de contactos simplificada
    </li>
    <li>...</li>
  </ul>

  {/* DESEJO - Prova social */}
  <div className="bg-white/10 rounded-xl p-4">
    <div className="flex items-center gap-1">
      {[...Array(5)].map(() => <Star className="fill-yellow-400" />)}
    </div>
    <p className="italic">"Aumentámos as vendas em 40%"</p>
    <p className="text-sm">— João Silva, CEO da TechStart</p>
  </div>
</div>
```

## Benefícios

1. **Copywriting persuasivo** - Segue metodologia comprovada de conversão
2. **Localização completa** - Interface 100% em Português
3. **Credibilidade** - Prova social aumenta confiança
4. **Consistência** - Alinhado com a identidade do produto

