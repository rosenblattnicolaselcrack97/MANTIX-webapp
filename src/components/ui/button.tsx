import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] border text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-brand-dark bg-brand-dark px-4 text-[var(--on-brand)] hover:bg-brand hover:shadow-[var(--glow-blue)]",
        secondary:
          "border-line bg-surface-alt px-4 text-foreground hover:border-brand hover:text-brand",
        outline:
          "border-line bg-transparent px-4 text-foreground hover:border-line-strong hover:bg-surface-alt",
        ghost:
          "border-transparent bg-transparent px-3 text-muted hover:bg-surface-alt hover:text-foreground",
        cyan: "border-cyan bg-cyan px-4 text-[var(--on-cyan)] hover:brightness-110",
        success:
          "border-success bg-success px-4 text-[var(--on-success)] hover:brightness-110",
        danger: "border-danger bg-danger px-4 text-[var(--on-danger)] hover:brightness-110",
      },
      size: {
        default: "h-9",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-5",
        icon: "h-[34px] w-[34px] rounded-[9px] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
