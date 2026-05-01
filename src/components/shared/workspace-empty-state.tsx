import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkspaceEmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

export function WorkspaceEmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: WorkspaceEmptyStateProps) {
  return (
    <Card className="mantix-card">
      <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="max-w-[520px]">
          <h2 className="text-[22px] font-bold text-foreground">{title}</h2>
          <p className="mt-3 text-[14px] leading-6 text-muted">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}