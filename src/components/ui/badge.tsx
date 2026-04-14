import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("mantix-badge", {
  variants: {
    tone: {
      brand: "tone-brand",
      neutral: "tone-neutral",
      success: "tone-success",
      warning: "tone-warning",
      danger: "tone-danger",
      cyan: "tone-cyan",
    },
  },
  defaultVariants: {
    tone: "neutral",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
