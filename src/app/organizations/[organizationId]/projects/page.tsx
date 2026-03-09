"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { AuthActionCard } from "@/components/auth/auth-action-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectWithDefaults } from "@/lib/create-project";
import { DialogClose } from "@radix-ui/react-dialog";

interface Organization {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
}

export default function OrganizationProjectsPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const organizationId = params.organizationId;
  const [org, setOrg] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .single(),
      supabase
        .from("projects")
        .select("id, name, description, organization_id")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
    ])
      .then(([orgRes, projectsRes]) => {
        if (orgRes.error || !orgRes.data) {
          router.replace("/organizations");
          return;
        }
        setOrg(orgRes.data as Organization);
        setProjects((projectsRes.data as Project[]) ?? []);
      })
      .finally(() => setLoading(false));
  }, [organizationId, router]);

  const handleOpenDialog = () => {
    setError(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationId) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setError("Project name must be between 3 and 50 characters.");
      return;
    }

    const namePattern = /^[A-Za-z0-9_-]+$/;
    if (!namePattern.test(trimmedName)) {
      setError(
        "Project name can only contain letters, numbers, hyphens, and underscores.",
      );
      return;
    }

    if (trimmedDescription.length > 500) {
      setError("Description cannot be longer than 500 characters.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { projectId, error: createError } = await createProjectWithDefaults(
        {
          supabase,
          organizationId,
          name: trimmedName,
          description: trimmedDescription,
          planParam: null,
        },
      );

      if (createError || !projectId) {
        setError(createError ?? "Could not create project.");
        setCreating(false);
        return;
      }

      setProjects((prev) => [
        {
          id: projectId,
          name: trimmedName,
          description: trimmedDescription || null,
          organization_id: organizationId,
        },
        ...prev,
      ]);
      setDialogOpen(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (loading || !org) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      {/* Header: Org name / Projects + Create project */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {org.name} / Projects
        </h1>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleOpenDialog}
        >
          <Plus className="h-4 w-4" />
          Create project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-[60vh] pt-40 items-center justify-center">
          <AuthActionCard
            imageSrc="/noprojects.svg"
            imageAlt="No Projects"
            title="No projects created"
            description="Projects group token sets, releases, and integrations for a design system."
            buttonLabel="Create project"
            onButtonClick={handleOpenDialog}
          />
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const initial = project.name?.charAt(0)?.toUpperCase() ?? "P";
            const descriptionText =
              project.description ||
              `Design tokens for ${org?.name ?? "this organization"}`;
            return (
              <li
                key={project.id}
                className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Top: light purple block with project initial */}
                <div className="flex h-40 items-center justify-center bg-primary/15">
                  <span className="text-6xl font-bold text-foreground">
                    {initial}
                  </span>
                </div>
                {/* Bottom: title, description, link, avatars */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {project.name}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        router.push(`/projects/${project.id}/tokens?set=global`)
                      }
                      aria-label="Open project"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {descriptionText}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
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
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() =>
                        router.push(`/projects/${project.id}/tokens?set=global`)
                      }
                    >
                      Open project
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md p-4">
          <div className="flex items-center justify-between">
            <div className="text-[16px] font-semibold">Create project</div>

            <DialogClose asChild>
              <button className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </DialogClose>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                placeholder="Add project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <textarea
                id="project-description"
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={creating}
              >
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
