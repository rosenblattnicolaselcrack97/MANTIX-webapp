// @ts-nocheck
/**
 * csvValidation.ts — Validación de filas CSV para Activos y Proveedores
 */

export interface RowError {
  row: number; // 1-based, counting from first DATA row
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: RowError[];
}

// ─── Asset row validation ─────────────────────────────────────────────────────
const VALID_ASSET_STATUSES = ["operative", "critical", "review", "inactive"];
const VALID_ASSET_CRITICALITIES = ["low", "medium", "high", "critical"];

export function validateAssetRows(rows: Record<string, string>[]): ValidationResult {
  const errors: RowError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Nombre is mandatory
    if (!row["Nombre"]?.trim()) {
      errors.push({ row: rowNum, field: "Nombre", message: `Fila ${rowNum}: "Nombre" es obligatorio.` });
    }

    // Status validation if provided
    if (row["Estado"] && !VALID_ASSET_STATUSES.includes(row["Estado"].toLowerCase().trim())) {
      errors.push({
        row: rowNum, field: "Estado",
        message: `Fila ${rowNum}: "Estado" inválido: "${row["Estado"]}". Valores válidos: ${VALID_ASSET_STATUSES.join(", ")}.`,
      });
    }

    // Criticality validation if provided
    if (row["Criticidad"] && !VALID_ASSET_CRITICALITIES.includes(row["Criticidad"].toLowerCase().trim())) {
      errors.push({
        row: rowNum, field: "Criticidad",
        message: `Fila ${rowNum}: "Criticidad" inválida: "${row["Criticidad"]}". Valores válidos: ${VALID_ASSET_CRITICALITIES.join(", ")}.`,
      });
    }
  });

  return { ok: errors.length === 0, errors };
}

// ─── Provider row validation ──────────────────────────────────────────────────
export function validateProviderRows(rows: Record<string, string>[]): ValidationResult {
  const errors: RowError[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 1;

    // Nombre is mandatory
    if (!row["Nombre"]?.trim()) {
      errors.push({ row: rowNum, field: "Nombre", message: `Fila ${rowNum}: "Nombre" es obligatorio.` });
    }

    // Teléfono is mandatory and must be at least 5 chars
    if (!row["Teléfono"]?.trim()) {
      errors.push({ row: rowNum, field: "Teléfono", message: `Fila ${rowNum}: "Teléfono" es obligatorio.` });
    } else if (row["Teléfono"].trim().length < 5) {
      errors.push({ row: rowNum, field: "Teléfono", message: `Fila ${rowNum}: "Teléfono" muy corto (mínimo 5 caracteres).` });
    }

    // Email validation if provided
    if (row["Email"]?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row["Email"].trim())) {
      errors.push({ row: rowNum, field: "Email", message: `Fila ${rowNum}: "Email" inválido: "${row["Email"]}".` });
    }

    // Estado validation if provided
    if (row["Estado"]?.trim() && !["Activo", "Inactivo"].includes(row["Estado"].trim())) {
      errors.push({ row: rowNum, field: "Estado", message: `Fila ${rowNum}: "Estado" inválido. Valores válidos: Activo, Inactivo.` });
    }
  });

  return { ok: errors.length === 0, errors };
}
