"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Project {
  id: string;
  name: string;
  slug: string;
  created_at: string | null;
}

export default function OrganizationProjectsPage() {
  const router = useRouter();
  const params = useParams<{ organizationId: string }>();
  const organizationId = params.organizationId;

  const [projects, setProjects] = useState<Project[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", organizationId)
          .single();

        if (orgError) {
          setError(orgError.message);
          setLoading(false);
          return;
        }

        setOrgName(org?.name ?? "Organization");

        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, slug, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (projectsError) {
          setError(projectsError.message);
          setLoading(false);
          return;
        }

        setProjects(projectsData ?? []);
        setLoading(false);
      } catch (err) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    };

    if (organizationId) {
      void loadData();
    }
  }, [organizationId]);

  const handleNewProject = () => {
    router.push(`/onboarding/create-project?organizationId=${organizationId}`);
  };

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Organization
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {orgName ?? "Loading..."}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage projects for this organization.
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewProject}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New project
          </button>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No projects yet. Create your first project to start managing tokens.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => router.push(`/projects/${project.id}/tokens`)}
                className="flex flex-col items-start rounded-lg border bg-card p-5 text-left transition-colors hover:border-primary/60"
              >
                <span className="text-sm font-medium">{project.name}</span>
                <span className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Project
                </span>
                {project.created_at ? (
                  <span className="mt-2 text-xs text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
