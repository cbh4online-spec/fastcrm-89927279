export class Resend { emails = { send: async () => { (globalThis as any).__emails = ((globalThis as any).__emails ?? 0) + 1; return { data: null, error: null }; } }; constructor(_k: string) {} }
