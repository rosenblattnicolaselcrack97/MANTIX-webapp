import type { DashboardData } from "@/types/entities";

export async function getDashboardData(): Promise<DashboardData> {
  return {
    company: {
      id: "",
      name: "Mantix",
      industry: "",
      headquarters: "",
      locations: 0,
      activeAssets: 0,
      openWorkOrders: 0,
      complianceScore: 0,
    },
    currentUser: {
      id: "",
      fullName: "",
      role: "",
      email: "",
      initials: "MX",
      team: "",
      availability: "offline",
      companyId: "",
      avatarUrl: null,
    },
    kpis: [],
    workOrders: [],
    assets: [],
    alerts: [],
    activity: [],
    modules: [],
    providers: [],
    messages: [],
    notifications: [],
  };
}
