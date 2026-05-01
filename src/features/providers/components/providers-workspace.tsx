"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, Mail, PencilLine, Phone, Search, Truck, UserRoundPlus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { isValidEmail, isValidUrl, normalizeComparableText } from "@/lib/normalization";
import { ExcelImportExport } from "@/components/shared/excel-import-export";
import { PageHeader } from "@/components/shared/page-header";
import { WorkspaceEmptyState } from "@/components/shared/workspace-empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProviderRow {
  id: string;
  name: string;
  normalized_name?: string | null;
  tax_id?: string | null;
  supplier_type?: string | null;
  category?: string | null;
  specialty?: string | null;
  main_contact_name?: string | null;
  main_email?: string | null;
  main_phone?: string | null;
  secondary_email?: string | null;
  secondary_phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  payment_terms?: string | null;
  currency?: string | null;
  notes?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  rating?: number | null;
  total_jobs?: number | null;
  created_at: string;
}

interface SupplierContactRow {
  id: string;
  supplier_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  notes: string | null;
}

interface AssociationRow {
  supplier_id: string;
}

interface EmailLinkRow {
  entity_id: string;
  entity_type: string;
}

interface ProviderFormState {
  id: string | null;
  name: string;
  taxId: string;
  supplierType: string;
  category: string;
  specialty: string;
  mainContactName: string;
  mainEmail: string;
  mainPhone: string;
  secondaryEmail: string;
  secondaryPhone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  paymentTerms: string;
  currency: string;
  notes: string;
  status: string;
}

interface ContactFormState {
  supplierId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  notes: string;
}

const initialProviderForm: ProviderFormState = {
  id: null,
  name: "",
  taxId: "",
  supplierType: "",
  category: "",
  specialty: "",
  mainContactName: "",
  mainEmail: "",
  mainPhone: "",
  secondaryEmail: "",
  secondaryPhone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  country: "",
  paymentTerms: "",
  currency: "",
  notes: "",
  status: "active",
};

const initialContactForm: ContactFormState = {
  supplierId: "",
  name: "",
  role: "",
  email: "",
  phone: "",
  isPrimary: false,
  notes: "",
};

