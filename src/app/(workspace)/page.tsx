import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getDashboardData } from "@/features/dashboard/services/get-dashboard-data";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <DashboardView data={data} />;
}
