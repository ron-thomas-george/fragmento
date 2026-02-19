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

const avatarColors = [
  "#a5b4fc",
  "#fbcfe8",
  "#fed7aa",
  "#bbf7d0",
  "#99f6e4",
  "#c4b5fd",
  "#fcd34d",
];

const getAvatarColor = (index: number) =>
  avatarColors[index % avatarColors.length];

const formatRelativeTime = (dateString: string | null) => {
  if (!dateString) return "Created just now";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= day) {
    const days = Math.floor(diffMs / day);
    return `Created ${days} day${days === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= hour) {
    const hours = Math.floor(diffMs / hour);
    return `Created ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= minute) {
    const minutes = Math.floor(diffMs / minute);
    return `Created ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  return "Created just now";
};

export default function OrganizationProjectsPage() {
  const router = useRouter();
  const params = useParams<{ organizationId: string }>();
  const organizationId = params.organizationId;

  const [projects, setProjects] = useState<Project[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", organizationId)
          .single();


        if (orgError || !org) {
          setLoading(false);
          router.replace("/organizations");
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

  const filteredProjects = projects.filter((project) =>
    project.name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const noProjects = !loading && !error && projects.length === 0;
  const noMatches =
    !loading && !error && projects.length > 0 && filteredProjects.length === 0;

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
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-64"
            />
            <button
              type="button"
              onClick={handleNewProject}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New project
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : noProjects ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No projects yet. Create your first project to start managing tokens.
          </div>
        ) : noMatches ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No projects match “{searchQuery}”.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProjects.map((project, index) => (
              <button
                key={project.id}
                type="button"
                onClick={() => router.push(`/projects/${project.id}/tokens`)}
                className="group flex flex-col rounded-2xl border border-border/70 bg-card/70 text-left transition-colors hover:border-primary/60"
              >
                <div
                  className="h-32 w-full rounded-t-2xl"
                  style={{
                    backgroundColor: getAvatarColor(index),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "2rem",
                    fontWeight: 600,
                  }}
                >
                  {project.name?.charAt(0)?.toUpperCase() ?? "P"}
                </div>
                <div className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">
                    {project.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(project.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
