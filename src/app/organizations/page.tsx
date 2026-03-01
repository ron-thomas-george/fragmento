"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Building2 } from "lucide-react";
import OnboardingLogo from "@/components/auth/onboarding-logo";
import { AuthActionCard } from "@/components/auth/auth-action-card";
import UserProfileMenu from "@/components/auth/user-profile-menu";
import type { User } from "@supabase/supabase-js";

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

export default function OrganizationsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const filteredOrganizations = organizations.filter((org) =>
    org.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const noOrganizations = !loading && !error && organizations.length === 0;

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

        setUser(user);

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
    <div className="flex min-h-screen flex-col bg-background">
      <div
        className="absolute inset-0 z-0 opacity-80"
        style={{
          background:
            "linear-gradient(180deg, #D6C9FD 1%, #E1D7FB 4%, #F7F5F2 100%)",
        }}
      />
      <header className="relative z-10 flex w-full items-center justify-between px-8 py-6">
        <OnboardingLogo />

        <div className="flex items-center gap-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input
              className="bg-white pl-9 border-none shadow-sm h-9"
              type="search"
              placeholder="Search organizations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {searchQuery && (
              <div className="absolute top-11 z-50 w-full rounded-xl border bg-white shadow-lg backdrop-blur-xl overflow-hidden">
                {filteredOrganizations.length > 0 ? (
                  filteredOrganizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        router.push(`/organizations/${org.id}/projects`);
                        setSearchQuery("");
                      }}
                      className="
              flex w-full items-center gap-2
              px-3 py-2 text-left
              hover:bg-slate-50
            "
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-xs font-semibold">
                        {org.name?.charAt(0).toUpperCase()}
                      </div>

                      <span className="text-sm text-slate-800">{org.name}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No organizations found
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            className="bg-slate-950 text-white hover:bg-slate-900 h-9 cursor-pointer"
            onClick={() => router.push("/onboarding/create-organization")}
          >
            Add organization
          </Button>
          <UserProfileMenu
            name={user?.user_metadata?.full_name || "User"}
            email={user?.email}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Building2 className="h-8 w-8 animate-pulse text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Loading organizations...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : noOrganizations ? (
          <AuthActionCard
            imageSrc="/organization.svg"
            imageAlt="Inbox Illustrations"
            title=" No organizations created"
            description="Organizations group projects, team members, and integrations."
            buttonLabel="Create"
            onButtonClick={() => router.push("/onboarding/create-organization")}
          />
        ) : (
          <div className="w-full max-w-5xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrganizations.map((org, index) => (
              <button
                key={org.id}
                type="button"
                onClick={() => router.push(`/organizations/${org.id}/projects`)}
                className="group flex flex-col rounded-xl border border-border/10 bg-white/60 p-1 text-left shadow-sm backdrop-blur-xl transition-all hover:bg-white/80 hover:shadow-md"
              >
                <div
                  className="flex h-32 w-full items-center justify-center rounded-lg text-3xl font-bold text-white shadow-inner"
                  style={{ backgroundColor: getAvatarColor(index) }}
                >
                  {org.name?.charAt(0)?.toUpperCase() ?? "F"}
                </div>
                <div className="px-4 py-4">
                  <h3 className="font-semibold text-slate-900">{org.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created{" "}
                    {new Date(org.created_at || "").toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
            {filteredOrganizations.length === 0 && searchQuery && (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No organizations match &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
