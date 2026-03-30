/**
 * Override @total-typescript/ts-reset's JSON.parse and Response.json()
 * returning `unknown` — too many existing callsites rely on `any`.
 */
interface JSON {
  parse(text: string, reviver?: (this: any, key: string, value: any) => any): any;
}

interface Body {
  json(): Promise<any>;
}
