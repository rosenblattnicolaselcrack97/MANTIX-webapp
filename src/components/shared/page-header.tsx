import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ actions, subtitle, title }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <div className="ph-title">{title}</div>
        {subtitle ? <div className="ph-sub">{subtitle}</div> : null}
      </div>
      {actions ? <div className="ph-actions">{actions}</div> : null}
    </div>
  );
}
