/**
 * IBAN validation wrapper using the `iban` package.
 */
import IBAN from "iban";

export function validateIban(value: string): boolean {
  return IBAN.isValid(value);
}

export function formatIban(value: string): string {
  if (!IBAN.isValid(value)) return value;
  return IBAN.printFormat(value, " ");
}

export function toElectronicIban(value: string): string {
  return IBAN.electronicFormat(value);
}
