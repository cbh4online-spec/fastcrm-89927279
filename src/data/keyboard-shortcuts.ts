export type ShortcutKey = {
  mac: string[];
  win: string[];
};

export type Shortcut = {
  id: string;
  label: string;
  keys: ShortcutKey;
  description?: string;
};

export type ShortcutGroup = {
  id: string;
  title: string;
  icon: string;
  shortcuts: Shortcut[];
};

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "global",
    title: "Global",
    icon: "🌐",
    shortcuts: [
      { id: "search", label: "Pesquisa global", keys: { mac: ["⌘", "K"], win: ["Ctrl", "K"] }, description: "Pesquisa contactos, leads, campanhas e mais" },
      { id: "help", label: "Abrir atalhos de teclado", keys: { mac: ["?"], win: ["?"] } },
      { id: "kb", label: "Abrir base de conhecimento", keys: { mac: ["⌘", "H"], win: ["Ctrl", "H"] } },
      { id: "onboarding-guide", label: "Abrir guia de onboarding do módulo actual", keys: { mac: ["Shift", "G"], win: ["Shift", "G"] }, description: "Reabre a apresentação do módulo onde estás" },
      { id: "escape", label: "Fechar modal / painel", keys: { mac: ["Esc"], win: ["Esc"] } },
      { id: "save", label: "Guardar formulário", keys: { mac: ["⌘", "S"], win: ["Ctrl", "S"] } },
      { id: "new", label: "Novo item (contexto actual)", keys: { mac: ["⌘", "N"], win: ["Ctrl", "N"] } },
      { id: "focus-search", label: "Focar barra de pesquisa", keys: { mac: ["/"], win: ["/"] } },
    ],
  },
  {
    id: "navigation",
    title: "Navegação",
    icon: "🧭",
    shortcuts: [
      { id: "go-dashboard", label: "Ir para Dashboard", keys: { mac: ["G", "D"], win: ["G", "D"] }, description: "Pressiona G depois D" },
      { id: "go-contacts", label: "Ir para Contactos", keys: { mac: ["G", "C"], win: ["G", "C"] } },
      { id: "go-leads", label: "Ir para Leads", keys: { mac: ["G", "L"], win: ["G", "L"] } },
      { id: "go-pipeline", label: "Ir para Pipeline", keys: { mac: ["G", "P"], win: ["G", "P"] } },
      { id: "go-email", label: "Ir para Email Marketing", keys: { mac: ["G", "E"], win: ["G", "E"] } },
      { id: "go-inbox", label: "Ir para Inbox", keys: { mac: ["G", "I"], win: ["G", "I"] } },
      { id: "go-tasks", label: "Ir para Tarefas", keys: { mac: ["G", "T"], win: ["G", "T"] } },
      { id: "go-calendar", label: "Ir para Calendário", keys: { mac: ["G", "A"], win: ["G", "A"] } },
      { id: "go-security", label: "Ir para Security Ops", keys: { mac: ["G", "S"], win: ["G", "S"] } },
      { id: "record-prev", label: "Registo anterior (fichas)", keys: { mac: ["Alt", "←"], win: ["Alt", "←"] }, description: "Navega na lista sem sair da ficha" },
      { id: "record-next", label: "Registo seguinte (fichas)", keys: { mac: ["Alt", "→"], win: ["Alt", "→"] } },

    ],
  },
  {
    id: "crm",
    title: "CRM",
    icon: "👥",
    shortcuts: [
      { id: "new-contact", label: "Novo contacto", keys: { mac: ["⌘", "Shift", "C"], win: ["Ctrl", "Shift", "C"] } },
      { id: "new-lead", label: "Novo lead", keys: { mac: ["⌘", "Shift", "L"], win: ["Ctrl", "Shift", "L"] } },
      { id: "new-opportunity", label: "Nova oportunidade", keys: { mac: ["⌘", "Shift", "O"], win: ["Ctrl", "Shift", "O"] } },
      { id: "new-task", label: "Nova tarefa", keys: { mac: ["⌘", "Shift", "T"], win: ["Ctrl", "Shift", "T"] } },
    ],
  },
  {
    id: "email",
    title: "Email Marketing",
    icon: "📧",
    shortcuts: [
      { id: "new-campaign", label: "Nova campanha", keys: { mac: ["⌘", "Shift", "M"], win: ["Ctrl", "Shift", "M"] } },
      { id: "send-campaign", label: "Enviar campanha (editor)", keys: { mac: ["⌘", "Return"], win: ["Ctrl", "Enter"] } },
      { id: "preview-mobile", label: "Pré-visualizar mobile (editor)", keys: { mac: ["⌘", "Shift", "P"], win: ["Ctrl", "Shift", "P"] } },
      { id: "save-draft", label: "Guardar rascunho (editor)", keys: { mac: ["⌘", "S"], win: ["Ctrl", "S"] } },
    ],
  },
  {
    id: "inbox",
    title: "Inbox",
    icon: "💬",
    shortcuts: [
      { id: "compose", label: "Compor nova mensagem", keys: { mac: ["C"], win: ["C"] }, description: "Quando o inbox está em foco" },
      { id: "reply", label: "Responder à conversa", keys: { mac: ["R"], win: ["R"] } },
      { id: "archive", label: "Arquivar conversa", keys: { mac: ["E"], win: ["E"] } },
      { id: "next-conv", label: "Próxima conversa", keys: { mac: ["J"], win: ["J"] } },
      { id: "prev-conv", label: "Conversa anterior", keys: { mac: ["K"], win: ["K"] } },
    ],
  },
  {
    id: "editor",
    title: "Editor de texto",
    icon: "✏️",
    shortcuts: [
      { id: "bold", label: "Negrito", keys: { mac: ["⌘", "B"], win: ["Ctrl", "B"] } },
      { id: "italic", label: "Itálico", keys: { mac: ["⌘", "I"], win: ["Ctrl", "I"] } },
      { id: "underline", label: "Sublinhado", keys: { mac: ["⌘", "U"], win: ["Ctrl", "U"] } },
      { id: "undo", label: "Desfazer", keys: { mac: ["⌘", "Z"], win: ["Ctrl", "Z"] } },
      { id: "redo", label: "Refazer", keys: { mac: ["⌘", "Shift", "Z"], win: ["Ctrl", "Y"] } },
    ],
  },
];

export const ALL_SHORTCUTS: Array<Shortcut & { groupTitle: string; groupIcon: string }> =
  SHORTCUT_GROUPS.flatMap((g) =>
    g.shortcuts.map((s) => ({ ...s, groupTitle: g.title, groupIcon: g.icon }))
  );
