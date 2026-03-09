"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectWithDefaults } from "@/lib/create-project";

const PLAN_VALUES = ["individual", "professional", "organization"] as const;
type PlanParam = (typeof PLAN_VALUES)[number];

function CreateProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const planParam = searchParams.get("plan");
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
        "Project name can only contain letters, numbers, hyphens, and underscores.",
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

      const plan =
        planParam && PLAN_VALUES.includes(planParam as PlanParam)
          ? (planParam as PlanParam)
          : null;

      const { projectId, error: createError } = await createProjectWithDefaults(
        {
          supabase,
          organizationId,
          name: trimmedName,
          description: trimmedDescription,
          planParam: plan,
        },
      );

      if (createError || !projectId) {
        setError(createError ?? "Could not create project.");
        setLoading(false);
        return;
      }

      router.push(`/projects/${projectId}/tokens?set=global`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your first project
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Projects group token sets, releases, and integrations for a design
            system.
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

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating project..." : "Create project"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-xl">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Create your first project
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
      }
    >
      <CreateProjectForm />
    </Suspense>
  );
}
