import type { SupabaseClient } from "@supabase/supabase-js";

type PlanParam = "individual" | "professional" | "organization";

interface CreateProjectParams {
  supabase: SupabaseClient;
  organizationId: string;
  name: string;
  description?: string;
  planParam?: PlanParam | null;
}

interface CreateProjectResult {
  projectId?: string;
  error?: string;
}

function capitalizePlan(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

export async function createProjectWithDefaults({
  supabase,
  organizationId,
  name,
  description,
  planParam,
}: CreateProjectParams): Promise<CreateProjectResult> {
  try {
    if (!organizationId) {
      return { error: "Missing organization." };
    }

    const trimmedName = name.trim();
    const trimmedDescription = (description ?? "").trim();

    // Persist selected plan to profile if present
    if (planParam) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (!userError && user) {
        const planValue = capitalizePlan(planParam);
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            plan: planValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      }
    }

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
      return { error: existingError.message };
    }

    if (existingProjects && existingProjects.length > 0) {
      return {
        error: "A project with this name already exists in this organization.",
      };
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
      return {
        error: projectError?.message ?? "Could not create project.",
      };
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
      return {
        error: setsError?.message ?? "Could not create default token sets.",
      };
    }

    const globalSet = createdSets.find((set) => set.level === 0);

    if (!globalSet) {
      return {
        error: "Global token set could not be initialized.",
      };
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
      return { error: tokensError.message };
    }

    return { projectId: project.id };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
