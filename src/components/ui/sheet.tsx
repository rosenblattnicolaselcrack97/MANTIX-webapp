"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetPortal = Dialog.Portal;
const SheetTitle = Dialog.Title;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm transition-opacity duration-300 data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = Dialog.Overlay.displayName;

const sheetVariants = {
  left: "inset-y-0 left-0 h-full w-[90vw] max-w-sm data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
  right:
    "inset-y-0 right-0 h-full w-[90vw] max-w-sm data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
} as const;

export interface SheetContentProps extends React.ComponentPropsWithoutRef<
  typeof Dialog.Content
> {
  side?: keyof typeof sheetVariants;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        "bg-background fixed z-50 p-0 shadow-2xl transition-transform duration-300 focus:outline-none",
        sheetVariants[side],
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close className="absolute top-4 right-4 rounded-full border border-nav-line bg-nav-hover p-2 text-nav-foreground transition hover:bg-nav-active focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:outline-none lg:hidden">
        <X className="size-4" />
        <span className="sr-only">Cerrar navegación</span>
      </Dialog.Close>
    </Dialog.Content>
  </SheetPortal>
));
SheetContent.displayName = Dialog.Content.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
