"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  FolderOpen,
  Users,
  CreditCard,
  Settings2,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { normalizePlan } from "@/lib/plans";
import { PlanProvider } from "@/contexts/plan-context";
import { SidebarAccountFooter } from "@/components/sidebar-account-footer";

interface OrgLayoutProps {
  children: ReactNode;
}

interface CurrentOrganization {
  id: string;
  name: string;
  plan?: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  provider?: string;
}

export default function OrganizationLayout({ children }: OrgLayoutProps) {
  const params = useParams<{ organizationId: string }>();
  const organizationId = params.organizationId;
  const pathname = usePathname();
  const router = useRouter();
  const [currentOrg, setCurrentOrg] = useState<CurrentOrganization | null>(
    null,
  );
  const [currentPlan, setCurrentPlan] = useState<string>("Individual");
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const fetchUserAndPlan = async () => {
    try {
      setIsLoadingPlan(true);
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setIsLoadingPlan(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, full_name, avatar_url")
        .eq("id", user.id)
        .single();
      setCurrentPlan(normalizePlan(profile?.plan ?? "Individual"));
      const name =
        profile?.full_name ??
        user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "User";
      setCurrentUser({
        id: user.id,
        name,
        email: user.email ?? "",
        avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url,
        provider: user.app_metadata?.provider,
      });
    } catch {
      setCurrentPlan("Individual");
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    void fetchUserAndPlan();
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("organizations")
      .select("id, name, plan")
      .eq("id", organizationId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("Failed to load organization in layout", error);
          return;
        }
        setCurrentOrg(data as CurrentOrganization);
      });
  }, [organizationId]);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const isProjectsPage =
    pathname === `/organizations/${organizationId}/projects`;
  const isUsersPage = pathname === `/organizations/${organizationId}/users`;
  const isSubscriptionPage =
    pathname === `/organizations/${organizationId}/subscription`;
  const isSettingsPage =
    pathname === `/organizations/${organizationId}/settings`;

  return (
    <PlanProvider planRaw={currentPlan} isLoading={isLoadingPlan}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar
            collapsible="offcanvas"
            className="border-r border-[#E5E7EB] bg-white"
          >
            {/* Top: org avatar + name + dropdown */}
            <SidebarHeader className="p-3">
              <Link
                href="/organizations"
                className="flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-left hover:bg-slate-100"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-200 text-sm font-semibold text-slate-700">
                  {(currentOrg?.name ?? "Org").charAt(0).toUpperCase()}
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <span className="text-sm font-semibold text-slate-900">
                    {currentOrg?.name ?? "Loading..."}
                  </span>
                  <span className="text-xs text-slate-500">
                    {currentOrg?.name ?? "Organization"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              </Link>
            </SidebarHeader>

            {/* Main nav: Projects, Users, Subscription */}
            <SidebarNav className="flex-1 gap-0 px-2">
              <SidebarNavItem
                active={isProjectsPage}
                onClick={() =>
                  organizationId &&
                  router.push(`/organizations/${organizationId}/projects`)
                }
                className={
                  isProjectsPage
                    ? "!bg-primary/10 !text-primary hover:!bg-primary/15 [&>span]:!text-primary [&>svg]:!text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="flex-1">Projects</span>
              </SidebarNavItem>
              <SidebarNavItem
                active={isUsersPage}
                onClick={() =>
                  organizationId &&
                  router.push(`/organizations/${organizationId}/users`)
                }
                className={
                  isUsersPage
                    ? "!bg-primary/10 !text-primary hover:!bg-primary/15 [&>span]:!text-primary [&>svg]:!text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="flex-1">Users</span>
              </SidebarNavItem>
              <SidebarNavItem
                active={isSubscriptionPage}
                onClick={() =>
                  organizationId &&
                  router.push(`/organizations/${organizationId}/subscription`)
                }
                className={
                  isSubscriptionPage
                    ? "!bg-primary/10 !text-primary hover:!bg-primary/15 [&>span]:!text-primary [&>svg]:!text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              >
                <CreditCard className="h-4 w-4 shrink-0" />
                <span className="flex-1">Subscription</span>
              </SidebarNavItem>
            </SidebarNav>

            <SidebarNav className="gap-0 px-2">
              <SidebarNavItem
                active={isSettingsPage}
                onClick={() =>
                  organizationId &&
                  router.push(`/organizations/${organizationId}/settings`)
                }
                className={
                  isSettingsPage
                    ? "!bg-primary/10 !text-primary hover:!bg-primary/15 [&>span]:!text-primary [&>svg]:!text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              >
                <Settings2 className="h-4 w-4 shrink-0" />
                <span className="flex-1">Settings</span>
              </SidebarNavItem>
            </SidebarNav>

            <SidebarFooter className="mt-auto border-t border-[#E5E7EB] p-3">
              <SidebarAccountFooter
                currentPlan={currentPlan}
                isLoadingPlan={isLoadingPlan}
                currentUser={currentUser}
                onSignOut={handleSignOut}
              />
            </SidebarFooter>
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-h-0 flex-1 bg-background">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </PlanProvider>
  );
}
