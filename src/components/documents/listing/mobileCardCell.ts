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

/** Numeric fields hidden on mobile when zero/empty (avoid orphan "0"). */
const NUMERIC_FIELDS: Record<string, string> = {
  score: "lead_score",
  value: "estimated_value",
};

function isEmptyValue(col: string, record: Record<string, unknown>): boolean {
  const num = NUMERIC_FIELDS[col];
  if (num) {
    const n = Number(record[num]);
    return !Number.isFinite(n) || n === 0;
  }
  const field = col === "company" && record.company_name !== undefined ? "company_name" : TEXT_FIELDS[col];
  if (!field) return false;
  const v = record[field];
  return v === null || v === undefined || String(v).trim() === "";
}

/** Columns that are self-explanatory on mobile and need no label prefix. */
const UNLABELED = new Set(["name", "status", "email", "phone", "company"]);

/**
 * Mobile label shown before the value (via data-label + CSS ::before),
 * so numbers on cards never appear without context.
 */
export function mobileCellLabel(col: string, label?: string): string | undefined {
  if (!label || UNLABELED.has(col)) return undefined;
  return `${label}:`;
}

/**
 * Mobile card layout classes for a list column.
 * - "name" is the card title (first line, grows).
 * - "status" sits next to the title.
 * - Other columns stack below with a label; empty values and columns beyond the 4th are hidden on mobile.
 */
export function mobileCellClass(col: string, colIdx: number, record: Record<string, unknown>) {
  if (col === "name") return "max-md:order-1 max-md:flex-1 max-md:min-w-0";
  if (col === "status") return "max-md:order-2 max-md:w-auto max-md:min-w-0";
  return cn(
    "max-md:order-last max-md:basis-full max-md:w-auto max-md:pl-7 max-md:justify-start max-md:gap-1.5 max-md:text-xs max-md:text-muted-foreground",
    "max-md:before:content-[attr(data-label)] max-md:before:shrink-0 max-md:before:text-muted-foreground",
    "max-md:[&>*]:w-auto max-md:[&>*]:min-w-fit max-md:[&>*]:shrink-0 max-md:[&>*]:text-left max-md:overflow-visible",
    (colIdx > 3 || isEmptyValue(col, record)) && "max-md:hidden",
  );
}
