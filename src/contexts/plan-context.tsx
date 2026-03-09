"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { PlanCapabilities, PlanType } from "@/lib/plans";
import {
  getPlanCapabilities,
  normalizePlan,
  canUse,
  canCreateProject,
  canUpgrade,
} from "@/lib/plans";

interface PlanContextValue {
  plan: PlanType;
  planRaw: string;
  capabilities: PlanCapabilities;
  isLoading: boolean;
  canUse: (capability: keyof PlanCapabilities) => boolean;
  canCreateProject: (currentProjectCount: number) => boolean;
  canUpgrade: () => boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  planRaw,
  isLoading,
  children,
}: {
  planRaw: string;
  isLoading: boolean;
  children: ReactNode;
}) {
  const plan = normalizePlan(planRaw);
  const capabilities = getPlanCapabilities(planRaw);

  const value: PlanContextValue = {
    plan,
    planRaw,
    capabilities,
    isLoading,
    canUse: (capability) => canUse(planRaw, capability),
    canCreateProject: (count) => canCreateProject(planRaw, count),
    canUpgrade: () => canUpgrade(planRaw),
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return ctx;
}

/** Safe hook for use outside project layout (e.g. organizations list); returns null if no provider. */
export function usePlanOptional(): PlanContextValue | null {
  return useContext(PlanContext);
}
