import { trackedAssets } from "@/data/mock/dashboard";
import { PartsWorkspace } from "@/features/parts/components/parts-workspace";
import { getPartsOverview } from "@/features/parts/services/get-parts-overview";

export default async function PartsPage() {
  const overview = await getPartsOverview();

  return <PartsWorkspace assets={trackedAssets} initialItems={overview.items} />;
}
