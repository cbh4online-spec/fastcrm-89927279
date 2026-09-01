/**
 * SSoT do tipo de papel de workspace, sem dependências de React.
 * Existe para poder ser importado por código partilhado com edge functions
 * (bundle sem alias "@/" e sem contextos de UI).
 */
export type WorkspaceRole = "owner" | "admin" | "agent" | "viewer" | "agency" | "hr";
