// @ts-nocheck
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface SelectedCompany {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
}

interface SelectedCompanyContextValue {
  selectedCompany: SelectedCompany | null;
  setSelectedCompany: (company: SelectedCompany | null) => void;
  clearSelectedCompany: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SelectedCompanyContext = createContext<SelectedCompanyContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function SelectedCompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<SelectedCompany | null>(null);

  const setSelectedCompany = useCallback((company: SelectedCompany | null) => {
    setSelectedCompanyState(company);
  }, []);

  const clearSelectedCompany = useCallback(() => {
    setSelectedCompanyState(null);
  }, []);

  return (
    <SelectedCompanyContext.Provider
      value={{ selectedCompany, setSelectedCompany, clearSelectedCompany }}
    >
      {children}
    </SelectedCompanyContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSelectedCompany(): SelectedCompanyContextValue {
  const context = useContext(SelectedCompanyContext);
  if (!context) {
    throw new Error("useSelectedCompany debe usarse dentro de <SelectedCompanyProvider>");
  }
  return context;
}
