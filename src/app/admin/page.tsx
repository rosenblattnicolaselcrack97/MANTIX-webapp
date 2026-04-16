// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Box, ClipboardList, MapPin, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Stats {
  companies: number;
  users: number;
  assets: number;
  workOrders: number;
  locations: number;
  activeUsers: number;
}

interface RecentCompany {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  data_sharing_consent: boolean;
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  trial: { bg: "rgba(234,179,8,0.12)", text: "#ca8a04" },
  starter: { bg: "rgba(14,165,233,0.12)", text: "#0284c7" },
  pro: { bg: "rgba(139,92,246,0.12)", text: "#7c3aed" },
  enterprise: { bg: "rgba(16,185,129,0.12)", text: "#059669" },
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid #334155",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{label}</p>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({ companies: 0, users: 0, assets: 0, workOrders: 0, locations: 0, activeUsers: 0 });
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [
          { count: companies },
          { count: users },
          { count: activeUsers },
          { count: assets },
          { count: workOrders },
          { count: locations },
          { data: recent },
        ] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("assets").select("*", { count: "exact", head: true }),
          supabase.from("work_orders").select("*", { count: "exact", head: true }),
          supabase.from("locations").select("*", { count: "exact", head: true }),
          supabase.from("companies").select("id, name, plan, created_at, data_sharing_consent").order("created_at", { ascending: false }).limit(6),
        ]);
        setStats({
          companies: companies ?? 0,
          users: users ?? 0,
          activeUsers: activeUsers ?? 0,
          assets: assets ?? 0,
          workOrders: workOrders ?? 0,
          locations: locations ?? 0,
        });
        setRecentCompanies((recent ?? []) as RecentCompany[]);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
          Panel de Administración
        </h1>
        <p style={{ fontSize: 14, color: "#64748b" }}>
          Vista global de todas las empresas y recursos en Mantix.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ width: 220, height: 84, background: "#1e293b", borderRadius: 12, border: "1px solid #334155", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
            <StatCard icon={Building2} label="Empresas registradas" value={stats.companies} color="#0ea5e9" />
            <StatCard icon={Users} label="Usuarios totales" value={stats.users} color="#8b5cf6" />
            <StatCard icon={CheckCircle2} label="Usuarios activos" value={stats.activeUsers} color="#10b981" />
            <StatCard icon={Box} label="Activos" value={stats.assets} color="#f59e0b" />
            <StatCard icon={ClipboardList} label="Órdenes de trabajo" value={stats.workOrders} color="#ef4444" />
            <StatCard icon={MapPin} label="Sucursales" value={stats.locations} color="#06b6d4" />
          </div>

          {/* Recent companies */}
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: 10 }}>
              <TrendingUp size={16} color="#0ea5e9" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Empresas recientes</h2>
            </div>
            {recentCompanies.length === 0 ? (
              <div style={{ padding: "32px 24px", textAlign: "center", color: "#475569", fontSize: 14 }}>
                No hay empresas registradas todavía.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0f172a" }}>
                    {["Empresa", "Plan", "Consentimiento datos", "Registrada"].map((h) => (
                      <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentCompanies.map((c, i) => {
                    const plan = PLAN_COLORS[c.plan] ?? PLAN_COLORS.trial;
                    return (
                      <tr key={c.id} style={{ borderTop: i === 0 ? "none" : "1px solid #1e293b" }}>
                        <td style={{ padding: "14px 24px", fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "14px 24px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: plan.bg, color: plan.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {c.plan}
                          </span>
                        </td>
                        <td style={{ padding: "14px 24px" }}>
                          {c.data_sharing_consent ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#10b981" }}>
                              <CheckCircle2 size={14} /> Habilitado
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569" }}>
                              <AlertCircle size={14} /> No habilitado
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 24px", fontSize: 13, color: "#64748b" }}>
                          {new Date(c.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
