import { Cog, ShieldCheck, Truck, Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProvidersOverview } from "@/features/providers/services/get-providers-overview";

const providerIcons = [Truck, Wrench, ShieldCheck, Cog];
const providerTones = [
  "rgba(30,122,255,.12)",
  "rgba(255,107,53,.12)",
  "rgba(0,214,143,.12)",
  "rgba(255,184,0,.12)",
];

export default async function ProvidersPage() {
  const overview = await getProvidersOverview();

  return (
    <div>
      <PageHeader
        actions={<Button>Nuevo contacto</Button>}
        subtitle="12 contactos registrados"
        title="Proveedores y Tecnicos Externos"
      />

      <div className="filter-bar">
        <button className="filter-chip active" type="button">
          Todos (12)
        </button>
        <button className="filter-chip" type="button">
          Electrica
        </button>
        <button className="filter-chip" type="button">
          Mecanica
        </button>
        <button className="filter-chip" type="button">
          HVAC
        </button>
      </div>

      <div className="provider-grid">
        {overview.items.map((provider, index) => {
          const Icon = providerIcons[index % providerIcons.length];

          return (
            <Card className="provider-card" key={provider.id}>
              <CardContent className="p-5">
                <div
                  className="provider-avatar"
                  style={{ background: providerTones[index % providerTones.length] }}
                >
                  <Icon className="size-5 text-foreground" />
                </div>
                <div className="provider-name">{provider.name}</div>
                <div className="provider-spec">{provider.specialty}</div>
                <div className="mb-3 text-[11px] text-muted">
                  📞 11-{4523 + index * 777}-8800
                </div>
                <div className="provider-stats">
                  <div className="provider-stat">
                    <strong>{provider.activeOrders}</strong>trabajos
                  </div>
                  <div className="provider-stat">
                    <strong>{provider.rating.toFixed(1)}</strong>
                    <span className="text-warning">★</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
