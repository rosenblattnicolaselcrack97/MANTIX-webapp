import { dashboardWorkOrders, trackedAssets } from "@/data/mock/dashboard";
import { currentUser } from "@/data/mock/platform";
import { WorkOrderComposer } from "@/features/work-orders/components/work-order-composer";

export default function NewWorkOrderPage() {
  const assignees = Array.from(
    new Set(
      [currentUser.fullName, ...dashboardWorkOrders.map((item) => item.assignee)].filter(
        (value) => value && value !== "Sin asignar",
      ),
    ),
  );
  const sites = Array.from(new Set(trackedAssets.map((asset) => asset.site)));

  return (
    <WorkOrderComposer
      assets={trackedAssets}
      assignees={assignees}
      relatedOrders={dashboardWorkOrders}
      sites={sites}
    />
  );
}
