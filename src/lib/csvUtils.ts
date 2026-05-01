// @ts-nocheck
/**
 * csvUtils.ts — Utilidades para generar, parsear y descargar CSV
 * Activos & Proveedores — Mantix CMMS
 */

// ─── Asset CSV headers ────────────────────────────────────────────────────────
export const ASSET_CSV_HEADERS = [
  "Código",
  "Nombre",
  "Categoría",
  "Estado",
  "Criticidad",
  "Ubicación",
  "Fabricante",
  "Modelo",
  "Número de Serie",
  "Notas",
];

// ─── Provider CSV headers ─────────────────────────────────────────────────────
export const PROVIDER_CSV_HEADERS = [
  "Nombre",
  "Teléfono",
  "WhatsApp",
  "Email",
  "Categoría",
  "Contacto Principal",
  "Notas",
  "Estado",
];

// ─── Valid values ─────────────────────────────────────────────────────────────
export const VALID_ASSET_STATUSES = ["operative", "critical", "review", "inactive"];
export const VALID_ASSET_CRITICALITIES = ["low", "medium", "high", "critical"];
export const VALID_PROVIDER_STATUSES = ["Activo", "Inactivo"];

// ─── CSV string builder ───────────────────────────────────────────────────────
function escapeCSVField(value: string | null | undefined): string {
  const str = value == null ? "" : String(value);
  // Always quote to handle commas, newlines, quotes
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildCSVRow(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCSVField).join(",");
}

export function buildCSVString(headers: string[], rows: (string | null | undefined)[][]): string {
  const headerRow = headers.map(escapeCSVField).join(",");
  const dataRows = rows.map((r) => buildCSVRow(r));
  return [headerRow, ...dataRows].join("\n");
}

// ─── Asset row → CSV row ──────────────────────────────────────────────────────
export function assetToCSVRow(asset: {
  internal_code?: string | null;
  name: string;
  category?: string | null;
  status: string;
  criticality: string;
  _locationName?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  notes?: string | null;
}): (string | null)[] {
  return [
    asset.internal_code ?? null,
    asset.name,
    asset.category ?? null,
    asset.status,
    asset.criticality,
    asset._locationName ?? null,
    asset.manufacturer ?? null,
    asset.model ?? null,
    asset.serial_number ?? null,
    asset.notes ?? null,
  ];
}

// ─── Provider row → CSV row ───────────────────────────────────────────────────
export function providerToCSVRow(provider: {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  category?: string | null;
  contact_name?: string | null;
  notes?: string | null;
  is_active: boolean;
}): (string | null)[] {
  return [
    provider.name,
    provider.phone ?? null,
    provider.whatsapp ?? null,
    provider.email ?? null,
    provider.category ?? null,
    provider.contact_name ?? null,
    provider.notes ?? null,
    provider.is_active ? "Activo" : "Inactivo",
  ];
}

// ─── Generate template with examples ─────────────────────────────────────────
export function buildAssetTemplate(exampleRows: (string | null)[][]): string {
  const instructions: (string | null)[][] = [
    [null, null, null, null, null, null, null, null, null, null],
    ["INSTRUCCIONES:", null, null, null, null, null, null, null, null, null],
    ["1. Código y Nombre son OBLIGATORIOS", null, null, null, null, null, null, null, null, null],
    ["2. Estado válido: operative, critical, review, inactive", null, null, null, null, null, null, null, null, null],
    ["3. Criticidad válida: low, medium, high, critical", null, null, null, null, null, null, null, null, null],
    ["4. Máximo 50 activos por importación", null, null, null, null, null, null, null, null, null],
    ["5. Reemplaza los ejemplos de arriba con tus datos", null, null, null, null, null, null, null, null, null],
  ];
  const allRows = [...exampleRows, ...instructions];
  return buildCSVString(ASSET_CSV_HEADERS, allRows);
}

export function buildProviderTemplate(exampleRows: (string | null)[][]): string {
  const instructions: (string | null)[][] = [
    [null, null, null, null, null, null, null, null],
    ["INSTRUCCIONES:", null, null, null, null, null, null, null],
    ["1. Nombre y Teléfono son OBLIGATORIOS", null, null, null, null, null, null, null],
    ["2. Estado válido: Activo, Inactivo", null, null, null, null, null, null, null],
    ["3. Máximo 50 proveedores por importación", null, null, null, null, null, null, null],
    ["4. Reemplaza los ejemplos de arriba con tus datos", null, null, null, null, null, null, null],
  ];
  const allRows = [...exampleRows, ...instructions];
  return buildCSVString(PROVIDER_CSV_HEADERS, allRows);
}

// ─── Download trigger ─────────────────────────────────────────────────────────
export function downloadCSV(csvString: string, filename: string): void {
  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }

  return rows;
}

// ─── Parse CSV text to object array ──────────────────────────────────────────
export function parseCSVToObjects(text: string, expectedHeaders: string[]): {
  ok: boolean;
  error?: string;
  rows: Record<string, string>[];
} {
  const allRows = parseCSV(text);
  if (allRows.length === 0) {
    return { ok: false, error: "El archivo está vacío.", rows: [] };
  }

  // Validate headers (first row)
  const headers = allRows[0].map((h) => h.trim());
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (headers[i]?.toLowerCase() !== expectedHeaders[i]?.toLowerCase()) {
      return {
        ok: false,
        error: `Headers no coinciden. Columna ${i + 1}: esperado "${expectedHeaders[i]}", encontrado "${headers[i] ?? "(vacío)"}". Descargá el template nuevamente.`,
        rows: [],
      };
    }
  }

  // Filter data rows — skip instruction rows (start with "INSTRUCCIONES:" or are empty)
  const dataRows = allRows.slice(1).filter((row) => {
    const firstCell = row[0]?.trim() ?? "";
    if (!firstCell) return false;
    if (firstCell.startsWith("INSTRUCCIONES:")) return false;
    if (/^\d+\./.test(firstCell)) return false; // numbered instructions
    return true;
  });

  const objects = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? "").trim();
    });
    return obj;
  });

  return { ok: true, rows: objects };
}

// ─── Today's date as YYYY-MM-DD ───────────────────────────────────────────────
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
