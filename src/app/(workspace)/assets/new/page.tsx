import { trackedAssets } from "@/data/mock/dashboard";
import { providers } from "@/data/mock/platform";
import { AssetRegistrationForm } from "@/features/assets/components/asset-registration-form";

export default function NewAssetPage() {
  const categories = Array.from(new Set(trackedAssets.map((asset) => asset.category)));
  const sites = Array.from(new Set(trackedAssets.map((asset) => asset.site)));
  const providerNames = providers.map((provider) => provider.name);

  return (
    <AssetRegistrationForm
      categories={categories}
      providers={providerNames}
      sites={sites}
    />
  );
}
