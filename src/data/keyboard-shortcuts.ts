export interface ShortcutItem {
  keys: string[];
  description: string;
}

export interface ShortcutGroup {
  title: string;
  icon: string;
  shortcuts: ShortcutItem[];
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

export const KEYBOARD_SHORTCUTS: ShortcutGroup[] = [
  {
    title: "Navegação global",
    icon: "🧭",
    shortcuts: [
      { keys: [mod, "K"], description: "Pesquisa rápida (Command Palette)" },
      { keys: [mod, "H"], description: "Base de Conhecimento" },
      { keys: [mod, "/"], description: "Atalhos de teclado" },
      { keys: ["G", "D"], description: "Ir para Dashboard" },
      { keys: ["G", "C"], description: "Ir para Contactos" },
      { keys: ["G", "L"], description: "Ir para Leads" },
      { keys: ["G", "P"], description: "Ir para Pipeline" },
      { keys: ["G", "T"], description: "Ir para Tarefas" },
    ],
  },
  {
    title: "Acções rápidas",
    icon: "⚡",
    shortcuts: [
      { keys: [mod, "N"], description: "Novo registo (no módulo actual)" },
      { keys: [mod, "S"], description: "Guardar" },
      { keys: [mod, "Enter"], description: "Confirmar / Submeter formulário" },
      { keys: ["Esc"], description: "Fechar modal / Cancelar" },
      { keys: [mod, "Z"], description: "Desfazer" },
      { keys: [mod, "Shift", "Z"], description: "Refazer" },
    ],
  },
  {
    title: "Tabelas e listas",
    icon: "📋",
    shortcuts: [
      { keys: ["↑", "↓"], description: "Navegar entre linhas" },
      { keys: ["Enter"], description: "Abrir registo seleccionado" },
      { keys: ["Espaço"], description: "Selecionar / Desselecionar linha" },
      { keys: [mod, "A"], description: "Selecionar tudo" },
      { keys: [mod, "F"], description: "Filtrar / Pesquisar na tabela" },
    ],
  },
  {
    title: "Comunicação",
    icon: "💬",
    shortcuts: [
      { keys: [mod, "Enter"], description: "Enviar mensagem" },
      { keys: [mod, "Shift", "E"], description: "Novo email" },
      { keys: ["R"], description: "Responder (no inbox)" },
      { keys: ["F"], description: "Reencaminhar (no inbox)" },
      { keys: ["A"], description: "Arquivar conversa" },
    ],
  },
  {
    title: "Editor de texto",
    icon: "✏️",
    shortcuts: [
      { keys: [mod, "B"], description: "Negrito" },
      { keys: [mod, "I"], description: "Itálico" },
      { keys: [mod, "U"], description: "Sublinhado" },
      { keys: [mod, "Shift", "7"], description: "Lista numerada" },
      { keys: [mod, "Shift", "8"], description: "Lista com marcas" },
    ],
  },
];
