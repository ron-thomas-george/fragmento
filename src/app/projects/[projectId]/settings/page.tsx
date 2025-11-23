"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Member";
  access: "view" | "edit";
  joinedAt: string;
  avatarUrl?: string;
  isCurrent?: boolean;
}

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [formState, setFormState] = useState({
    name: "",
    description: "",
  });
  const [savingProject, setSavingProject] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isProjectDirty =
    formState.name !== (project?.name ?? "") ||
    formState.description !== (project?.description ?? "");

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      try {
        setLoadingProject(true);
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, slug, description")
          .eq("id", projectId)
          .single();

        if (error) {
          console.error("Failed to load project", error);
          return;
        }

        if (data) {
          setProject(data as ProjectRow);
          setFormState({
            name: data.name,
            description: data.description ?? "",
          });
        }
      } catch (err) {
        console.error("Unexpected error loading project", err);
      } finally {
        setLoadingProject(false);
      }
    };

    void fetchProject();
  }, [projectId]);

  const handleProjectUpdate = async () => {
    if (!projectId || !isProjectDirty) return;

    try {
      setSavingProject(true);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("projects")
        .update({
          name: formState.name,
          description: formState.description,
        })
        .eq("id", projectId);

      if (error) {
        console.error("Failed to update project", error);
        return;
      }

      setProject((prev) =>
        prev
          ? {
              ...prev,
              name: formState.name,
              description: formState.description,
            }
          : prev
      );
    } catch (err) {
      console.error("Error updating project", err);
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId || deleteConfirmation !== (project?.name ?? "")) return;

    try {
      setDeleting(true);
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        console.error("Failed to delete project", error);
        return;
      }

      setDeleteDialogOpen(false);
      router.push("/organizations");
    } catch (err) {
      console.error("Unexpected error deleting project", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col">
      <header className="border-b px-6 py-4 w-full">
        <div>
          <h1 className="text-xl font-semibold">Project settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage details and danger-zone actions for this project.
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-4 w-full min-w-0">
        <div className="space-y-6 w-full">
          <Card className="w-full max-w-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Project details</CardTitle>
                <CardDescription>
                  Update your project title and description.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Brand Design System"
                  disabled={loadingProject}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Design tokens for our brand refresh."
                  disabled={loadingProject}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  onClick={handleProjectUpdate}
                  disabled={!isProjectDirty || savingProject}
                >
                  {savingProject ? "Saving..." : "Update project info"}
                </Button>
                {isProjectDirty && !savingProject && (
                  <span className="text-xs text-muted-foreground">
                    Unsaved changes
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="w-full max-w-none border-destructive/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Delete project</CardTitle>
                <CardDescription>
                  Permanently remove this project and all related data.
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete project
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Deleting the project cannot be undone. All tokens, releases, and
                pending changes will be removed from Fragmento.
              </p>
              <p>You will be redirected to your organizations page after deletion.</p>
            </CardContent>
          </Card>
        </div>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete project?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Type the project name to confirm
                permanent deletion.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm-name">Project name</Label>
              <Input
                id="confirm-name"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={project?.name ?? "Project name"}
              />
            </div>
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <p>
                Deleting the project will remove it from the database along with
                all associated tokens, releases, and team access.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteProject}
                disabled={
                  deleting || deleteConfirmation !== (project?.name ?? "")
                }
              >
                {deleting ? "Deleting..." : "Delete project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
