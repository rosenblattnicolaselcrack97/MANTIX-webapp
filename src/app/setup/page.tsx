"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { buildAccountStatusRoute, resolveAccessState } from "@/lib/access-state";

export default function SetupPage() {
  const router = useRouter();
  const { user, profile, isLoading, isAdminLevel } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const state = resolveAccessState({
      isAuthenticated: Boolean(user),
      isAdminLevel,
      profile,
    });

    if (state === "unauthenticated") router.replace("/auth/login");
    else if (state === "admin") router.replace("/admin");
    else if (state === "ready") router.replace("/");
    else router.replace(buildAccountStatusRoute(state));
  }, [isLoading, user, isAdminLevel, profile, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0f1e",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid rgba(14,165,233,0.3)",
          borderTop: "3px solid #0ea5e9",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
