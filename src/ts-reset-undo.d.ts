/**
 * Override @total-typescript/ts-reset narrowing of JSON.parse and fetch .json()
 * back to `any` to prevent hundreds of false-positive type errors.
 *
 * ts-reset makes these return `unknown` which is safer but incompatible
 * with the existing codebase.
 */

// Restore JSON.parse to return `any`
interface JSON {
  parse(
    text: string,
    reviver?: (this: any, key: string, value: any) => any,
  ): any;
}

// Restore Response.json() / Body.json() to return Promise<any>
interface Body {
  json(): Promise<any>;
}

// Restore .filter(Boolean) to keep the original array type
declare global {
  interface Array<T> {
    filter(predicate: BooleanConstructor): NonNullable<T>[];
  }

  interface ReadonlyArray<T> {
    filter(predicate: BooleanConstructor): NonNullable<T>[];
  }
}

export {};
