"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

import { supabase } from "@/lib/supabase";
import {
  ASSET_CSV_HEADERS,
  PROVIDER_CSV_HEADERS,
  assetToCSVRow,
  parseCSVToObjects,
  providerToCSVRow,
  todayStr,
} from "@/lib/csvUtils";
import { detectAssetDuplicates, detectProviderDuplicates } from "@/lib/duplicateDetection";
import { validateAssetRows, validateProviderRows } from "@/lib/csvValidation";

type ImportType = "activos" | "proveedores";
type WizardStep = "upload" | "validating" | "errors" | "duplicates" | "confirm" | "importing" | "result";

interface ImportRow {
  action: "create" | "update" | "skip";
  data: Record<string, string>;
  existingId?: string;
}

interface DuplicateItem {
  csvRowIndex: number;
  csvRow: Record<string, string>;
  existingId: string;
  existingRow: Record<string, string>;
  matchedFields?: string[];
  decision: "create" | "update" | "skip";
}

interface ExcelImportExportProps {
  companyId: string;
  companyName: string;
  importType: ImportType;
  onImportComplete?: () => void;
}

async function getToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

function buildTemplateRows(importType: ImportType, exampleRows: (string | null | undefined)[][]) {
  if (importType === "activos") {
    return [
      ...exampleRows,
      [""],
      ["INSTRUCCIONES:"],
      ["1. Código y Nombre son obligatorios"],
      ["2. Estado válido: operative, critical, review, inactive"],
      ["3. Criticidad válida: low, medium, high, critical"],
      ["4. Máximo 50 activos por importación"],
    ];
  }

  return [
    ...exampleRows,
    [""],
    ["INSTRUCCIONES:"],
    ["1. Nombre y Teléfono son obligatorios"],
    ["2. Estado válido: Activo, Inactivo"],
    ["3. Máximo 50 proveedores por importación"],
  ];
}

function downloadWorkbook(headers: string[], rows: (string | null | undefined)[][], filename: string, sheetName: string) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename, { compression: true });
}

function normalizeCell(value: unknown) {
  if (value == null) {
    return "";
  }

  return String(value).trim();
}

function parseWorkbookToObjects(data: ArrayBuffer, expectedHeaders: string[]) {
  const workbook = XLSX.read(data, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return { ok: false as const, error: "El archivo Excel no tiene hojas.", rows: [] as Record<string, string>[] };
  }

  const worksheet = workbook.Sheets[firstSheet];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (!matrix.length) {
    return { ok: false as const, error: "El archivo Excel está vacío.", rows: [] as Record<string, string>[] };
  }

  const headers = (matrix[0] ?? []).map((cell) => normalizeCell(cell));
  for (let index = 0; index < expectedHeaders.length; index += 1) {
    if ((headers[index] ?? "").toLowerCase() !== expectedHeaders[index].toLowerCase()) {
      return {
        ok: false as const,
        error: `Headers no coinciden. Columna ${index + 1}: esperado "${expectedHeaders[index]}", encontrado "${headers[index] ?? "(vacío)"}".`,
        rows: [] as Record<string, string>[],
      };
    }
  }

  const rows = matrix
    .slice(1)
    .map((row) => row.map((cell) => normalizeCell(cell)))
    .filter((row) => {
      const firstCell = row[0] ?? "";
      return firstCell && !firstCell.startsWith("INSTRUCCIONES:") && !/^\d+\./.test(firstCell);
    })
    .map((row) => {
      const record: Record<string, string> = {};
      expectedHeaders.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

  return { ok: true as const, rows };
}

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.75)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const CARD: React.CSSProperties = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 16,
  width: "100%",
  maxWidth: 620,
  maxHeight: "90vh",
  overflow: "auto",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 24px",
  borderBottom: "1px solid #334155",
};

const BODY: React.CSSProperties = { padding: "24px" };
const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "9px 20px",
  borderRadius: 8,
  border: "none",
  background: "#0ea5e9",
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
};

const BTN_SECONDARY: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 13,
};

