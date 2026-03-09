"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import OnboardingLogo from "@/components/auth/onboarding-logo";
import UserProfileMenu from "@/components/auth/user-profile-menu";
import { AuthActionCard } from "@/components/auth/auth-action-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

interface Organization {
  id: string;
  name: string;
  created_at: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  organization_id: string;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projectCountByOrgId, setProjectCountByOrgId] = useState<
    Record<string, number>
  >({});
  const [firstProjectByOrgId, setFirstProjectByOrgId] = useState<
    Record<string, ProjectSummary>
  >({});

  const hasNoOrganizations = !loading && !error && organizations.length === 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user: u },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !u) {
          router.push("/signin");
          return;
        }

        setUser(u);

        const { data: orgs, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, created_at")
          .eq("owner_id", u.id)
          .order("created_at", { ascending: false });

        if (orgError) {
          setError(orgError.message);
          setLoading(false);
          return;
        }

        const list = orgs ?? [];
        setOrganizations(list);

        if (list.length > 0) {
          const orgIds = list.map((o) => o.id);
          const { data: projects } = await supabase
            .from("projects")
            .select("id, name, organization_id")
            .in("organization_id", orgIds)
            .order("created_at", { ascending: false });

          const countByOrg: Record<string, number> = {};
          const firstByOrg: Record<string, ProjectSummary> = {};
          orgIds.forEach((id) => (countByOrg[id] = 0));
          projects?.forEach((p) => {
            countByOrg[p.organization_id] =
              (countByOrg[p.organization_id] ?? 0) + 1;
            if (!firstByOrg[p.organization_id]) {
              firstByOrg[p.organization_id] = p;
            }
          });
          setProjectCountByOrgId(countByOrg);
          setFirstProjectByOrgId(firstByOrg);
        }

        setLoading(false);
      } catch {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    };

    void loadData();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-10 flex w-full items-center justify-between px-8 py-6">
        <OnboardingLogo />
        <UserProfileMenu
          name={user?.user_metadata?.full_name ?? undefined}
          email={user?.email ?? undefined}
        />
      </header>

      <div className="flex flex-1 flex-col px-8 pb-12 pt-4">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          {!loading && !error && !hasNoOrganizations && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Organizations
              </h1>
              <Link
                href="/onboarding/create-organization"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                <Plus className="h-4 w-4" />
                Create organization
              </Link>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center text-sm text-muted-foreground">
              Loading organizations...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : hasNoOrganizations ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
              <AuthActionCard
                imageSrc="/organization.svg"
                imageAlt="Inbox Illustrations"
                title="No organizations created"
                description="Organizations group projects, team members, and integrations."
                buttonLabel="Create Organization"
                onButtonClick={() =>
                  router.push("/onboarding/create-organization")
                }
              />
            </div>
          ) : (
            <ul className="space-y-4">
              {organizations.map((org) => {
                const projectCount = projectCountByOrgId[org.id] ?? 0;
                const firstProject = firstProjectByOrgId[org.id];
                const initial = org.name?.charAt(0)?.toUpperCase() ?? "F";

                return (
                  <li
                    key={org.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/organizations/${org.id}/projects`)
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      router.push(`/organizations/${org.id}/projects`)
                    }
                    className="cursor-pointer overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Top section: avatar + org name */}
                    <div className="flex items-center gap-4 p-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#66CCCC] text-xl font-semibold text-[#0f766e]">
                        {initial}
                      </div>
                      <span className="text-base font-bold text-black">
                        {org.name}
                      </span>
                    </div>
                    {/* Divider */}
                    <div className="h-px w-full bg-gray-200" />
                    {/* Bottom section: project info or "No projects" + Create project */}
                    <div
                      className="flex items-center justify-between gap-4 p-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {firstProject ? (
                        <>
                          <span className="text-base font-medium text-foreground">
                            {firstProject.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              <Avatar className="h-8 w-8 border-2 border-white">
                                <AvatarFallback className="bg-slate-200 text-xs font-medium text-slate-600">
                                  U
                                </AvatarFallback>
                              </Avatar>
                              <Avatar className="h-8 w-8 border-2 border-white">
                                <AvatarFallback className="bg-slate-300 text-xs font-medium text-slate-600">
                                  T
                                </AvatarFallback>
                              </Avatar>
                              <Avatar className="h-8 w-8 border-2 border-white">
                                <AvatarFallback className="bg-primary/20 text-xs font-medium text-primary">
                                  {firstProject.name
                                    ?.charAt(0)
                                    ?.toUpperCase() ?? "P"}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <Button
                              onClick={() =>
                                router.push(
                                  `/projects/${firstProject.id}/tokens?set=global`,
                                )
                              }
                              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              View project
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-500">
                            No projects added
                          </p>
                          {/* <Button
                            type="button"
                            className="shrink-0 rounded-lg border-0 bg-[#E0E7EB] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-[#d1d5db]"
                            onClick={() =>
                              router.push(
                                `/onboarding/create-project?organizationId=${org.id}`,
                              )
                            }
                          >
                            Create project
                          </Button> */}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
