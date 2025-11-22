"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Organization {
  id: string;
  name: string;
  created_at: string | null;
  updated_at?: string | null;
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
  if (!dateString) return "Edited just now";
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs >= day) {
    const days = Math.floor(diffMs / day);
    return `Edited ${days} day${days === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= hour) {
    const hours = Math.floor(diffMs / hour);
    return `Edited ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs >= minute) {
    const minutes = Math.floor(diffMs / minute);
    return `Edited ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  return "Edited just now";
};

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredOrganizations = organizations.filter((org) =>
    org.name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const noOrganizations = !loading && !error && organizations.length === 0;
  const noMatches =
    !loading && !error && organizations.length > 0 && filteredOrganizations.length === 0;

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an organization to continue, or create a new one.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search organizations"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-64"
            />
            <button
              type="button"
              onClick={() => router.push("/onboarding/create-organization")}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              New organization
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading organizations...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : noOrganizations ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            You don&apos;t have any organizations yet. Create one to get started.
          </div>
        ) : noMatches ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            No organizations match “{searchQuery}”.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredOrganizations.map((org, index) => (
              <button
                key={org.id}
                type="button"
                onClick={() =>
                  router.push(`/organizations/${org.id}/projects`)
                }
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
                  {org.name?.charAt(0)?.toUpperCase() ?? "F"}
                </div>
                <div className="flex flex-col gap-1 px-4 py-3">
                  <span className="text-sm font-medium text-foreground">
                    {org.name}
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
