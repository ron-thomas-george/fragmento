"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";

import { canUpgrade } from "@/lib/plans";

interface SidebarAccountFooterUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  provider?: string;
}

interface SidebarAccountFooterProps {
  currentPlan: string;
  isLoadingPlan: boolean;
  currentUser: SidebarAccountFooterUser | null;
  onSignOut: () => void;
}

export function SidebarAccountFooter({
  currentPlan,
  isLoadingPlan,
  currentUser,
  onSignOut,
}: SidebarAccountFooterProps) {
  return (
    <div className="space-y-3">
      {canUpgrade(currentPlan) && !isLoadingPlan && (
        <div className="rounded-lg bg-primary/10 p-3">
          <p className="text-xs font-medium text-primary">
            Upgrade to a paid plan to get access to more features
          </p>
          <Link
            href="/onboarding/select-plan"
            className="mt-2 flex w-full items-center justify-center rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Upgrade plan
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-md px-1 py-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
          {currentUser?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-slate-600">
              {(currentUser?.name ?? "U").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {currentUser?.name ?? "Loading..."}
          </p>
          <p className="truncate text-xs text-slate-500">
            {currentUser?.email ?? ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
