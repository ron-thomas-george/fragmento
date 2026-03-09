/**
 * Plan types and capabilities for feature gating.
 * The user's selected plan (stored in profiles.plan) is used to show/restrict
 * features across the app.
 */

export type PlanType = "Individual" | "Professional" | "Organization";

/** Normalize DB string to PlanType */
export function normalizePlan(plan: string | null | undefined): PlanType {
  if (!plan) return "Individual";
  const p = plan.trim();
  if (p === "Professional") return "Professional";
  if (p === "Organization") return "Organization";
  return "Individual";
}

export interface PlanCapabilities {
  /** Max projects (per org for Individual/Professional; total for Organization) */
  maxProjects: number;
  /** Max organizations (Organization plan allows 3) */
  maxOrganizations: number;
  /** Max editor seats */
  maxEditorSeats: number;
  /** Slack integration available */
  slackIntegration: boolean;
  /** Token relationship graph (Organization) */
  tokenRelationshipGraph: boolean;
  /** Component library import (Organization) */
  componentLibraryImport: boolean;
  /** Priority support + Slack/Discord channel (Organization) */
  prioritySupportChannel: boolean;
  /** Can create more than one project (Individual = 1 project) */
  multipleProjects: boolean;
  /** Can invite additional editors (Professional = 2 extra, Organization = more) */
  canInviteEditors: boolean;
}

const CAPABILITIES: Record<PlanType, PlanCapabilities> = {
  Individual: {
    maxProjects: 1,
    maxOrganizations: 1,
    maxEditorSeats: 1,
    slackIntegration: false,
    tokenRelationshipGraph: false,
    componentLibraryImport: false,
    prioritySupportChannel: false,
    multipleProjects: false,
    canInviteEditors: false,
  },
  Professional: {
    maxProjects: 5,
    maxOrganizations: 1,
    maxEditorSeats: 3,
    slackIntegration: true,
    tokenRelationshipGraph: false,
    componentLibraryImport: false,
    prioritySupportChannel: false,
    multipleProjects: true,
    canInviteEditors: true,
  },
  Organization: {
    maxProjects: Infinity,
    maxOrganizations: 3,
    maxEditorSeats: 5,
    slackIntegration: true,
    tokenRelationshipGraph: true,
    componentLibraryImport: true,
    prioritySupportChannel: true,
    multipleProjects: true,
    canInviteEditors: true,
  },
};

export function getPlanCapabilities(
  plan: string | null | undefined,
): PlanCapabilities {
  return CAPABILITIES[normalizePlan(plan)];
}

/** Whether the plan can use a given capability (by key). */
export function canUse(
  plan: string | null | undefined,
  capability: keyof PlanCapabilities,
): boolean {
  const caps = getPlanCapabilities(plan);
  const value = caps[capability];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0 && value !== Infinity;
  return false;
}

/** Whether the user can create another project (under current org) given current count. */
export function canCreateProject(
  plan: string | null | undefined,
  currentProjectCount: number,
): boolean {
  const caps = getPlanCapabilities(plan);
  return currentProjectCount < caps.maxProjects;
}

/** Whether to show upgrade CTA (Individual or Professional can upgrade). */
export function canUpgrade(plan: string | null | undefined): boolean {
  const p = normalizePlan(plan);
  return p === "Individual" || p === "Professional";
}
