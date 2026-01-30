import React, { createContext, useContext, useCallback, useRef } from 'react';

type InsertVariableFunction = (variable: string) => void;

interface EmailEditorContextValue {
  registerEditor: (editorId: string, insertFn: InsertVariableFunction) => void;
  unregisterEditor: (editorId: string) => void;
  setActiveEditor: (editorId: string | null) => void;
  insertVariable: (variable: string) => void;
}

const EmailEditorContext = createContext<EmailEditorContextValue | null>(null);

export function EmailEditorProvider({ children }: { children: React.ReactNode }) {
  const editorsRef = useRef<Map<string, InsertVariableFunction>>(new Map());
  const activeEditorRef = useRef<string | null>(null);

  const registerEditor = useCallback((editorId: string, insertFn: InsertVariableFunction) => {
    editorsRef.current.set(editorId, insertFn);
  }, []);

  const unregisterEditor = useCallback((editorId: string) => {
    editorsRef.current.delete(editorId);
    if (activeEditorRef.current === editorId) {
      activeEditorRef.current = null;
    }
  }, []);

  const setActiveEditor = useCallback((editorId: string | null) => {
    activeEditorRef.current = editorId;
  }, []);

  const insertVariable = useCallback((variable: string) => {
    const activeId = activeEditorRef.current;
    if (activeId) {
      const insertFn = editorsRef.current.get(activeId);
      if (insertFn) {
        insertFn(variable);
        return;
      }
    }
    
    // Fallback: insert into the last focused editor or first available
    const editors = Array.from(editorsRef.current.entries());
    if (editors.length > 0) {
      const [, insertFn] = editors[editors.length - 1];
      insertFn(variable);
    }
  }, []);

  return (
    <EmailEditorContext.Provider
      value={{
        registerEditor,
        unregisterEditor,
        setActiveEditor,
        insertVariable,
      }}
    >
      {children}
    </EmailEditorContext.Provider>
  );
}

export function useEmailEditorContext() {
  const context = useContext(EmailEditorContext);
  if (!context) {
    throw new Error('useEmailEditorContext must be used within EmailEditorProvider');
  }
  return context;
}
