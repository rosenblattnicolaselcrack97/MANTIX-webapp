// @ts-nocheck
/**
 * duplicateDetection.ts — Lógica de detección de duplicados para CSV import
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AssetDuplicate {
  csvRowIndex: number;
  csvRow: Record<string, string>;
  existingId: string;
  existingRow: Record<string, string>;
  matchedFields: string[];
  decision?: "create" | "update" | "skip";
}

export interface ProviderDuplicate {
  csvRowIndex: number;
  csvRow: Record<string, string>;
  existingId: string;
  existingRow: Record<string, string>;
  decision?: "create" | "update" | "skip";
}

// ─── Asset duplicate detection ────────────────────────────────────────────────
// Match if 2 of 3 fields coincide: Código, Nombre, Ubicación
export function detectAssetDuplicates(
  csvRows: Record<string, string>[],
  existingAssets: { id: string; internal_code?: string | null; name: string; _locationName?: string | null }[]
): AssetDuplicate[] {
  const duplicates: AssetDuplicate[] = [];

  csvRows.forEach((csvRow, idx) => {
    const csvCode = (csvRow["Código"] ?? "").trim().toLowerCase();
    const csvName = (csvRow["Nombre"] ?? "").trim().toLowerCase();
    const csvLoc = (csvRow["Ubicación"] ?? "").trim().toLowerCase();

    for (const existing of existingAssets) {
      const exCode = (existing.internal_code ?? "").trim().toLowerCase();
      const exName = (existing.name ?? "").trim().toLowerCase();
      const exLoc = (existing._locationName ?? "").trim().toLowerCase();

      const matchedFields: string[] = [];
      if (csvCode && exCode && csvCode === exCode) matchedFields.push("Código");
      if (csvName && exName && csvName === exName) matchedFields.push("Nombre");
      if (csvLoc && exLoc && csvLoc === exLoc) matchedFields.push("Ubicación");

      if (matchedFields.length >= 2) {
        duplicates.push({
          csvRowIndex: idx,
          csvRow,
          existingId: existing.id,
          existingRow: {
            "Código": existing.internal_code ?? "",
            "Nombre": existing.name,
            "Ubicación": existing._locationName ?? "",
          },
          matchedFields,
        });
        break; // one match per CSV row is enough
      }
    }
  });

  return duplicates;
}

// ─── Provider duplicate detection ────────────────────────────────────────────
// Match if BOTH Nombre + Teléfono coincide
export function detectProviderDuplicates(
  csvRows: Record<string, string>[],
  existingProviders: { id: string; name: string; phone?: string | null }[]
): ProviderDuplicate[] {
  const duplicates: ProviderDuplicate[] = [];

  csvRows.forEach((csvRow, idx) => {
    const csvName = (csvRow["Nombre"] ?? "").trim().toLowerCase();
    const csvPhone = (csvRow["Teléfono"] ?? "").replace(/\s/g, "").toLowerCase();

    for (const existing of existingProviders) {
      const exName = (existing.name ?? "").trim().toLowerCase();
      const exPhone = (existing.phone ?? "").replace(/\s/g, "").toLowerCase();

      if (csvName && exName && csvName === exName && csvPhone && exPhone && csvPhone === exPhone) {
        duplicates.push({
          csvRowIndex: idx,
          csvRow,
          existingId: existing.id,
          existingRow: {
            "Nombre": existing.name,
            "Teléfono": existing.phone ?? "",
          },
        });
        break;
      }
    }
  });

  return duplicates;
}
