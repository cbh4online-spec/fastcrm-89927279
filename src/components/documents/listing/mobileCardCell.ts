import { cn } from "@/lib/utils";

/** Plain-text fields that, when empty, should not create a blank "—" line on mobile cards. */
const TEXT_FIELDS: Record<string, string> = {
  email: "email",
  phone: "phone",
  tax_id: "tax_id",
  website: "website",
  industry: "industry",
  company: "company",
  city: "city",
  country: "country",
  client_number: "client_number",
};

function isEmptyValue(col: string, record: Record<string, unknown>): boolean {
  const field = col === "company" && record.company_name !== undefined ? "company_name" : TEXT_FIELDS[col];
  if (!field) return false;
  const v = record[field];
  return v === null || v === undefined || String(v).trim() === "";
}

/**
 * Mobile card layout classes for a list column.
 * - "name" is the card title (first line, grows).
 * - "status" sits next to the title.
 * - Other columns stack below; empty text fields and columns beyond the 3rd are hidden on mobile.
 */
export function mobileCellClass(col: string, colIdx: number, record: Record<string, unknown>) {
  if (col === "name") return "max-md:order-1 max-md:flex-1 max-md:min-w-0";
  if (col === "status") return "max-md:order-2 max-md:w-auto max-md:min-w-0";
  return cn(
    "max-md:order-last max-md:basis-full max-md:w-auto max-md:pl-7 max-md:justify-start max-md:text-xs max-md:text-muted-foreground",
    (colIdx > 3 || isEmptyValue(col, record)) && "max-md:hidden",
  );
}
