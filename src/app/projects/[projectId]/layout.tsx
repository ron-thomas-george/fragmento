"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Sidebar, SidebarHeader, SidebarNav, SidebarNavItem, SidebarFooter, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, History, Settings2, Link2, SlidersHorizontal, ChevronDown, User, LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface ProjectLayoutProps {
  children: ReactNode;
}

interface CurrentProject {
  id: string;
  name: string;
  slug: string | null;
  organization_id: string;
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

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<CurrentProject | null>(null);
  const [currentOrg, setCurrentOrg] = useState<CurrentOrganization | null>(null);
  const [orgProjects, setOrgProjects] = useState<CurrentProject[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('Individual');
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  // Function to fetch current user's plan
  const fetchCurrentPlan = async () => {
    try {
      setIsLoadingPlan(true);
      const supabase = createSupabaseBrowserClient();
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting user:', userError);
        setCurrentPlan('Individual');
        return;
      }

      // Fetch user's subscription/plan and profile data from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, subscription_status, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      // Set user data
      // Safely extract user name
      const getUserName = () => {
        if (profile?.full_name) return profile.full_name;
        if (user.user_metadata?.full_name) return user.user_metadata.full_name;
        if (user.email) {
          const emailPart = user.email.split('@')[0];
          return emailPart || 'User';
        }
        return 'User';
      };

      setCurrentUser({
        id: user.id,
        name: getUserName(),
        email: user.email || '',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
        provider: user.app_metadata?.provider
      });

      if (profileError) {
        console.error('Error fetching user plan:', profileError);
        // Try alternative approach - check if user has active subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('plan_type, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (!subError && subscription) {
          const planType = subscription.plan_type || 'Individual';
          setCurrentPlan(planType === 'Organization' ? 'Organization' : 'Individual');
        } else {
          setCurrentPlan('Individual');
        }
      } else if (profile) {
        const userPlan = profile.plan || 'Individual';
        setCurrentPlan(userPlan === 'Organization' ? 'Organization' : 'Individual');
      }
    } catch (error) {
      console.error('Error in fetchCurrentPlan:', error);
      setCurrentPlan('Individual');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.push('/'); // Redirect to home page after sign out
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  useEffect(() => {
    const loadProjectAndOrg = async () => {
      if (!projectId) return;

      const supabase = createSupabaseBrowserClient();

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name, slug, organization_id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        router.replace("/organizations");
        return;
      }

      setCurrentProject(project as CurrentProject);

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, plan")
        .eq("id", project.organization_id)
        .single();

      if (!orgError && org) {
        console.log('Organization data:', org); // Debug log
        setCurrentOrg(org as CurrentOrganization);
      }

      const { data: projectsForOrg } = await supabase
        .from("projects")
        .select("id, name, slug, organization_id")
        .eq("organization_id", project.organization_id)
        .order("created_at", { ascending: false });

      setOrgProjects((projectsForOrg as CurrentProject[]) ?? []);
    };

    void loadProjectAndOrg();
  }, [projectId]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible={sidebarCollapsed ? "icon" : "offcanvas"}>
          <SidebarHeader className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((open) => !open)}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs hover:bg-muted"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-background text-[11px] font-medium">
                {((currentOrg?.name ?? "Fragmento") || "F").charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-1 items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium leading-tight">
                      {currentProject?.name ?? "Loading project"}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {currentOrg?.name ?? "Organization"}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </button>

            {switcherOpen && !sidebarCollapsed && (
              <div className="absolute left-0 right-0 top-11 z-50 rounded-lg border bg-white p-2 text-xs">
                <div className="px-1 pb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Your projects
                </div>
                <div className="space-y-1">
                  {orgProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        router.push(`/projects/${project.id}/tokens`);
                      }}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted"
                    >
                      <span className="truncate text-xs">{project.name}</span>
                      {project.id === currentProject?.id && (
                        <span className="text-[10px] text-muted-foreground">Current</span>
                      )}
                    </button>
                  ))}
                  {currentProject && (
                    <button
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        router.push(`/organizations/${currentProject.organization_id}/projects`);
                      }}
                      className="flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-muted"
                    >
                      <span className="text-xs">All projects</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      router.push('/organizations');
                    }}
                    className="flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-muted"
                  >
                    <span className="text-xs">View organizations</span>
                  </button>
                </div>

                <div className="my-2 h-px bg-border" />

                {currentProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      router.push(`/projects/${currentProject.id}/settings`);
                    }}
                    className="flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-muted"
                  >
                    <span className="text-xs">Project settings</span>
                  </button>
                )}

                {currentOrg && (
                  <>
                    <div className="mt-2 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Fragmento
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSwitcherOpen(false);
                        router.push("/organizations");
                      }}
                      className="mt-1 flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-muted"
                    >
                      <span className="text-xs">Switch organization</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </SidebarHeader>
          <SidebarNav className="flex-1">
            <SidebarNavItem
              active={pathname?.includes("/tokens")}
              onClick={() =>
                projectId &&
                router.push(`/projects/${projectId}/tokens?set=global`)
              }
            >
              <Palette className="h-4 w-4" />
              {!sidebarCollapsed && (
                <span className="flex-1">Tokens &amp; Sets</span>
              )}
            </SidebarNavItem>
            <SidebarNavItem
              active={pathname?.includes("/versions")}
              onClick={() =>
                projectId && router.push(`/projects/${projectId}/versions`)
              }
            >
              <History className="h-4 w-4" />
              {!sidebarCollapsed && <span>Versions &amp; Releases</span>}
            </SidebarNavItem>
            <SidebarNavItem
              active={pathname?.includes("/export-configuration")}
              onClick={() =>
                projectId && router.push(`/projects/${projectId}/export-configuration`)
              }
            >
              <SlidersHorizontal className="h-4 w-4" />
              {!sidebarCollapsed && <span>Export configuration</span>}
            </SidebarNavItem>
            <SidebarNavItem
              active={pathname?.includes("/integrations")}
              onClick={() =>
                projectId && router.push(`/projects/${projectId}/integrations`)
              }
            >
              <Link2 className="h-4 w-4" />
              {!sidebarCollapsed && <span>Integrations</span>}
            </SidebarNavItem>
            <SidebarNavItem
              active={pathname?.includes("/settings")}
              onClick={() =>
                projectId && router.push(`/projects/${projectId}/settings`)
              }
            >
              <Settings2 className="h-4 w-4" />
              {!sidebarCollapsed && <span>Project settings</span>}
            </SidebarNavItem>
          </SidebarNav>
          <SidebarFooter>
            {!sidebarCollapsed && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span>
                    Current Plan: {isLoadingPlan ? 'Loading...' : currentPlan}
                  </span>
                  {!isLoadingPlan && currentPlan === 'Individual' && (
                    <button className="text-primary underline-offset-4 hover:underline">
                      Upgrade
                    </button>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen((open) => !open)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                      {currentUser?.avatar_url ? (
                        <img
                          src={currentUser.avatar_url}
                          alt={currentUser.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[11px] font-medium text-foreground truncate">
                        {currentUser?.name || 'Loading...'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {currentUser?.email || ''}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>

                  {userDropdownOpen && !sidebarCollapsed && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-lg border bg-white p-2 text-xs">
                      <div className="px-2 py-1.5 border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {currentUser?.avatar_url ? (
                              <img
                                src={currentUser.avatar_url}
                                alt={currentUser.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground">
                              {currentUser?.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {currentUser?.email}
                            </span>
                            {currentUser?.provider === 'google' && (
                              <span className="text-[9px] text-muted-foreground">
                                Signed in with Google
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted mt-1"
                      >
                        <LogOut className="h-3 w-3" />
                        <span className="text-xs">Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 min-w-0 flex-col">
          <main className="flex-1 min-w-0 bg-background">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
