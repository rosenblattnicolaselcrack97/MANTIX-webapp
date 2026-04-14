import {
  dashboardActivity,
  dashboardAlerts,
  dashboardKpis,
  dashboardWorkOrders,
  trackedAssets,
} from "@/data/mock/dashboard";
import {
  currentUser,
  mantixCompany,
  messages,
  modulePreviews,
  notifications,
  providers,
} from "@/data/mock/platform";
import type { DashboardData } from "@/types/entities";

export async function getDashboardData(): Promise<DashboardData> {
  return {
    company: mantixCompany,
    currentUser,
    kpis: dashboardKpis,
    workOrders: dashboardWorkOrders,
    assets: trackedAssets,
    alerts: dashboardAlerts,
    activity: dashboardActivity,
    modules: modulePreviews,
    providers,
    messages,
    notifications,
  };
}
