import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn("form-control h-9 file:border-0 file:bg-transparent file:text-[12px] file:font-medium", className)}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
