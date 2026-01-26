
# Plano: Seletor de Unidades Pré-Definidas para Metas

## Objetivo
Transformar o campo "Unidade" de texto livre para um seletor visual com opções pré-definidas, tornando a criação de metas mais rápida, consistente e atraente.

---

## O Que Vai Mudar

### Interface Atual
- Campo de texto simples onde o utilizador escreve a unidade manualmente

### Nova Interface
- Seletor visual com ícones e categorias organizadas
- Opções relevantes para vendas/CRM pré-configuradas
- Opção "Personalizada" para casos específicos
- Visual moderno com ícones coloridos por categoria

---

## Unidades Pré-Definidas

Organizadas por categoria para facilitar a escolha:

| Categoria | Unidades | Ícones |
|-----------|----------|--------|
| **Vendas** | Vendas, Negócios, Contratos | ShoppingCart, Briefcase, FileSignature |
| **Relacionamento** | Reuniões, Chamadas, Emails, Contactos | Calendar, Phone, Mail, Users |
| **Financeiro** | € (Euro), Faturação, Comissões | Euro, Receipt, Wallet |
| **Tarefas** | Tarefas, Propostas, Apresentações | CheckSquare, FileText, Presentation |
| **Especial** | % (Percentagem), Unidades, Personalizada | Percent, Hash, Edit |

---

## Implementação Técnica

### 1. Criar Configuração de Unidades
```text
UNIT_OPTIONS = {
  vendas: { label: "Vendas", icon: ShoppingCart, color: "text-green-500" },
  reunioes: { label: "Reuniões", icon: Calendar, color: "text-blue-500" },
  euros: { label: "€", icon: Euro, color: "text-yellow-500" },
  ...
}
```

### 2. Componente de Seleção
- Select com ícones coloridos
- Agrupamento por categoria (SelectGroup)
- Preview visual do valor selecionado
- Input condicional para opção "Personalizada"

### 3. Melhorias Visuais
- Ícones com cores por categoria
- Labels descritivas
- Animação suave na seleção
- Estado visual claro do valor selecionado

---

## Fluxo do Utilizador

```text
1. Utilizador abre modal "Criar Nova Meta"
   |
2. Clica no campo "Unidade"
   |
3. Dropdown aparece com opções organizadas:
   +-- Vendas
   |   +-- Vendas
   |   +-- Negócios  
   |   +-- Contratos
   +-- Relacionamento
   |   +-- Reuniões
   |   +-- Chamadas
   |   +-- Emails
   +-- Financeiro
   |   +-- € (Euro)
   |   +-- Faturação
   +-- Outro
       +-- Personalizada (abre input)
   |
4. Seleciona opção ou escolhe "Personalizada"
   |
5. Se personalizada: campo de texto aparece
```

---

## Ficheiro a Modificar

**src/components/productivity/GoalsManager.tsx**

Alterações:
1. Adicionar constante `UNIT_OPTIONS` com todas as opções e configurações
2. Adicionar estado `customUnit` para input personalizado
3. Substituir Input por Select com SelectGroup
4. Adicionar lógica condicional para mostrar input quando "custom" selecionado
5. Atualizar handleSubmit para usar valor correto

---

## Benefícios

- **Consistência**: Todos usam as mesmas unidades
- **Rapidez**: Seleção em vez de digitação
- **Visual**: Ícones tornam a interface mais intuitiva
- **Flexibilidade**: Opção personalizada mantida para casos especiais
- **UX**: Categorização facilita encontrar a opção certa
