"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, MapPinned, PencilLine } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BranchRow {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface AreaRow {
  id: string;
  company_id: string;
  branch_id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface BranchFormState {
  id: string | null;
  name: string;
  city: string;
  address: string;
  description: string;
  isActive: boolean;
}

interface AreaFormState {
  id: string | null;
  branchId: string;
  name: string;
  description: string;
  status: string;
}

interface CountRow {
  location_id?: string | null;
  area_id?: string | null;
}

const initialBranchForm: BranchFormState = {
  id: null,
  name: "",
  city: "",
  address: "",
  description: "",
  isActive: true,
};

const initialAreaForm: AreaFormState = {
  id: null,
  branchId: "",
  name: "",
  description: "",
  status: "active",
};

function countByKey(rows: CountRow[], key: "location_id" | "area_id") {
  return rows.reduce<Map<string, number>>((accumulator, row) => {
    const value = row[key];
    if (!value) {
      return accumulator;
    }

    accumulator.set(value, (accumulator.get(value) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());
}

export function LocationsWorkspace() {
  const { profile } = useAuth();
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [branchForm, setBranchForm] = useState<BranchFormState>(initialBranchForm);
  const [areaForm, setAreaForm] = useState<AreaFormState>(initialAreaForm);
  const [assetCountByBranch, setAssetCountByBranch] = useState<Map<string, number>>(new Map());
  const [assetCountByArea, setAssetCountByArea] = useState<Map<string, number>>(new Map());
  const [workOrderCountByBranch, setWorkOrderCountByBranch] = useState<Map<string, number>>(new Map());
  const [workOrderCountByArea, setWorkOrderCountByArea] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingBranch, setIsSubmittingBranch] = useState(false);
  const [isSubmittingArea, setIsSubmittingArea] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredAreas = useMemo(() => {
    return areas.filter((area) => {
      const matchesBranch = branchFilter === "all" || area.branch_id === branchFilter;
      const matchesArea = areaFilter === "all" || area.id === areaFilter;
      return matchesBranch && matchesArea;
    });
  }, [areas, areaFilter, branchFilter]);

  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      if (branchFilter !== "all" && branch.id !== branchFilter) {
        return false;
      }

      if (areaFilter === "all") {
        return true;
      }

      return areas.some((area) => area.id === areaFilter && area.branch_id === branch.id);
    });
  }, [areas, areaFilter, branchFilter, branches]);

  useEffect(() => {
    let mounted = true;

    const loadWorkspace = async () => {
      if (!profile?.company_id) {
        if (mounted) {
          setBranches([]);
          setAreas([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setSchemaWarning(null);

      const [branchesResult, areasResult, assetsResult, workOrdersResult] = await Promise.all([
        supabase
          .from("locations")
          .select("id, name, city, address, description, is_active, created_at")
          .eq("company_id", profile.company_id)
          .order("name", { ascending: true }),
        supabase
          .from("branch_areas")
          .select("id, company_id, branch_id, name, description, status, created_at")
          .eq("company_id", profile.company_id)
          .order("name", { ascending: true }),
        supabase
          .from("assets")
          .select("location_id, area_id")
          .eq("company_id", profile.company_id),
        supabase
          .from("work_orders")
          .select("location_id, area_id")
          .eq("company_id", profile.company_id),
      ]);

      if (!mounted) {
        return;
      }

      if (branchesResult.error) {
        setErrorMessage(branchesResult.error.message);
        setBranches([]);
        setAreas([]);
        setIsLoading(false);
        return;
      }

      if (areasResult.error) {
        setSchemaWarning(
          'La tabla branch_areas o las columnas area_id todavia no estan disponibles. Ejecuta las migraciones de Prompt 2 para habilitar areas y sus contadores.',
        );
      }

      const assetRows = (assetsResult.data as CountRow[] | null) ?? [];
      const workOrderRows = (workOrdersResult.data as CountRow[] | null) ?? [];

      setBranches((branchesResult.data as BranchRow[] | null) ?? []);
      setAreas(areasResult.error ? [] : ((areasResult.data as AreaRow[] | null) ?? []));
      setAssetCountByBranch(countByKey(assetRows, "location_id"));
      setAssetCountByArea(countByKey(assetRows, "area_id"));
      setWorkOrderCountByBranch(countByKey(workOrderRows, "location_id"));
      setWorkOrderCountByArea(countByKey(workOrderRows, "area_id"));
      setIsLoading(false);
    };

    void loadWorkspace();

    return () => {
      mounted = false;
    };
  }, [profile?.company_id]);

  const resetMessages = () => {
    setFeedback(null);
    setErrorMessage(null);
  };

  const loadBranchIntoForm = (branch: BranchRow) => {
    resetMessages();
    setBranchForm({
      id: branch.id,
      name: branch.name,
      city: branch.city ?? "",
      address: branch.address ?? "",
      description: branch.description ?? "",
      isActive: branch.is_active,
    });
  };

  const loadAreaIntoForm = (area: AreaRow) => {
    resetMessages();
    setAreaForm({
      id: area.id,
      branchId: area.branch_id,
      name: area.name,
      description: area.description ?? "",
      status: area.status,
    });
  };

  const handleBranchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) {
      setErrorMessage("No hay empresa asociada para guardar sucursales.");
      return;
    }

    if (!branchForm.name.trim()) {
      setErrorMessage("El nombre de la sucursal es obligatorio.");
      return;
    }

    resetMessages();
    setIsSubmittingBranch(true);

    const payload = {
      company_id: profile.company_id,
      name: branchForm.name.trim(),
      city: branchForm.city.trim() || null,
      address: branchForm.address.trim() || null,
      description: branchForm.description.trim() || null,
      is_active: branchForm.isActive,
    };

    const query = branchForm.id
      ? supabase.from("locations").update(payload).eq("id", branchForm.id)
      : supabase.from("locations").insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setIsSubmittingBranch(false);
      return;
    }

    setFeedback(branchForm.id ? "Sucursal actualizada." : "Sucursal creada.");
    setBranchForm(initialBranchForm);
    setIsSubmittingBranch(false);
    setIsLoading(true);

    const { data } = await supabase
      .from("locations")
      .select("id, name, city, address, description, is_active, created_at")
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true });
    setBranches((data as BranchRow[] | null) ?? []);
    setIsLoading(false);
  };

  const handleAreaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) {
      setErrorMessage("No hay empresa asociada para guardar areas.");
      return;
    }

    if (!areaForm.branchId || !areaForm.name.trim()) {
      setErrorMessage("Selecciona una sucursal y completa el nombre del area.");
      return;
    }

    resetMessages();
    setIsSubmittingArea(true);

    const payload = {
      company_id: profile.company_id,
      branch_id: areaForm.branchId,
      name: areaForm.name.trim(),
      description: areaForm.description.trim() || null,
      status: areaForm.status,
    };

    const query = areaForm.id
      ? supabase.from("branch_areas").update(payload).eq("id", areaForm.id)
      : supabase.from("branch_areas").insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      if (error.message.toLowerCase().includes("branch_areas")) {
        setSchemaWarning(
          'La tabla branch_areas todavia no existe en Supabase. Ejecuta la migracion de sucursales y areas antes de crear areas.',
        );
      }
      setIsSubmittingArea(false);
      return;
    }

    const { data } = await supabase
      .from("branch_areas")
      .select("id, company_id, branch_id, name, description, status, created_at")
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true });

    setAreas((data as AreaRow[] | null) ?? []);
    setFeedback(areaForm.id ? "Area actualizada." : "Area creada.");
    setAreaForm(initialAreaForm);
    setIsSubmittingArea(false);
  };

  const toggleBranchStatus = async (branch: BranchRow) => {
    resetMessages();
    const { error } = await supabase
      .from("locations")
      .update({ is_active: !branch.is_active })
      .eq("id", branch.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setBranches((current) =>
      current.map((item) =>
        item.id === branch.id ? { ...item, is_active: !item.is_active } : item,
      ),
    );
    setFeedback(branch.is_active ? "Sucursal desactivada." : "Sucursal reactivada.");
  };

  const toggleAreaStatus = async (area: AreaRow) => {
    resetMessages();
    const nextStatus = area.status === "inactive" ? "active" : "inactive";
    const { error } = await supabase
      .from("branch_areas")
      .update({ status: nextStatus })
      .eq("id", area.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAreas((current) =>
      current.map((item) => (item.id === area.id ? { ...item, status: nextStatus } : item)),
    );
    setFeedback(nextStatus === "inactive" ? "Area desactivada." : "Area reactivada.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sucursales y areas"
        subtitle={`${branches.length} sucursales · ${areas.length} areas configuradas`}
      />

      {schemaWarning ? (
        <Card className="mantix-card border-warning/40">
          <CardContent className="flex items-start gap-3 p-5 text-[13px] text-muted">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>{schemaWarning}</div>
          </CardContent>
        </Card>
      ) : null}

      {feedback ? (
        <Card className="mantix-card border-success/40">
          <CardContent className="p-4 text-[13px] text-success">{feedback}</CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="mantix-card border-danger/40">
          <CardContent className="p-4 text-[13px] text-danger">{errorMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <div className="space-y-5">
          <Card className="mantix-card">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                Filtrar sucursal
                <select
                  className="form-control h-9"
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                >
                  <option value="all">Todas</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                Filtrar area
                <select
                  className="form-control h-9"
                  value={areaFilter}
                  onChange={(event) => setAreaFilter(event.target.value)}
                >
                  <option value="all">Todas</option>
                  {areas
                    .filter((area) => branchFilter === "all" || area.branch_id === branchFilter)
                    .map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Activos visibles
                </div>
                <div className="mt-2 text-[24px] font-bold text-foreground">
                  {filteredBranches.reduce(
                    (total, branch) => total + (assetCountByBranch.get(branch.id) ?? 0),
                    0,
                  )}
                </div>
              </div>

              <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Ordenes visibles
                </div>
                <div className="mt-2 text-[24px] font-bold text-foreground">
                  {filteredBranches.reduce(
                    (total, branch) => total + (workOrderCountByBranch.get(branch.id) ?? 0),
                    0,
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card className="mantix-card">
              <CardContent className="p-5 text-[13px] text-muted">Cargando sucursales y areas...</CardContent>
            </Card>
          ) : filteredBranches.length === 0 ? (
            <WorkspaceEmptyState
              title="Todavia no hay sucursales configuradas"
              description="Registra la primera sucursal para empezar a organizar activos, areas y ordenes por ubicacion operativa real."
            />
          ) : (
            <div className="space-y-4">
              {filteredBranches.map((branch) => {
                const branchAreas = filteredAreas.filter((area) => area.branch_id === branch.id);

                return (
                  <Card className="mantix-card" key={branch.id}>
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-brand" />
                            <h2 className="text-[18px] font-semibold text-foreground">{branch.name}</h2>
                            <span className="rounded-full border border-line px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                              {branch.is_active ? "Activa" : "Inactiva"}
                            </span>
                          </div>
                          <div className="text-[13px] text-muted">
                            {[branch.city, branch.address].filter(Boolean).join(" · ") || "Sin direccion cargada"}
                          </div>
                          {branch.description ? (
                            <p className="max-w-3xl text-[13px] leading-6 text-muted">{branch.description}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => loadBranchIntoForm(branch)} type="button">
                            <PencilLine className="size-4" />
                            Editar sucursal
                          </Button>
                          <Button
                            variant={branch.is_active ? "danger" : "success"}
                            onClick={() => toggleBranchStatus(branch)}
                            type="button"
                          >
                            {branch.is_active ? "Desactivar" : "Reactivar"}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Areas</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">{branchAreas.length}</div>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Activos asociados</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">{assetCountByBranch.get(branch.id) ?? 0}</div>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Ordenes asociadas</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">{workOrderCountByBranch.get(branch.id) ?? 0}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                          <MapPinned className="size-4" />
                          Areas de la sucursal
                        </div>

                        {branchAreas.length === 0 ? (
                          <div className="rounded-[12px] border border-dashed border-line p-4 text-[13px] text-muted">
                            Esta sucursal todavia no tiene areas cargadas.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {branchAreas.map((area) => (
                              <div
                                className="flex flex-col gap-3 rounded-[12px] border border-line bg-surface-alt p-4 lg:flex-row lg:items-center lg:justify-between"
                                key={area.id}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-semibold text-foreground">{area.name}</span>
                                    <span className="rounded-full border border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                                      {area.status === "inactive" ? "Inactiva" : "Activa"}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[12px] text-muted">
                                    {area.description || "Sin descripcion"}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted">
                                    <span>Activos: {assetCountByArea.get(area.id) ?? 0}</span>
                                    <span>Ordenes: {workOrderCountByArea.get(area.id) ?? 0}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" onClick={() => loadAreaIntoForm(area)} type="button">
                                    Editar area
                                  </Button>
                                  <Button
                                    variant={area.status === "inactive" ? "success" : "danger"}
                                    onClick={() => toggleAreaStatus(area)}
                                    type="button"
                                  >
                                    {area.status === "inactive" ? "Reactivar" : "Desactivar"}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">
                    {branchForm.id ? "Editar sucursal" : "Nueva sucursal"}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Usa locations como tabla base actual y manten el aislamiento por company_id.
                  </p>
                </div>
                {branchForm.id ? (
                  <Button variant="ghost" onClick={() => setBranchForm(initialBranchForm)} type="button">
                    Limpiar
                  </Button>
                ) : null}
              </div>

              <form className="space-y-4" onSubmit={handleBranchSubmit}>
                <label className="block space-y-2">
                  <span className="form-label">Nombre de la sucursal *</span>
                  <Input
                    value={branchForm.name}
                    onChange={(event) =>
                      setBranchForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Ej: Planta principal"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Ciudad</span>
                    <Input
                      value={branchForm.city}
                      onChange={(event) =>
                        setBranchForm((current) => ({ ...current, city: event.target.value }))
                      }
                      placeholder="Ej: Rosario"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Direccion</span>
                    <Input
                      value={branchForm.address}
                      onChange={(event) =>
                        setBranchForm((current) => ({ ...current, address: event.target.value }))
                      }
                      placeholder="Ej: Av. Circunvalacion 1450"
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="form-label">Descripcion</span>
                  <Textarea
                    value={branchForm.description}
                    onChange={(event) =>
                      setBranchForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Contexto operativo, equipos clave o notas internas."
                  />
                </label>

                <label className="flex items-center gap-3 rounded-[12px] border border-line bg-surface-alt px-4 py-3 text-[13px] text-foreground">
                  <input
                    checked={branchForm.isActive}
                    onChange={(event) =>
                      setBranchForm((current) => ({ ...current, isActive: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  Sucursal activa
                </label>

                <Button disabled={isSubmittingBranch} type="submit">
                  {isSubmittingBranch
                    ? "Guardando..."
                    : branchForm.id
                      ? "Actualizar sucursal"
                      : "Crear sucursal"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">
                    {areaForm.id ? "Editar area" : "Nueva area"}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Las areas permiten bajar activos, ordenes y costos a un nivel operativo mas fino.
                  </p>
                </div>
                {areaForm.id ? (
                  <Button variant="ghost" onClick={() => setAreaForm(initialAreaForm)} type="button">
                    Limpiar
                  </Button>
                ) : null}
              </div>

              <form className="space-y-4" onSubmit={handleAreaSubmit}>
                <label className="block space-y-2">
                  <span className="form-label">Sucursal *</span>
                  <select
                    className="form-control h-9"
                    value={areaForm.branchId}
                    onChange={(event) =>
                      setAreaForm((current) => ({ ...current, branchId: event.target.value }))
                    }
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="form-label">Nombre del area *</span>
                  <Input
                    value={areaForm.name}
                    onChange={(event) =>
                      setAreaForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Ej: Produccion"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="form-label">Descripcion</span>
                  <Textarea
                    value={areaForm.description}
                    onChange={(event) =>
                      setAreaForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Ej: Linea 1, equipos de empaque, turnos nocturnos."
                  />
                </label>

                <label className="block space-y-2">
                  <span className="form-label">Estado</span>
                  <select
                    className="form-control h-9"
                    value={areaForm.status}
                    onChange={(event) =>
                      setAreaForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </label>

                <Button disabled={isSubmittingArea} type="submit" variant="secondary">
                  {isSubmittingArea
                    ? "Guardando..."
                    : areaForm.id
                      ? "Actualizar area"
                      : "Crear area"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}