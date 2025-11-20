"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Sidebar, SidebarHeader, SidebarNav, SidebarNavItem, SidebarFooter } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, History, Settings2, Link2, SlidersHorizontal, Bell, Menu, ChevronDown } from "lucide-react";
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
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<CurrentProject | null>(null);
  const [currentOrg, setCurrentOrg] = useState<CurrentOrganization | null>(null);
  const [orgProjects, setOrgProjects] = useState<CurrentProject[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

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
        return;
      }

      setCurrentProject(project as CurrentProject);

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", project.organization_id)
        .single();

      if (!orgError && org) {
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
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed}>
        <SidebarHeader className="relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen((open) => !open)}
            className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-xs hover:bg-muted"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-background text-[11px] font-medium">
              {(currentOrg?.name ?? "Fragmento").charAt(0).toUpperCase()}
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
                {currentOrg && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwitcherOpen(false);
                      router.push(`/organizations/${currentOrg.id}/projects`);
                    }}
                    className="flex w-full items-center rounded-md px-2 py-1 text-left hover:bg-muted"
                  >
                    <span className="text-xs">All projects</span>
                  </button>
                )}
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
        <SidebarNav>
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
            active={pathname?.includes("/export")}
            onClick={() =>
              projectId && router.push(`/projects/${projectId}/export`)
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
                <span>Org plan: Trial</span>
                <button className="text-primary underline-offset-4 hover:underline">
                  Upgrade
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-medium text-foreground">
                    Jane Doe
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    jane@example.com
                  </span>
                </div>
              </div>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background/80 px-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 h-7 w-7"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 rounded-md border px-2 text-xs"
                onClick={() => setProjectMenuOpen((open) => !open)}
              >
                <span className="hidden sm:inline text-muted-foreground">
                  Acme Org ·
                </span>
                <span className="font-medium">Brand Tokens</span>
                <span className="text-[10px] text-muted-foreground">
                  Can edit
                </span>
              </Button>
              {projectMenuOpen && (
                <div className="absolute z-20 mt-1 w-64 rounded-md border bg-card p-2 text-xs">
                  <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Projects
                  </p>
                  <div className="space-y-1">
                    <button className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted">
                      <span>Brand Tokens</span>
                      <span className="text-[10px] text-muted-foreground">
                        Can edit
                      </span>
                    </button>
                    <button className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted">
                      <span>Marketing Site</span>
                      <span className="text-[10px] text-muted-foreground">
                        View only
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3 pl-4">
            <div className="hidden max-w-xs flex-1 items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-xs text-muted-foreground sm:flex">
              <Input
                type="search"
                placeholder="Search tokens..."
                className="h-7 border-none bg-transparent p-0 text-xs focus-visible:ring-0"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>
            <button className="flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
              <span className="h-6 w-6 rounded-full bg-primary/10" />
              <span className="hidden sm:inline text-xs font-medium">
                Jane Doe
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
