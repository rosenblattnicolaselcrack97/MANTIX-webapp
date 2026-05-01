// @ts-nocheck
"use client";

/**
 * CSVImportExport.tsx — Botón dropdown + modal completo de importación/exportación CSV
 * Para Activos y Proveedores — Mantix CMMS Admin
 *
 * Flujo:
 *   1. Dropdown: Descargar Template / Descargar Información / Cargar CSV
 *   2. Cargar: Upload → Validación → Duplicados → Confirmación → Progreso → Resultado
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ASSET_CSV_HEADERS,
  PROVIDER_CSV_HEADERS,
  buildCSVString,
  buildAssetTemplate,
  buildProviderTemplate,
  assetToCSVRow,
  providerToCSVRow,
  downloadCSV,
  parseCSVToObjects,
  todayStr,
} from "@/lib/csvUtils";
import { validateAssetRows, validateProviderRows } from "@/lib/csvValidation";
import { detectAssetDuplicates, detectProviderDuplicates } from "@/lib/duplicateDetection";

// ─── Types ─────────────────────────────────────────────────────────────────────
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

// ─── Token helper ──────────────────────────────────────────────────────────────
async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

// ─── Inline styles ─────────────────────────────────────────────────────────────
const OVERLAY: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const CARD: React.CSSProperties = {
  background: "#1e293b", border: "1px solid #334155", borderRadius: 16,
  width: "100%", maxWidth: 620, maxHeight: "90vh", overflow: "auto",
  fontFamily: "system-ui, -apple-system, sans-serif",
};
const HEADER: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "18px 24px", borderBottom: "1px solid #334155",
};
const BODY: React.CSSProperties = { padding: "24px" };
const BTN_PRIMARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "9px 20px", borderRadius: 8, border: "none", background: "#0ea5e9",
  color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
};
const BTN_SECONDARY: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "9px 16px", borderRadius: 8, border: "1px solid #334155",
  background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13,
};
const BTN_DANGER: React.CSSProperties = {
  ...BTN_SECONDARY, borderColor: "rgba(239,68,68,0.4)", color: "#ef4444",
};
const LABEL_SM: React.CSSProperties = {
  fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em",
};

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 28 }: { size?: number }) {
  return (
    <>
      <style>{`@keyframes csv-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        width: size, height: size,
        border: `3px solid rgba(14,165,233,0.3)`,
        borderTop: `3px solid #0ea5e9`,
        borderRadius: "50%",
        animation: "csv-spin 0.8s linear infinite",
        flexShrink: 0,
      }} />
    </>
  );
}

// ─── DuplicateCard ────────────────────────────────────────────────────────────
function DuplicateCard({
  dup,
  onDecide,
}: {
  dup: DuplicateItem;
  onDecide: (decision: "create" | "update" | "skip") => void;
}) {
  const labelCol = (label: string) => (
    <p style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
      {label}
    </p>
  );

  const allFields = Array.from(new Set([...Object.keys(dup.csvRow), ...Object.keys(dup.existingRow)])).slice(0, 6);

  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: "#f59e0b", marginBottom: 12, fontWeight: 600 }}>
        ⚠ Posible duplicado detectado{dup.matchedFields ? ` — coincide en: ${dup.matchedFields.join(", ")}` : ""}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
        <div>
          {labelCol("📤 Nuevo (CSV)")}
          {allFields.map((k) => (
            <p key={k} style={{ fontSize: 12, color: dup.matchedFields?.includes(k) ? "#e2e8f0" : "#64748b", marginBottom: 2 }}>
              <span style={{ color: "#475569" }}>{k}:</span> {dup.csvRow[k] || "—"}
            </p>
          ))}
        </div>
        <div>
          {labelCol("📋 Existente (BD)")}
          {allFields.map((k) => (
            <p key={k} style={{ fontSize: 12, color: dup.matchedFields?.includes(k) ? "#e2e8f0" : "#64748b", marginBottom: 2 }}>
              <span style={{ color: "#475569" }}>{k}:</span> {dup.existingRow[k] || "—"}
            </p>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onDecide("update")}
          style={{ ...BTN_PRIMARY, flex: 1, background: dup.decision === "update" ? "#0ea5e9" : "rgba(14,165,233,0.15)", color: dup.decision === "update" ? "#fff" : "#0ea5e9", border: `1px solid ${dup.decision === "update" ? "#0ea5e9" : "rgba(14,165,233,0.3)"}` }}
        >
          Actualizar existente
        </button>
        <button
          onClick={() => onDecide("create")}
          style={{ ...BTN_SECONDARY, flex: 1, background: dup.decision === "create" ? "rgba(16,185,129,0.15)" : "transparent", borderColor: dup.decision === "create" ? "#10b981" : "#334155", color: dup.decision === "create" ? "#10b981" : "#94a3b8" }}
        >
          Crear nuevo
        </button>
        <button
          onClick={() => onDecide("skip")}
          style={{ ...BTN_SECONDARY, background: dup.decision === "skip" ? "rgba(100,116,139,0.15)" : "transparent", borderColor: dup.decision === "skip" ? "#64748b" : "#334155", color: dup.decision === "skip" ? "#64748b" : "#94a3b8" }}
        >
          Saltar
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CSVImportExportProps {
  companyId: string;
  companyName: string;
  importType: ImportType;
  onImportComplete?: () => void;
}

export function CSVImportExport({ companyId, companyName, importType, onImportComplete }: CSVImportExportProps) {
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
  const dropRef = useRef<HTMLDivElement>(null);

  const headers = importType === "activos" ? ASSET_CSV_HEADERS : PROVIDER_CSV_HEADERS;
  const safeCompanyName = companyName.replace(/[^a-zA-Z0-9\-_]/g, "_");

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
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

  // ─── Download Template ──────────────────────────────────────────────────────
  const handleDownloadTemplate = useCallback(async () => {
    setDropdownOpen(false);
    if (importType === "activos") {
      const { data } = await supabase.from("assets")
        .select("name, internal_code, category, status, criticality, serial_number, manufacturer, model, notes, location_id")
        .eq("company_id", companyId).limit(3);
      const { data: locs } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
      const locMap: Record<string, string> = {};
      (locs ?? []).forEach((l) => { locMap[l.id] = l.name; });
      const exampleRows = (data ?? []).map((a) =>
        assetToCSVRow({ ...a, _locationName: a.location_id ? locMap[a.location_id] : null })
      );
      downloadCSV(buildAssetTemplate(exampleRows), `Activos_en_Mantix_${safeCompanyName}_TEMPLATE.csv`);
    } else {
      const { data } = await supabase.from("providers")
        .select("name, phone, whatsapp, email, category, contact_name, notes, is_active")
        .eq("company_id", companyId).limit(3);
      const exampleRows = (data ?? []).map((p) => providerToCSVRow(p));
      downloadCSV(buildProviderTemplate(exampleRows), `Proveedores_en_Mantix_${safeCompanyName}_TEMPLATE.csv`);
    }
  }, [companyId, companyName, importType]);

  // ─── Download Data ──────────────────────────────────────────────────────────
  const handleDownloadData = useCallback(async () => {
    setDropdownOpen(false);
    if (importType === "activos") {
      const { data } = await supabase.from("assets")
        .select("name, internal_code, category, status, criticality, serial_number, manufacturer, model, notes, location_id")
        .eq("company_id", companyId);
      const { data: locs } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
      const locMap: Record<string, string> = {};
      (locs ?? []).forEach((l) => { locMap[l.id] = l.name; });
      const rows = (data ?? []).map((a) =>
        assetToCSVRow({ ...a, _locationName: a.location_id ? locMap[a.location_id] : null })
      );
      downloadCSV(
        buildCSVString(ASSET_CSV_HEADERS, rows),
        `Activos_en_Mantix_${safeCompanyName}_${todayStr()}.csv`
      );
    } else {
      const { data } = await supabase.from("providers")
        .select("name, phone, whatsapp, email, category, contact_name, notes, is_active")
        .eq("company_id", companyId);
      const rows = (data ?? []).map((p) => providerToCSVRow(p));
      downloadCSV(
        buildCSVString(PROVIDER_CSV_HEADERS, rows),
        `Proveedores_en_Mantix_${safeCompanyName}_${todayStr()}.csv`
      );
    }
  }, [companyId, companyName, importType]);

  // ─── File handling ──────────────────────────────────────────────────────────
  const processFile = useCallback((f: File) => {
    if (!f.name.endsWith(".csv") && f.type !== "text/csv") {
      setValidationErrors(["El archivo debe ser .CSV"]);
      setModalStep("errors");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setValidationErrors(["El archivo excede el tamaño máximo de 5MB"]);
      setModalStep("errors");
      return;
    }
    setFile(f);
    setModalStep("validating");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = (e.target?.result as string) ?? "";
      const parsed = parseCSVToObjects(text, headers);

      if (!parsed.ok) {
        setValidationErrors([parsed.error ?? "Error al parsear el CSV"]);
        setModalStep("errors");
        return;
      }
      if (parsed.rows.length === 0) {
        setValidationErrors(["El archivo no tiene datos. Descargá el template y completá los datos."]);
        setModalStep("errors");
        return;
      }
      if (parsed.rows.length > 50) {
        setValidationErrors([`Máximo 50 registros permitidos. Tu archivo tiene ${parsed.rows.length}.`]);
        setModalStep("errors");
        return;
      }

      // Field validation
      const validation = importType === "activos"
        ? validateAssetRows(parsed.rows)
        : validateProviderRows(parsed.rows);

      if (!validation.ok) {
        setValidationErrors(validation.errors.map((e) => e.message));
        setModalStep("errors");
        return;
      }

      setParsedRows(parsed.rows);

      // Duplicate detection
      if (importType === "activos") {
        const { data: existing } = await supabase.from("assets")
          .select("id, name, internal_code, location_id")
          .eq("company_id", companyId);
        const { data: locs } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
        const locMap: Record<string, string> = {};
        (locs ?? []).forEach((l) => { locMap[l.id] = l.name; });
        const withLoc = (existing ?? []).map((a) => ({ ...a, _locationName: a.location_id ? locMap[a.location_id] : null }));
        const dups = detectAssetDuplicates(parsed.rows, withLoc).map((d) => ({ ...d, decision: "update" as const }));
        setDuplicates(dups);
        if (dups.length > 0) {
          setModalStep("duplicates");
        } else {
          buildFinalRows(parsed.rows, [], "activos");
          setModalStep("confirm");
        }
      } else {
        const { data: existing } = await supabase.from("providers")
          .select("id, name, phone")
          .eq("company_id", companyId);
        const dups = detectProviderDuplicates(parsed.rows, existing ?? []).map((d) => ({ ...d, decision: "update" as const }));
        setDuplicates(dups);
        if (dups.length > 0) {
          setModalStep("duplicates");
        } else {
          buildFinalRows(parsed.rows, [], "proveedores");
          setModalStep("confirm");
        }
      }
    };
    reader.readAsText(f, "UTF-8");
  }, [companyId, importType, headers]);

  const buildFinalRows = useCallback((
    rows: Record<string, string>[],
    dups: DuplicateItem[],
    type: ImportType
  ) => {
    const dupMap: Record<number, DuplicateItem> = {};
    dups.forEach((d) => { dupMap[d.csvRowIndex] = d; });

    const final: ImportRow[] = rows.map((row, idx) => {
      const dup = dupMap[idx];
      if (!dup) return { action: "create", data: row };
      if (dup.decision === "skip") return { action: "skip", data: row };
      if (dup.decision === "update") return { action: "update", data: row, existingId: dup.existingId };
      return { action: "create", data: row };
    }).filter((r) => r.action !== "skip");

    setImportRows(final);
  }, []);

  const handleDuplicateDecide = (idx: number, decision: "create" | "update" | "skip") => {
    setDuplicates((prev) => prev.map((d) => d.csvRowIndex === idx ? { ...d, decision } : d));
  };

  const handleDuplicatesContinue = () => {
    buildFinalRows(parsedRows, duplicates, importType);
    setModalStep("confirm");
  };

  // ─── Run import ─────────────────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    setModalStep("importing");
    setProgress(0);

    // Build location_map for assets
    let locationMap: Record<string, string> = {};
    if (importType === "activos") {
      const { data: locs } = await supabase.from("locations").select("id, name").eq("company_id", companyId);
      (locs ?? []).forEach((l) => { locationMap[l.name] = l.id; });
    }

    const token = await getToken();
    // Animate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 5, 85));
    }, 150);

    try {
      const res = await fetch("/api/csv/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_id: companyId,
          import_type: importType,
          rows: importRows,
          file_name: file?.name ?? "import.csv",
          location_map: locationMap,
        }),
      });
      const json = await res.json();
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setResult({
          created: json.created_count ?? 0,
          updated: json.updated_count ?? 0,
          errors: json.errors ?? [],
        });
        setModalStep("result");
        if (onImportComplete) onImportComplete();
      }, 400);
    } catch (e: any) {
      clearInterval(progressInterval);
      setResult({ created: 0, updated: 0, errors: [e.message ?? "Error desconocido"] });
      setModalStep("result");
    }
  }, [companyId, importType, importRows, file, onImportComplete]);

  const createCount = importRows.filter((r) => r.action === "create").length;
  const updateCount = importRows.filter((r) => r.action === "update").length;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Dropdown trigger ── */}
      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
            borderRadius: 8, border: "1px solid #334155", background: "#1e293b",
            color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          <span style={{ fontSize: 15 }}>📊</span> CSV
          <span style={{ fontSize: 10, marginLeft: 2 }}>▼</span>
        </button>

        {dropdownOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 500,
              background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 220, overflow: "hidden",
            }}
          >
            {[
              { icon: "📥", label: "Descargar Template", action: () => { handleDownloadTemplate(); setDropdownOpen(false); } },
              { icon: "📊", label: "Descargar Información", action: () => { handleDownloadData(); setDropdownOpen(false); } },
              { icon: "📤", label: "Cargar CSV", action: () => { setDropdownOpen(false); setModalStep("upload"); } },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "12px 16px", border: "none", background: "transparent",
                  color: "#e2e8f0", cursor: "pointer", fontSize: 13, textAlign: "left",
                  borderBottom: item.label !== "Cargar CSV" ? "1px solid #1e293b" : "none",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(14,165,233,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalStep && (
        <div style={OVERLAY}>
          <div style={CARD}>
            <div style={HEADER}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
                  {importType === "activos" ? "📦 Importar / Exportar Activos" : "🚚 Importar / Exportar Proveedores"}
                </p>
                <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{companyName}</p>
              </div>
              {modalStep !== "importing" && (
                <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18 }}>✕</button>
              )}
            </div>

            <div style={BODY}>

              {/* ── STEP: Upload ── */}
              {modalStep === "upload" && (
                <div>
                  <p style={{ ...LABEL_SM, marginBottom: 16 }}>Seleccionar archivo CSV</p>
                  <div
                    ref={dropRef}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragging ? "#0ea5e9" : "#334155"}`,
                      borderRadius: 12, padding: "48px 24px", textAlign: "center",
                      cursor: "pointer", transition: "border-color 0.2s",
                      background: dragging ? "rgba(14,165,233,0.04)" : "rgba(255,255,255,0.01)",
                    }}
                  >
                    <p style={{ fontSize: 32, marginBottom: 8 }}>📂</p>
                    <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      Arrastrá tu CSV aquí
                    </p>
                    <p style={{ color: "#475569", fontSize: 12 }}>o hacé click para seleccionar</p>
                    <p style={{ color: "#334155", fontSize: 11, marginTop: 8 }}>
                      Máx. 50 registros · Máx. 5MB · Solo .CSV
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                  />
                  <p style={{ fontSize: 12, color: "#475569", marginTop: 14 }}>
                    ¿No tenés el template?{" "}
                    <button onClick={handleDownloadTemplate} style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer", fontSize: 12, padding: 0 }}>
                      Descargarlo acá
                    </button>
                  </p>
                </div>
              )}

              {/* ── STEP: Validating ── */}
              {modalStep === "validating" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
                  <Spinner size={40} />
                  <p style={{ color: "#94a3b8", fontSize: 14 }}>Validando archivo...</p>
                  {file && <p style={{ color: "#475569", fontSize: 12 }}>{file.name}</p>}
                </div>
              )}

              {/* ── STEP: Errors ── */}
              {modalStep === "errors" && (
                <div>
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                    <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                      ❌ Errores detectados — importación cancelada
                    </p>
                    <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                      {validationErrors.map((e, i) => (
                        <li key={i} style={{ color: "#fca5a5", fontSize: 13, marginBottom: 4 }}>{e}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={handleDownloadTemplate} style={BTN_SECONDARY}>📥 Descargar template</button>
                    <button onClick={() => { setValidationErrors([]); setFile(null); setModalStep("upload"); }} style={BTN_PRIMARY}>Intentar nuevamente</button>
                  </div>
                </div>
              )}

              {/* ── STEP: Duplicates ── */}
              {modalStep === "duplicates" && (
                <div>
                  <p style={{ color: "#f59e0b", fontSize: 13, marginBottom: 16 }}>
                    Se encontraron <strong>{duplicates.length}</strong> posible{duplicates.length !== 1 ? "s" : ""} duplicado{duplicates.length !== 1 ? "s" : ""}.
                    Decidí qué hacer con cada uno:
                  </p>
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {duplicates.map((dup) => (
                      <DuplicateCard
                        key={dup.csvRowIndex}
                        dup={dup}
                        onDecide={(decision) => handleDuplicateDecide(dup.csvRowIndex, decision)}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: "1px solid #334155" }}>
                    <button onClick={() => setModalStep("upload")} style={BTN_SECONDARY}>Volver</button>
                    <button onClick={handleDuplicatesContinue} style={BTN_PRIMARY}>Continuar →</button>
                  </div>
                </div>
              )}

              {/* ── STEP: Confirm ── */}
              {modalStep === "confirm" && (
                <div>
                  <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
                    <p style={{ color: "#10b981", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>✅ Listo para importar</p>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      {createCount > 0 && (
                        <div>
                          <p style={LABEL_SM}>Nuevos</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{createCount}</p>
                        </div>
                      )}
                      {updateCount > 0 && (
                        <div>
                          <p style={LABEL_SM}>A actualizar</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: "#0ea5e9" }}>{updateCount}</p>
                        </div>
                      )}
                      <div>
                        <p style={LABEL_SM}>Total</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{createCount + updateCount}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={closeModal} style={BTN_SECONDARY}>Cancelar</button>
                    <button onClick={handleImport} style={BTN_PRIMARY}>Importar ahora</button>
                  </div>
                </div>
              )}

              {/* ── STEP: Importing ── */}
              {modalStep === "importing" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0" }}>
                  <Spinner size={40} />
                  <p style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
                    Importando {importType}...
                  </p>
                  <div style={{ width: "100%", maxWidth: 320 }}>
                    <div style={{ background: "#0f172a", borderRadius: 20, height: 8, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: "#0ea5e9", borderRadius: 20,
                        width: `${progress}%`, transition: "width 0.3s ease",
                      }} />
                    </div>
                    <p style={{ color: "#475569", fontSize: 12, textAlign: "center", marginTop: 8 }}>{progress}%</p>
                  </div>
                </div>
              )}

              {/* ── STEP: Result ── */}
              {modalStep === "result" && result && (
                <div>
                  {result.errors.length === 0 ? (
                    <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
                      <p style={{ color: "#10b981", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>✅ Importación completada</p>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                        {result.created > 0 && (
                          <div>
                            <p style={LABEL_SM}>Creados</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{result.created}</p>
                          </div>
                        )}
                        {result.updated > 0 && (
                          <div>
                            <p style={LABEL_SM}>Actualizados</p>
                            <p style={{ fontSize: 22, fontWeight: 800, color: "#0ea5e9" }}>{result.updated}</p>
                          </div>
                        )}
                        <div>
                          <p style={LABEL_SM}>Total procesado</p>
                          <p style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{result.created + result.updated}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                      <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                        ⚠ Importación parcial — {result.errors.length} error{result.errors.length !== 1 ? "es" : ""}
                      </p>
                      {result.created > 0 && <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>✅ Creados: {result.created}</p>}
                      {result.updated > 0 && <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>✅ Actualizados: {result.updated}</p>}
                      <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                        {result.errors.slice(0, 5).map((e, i) => (
                          <li key={i} style={{ color: "#fca5a5", fontSize: 12, marginBottom: 3 }}>{e}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li style={{ color: "#475569", fontSize: 12 }}>...y {result.errors.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={closeModal} style={BTN_PRIMARY}>OK</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