const LABEL_SM: React.CSSProperties = {
  fontSize: 11,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

function Spinner({ size = 28 }: { size?: number }) {
  return (
    <>
      <style>{`@keyframes excel-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: size,
          height: size,
          border: "3px solid rgba(14,165,233,0.3)",
          borderTop: "3px solid #0ea5e9",
          borderRadius: "50%",
          animation: "excel-spin 0.8s linear infinite",
          flexShrink: 0,
        }}
      />
    </>
  );
}

function DuplicateCard({ dup, onDecide }: { dup: DuplicateItem; onDecide: (decision: "create" | "update" | "skip") => void }) {
  const allFields = Array.from(new Set([...Object.keys(dup.csvRow), ...Object.keys(dup.existingRow)])).slice(0, 6);

  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: "#f59e0b", marginBottom: 12, fontWeight: 600 }}>
        Posible duplicado detectado{dup.matchedFields ? ` — coincide en: ${dup.matchedFields.join(", ")}` : ""}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Nuevo (Excel)</p>
          {allFields.map((field) => (
            <p key={field} style={{ fontSize: 12, color: dup.matchedFields?.includes(field) ? "#e2e8f0" : "#64748b", marginBottom: 2 }}>
              <span style={{ color: "#475569" }}>{field}:</span> {dup.csvRow[field] || "—"}
            </p>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Existente (BD)</p>
          {allFields.map((field) => (
            <p key={field} style={{ fontSize: 12, color: dup.matchedFields?.includes(field) ? "#e2e8f0" : "#64748b", marginBottom: 2 }}>
              <span style={{ color: "#475569" }}>{field}:</span> {dup.existingRow[field] || "—"}
            </p>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onDecide("update")} style={{ ...BTN_PRIMARY, flex: 1 }}>
          Actualizar existente
        </button>
        <button onClick={() => onDecide("create")} style={{ ...BTN_SECONDARY, flex: 1 }}>
          Crear nuevo
        </button>
        <button onClick={() => onDecide("skip")} style={BTN_SECONDARY}>
          Saltar
        </button>
      </div>
    </div>
  );
}

export function ExcelImportExport({ companyId, companyName, importType, onImportComplete }: ExcelImportExportProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalStep, setModalStep] = useState<WizardStep | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headers = importType === "activos" ? ASSET_CSV_HEADERS : PROVIDER_CSV_HEADERS;
  const safeCompanyName = companyName.replace(/[^a-zA-Z0-9\-_]/g, "_");

  useEffect(() => {
    if (!dropdownOpen) {
      return undefined;
    }

    const handler = () => setDropdownOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [dropdownOpen]);

  const closeModal = () => {
    setModalStep(null);
    setFile(null);
    setValidationErrors([]);
    setParsedRows([]);
    setDuplicates([]);
    setImportRows([]);
    setProgress(0);
    setResult(null);
  };

  const buildFinalRows = useCallback((rows: Record<string, string>[], duplicateRows: DuplicateItem[]) => {
    const duplicateMap: Record<number, DuplicateItem> = {};
    duplicateRows.forEach((duplicate) => {
      duplicateMap[duplicate.csvRowIndex] = duplicate;
    });

    setImportRows(
      rows
        .map((row, index) => {
          const duplicate = duplicateMap[index];
          if (!duplicate) {
            return { action: "create", data: row } as ImportRow;
          }
          if (duplicate.decision === "skip") {
            return { action: "skip", data: row } as ImportRow;
          }
          if (duplicate.decision === "update") {
            return { action: "update", data: row, existingId: duplicate.existingId } as ImportRow;
          }
          return { action: "create", data: row } as ImportRow;
        })
        .filter((row) => row.action !== "skip"),
    );
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    setDropdownOpen(false);

    if (importType === "activos") {
      const { data } = await supabase
        .from("assets")
        .select("name, internal_code, category, status, criticality, serial_number, manufacturer, model, notes, location_id")
        .eq("company_id", companyId)
        .limit(3);
      const { data: locations } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
      const locationMap = new Map((locations ?? []).map((location) => [location.id, location.name]));
      const exampleRows = (data ?? []).map((asset) =>
        assetToCSVRow({
          ...asset,
          _locationName: asset.location_id ? locationMap.get(asset.location_id) ?? null : null,
        }),
      );
      downloadWorkbook(headers, buildTemplateRows(importType, exampleRows), `Activos_en_Mantix_${safeCompanyName}_TEMPLATE.xlsx`, "Activos");
      return;
    }

    const { data } = await supabase
      .from("providers")
      .select("name, phone, whatsapp, email, category, contact_name, notes, is_active")
      .eq("company_id", companyId)
      .limit(3);
    const exampleRows = (data ?? []).map((provider) => providerToCSVRow(provider));
    downloadWorkbook(headers, buildTemplateRows(importType, exampleRows), `Proveedores_en_Mantix_${safeCompanyName}_TEMPLATE.xlsx`, "Proveedores");
  }, [companyId, headers, importType, safeCompanyName]);

  const handleDownloadData = useCallback(async () => {
    setDropdownOpen(false);

    if (importType === "activos") {
      const { data } = await supabase
        .from("assets")
        .select("name, internal_code, category, status, criticality, serial_number, manufacturer, model, notes, location_id")
        .eq("company_id", companyId);
      const { data: locations } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
      const locationMap = new Map((locations ?? []).map((location) => [location.id, location.name]));
      const rows = (data ?? []).map((asset) =>
        assetToCSVRow({
          ...asset,
          _locationName: asset.location_id ? locationMap.get(asset.location_id) ?? null : null,
        }),
      );
      downloadWorkbook(headers, rows, `Activos_en_Mantix_${safeCompanyName}_${todayStr()}.xlsx`, "Activos");
      return;
    }

    const { data } = await supabase
      .from("providers")
      .select("name, phone, whatsapp, email, category, contact_name, notes, is_active")
      .eq("company_id", companyId);
    const rows = (data ?? []).map((provider) => providerToCSVRow(provider));
    downloadWorkbook(headers, rows, `Proveedores_en_Mantix_${safeCompanyName}_${todayStr()}.xlsx`, "Proveedores");
  }, [companyId, headers, importType, safeCompanyName]);

  const processFile = useCallback(
    (selectedFile: File) => {
      const lowerName = selectedFile.name.toLowerCase();
      const isCsv = lowerName.endsWith(".csv");
      const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

      if (!isCsv && !isExcel) {
        setValidationErrors(["El archivo debe ser .xlsx, .xls o .csv."]);
        setModalStep("errors");
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setValidationErrors(["El archivo excede el tamaño máximo de 5MB."]);
        setModalStep("errors");
        return;
      }

      setFile(selectedFile);
      setModalStep("validating");

      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result;
        const parsed = isCsv
          ? parseCSVToObjects(String(result ?? ""), headers)
          : parseWorkbookToObjects(result as ArrayBuffer, headers);

        if (!parsed.ok) {
          setValidationErrors([parsed.error ?? "No se pudo leer el archivo."]);
          setModalStep("errors");
          return;
        }

        if (parsed.rows.length === 0) {
          setValidationErrors(["El archivo no tiene datos para importar."]);
          setModalStep("errors");
          return;
        }

        if (parsed.rows.length > 50) {
          setValidationErrors([`Máximo 50 registros permitidos. El archivo tiene ${parsed.rows.length}.`]);
          setModalStep("errors");
          return;
        }

        const validation = importType === "activos" ? validateAssetRows(parsed.rows) : validateProviderRows(parsed.rows);
        if (!validation.ok) {
          setValidationErrors(validation.errors.map((error) => error.message));
          setModalStep("errors");
          return;
        }

        setParsedRows(parsed.rows);

        if (importType === "activos") {
          const { data: existingAssets } = await supabase
            .from("assets")
            .select("id, name, internal_code, location_id")
            .eq("company_id", companyId);
          const { data: locations } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
          const locationMap = new Map((locations ?? []).map((location) => [location.id, location.name]));
          const duplicatesFound = detectAssetDuplicates(
            parsed.rows,
            (existingAssets ?? []).map((asset) => ({
              ...asset,
              _locationName: asset.location_id ? locationMap.get(asset.location_id) ?? null : null,
            })),
          ).map((duplicate) => ({ ...duplicate, decision: "update" as const }));
          setDuplicates(duplicatesFound);
          if (duplicatesFound.length > 0) {
            setModalStep("duplicates");
            return;
          }
          buildFinalRows(parsed.rows, []);
          setModalStep("confirm");
          return;
        }

        const { data: existingProviders } = await supabase
          .from("providers")
          .select("id, name, phone")
          .eq("company_id", companyId);
        const duplicatesFound = detectProviderDuplicates(parsed.rows, existingProviders ?? []).map((duplicate) => ({
          ...duplicate,
          decision: "update" as const,
        }));
        setDuplicates(duplicatesFound);
        if (duplicatesFound.length > 0) {
          setModalStep("duplicates");
          return;
        }
        buildFinalRows(parsed.rows, []);
        setModalStep("confirm");
      };

      if (isCsv) {
        reader.readAsText(selectedFile, "UTF-8");
      } else {
        reader.readAsArrayBuffer(selectedFile);
      }
    },
    [buildFinalRows, companyId, headers, importType],
  );

  const handleImport = useCallback(async () => {
    setModalStep("importing");
    setProgress(0);

    let locationMap: Record<string, string> = {};
    if (importType === "activos") {
      const { data } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
      locationMap = Object.fromEntries((data ?? []).map((location) => [location.name, location.id]));
    }

    const token = await getToken();
    const interval = setInterval(() => {
      setProgress((current) => Math.min(current + 5, 85));
    }, 150);

    try {
      const response = await fetch("/api/csv/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_id: companyId,
          import_type: importType,
          rows: importRows,
          file_name: file?.name ?? "import.xlsx",
          location_map: locationMap,
        }),
      });
      const payload = await response.json();
      clearInterval(interval);
      setProgress(100);
      window.setTimeout(() => {
        setResult({
          created: payload.created_count ?? 0,
          updated: payload.updated_count ?? 0,
          errors: payload.errors ?? [],
        });
        setModalStep("result");
        onImportComplete?.();
      }, 400);
    } catch (error) {
      clearInterval(interval);
      setResult({
        created: 0,
        updated: 0,
        errors: [error instanceof Error ? error.message : "Error desconocido"],
      });
      setModalStep("result");
    }
  }, [companyId, file?.name, importRows, importType, onImportComplete]);

  const createCount = importRows.filter((row) => row.action === "create").length;
  const updateCount = importRows.filter((row) => row.action === "update").length;

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          onClick={(event) => {
            event.stopPropagation();
            setDropdownOpen((current) => !current);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 15 }}>XLSX</span>
          <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
        </button>

        {dropdownOpen ? (
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 500,
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              minWidth: 220,
              overflow: "hidden",
            }}
          >
            {[
              { label: "Descargar template", action: () => void handleDownloadTemplate() },
              { label: "Descargar información", action: () => void handleDownloadData() },
              { label: "Cargar Excel", action: () => { setDropdownOpen(false); setModalStep("upload"); } },
            ].map((item, index) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  background: "transparent",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  fontSize: 13,
                  textAlign: "left",
                  borderBottom: index < 2 ? "1px solid #1e293b" : "none",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {modalStep ? (
        <div style={OVERLAY}>
          <div style={CARD}>
            <div style={HEADER}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
                  {importType === "activos" ? "Importar / Exportar Activos" : "Importar / Exportar Proveedores"}
                </p>
                <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{companyName}</p>
              </div>
              {modalStep !== "importing" ? (
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18 }}>
                  ✕
                </button>
              ) : null}
            </div>

            <div style={BODY}>
              {modalStep === "upload" ? (
                <div>
                  <p style={{ ...LABEL_SM, marginBottom: 16 }}>Seleccionar archivo Excel</p>
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      const selectedFile = event.dataTransfer.files[0];
                      if (selectedFile) {
                        processFile(selectedFile);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragging ? "#0ea5e9" : "#334155"}`,
                      borderRadius: 12,
                      padding: "48px 24px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: dragging ? "rgba(14,165,233,0.04)" : "rgba(255,255,255,0.01)",
                    }}
                  >
                    <p style={{ fontSize: 32, marginBottom: 8 }}>📂</p>
                    <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Arrastrá tu Excel aquí</p>
                    <p style={{ color: "#475569", fontSize: 12 }}>o hacé click para seleccionar</p>
                    <p style={{ color: "#334155", fontSize: 11, marginTop: 8 }}>Máx. 50 registros · Máx. 5MB · .xlsx, .xls o .csv</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0];
                      if (selectedFile) {
                        processFile(selectedFile);
                      }
                    }}
                  />
                </div>
              ) : null}

              {modalStep === "validating" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
                  <Spinner size={40} />
                  <p style={{ color: "#94a3b8", fontSize: 14 }}>Validando archivo...</p>
                  {file ? <p style={{ color: "#475569", fontSize: 12 }}>{file.name}</p> : null}
                </div>
              ) : null}

              {modalStep === "errors" ? (
                <div>
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Errores detectados</p>
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                      {validationErrors.map((error) => (
                        <li key={error} style={{ color: "#fca5a5", fontSize: 13, marginBottom: 4 }}>{error}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => void handleDownloadTemplate()} style={BTN_SECONDARY}>Descargar template</button>
                    <button onClick={() => setModalStep("upload")} style={BTN_PRIMARY}>Intentar nuevamente</button>
                  </div>
                </div>
              ) : null}

              {modalStep === "duplicates" ? (
                <div>
                  <p style={{ color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
                    Se encontraron <strong>{duplicates.length}</strong> posible{duplicates.length !== 1 ? "s" : ""} duplicado{duplicates.length !== 1 ? "s" : ""}.
                  </p>
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {duplicates.map((duplicate) => (
                      <DuplicateCard
                        key={`${duplicate.existingId}-${duplicate.csvRowIndex}`}
                        dup={duplicate}
                        onDecide={(decision) => {
                          setDuplicates((current) =>
                            current.map((item) =>
                              item.csvRowIndex === duplicate.csvRowIndex ? { ...item, decision } : item,
                            ),
                          );
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: "1px solid #334155" }}>
                    <button onClick={() => setModalStep("upload")} style={BTN_SECONDARY}>Volver</button>
                    <button
                      onClick={() => {
                        buildFinalRows(parsedRows, duplicates);
                        setModalStep("confirm");
                      }}
                      style={BTN_PRIMARY}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : null}

              {modalStep === "confirm" ? (
                <div>
                  <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
                    <p style={{ color: "#10b981", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Listo para importar</p>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div>
                        <p style={LABEL_SM}>Nuevos</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{createCount}</p>
                      </div>
                      <div>
                        <p style={LABEL_SM}>Actualizar</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#0ea5e9" }}>{updateCount}</p>
                      </div>
                      <div>
                        <p style={LABEL_SM}>Total</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{createCount + updateCount}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={closeModal} style={BTN_SECONDARY}>Cancelar</button>
                    <button onClick={() => void handleImport()} style={BTN_PRIMARY}>Importar ahora</button>
                  </div>
                </div>
              ) : null}

              {modalStep === "importing" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
                  <Spinner size={40} />
                  <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>Importando...</p>
                  <div style={{ width: "100%", maxWidth: 320 }}>
                    <div style={{ background: "#0f172a", borderRadius: 20, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "#0ea5e9", borderRadius: 20, width: `${progress}%`, transition: "width 0.3s ease" }} />
                    </div>
                    <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 8 }}>{progress}%</p>
                  </div>
                </div>
              ) : null}

              {modalStep === "result" && result ? (
                <div>
                  <div style={{ background: result.errors.length === 0 ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.08)", border: result.errors.length === 0 ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
                    <p style={{ color: result.errors.length === 0 ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                      {result.errors.length === 0 ? "Importación completada" : "Importación parcial"}
                    </p>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div>
                        <p style={LABEL_SM}>Creados</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{result.created}</p>
                      </div>
                      <div>
                        <p style={LABEL_SM}>Actualizados</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#0ea5e9" }}>{result.updated}</p>
                      </div>
                    </div>
                    {result.errors.length > 0 ? (
                      <ul style={{ margin: "16px 0 0", padding: "0 0 0 16px" }}>
                        {result.errors.slice(0, 5).map((error) => (
                          <li key={error} style={{ color: "#fca5a5", fontSize: 12, marginBottom: 3 }}>{error}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={closeModal} style={BTN_PRIMARY}>OK</button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
