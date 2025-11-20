"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Organization {
  id: string;
  name: string;
  created_at: string | null;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push("/signin");
          return;
        }

        const { data, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, created_at")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (orgError) {
          setError(orgError.message);
          setLoading(false);
          return;
        }

        setOrganizations(data ?? []);
        setLoading(false);
      } catch (err) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    };

    void loadOrgs();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an organization to continue, or create a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/onboarding/create-organization")}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            New organization
          </button>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading organizations...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : organizations.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            You don&apos;t have any organizations yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() =>
                  router.push(`/organizations/${org.id}/projects`)
                }
                className="flex flex-col items-start rounded-lg border bg-card p-5 text-left transition-colors hover:border-primary/60"
              >
                <span className="text-sm font-medium">{org.name}</span>
                <span className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Organization
                </span>
                {org.created_at ? (
                  <span className="mt-2 text-xs text-muted-foreground">
                    Created {new Date(org.created_at).toLocaleDateString()}
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