function buildCountMap<T extends string>(rows: T[]) {
  return rows.reduce<Map<string, number>>((accumulator, key) => {
    accumulator.set(key, (accumulator.get(key) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());
}

function providerStatus(provider: ProviderRow) {
  if (provider.status) {
    return provider.status;
  }

  return provider.is_active === false ? "inactive" : "active";
}

export function ProvidersWorkspace() {
  const { profile } = useAuth();
  const [companyName, setCompanyName] = useState("Mantix");
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [contacts, setContacts] = useState<SupplierContactRow[]>([]);
  const [assetCountBySupplier, setAssetCountBySupplier] = useState<Map<string, number>>(new Map());
  const [workOrderCountBySupplier, setWorkOrderCountBySupplier] = useState<Map<string, number>>(new Map());
  const [emailCountBySupplier, setEmailCountBySupplier] = useState<Map<string, number>>(new Map());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [providerForm, setProviderForm] = useState<ProviderFormState>(initialProviderForm);
  const [contactForm, setContactForm] = useState<ContactFormState>(initialContactForm);
  const [hasSuppliersCoreSchema, setHasSuppliersCoreSchema] = useState(false);
  const [hasContactsSchema, setHasContactsSchema] = useState(false);
  const [hasEmailLinksSchema, setHasEmailLinksSchema] = useState(false);
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);

  const visibleProviders = useMemo(() => {
    const normalizedQuery = normalizeComparableText(query);

    return providers.filter((provider) => {
      const matchesStatus = statusFilter === "all" || providerStatus(provider) === statusFilter;
      const matchesCategory = categoryFilter === "all" || (provider.category ?? "") === categoryFilter;
      const haystack = [
        provider.name,
        provider.normalized_name,
        provider.tax_id,
        provider.main_email,
        provider.email,
        provider.main_phone,
        provider.phone,
        provider.specialty,
        provider.category,
        provider.notes,
      ]
        .map((value) => normalizeComparableText(value))
        .join(" ");

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [categoryFilter, providers, query, statusFilter]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          providers
            .map((provider) => provider.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort(),
    [providers],
  );

  useEffect(() => {
    let mounted = true;

    const loadWorkspace = async () => {
      if (!profile?.company_id) {
        if (mounted) {
          setProviders([]);
          setContacts([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setSchemaWarning(null);
      setErrorMessage(null);

      const companyPromise = supabase
        .from("companies")
        .select("name")
        .eq("id", profile.company_id)
        .maybeSingle();

      const providersExtendedPromise = supabase
        .from("providers")
        .select(
          "id, name, normalized_name, tax_id, supplier_type, category, specialty, main_contact_name, main_email, main_phone, secondary_email, secondary_phone, website, address, city, state, country, payment_terms, currency, notes, status, is_active, created_at",
        )
        .eq("company_id", profile.company_id)
        .order("name", { ascending: true });

      const [companyResult, providersExtendedResult] = await Promise.all([
        companyPromise,
        providersExtendedPromise,
      ]);

      if (!mounted) {
        return;
      }

      if (companyResult.data?.name) {
        setCompanyName(companyResult.data.name);
      }

      let providerRows: ProviderRow[] = [];
      let suppliersCoreReady = false;

      if (providersExtendedResult.error) {
        const fallbackResult = await supabase
          .from("providers")
          .select("id, name, category, contact_name, phone, email, rating, total_jobs, notes, is_active, created_at")
          .eq("company_id", profile.company_id)
          .order("name", { ascending: true });

        if (fallbackResult.error) {
          setErrorMessage(fallbackResult.error.message);
          setProviders([]);
          setContacts([]);
          setIsLoading(false);
          return;
        }

        providerRows = ((fallbackResult.data as ProviderRow[] | null) ?? []).map((provider) => ({
          ...provider,
          main_contact_name: provider.contact_name ?? null,
          main_email: provider.email ?? null,
          main_phone: provider.phone ?? null,
          status: provider.is_active === false ? "inactive" : "active",
        }));
        setSchemaWarning(
          'La migracion de proveedores core todavia no esta aplicada. Se usa el esquema base actual y algunas capacidades avanzadas quedan en modo compatibilidad.',
        );
      } else {
        providerRows = (providersExtendedResult.data as ProviderRow[] | null) ?? [];
        suppliersCoreReady = true;
      }

      const [contactsResult, assetSuppliersResult, workOrderSuppliersResult, workOrdersFallbackResult, emailLinksResult] = await Promise.all([
        supabase
          .from("supplier_contacts")
          .select("id, supplier_id, name, role, email, phone, is_primary, notes")
          .eq("company_id", profile.company_id),
        supabase
          .from("asset_suppliers")
          .select("supplier_id")
          .eq("company_id", profile.company_id),
        supabase
          .from("work_order_suppliers")
          .select("supplier_id")
          .eq("company_id", profile.company_id),
        supabase
          .from("work_orders")
          .select("provider_id")
          .eq("company_id", profile.company_id),
        supabase
          .from("email_entity_links")
          .select("entity_id, entity_type")
          .eq("company_id", profile.company_id),
      ]);

      if (!mounted) {
        return;
      }

      setHasSuppliersCoreSchema(suppliersCoreReady);
      setHasContactsSchema(!contactsResult.error);
      setHasEmailLinksSchema(!emailLinksResult.error);
      setProviders(providerRows);
      setContacts(contactsResult.error ? [] : ((contactsResult.data as SupplierContactRow[] | null) ?? []));
      setAssetCountBySupplier(
        assetSuppliersResult.error
          ? new Map()
          : buildCountMap(
              (((assetSuppliersResult.data as AssociationRow[] | null) ?? [])
                .map((item) => item.supplier_id)
                .filter(Boolean) as string[]),
            ),
      );

      const workOrderRows = workOrderSuppliersResult.error
        ? ((((workOrdersFallbackResult.data as { provider_id: string | null }[] | null) ?? [])
            .map((item) => item.provider_id)
            .filter(Boolean) as string[]))
        : ((((workOrderSuppliersResult.data as AssociationRow[] | null) ?? [])
            .map((item) => item.supplier_id)
            .filter(Boolean) as string[]));

      setWorkOrderCountBySupplier(buildCountMap(workOrderRows));
      setEmailCountBySupplier(
        emailLinksResult.error
          ? new Map()
          : buildCountMap(
              (((emailLinksResult.data as EmailLinkRow[] | null) ?? [])
                .filter((item) => item.entity_type === "supplier" || item.entity_type === "provider")
                .map((item) => item.entity_id)
                .filter(Boolean) as string[]),
            ),
      );

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

  const loadProviderIntoForm = (provider: ProviderRow) => {
    resetMessages();
    setProviderForm({
      id: provider.id,
      name: provider.name,
      taxId: provider.tax_id ?? "",
      supplierType: provider.supplier_type ?? "",
      category: provider.category ?? "",
      specialty: provider.specialty ?? "",
      mainContactName: provider.main_contact_name ?? provider.contact_name ?? "",
      mainEmail: provider.main_email ?? provider.email ?? "",
      mainPhone: provider.main_phone ?? provider.phone ?? "",
      secondaryEmail: provider.secondary_email ?? "",
      secondaryPhone: provider.secondary_phone ?? "",
      website: provider.website ?? "",
      address: provider.address ?? "",
      city: provider.city ?? "",
      state: provider.state ?? "",
      country: provider.country ?? "",
      paymentTerms: provider.payment_terms ?? "",
      currency: provider.currency ?? "",
      notes: provider.notes ?? "",
      status: providerStatus(provider),
    });
  };

  const handleProviderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) {
      setErrorMessage("No hay empresa asociada para guardar proveedores.");
      return;
    }

    if (!providerForm.name.trim()) {
      setErrorMessage("El nombre del proveedor es obligatorio.");
      return;
    }

    if (!isValidEmail(providerForm.mainEmail) || !isValidEmail(providerForm.secondaryEmail)) {
      setErrorMessage("Revisa los emails antes de guardar.");
      return;
    }

    if (!isValidUrl(providerForm.website)) {
      setErrorMessage("El sitio web debe usar http o https.");
      return;
    }

    resetMessages();
    setIsSavingProvider(true);

    const normalizedName = normalizeComparableText(providerForm.name);

    const payload = hasSuppliersCoreSchema
      ? {
          company_id: profile.company_id,
          name: providerForm.name.trim(),
          normalized_name: normalizedName,
          tax_id: providerForm.taxId.trim() || null,
          supplier_type: providerForm.supplierType.trim() || null,
          category: providerForm.category.trim() || null,
          specialty: providerForm.specialty.trim() || null,
          main_contact_name: providerForm.mainContactName.trim() || null,
          main_email: providerForm.mainEmail.trim() || null,
          main_phone: providerForm.mainPhone.trim() || null,
          secondary_email: providerForm.secondaryEmail.trim() || null,
          secondary_phone: providerForm.secondaryPhone.trim() || null,
          website: providerForm.website.trim() || null,
          address: providerForm.address.trim() || null,
          city: providerForm.city.trim() || null,
          state: providerForm.state.trim() || null,
          country: providerForm.country.trim() || null,
          payment_terms: providerForm.paymentTerms.trim() || null,
          currency: providerForm.currency.trim() || null,
          notes: providerForm.notes.trim() || null,
          status: providerForm.status,
          is_active: providerForm.status !== "inactive" && providerForm.status !== "blocked",
        }
      : {
          company_id: profile.company_id,
          name: providerForm.name.trim(),
          category: providerForm.category.trim() || null,
          contact_name: providerForm.mainContactName.trim() || null,
          email: providerForm.mainEmail.trim() || null,
          phone: providerForm.mainPhone.trim() || null,
          notes: providerForm.notes.trim() || null,
          is_active: providerForm.status !== "inactive" && providerForm.status !== "blocked",
        };

    const query = providerForm.id
      ? supabase.from("providers").update(payload).eq("id", providerForm.id)
      : supabase.from("providers").insert(payload);

    const { error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setIsSavingProvider(false);
      return;
    }

    const refreshResult = await supabase
      .from("providers")
      .select(
        hasSuppliersCoreSchema
          ? "id, name, normalized_name, tax_id, supplier_type, category, specialty, main_contact_name, main_email, main_phone, secondary_email, secondary_phone, website, address, city, state, country, payment_terms, currency, notes, status, is_active, created_at"
          : "id, name, category, contact_name, phone, email, rating, total_jobs, notes, is_active, created_at",
      )
      .eq("company_id", profile.company_id)
      .order("name", { ascending: true });

    const refreshedRows = ((refreshResult.data as ProviderRow[] | null) ?? []).map((provider) => ({
      ...provider,
      main_contact_name: provider.main_contact_name ?? provider.contact_name ?? null,
      main_email: provider.main_email ?? provider.email ?? null,
      main_phone: provider.main_phone ?? provider.phone ?? null,
      status: provider.status ?? (provider.is_active === false ? "inactive" : "active"),
    }));

    setProviders(refreshedRows);
    setFeedback(providerForm.id ? "Proveedor actualizado." : "Proveedor creado.");
    setProviderForm(initialProviderForm);
    setIsSavingProvider(false);
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) {
      setErrorMessage("No hay empresa asociada para guardar contactos.");
      return;
    }

    if (!hasContactsSchema) {
      setErrorMessage("La tabla supplier_contacts todavia no existe. Ejecuta la migracion de proveedores core.");
      return;
    }

    if (!contactForm.supplierId || !contactForm.name.trim()) {
      setErrorMessage("Selecciona proveedor y completa el nombre del contacto.");
      return;
    }

    if (!isValidEmail(contactForm.email)) {
      setErrorMessage("El email del contacto no es valido.");
      return;
    }

    resetMessages();
    setIsSavingContact(true);

    const { error } = await supabase.from("supplier_contacts").insert({
      company_id: profile.company_id,
      supplier_id: contactForm.supplierId,
      name: contactForm.name.trim(),
      role: contactForm.role.trim() || null,
      email: contactForm.email.trim() || null,
      phone: contactForm.phone.trim() || null,
      is_primary: contactForm.isPrimary,
      notes: contactForm.notes.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSavingContact(false);
      return;
    }

    const { data } = await supabase
      .from("supplier_contacts")
      .select("id, supplier_id, name, role, email, phone, is_primary, notes")
      .eq("company_id", profile.company_id);

    setContacts((data as SupplierContactRow[] | null) ?? []);
    setContactForm(initialContactForm);
    setFeedback("Contacto agregado.");
    setIsSavingContact(false);
  };

  const toggleProviderStatus = async (provider: ProviderRow) => {
    resetMessages();
    const currentStatus = providerStatus(provider);
    const nextStatus = currentStatus === "inactive" ? "active" : "inactive";
    const payload = hasSuppliersCoreSchema
      ? { status: nextStatus, is_active: nextStatus === "active" }
      : { is_active: nextStatus === "active" };

    const { error } = await supabase.from("providers").update(payload).eq("id", provider.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setProviders((current) =>
      current.map((item) =>
        item.id === provider.id
          ? { ...item, status: nextStatus, is_active: nextStatus === "active" }
          : item,
      ),
    );
    setFeedback(nextStatus === "inactive" ? "Proveedor desactivado." : "Proveedor reactivado.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Proveedores"
        subtitle={`${providers.length} proveedores · ${visibleProviders.length} visibles con filtros activos`}
        actions={
          profile?.company_id ? (
            <ExcelImportExport companyId={profile.company_id} companyName={companyName} importType="proveedores" />
          ) : undefined
        }
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
        <div className="space-y-5">
          <Card className="mantix-card">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="form-label">Buscar proveedor</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <Input
                    className="pl-9"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nombre, email, telefono, CUIT, especialidad..."
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="form-label">Estado</span>
                <select
                  className="form-control h-9"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="pending">Pendientes</option>
                  <option value="blocked">Bloqueados</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="form-label">Categoria</span>
                <select
                  className="form-control h-9"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Proveedores activos
                </div>
                <div className="mt-2 text-[24px] font-bold text-foreground">
                  {providers.filter((provider) => providerStatus(provider) === "active").length}
                </div>
                <div className="mt-1 text-[12px] text-muted">Empresa: {companyName}</div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card className="mantix-card">
              <CardContent className="p-5 text-[13px] text-muted">Cargando proveedores...</CardContent>
            </Card>
          ) : visibleProviders.length === 0 ? (
            <WorkspaceEmptyState
              title="Todavia no hay proveedores visibles"
              description="Carga el primer proveedor para empezar a relacionar activos, ordenes de trabajo, costos y comunicaciones reales por empresa."
            />
          ) : (
            <div className="space-y-4">
              {visibleProviders.map((provider) => {
                const providerContacts = contacts.filter((contact) => contact.supplier_id === provider.id);
                const status = providerStatus(provider);

                return (
                  <Card className="mantix-card" key={provider.id}>
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Truck className="size-4 text-brand" />
                            <h2 className="text-[18px] font-semibold text-foreground">{provider.name}</h2>
                            <span className="rounded-full border border-line px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                              {status === "active"
                                ? "Activo"
                                : status === "inactive"
                                  ? "Inactivo"
                                  : status === "pending"
                                    ? "Pendiente"
                                    : "Bloqueado"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[13px] text-muted">
                            <span>{provider.specialty || provider.category || "Sin categoria"}</span>
                            {provider.tax_id ? <span>CUIT / ID: {provider.tax_id}</span> : null}
                            {provider.supplier_type ? <span>Tipo: {provider.supplier_type}</span> : null}
                          </div>
                          <div className="flex flex-wrap gap-4 text-[12px] text-muted">
                            {(provider.main_email ?? provider.email) ? (
                              <span className="inline-flex items-center gap-1">
                                <Mail className="size-3.5" />
                                {provider.main_email ?? provider.email}
                              </span>
                            ) : null}
                            {(provider.main_phone ?? provider.phone) ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="size-3.5" />
                                {provider.main_phone ?? provider.phone}
                              </span>
                            ) : null}
                            {(provider.main_contact_name ?? provider.contact_name) ? (
                              <span>Contacto principal: {provider.main_contact_name ?? provider.contact_name}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => loadProviderIntoForm(provider)} type="button">
                            <PencilLine className="size-4" />
                            Editar proveedor
                          </Button>
                          <Button
                            type="button"
                            variant={status === "inactive" ? "success" : "danger"}
                            onClick={() => toggleProviderStatus(provider)}
                          >
                            {status === "inactive" ? "Reactivar" : "Desactivar"}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Activos asociados</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">{assetCountBySupplier.get(provider.id) ?? 0}</div>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Ordenes asociadas</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">{workOrderCountBySupplier.get(provider.id) ?? 0}</div>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Contactos</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">{providerContacts.length}</div>
                        </div>
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Comunicaciones</div>
                          <div className="mt-2 text-[24px] font-bold text-foreground">
                            {hasEmailLinksSchema ? emailCountBySupplier.get(provider.id) ?? 0 : "-"}
                          </div>
                          {!hasEmailLinksSchema ? (
                            <div className="mt-1 text-[11px] text-muted">Pendiente de migracion email_entity_links</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">Cobertura operativa</div>
                          <div className="mt-3 grid gap-2 text-[13px] text-muted md:grid-cols-2">
                            <div>Categoria: {provider.category || "Sin definir"}</div>
                            <div>Especialidad: {provider.specialty || "Sin definir"}</div>
                            <div>Moneda: {provider.currency || "Sin definir"}</div>
                            <div>Pago: {provider.payment_terms || "Sin definir"}</div>
                            <div>Ciudad: {provider.city || "Sin definir"}</div>
                            <div>Pais: {provider.country || "Sin definir"}</div>
                          </div>
                          {provider.address ? (
                            <p className="mt-3 text-[13px] leading-6 text-muted">Direccion: {provider.address}</p>
                          ) : null}
                          {provider.notes ? (
                            <p className="mt-3 text-[13px] leading-6 text-muted">Notas: {provider.notes}</p>
                          ) : null}
                        </div>

                        <div className="rounded-[12px] border border-line bg-surface-alt p-4">
                          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                            <UserRoundPlus className="size-4" />
                            Contactos asociados
                          </div>

                          {providerContacts.length === 0 ? (
                            <div className="rounded-[10px] border border-dashed border-line px-3 py-4 text-[13px] text-muted">
                              Todavia no hay contactos adicionales para este proveedor.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {providerContacts.map((contact) => (
                                <div className="rounded-[10px] border border-line px-3 py-3" key={contact.id}>
                                  <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                                    {contact.name}
                                    {contact.is_primary ? (
                                      <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted">
                                        Principal
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-1 text-[12px] text-muted">
                                    {[contact.role, contact.email, contact.phone].filter(Boolean).join(" · ") || "Sin datos extra"}
                                  </div>
                                  {contact.notes ? (
                                    <div className="mt-1 text-[12px] text-muted">{contact.notes}</div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                    {providerForm.id ? "Editar proveedor" : "Nuevo proveedor"}
                  </h2>
                  <p className="mt-1 text-[13px] text-muted">
                    El alta manual respeta `company_id` y se adapta al schema base o extendido segun lo que ya exista en Supabase.
                  </p>
                </div>
                {providerForm.id ? (
                  <Button variant="ghost" type="button" onClick={() => setProviderForm(initialProviderForm)}>
                    Limpiar
                  </Button>
                ) : null}
              </div>

              <form className="space-y-4" onSubmit={handleProviderSubmit}>
                <label className="block space-y-2">
                  <span className="form-label">Nombre del proveedor *</span>
                  <Input
                    value={providerForm.name}
                    onChange={(event) =>
                      setProviderForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Ej: Servicios Tecnicos Lopez"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">CUIT / ID fiscal</span>
                    <Input
                      value={providerForm.taxId}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, taxId: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Estado</span>
                    <select
                      className="form-control h-9"
                      value={providerForm.status}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, status: event.target.value }))
                      }
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="pending">Pendiente</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Tipo de proveedor</span>
                    <Input
                      value={providerForm.supplierType}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, supplierType: event.target.value }))
                      }
                      placeholder="Ej: mantenimiento"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Categoria</span>
                    <Input
                      value={providerForm.category}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, category: event.target.value }))
                      }
                      placeholder="Ej: refrigeracion"
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="form-label">Especialidad</span>
                  <Input
                    value={providerForm.specialty}
                    onChange={(event) =>
                      setProviderForm((current) => ({ ...current, specialty: event.target.value }))
                    }
                    placeholder="Ej: camaras frigorificas"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Contacto principal</span>
                    <Input
                      value={providerForm.mainContactName}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, mainContactName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Telefono principal</span>
                    <Input
                      value={providerForm.mainPhone}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, mainPhone: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Email principal</span>
                    <Input
                      type="email"
                      value={providerForm.mainEmail}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, mainEmail: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Email secundario</span>
                    <Input
                      type="email"
                      value={providerForm.secondaryEmail}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, secondaryEmail: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Telefono secundario</span>
                    <Input
                      value={providerForm.secondaryPhone}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, secondaryPhone: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Sitio web</span>
                    <Input
                      value={providerForm.website}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, website: event.target.value }))
                      }
                      placeholder="https://"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Ciudad</span>
                    <Input
                      value={providerForm.city}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, city: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Provincia / Estado</span>
                    <Input
                      value={providerForm.state}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, state: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Pais</span>
                    <Input
                      value={providerForm.country}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, country: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Moneda habitual</span>
                    <Input
                      value={providerForm.currency}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                      }
                      placeholder="Ej: ARS"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Condicion de pago</span>
                    <Input
                      value={providerForm.paymentTerms}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, paymentTerms: event.target.value }))
                      }
                      placeholder="Ej: 30 dias"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Direccion</span>
                    <Input
                      value={providerForm.address}
                      onChange={(event) =>
                        setProviderForm((current) => ({ ...current, address: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="form-label">Notas</span>
                  <Textarea
                    value={providerForm.notes}
                    onChange={(event) =>
                      setProviderForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Especialidades, cobertura, acuerdos, condiciones o aclaraciones."
                  />
                </label>

                <Button disabled={isSavingProvider} type="submit">
                  {isSavingProvider
                    ? "Guardando..."
                    : providerForm.id
                      ? "Actualizar proveedor"
                      : "Crear proveedor"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mantix-card">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-foreground">Contacto adicional</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Multiples contactos quedan disponibles cuando la tabla `supplier_contacts` ya existe.
                  </p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleContactSubmit}>
                <label className="block space-y-2">
                  <span className="form-label">Proveedor *</span>
                  <select
                    className="form-control h-9"
                    value={contactForm.supplierId}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, supplierId: event.target.value }))
                    }
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="form-label">Nombre del contacto *</span>
                  <Input
                    value={contactForm.name}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="form-label">Cargo</span>
                    <Input
                      value={contactForm.role}
                      onChange={(event) =>
                        setContactForm((current) => ({ ...current, role: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="form-label">Telefono</span>
                    <Input
                      value={contactForm.phone}
                      onChange={(event) =>
                        setContactForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <label className="block space-y-2">
                  <span className="form-label">Email</span>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>

                <label className="flex items-center gap-3 rounded-[12px] border border-line bg-surface-alt px-4 py-3 text-[13px] text-foreground">
                  <input
                    checked={contactForm.isPrimary}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, isPrimary: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  Marcar como contacto principal
                </label>

                <label className="block space-y-2">
                  <span className="form-label">Notas</span>
                  <Textarea
                    value={contactForm.notes}
                    onChange={(event) =>
                      setContactForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>

                <Button disabled={isSavingContact || !hasContactsSchema} type="submit" variant="secondary">
                  {isSavingContact ? "Guardando..." : "Agregar contacto"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}