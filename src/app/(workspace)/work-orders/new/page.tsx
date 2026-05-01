"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Asset, WorkOrder } from "@/types/entities";
import { WorkOrderComposer } from "@/features/work-orders/components/work-order-composer";

export default function NewWorkOrderPage() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [relatedOrders, setRelatedOrders] = useState<WorkOrder[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [sites, setSites] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadFormData = async () => {
      if (!profile?.company_id) {
        return;
      }

      const companyId = profile.company_id;
      const [{ data: rawAssets }, { data: rawWorkOrders }, { data: rawProfiles }, { data: rawLocations }] = await Promise.all([
        supabase.from("assets").select("id, name, internal_code, category, criticality, status, location_id, next_maintenance_at, last_maintenance_at").eq("company_id", companyId),
        supabase.from("work_orders").select("id, title, asset_id, status, priority, created_at, due_date").eq("company_id", companyId).order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("full_name").eq("company_id", companyId).eq("is_active", true),
        supabase.from("locations").select("id, name").eq("company_id", companyId),
      ]);

      const locationMap = new Map((rawLocations ?? []).map((location) => [location.id, location.name]));
      const assetMap = new Map((rawAssets ?? []).map((asset) => [asset.id, asset.name]));

      if (isMounted) {
        setAssets(
          (rawAssets ?? []).map((asset) => ({
            id: asset.id,
            name: asset.name,
            code: asset.internal_code ?? asset.id.slice(0, 8),
            category: asset.category ?? "Sin categoría",
            site: asset.location_id ? locationMap.get(asset.location_id) ?? "Sin ubicación" : "Sin ubicación",
            status: asset.status === "critical" ? "critical" : asset.status === "review" ? "warning" : asset.status === "inactive" ? "offline" : "healthy",
            criticality: asset.criticality === "high" ? "high" : asset.criticality === "low" ? "low" : "medium",
            nextServiceAt: asset.next_maintenance_at ?? "",
            nextServiceLabel: asset.next_maintenance_at ? new Date(asset.next_maintenance_at).toLocaleDateString("es-AR") : "Sin fecha",
            lastInterventionAt: asset.last_maintenance_at ?? "",
            lastInterventionLabel: asset.last_maintenance_at ? new Date(asset.last_maintenance_at).toLocaleDateString("es-AR") : "Sin registro",
            openIssues: 0,
            utilization: 0,
          })),
        );
        setRelatedOrders(
          (rawWorkOrders ?? []).map((workOrder) => ({
            id: workOrder.id,
            title: workOrder.title,
            assetId: workOrder.asset_id ?? "",
            assetName: workOrder.asset_id ? assetMap.get(workOrder.asset_id) ?? "Sin activo" : "Sin activo",
            site: "",
            assignee: "Sin asignar",
            resolution: "external",
            priority: workOrder.priority === "urgent" ? "urgent" : workOrder.priority === "high" ? "high" : workOrder.priority === "low" ? "low" : "medium",
            status: workOrder.status === "completed" ? "completed" : workOrder.status === "blocked" ? "blocked" : workOrder.status === "scheduled" ? "scheduled" : "in_progress",
            requestedAt: workOrder.created_at,
            dueAt: workOrder.due_date ?? "",
            dueLabel: workOrder.due_date ? new Date(workOrder.due_date).toLocaleDateString("es-AR") : "Sin fecha",
            estimatedHours: 0,
            evidenceCount: 0,
          })),
        );
        setAssignees((rawProfiles ?? []).map((entry) => entry.full_name).filter(Boolean));
        setSites((rawLocations ?? []).map((entry) => entry.name));
      }
    };

    void loadFormData();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  return (
    <WorkOrderComposer
      assets={assets}
      assignees={assignees}
      relatedOrders={relatedOrders}
      sites={sites}
    />
  );
}
