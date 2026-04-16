// @ts-nocheck
"use client";

import { useEffect, useState, useCallback } from "react";
import { MapPin, RefreshCw, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  description: string | null;
  is_active: boolean;
  company_id: string;
  created_at: string;
  _companyName?: string;
  _dataConsent?: boolean;
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLocations = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    const companyIds = [...new Set(data.map((l) => l.company_id))];
    const { data: companies } = companyIds.length > 0
      ? await supabase.from("companies").select("id, name, data_sharing_consent").in("id", companyIds)
      : { data: [] };

    const companyMap: Record<string, { name: string; consent: boolean }> = {};
    (companies ?? []).forEach((c) => { companyMap[c.id] = { name: c.name, consent: c.data_sharing_consent }; });

    setLocations(data.map((l) => ({
      ...l,
      _companyName: companyMap[l.company_id]?.name,
      _dataConsent: companyMap[l.company_id]?.consent,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  const filtered = locations.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.name.toLowerCase().includes(q) || (l._companyName ?? "").toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <MapPin size={20} color="#06b6d4" />
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Sucursales</h1>
          </div>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Todas las sucursales y ubicaciones. La dirección detallada solo se muestra si la empresa habilitó el acceso a datos.
          </p>
        </div>
        <button
          onClick={loadLocations}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar por nombre, empresa o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 400, padding: "9px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#f1f5f9", fontSize: 13, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>Cargando sucursales...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>
            {search ? "Sin resultados." : "No hay sucursales registradas."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  {["Sucursal", "Empresa", "Ciudad", "Dirección", "Estado"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id} style={{ borderTop: i === 0 ? "none" : "1px solid #0f172a" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <p style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{l.name}</p>
                      {l._dataConsent && l.description && <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{l.description}</p>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{l._companyName ?? "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{l.city ?? "—"}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13 }}>
                      {l._dataConsent ? (
                        <span style={{ color: "#94a3b8" }}>{l.address ?? "—"}</span>
                      ) : (
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#334155", fontSize: 12 }}>
                          <EyeOff size={12} /> Privado
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                        background: l.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: l.is_active ? "#10b981" : "#ef4444",
                      }}>
                        {l.is_active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
