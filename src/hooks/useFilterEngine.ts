import { subDays, isAfter, isBefore, isEqual, parseISO, startOfDay } from "date-fns";

export interface FilterCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface FilterConfig {
  conditions: FilterCondition[];
  logic: "AND" | "OR";
}

export interface FilterableField {
  slug: string;
  name: string;
  field_type: string;
  options?: Record<string, unknown> | null;
}

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "eq", label: "É igual a" },
    { value: "neq", label: "Não é igual a" },
    { value: "contains", label: "Contém" },
    { value: "not_contains", label: "Não contém" },
    { value: "is_empty", label: "Está vazio" },
    { value: "is_not_empty", label: "Não está vazio" },
  ],
  email: [
    { value: "eq", label: "É igual a" },
    { value: "neq", label: "Não é igual a" },
    { value: "contains", label: "Contém" },
    { value: "not_contains", label: "Não contém" },
    { value: "is_empty", label: "Está vazio" },
    { value: "is_not_empty", label: "Não está vazio" },
  ],
  url: [
    { value: "eq", label: "É igual a" },
    { value: "contains", label: "Contém" },
    { value: "is_empty", label: "Está vazio" },
    { value: "is_not_empty", label: "Não está vazio" },
  ],
  number: [
    { value: "eq", label: "É igual a" },
    { value: "neq", label: "Não é igual a" },
    { value: "gt", label: "Maior que" },
    { value: "gte", label: "Maior ou igual a" },
    { value: "lt", label: "Menor que" },
    { value: "lte", label: "Menor ou igual a" },
    { value: "is_empty", label: "Está vazio" },
  ],
  currency: [
    { value: "eq", label: "É igual a" },
    { value: "neq", label: "Não é igual a" },
    { value: "gt", label: "Maior que" },
    { value: "gte", label: "Maior ou igual a" },
    { value: "lt", label: "Menor que" },
    { value: "lte", label: "Menor ou igual a" },
    { value: "is_empty", label: "Está vazio" },
  ],
  date: [
    { value: "eq", label: "É igual a" },
    { value: "gt", label: "Depois de" },
    { value: "gte", label: "A partir de" },
    { value: "lt", label: "Antes de" },
    { value: "lte", label: "Até" },
    { value: "last_7_days", label: "Últimos 7 dias" },
    { value: "last_14_days", label: "Últimos 14 dias" },
    { value: "last_30_days", label: "Últimos 30 dias" },
    { value: "today", label: "Hoje" },
    { value: "is_empty", label: "Está vazio" },
  ],
  boolean: [
    { value: "eq", label: "É igual a" },
  ],
  select: [
    { value: "eq", label: "É igual a" },
    { value: "neq", label: "Não é igual a" },
    { value: "in", label: "É um de" },
    { value: "is_empty", label: "Está vazio" },
  ],
  multi_select: [
    { value: "eq", label: "Contém" },
    { value: "neq", label: "Não contém" },
    { value: "is_empty", label: "Está vazio" },
  ],
  relation: [
    { value: "is_empty", label: "Está vazio" },
    { value: "is_not_empty", label: "Não está vazio" },
  ],
};

export function getOperatorsForFieldType(fieldType: string) {
  return OPERATORS_BY_TYPE[fieldType] || OPERATORS_BY_TYPE.text;
}

export function operatorNeedsValue(operator: string): boolean {
  return !["is_empty", "is_not_empty", "last_7_days", "last_14_days", "last_30_days", "today"].includes(operator);
}

function resolveRelativeDate(operator: string): Date {
  const now = new Date();
  switch (operator) {
    case "last_7_days": return subDays(now, 7);
    case "last_14_days": return subDays(now, 14);
    case "last_30_days": return subDays(now, 30);
    case "today": return startOfDay(now);
    default: return now;
  }
}

function evaluateCondition(record: Record<string, unknown>, condition: FilterCondition): boolean {
  const { field, operator, value } = condition;
  const recordValue = record[field];

  // Relative date operators
  if (["last_7_days", "last_14_days", "last_30_days", "today"].includes(operator)) {
    if (!recordValue) return false;
    const recordDate = typeof recordValue === "string" ? parseISO(recordValue) : recordValue as Date;
    const threshold = resolveRelativeDate(operator);
    if (operator === "today") {
      return startOfDay(recordDate).getTime() === startOfDay(new Date()).getTime();
    }
    return isAfter(recordDate, threshold);
  }

  // Empty checks
  if (operator === "is_empty") {
    return recordValue === null || recordValue === undefined || recordValue === "" ||
      (Array.isArray(recordValue) && recordValue.length === 0);
  }
  if (operator === "is_not_empty") {
    return recordValue !== null && recordValue !== undefined && recordValue !== "" &&
      !(Array.isArray(recordValue) && recordValue.length === 0);
  }

  const strVal = String(recordValue ?? "").toLowerCase();
  const filterVal = String(value ?? "").toLowerCase();

  switch (operator) {
    case "eq":
      if (typeof recordValue === "boolean") return recordValue === (value === true || value === "true");
      if (typeof recordValue === "number") return recordValue === Number(value);
      return strVal === filterVal;
    case "neq":
      if (typeof recordValue === "number") return recordValue !== Number(value);
      return strVal !== filterVal;
    case "gt": return Number(recordValue ?? 0) > Number(value);
    case "gte": {
      // Handle dates
      if (typeof recordValue === "string" && typeof value === "string") {
        try {
          const rd = parseISO(recordValue);
          const vd = parseISO(value);
          if (!isNaN(rd.getTime()) && !isNaN(vd.getTime())) {
            return isAfter(rd, vd) || isEqual(rd, vd);
          }
        } catch {}
      }
      return Number(recordValue ?? 0) >= Number(value);
    }
    case "lt": return Number(recordValue ?? 0) < Number(value);
    case "lte": {
      if (typeof recordValue === "string" && typeof value === "string") {
        try {
          const rd = parseISO(recordValue);
          const vd = parseISO(value);
          if (!isNaN(rd.getTime()) && !isNaN(vd.getTime())) {
            return isBefore(rd, vd) || isEqual(rd, vd);
          }
        } catch {}
      }
      return Number(recordValue ?? 0) <= Number(value);
    }
    case "contains": return strVal.includes(filterVal);
    case "not_contains": return !strVal.includes(filterVal);
    case "in": {
      const arr = Array.isArray(value) ? value : String(value).split(",").map(s => s.trim());
      return arr.some((v: string) => String(v).toLowerCase() === strVal);
    }
    default: return true;
  }
}

export function applyFilters<T extends Record<string, unknown>>(
  records: T[],
  conditions: FilterCondition[],
  logic: "AND" | "OR" = "AND"
): T[] {
  if (!conditions || conditions.length === 0) return records;

  return records.filter((record) => {
    if (logic === "AND") {
      return conditions.every((c) => evaluateCondition(record, c));
    }
    return conditions.some((c) => evaluateCondition(record, c));
  });
}

/**
 * Apply filters to custom object records where data is nested in a `data` property
 */
export function applyFiltersToObjectRecords<T extends { data: Record<string, unknown> }>(
  records: T[],
  conditions: FilterCondition[],
  logic: "AND" | "OR" = "AND"
): T[] {
  if (!conditions || conditions.length === 0) return records;

  return records.filter((record) => {
    const flatRecord = { ...record.data, created_at: (record as any).created_at, updated_at: (record as any).updated_at };
    if (logic === "AND") {
      return conditions.every((c) => evaluateCondition(flatRecord, c));
    }
    return conditions.some((c) => evaluateCondition(flatRecord, c));
  });
}
