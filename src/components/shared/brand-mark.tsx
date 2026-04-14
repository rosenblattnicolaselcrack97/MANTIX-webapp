"use client";

import Image from "next/image";
import { useState, type HTMLAttributes } from "react";

import { useTheme } from "@/components/theme/theme-provider";
import { getBrandingAsset } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface BrandMarkProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean;
}

function BrandFallback({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <div className="sidebar-brand-box">
        {compact ? "M" : "LOGO EMPRESA"}
      </div>
      {!compact ? (
        <div className="sidebar-brand-sub">
          by <span>MANTIX</span>
        </div>
      ) : null}
    </>
  );
}

function BrandAssetImage({
  assetPath,
  compact,
}: {
  assetPath: string;
  compact: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <BrandFallback compact={compact} />;
  }

  return (
    <Image
      alt="Mantix"
      className={cn("h-auto object-contain", compact ? "w-10" : "w-[148px]")}
      height={compact ? 40 : 40}
      onError={() => setFailed(true)}
      priority
      src={assetPath}
      unoptimized
      width={compact ? 40 : 148}
    />
  );
}

export function BrandMark({
  compact = false,
  className,
  ...props
}: BrandMarkProps) {
  const { resolvedTheme } = useTheme();
  const assetPath = getBrandingAsset(compact ? "mark" : "full", resolvedTheme);

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        compact ? "justify-center" : "min-h-[40px]",
        className,
      )}
      {...props}
    >
      <BrandAssetImage assetPath={assetPath} compact={compact} key={assetPath} />
    </div>
  );
}
