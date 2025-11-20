"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!organizationId) {
      router.push("/onboarding/create-organization");
      return;
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      setError("Project name must be between 3 and 50 characters.");
      return;
    }

    const namePattern = /^[A-Za-z0-9_-]+$/;
    if (!namePattern.test(trimmedName)) {
      setError(
        "Project name can only contain letters, numbers, hyphens, and underscores."
      );
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > 500) {
      setError("Description cannot be longer than 500 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const { data: existingProjects, error: existingError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", organizationId)
        .ilike("name", trimmedName);

      if (existingError) {
        setError(existingError.message);
        setLoading(false);
        return;
      }

      if (existingProjects && existingProjects.length > 0) {
        setError("A project with this name already exists in this organization.");
        setLoading(false);
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          organization_id: organizationId,
          name: trimmedName,
          slug,
          description: trimmedDescription || null,
        })
        .select("id")
        .single();

      if (projectError || !project) {
        setError(projectError?.message ?? "Could not create project.");
        setLoading(false);
        return;
      }

      const { data: createdSets, error: setsError } = await supabase
        .from("token_sets")
        .insert([
          {
            project_id: project.id,
            name: "global",
            level: 0,
            description:
              "Base primitives like colors, spacing, and typography scales.",
          },
          {
            project_id: project.id,
            name: "semantic",
            level: 1,
            description: "Brand-specific tokens mapped to primitives.",
          },
          {
            project_id: project.id,
            name: "component",
            level: 2,
            description: "Component-level tokens for UI parts.",
          },
        ])
        .select("id, name, level");

      if (setsError || !createdSets) {
        setError(setsError?.message ?? "Could not create default token sets.");
        setLoading(false);
        return;
      }

      const globalSet = createdSets.find((set) => set.level === 0);

      if (!globalSet) {
        setError("Global token set could not be initialized.");
        setLoading(false);
        return;
      }

      const { error: tokensError } = await supabase.from("tokens").insert([
        // Colors (shadcn/ui compatible)
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.slate.50",
          type: "color",
          value: "#f8fafc",
          description: "slate-50",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.slate.100",
          type: "color",
          value: "#f1f5f9",
          description: "slate-100",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.slate.200",
          type: "color",
          value: "#e2e8f0",
          description: "slate-200",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.slate.500",
          type: "color",
          value: "#64748b",
          description: "slate-500",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.slate.900",
          type: "color",
          value: "#0f172a",
          description: "slate-900",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.blue.500",
          type: "color",
          value: "#3b82f6",
          description: "blue-500",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.blue.600",
          type: "color",
          value: "#2563eb",
          description: "blue-600",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "color.red.500",
          type: "color",
          value: "#ef4444",
          description: "red-500",
          source: "auto_generated",
        },
        // Spacing (Tailwind-compatible)
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "spacing.1",
          type: "spacing",
          value: "0.25rem",
          description: "spacing-1 (4px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "spacing.2",
          type: "spacing",
          value: "0.5rem",
          description: "spacing-2 (8px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "spacing.4",
          type: "spacing",
          value: "1rem",
          description: "spacing-4 (16px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "spacing.6",
          type: "spacing",
          value: "1.5rem",
          description: "spacing-6 (24px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "spacing.8",
          type: "spacing",
          value: "2rem",
          description: "spacing-8 (32px)",
          source: "auto_generated",
        },
        // Border radius (shadcn/ui standard)
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "radius.sm",
          type: "radius",
          value: "0.125rem",
          description: "radius-sm (2px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "radius.md",
          type: "radius",
          value: "0.375rem",
          description: "radius-md (6px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "radius.lg",
          type: "radius",
          value: "0.5rem",
          description: "radius-lg (8px)",
          source: "auto_generated",
        },
        {
          project_id: project.id,
          token_set_id: globalSet.id,
          name: "radius.full",
          type: "radius",
          value: "9999px",
          description: "radius-full",
          source: "auto_generated",
        },
      ]);

      if (tokensError) {
        setError(tokensError.message);
        setLoading(false);
        return;
      }

      router.push(`/projects/${project.id}/tokens?set=global`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your first project</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Projects group token sets, releases, and integrations for a design system.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="name">
                Project name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Brand Design System"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="description">
                Description (optional)
              </Label>
              <textarea
                id="description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Design tokens for our product UIs across platforms."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating project..." : "Create project"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
