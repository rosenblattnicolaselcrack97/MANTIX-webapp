"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AssetRegistrationForm } from "@/features/assets/components/asset-registration-form";

interface LocationRow {
  id: string;
  name: string;
}

interface ProviderRow {
  id: string;
  name: string;
}

interface AreaRow {
  id: string;
  name: string;
  branch_id: string;
}

export default function NewAssetPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [sites, setSites] = useState<LocationRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadFormData = async () => {
      if (!profile?.company_id) {
        return;
      }

      const companyId = profile.company_id;
      const [{ data: assets }, { data: locations }, { data: providerRows }, areasResult] = await Promise.all([
        supabase.from("assets").select("category").eq("company_id", companyId),
        supabase.from("locations").select("id, name").eq("company_id", companyId),
        supabase.from("providers").select("id, name").eq("company_id", companyId),
        supabase.from("branch_areas").select("id, name, branch_id").eq("company_id", companyId),
      ]);

      if (!isMounted) {
        return;
      }

      setCategories(Array.from(new Set((assets ?? []).map((asset) => asset.category).filter(Boolean))));
      setSites((locations as LocationRow[] | null) ?? []);
      setProviders((providerRows as ProviderRow[] | null) ?? []);
      setAreas(areasResult.error ? [] : ((areasResult.data as AreaRow[] | null) ?? []));
    };

    void loadFormData();

    return () => {
      isMounted = false;
    };
  }, [profile?.company_id]);

  return <AssetRegistrationForm areas={areas} categories={categories} providers={providers} sites={sites} />;
}
