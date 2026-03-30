import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Validate an international phone number.
 * Defaults to PT if no country prefix is provided.
 */
export function isValidPhone(value: string, defaultCountry: CountryCode = "PT"): boolean {
  if (!value) return false;
  return isValidPhoneNumber(value, defaultCountry);
}

/**
 * Format a phone number to international format (e.g. +351 912 345 678).
 * Returns the original string if parsing fails.
 */
export function formatPhone(value: string, defaultCountry: CountryCode = "PT"): string {
  if (!value) return value;
  const phone = parsePhoneNumberFromString(value, defaultCountry);
  return phone ? phone.formatInternational() : value;
}

/**
 * Format a phone number to E.164 format (e.g. +351912345678).
 * Returns null if the number is invalid.
 */
export function toE164(value: string, defaultCountry: CountryCode = "PT"): string | null {
  if (!value) return null;
  const phone = parsePhoneNumberFromString(value, defaultCountry);
  return phone?.isValid() ? phone.format("E.164") : null;
}
