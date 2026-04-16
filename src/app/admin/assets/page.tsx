// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, RefreshCw, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AssetRow {
  id: string;
  name: string;
  category: string | null;
  status: string;
  criticality: string;
  internal_code: string | null;
  notes: string | null;
  company_id: string;
  created_at: string;
  _companyName?: string;
  _locationName?: string;
  _dataConsent?: boolean;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  operative: { bg: "rgba(16,185,129,0.12)", text: "#10b981" },
  critical: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
  review: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  inactive: { bg: "rgba(100,116,139,0.15)", text: "#64748b" },
};

const CRITICALITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(16,185,129,0.08)", text: "#6ee7b7" },
  medium: { bg: "rgba(234,179,8,0.08)", text: "#fcd34d" },
  high: { bg: "rgba(249,115,22,0.12)", text: "#f97316" },
  critical: { bg: "rgba(239,68,68,0.12)", text: "#ef4444" },
};

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assets")
      .select("id, name, category, status, criticality, internal_code, notes, company_id, location_id, created_at")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const companyIds = [...new Set(data.map((a) => a.company_id))];
    const locationIds = [...new Set(data.map((a) => a.location_id).filter(Boolean))];

    const [{ data: companies }, { data: locations }] = await Promise.all([
      companyIds.length > 0
        ? supabase.from("companies").select("id, name, data_sharing_consent").in("id", companyIds)
        : { data: [] },
      locationIds.length > 0
        ? supabase.from("locations").select("id, name").in("id", locationIds)
        : { data: [] },
    ]);

    const companyMap: Record<string, { name: string; consent: boolean }> = {};
    (companies ?? []).forEach((c) => { companyMap[c.id] = { name: c.name, consent: c.data_sharing_consent }; });

    const locationMap: Record<string, string> = {};
    (locations ?? []).forEach((l) => { locationMap[l.id] = l.name; });

    setAssets(data.map((a) => ({
      ...a,
      _companyName: companyMap[a.company_id]?.name,
      _locationName: a.location_id ? locationMap[a.location_id] : undefined,
      _dataConsent: companyMap[a.company_id]?.consent,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const filtered = assets.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a._companyName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Package size={20} color="#f59e0b" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Activos</h1>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Todos los activos registrados. Los detalles sensibles solo se muestran si la empresa habilitó el acceso a datos.
          </p>
        </div>
        <button onClick={loadAssets} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por nombre o empresa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 320, padding: "9px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "9px 12px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#94a3b8", fontSize: 13, outline: "none" }}
        >
          <option value="all">Todos los estados</option>
          <option value="operative">Operativo</option>
          <option value="critical">Crítico</option>
          <option value="review">En revisión</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando activos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>Sin resultados.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Activo", "Empresa", "Sucursal", "Categoría", "Estado", "Criticidad"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const statusColor = STATUS_COLORS[a.status] ?? STATUS_COLORS.operative;
                  const critColor = CRITICALITY_COLORS[a.criticality] ?? CRITICALITY_COLORS.medium;
                  return (
                    <tr key={a.id} style={{ borderTop: i === 0 ? "none" : "1px solid #0f172a" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{a.name}</p>
                        {a.internal_code && <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>#{a.internal_code}</p>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{a._companyName ?? "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>
                        {a._dataConsent ? (
                          <span style={{ color: "#94a3b8" }}>{a._locationName ?? "—"}</span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#334155", fontSize: 12 }}>
                            <EyeOff size={12} /> Privado
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{a.category ?? "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: statusColor.bg, color: statusColor.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: critColor.bg, color: critColor.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {a.criticality}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
