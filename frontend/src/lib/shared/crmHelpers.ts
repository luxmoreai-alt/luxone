import type { CRMColumn, CRMRecord } from "./crmTypes";

export function sortRecords<T extends CRMRecord>(
  rows: T[],
  key: keyof T & string,
  direction: "asc" | "desc"
): T[] {
  const cloned = [...rows];
  cloned.sort((a, b) => {
    const valueA = String(a[key] ?? "");
    const valueB = String(b[key] ?? "");

    const maybeNumA = Number(valueA.replace(/[^0-9.-]/g, ""));
    const maybeNumB = Number(valueB.replace(/[^0-9.-]/g, ""));
    const bothNumeric = !Number.isNaN(maybeNumA) && !Number.isNaN(maybeNumB);

    if (bothNumeric) {
      return direction === "asc" ? maybeNumA - maybeNumB : maybeNumB - maybeNumA;
    }

    const aLower = valueA.toLowerCase();
    const bLower = valueB.toLowerCase();
    if (aLower < bLower) return direction === "asc" ? -1 : 1;
    if (aLower > bLower) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return cloned;
}

export function filterRecords<T extends CRMRecord>(
  rows: T[],
  columns: CRMColumn<T>[],
  filters: Partial<Record<string, string>>
): T[] {
  return rows.filter((row) =>
    columns.every((column) => {
      const filterValue = (filters[column.key] ?? "").trim().toLowerCase();
      if (!filterValue) return true;
      return String(row[column.key] ?? "").toLowerCase().includes(filterValue);
    })
  );
}
