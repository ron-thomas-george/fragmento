"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OnboardingLogo from "@/components/auth/onboarding-logo";
import UserProfileMenu from "@/components/auth/user-profile-menu";
import type { User } from "@supabase/supabase-js";

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 50;

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
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
    };
    void loadUser();
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("You need to be signed in to create an organization.");
        return;
      }

      const trimmedName = name.trim();
      if (
        trimmedName.length < NAME_MIN_LENGTH ||
        trimmedName.length > NAME_MAX_LENGTH
      ) {
        setError(
          `Organization name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`,
        );
        return;
      }

      const { data: existingOrgs, error: existingError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", user.id)
        .ilike("name", trimmedName);

      if (existingError) {
        setError(existingError.message);
        return;
      }
      if (existingOrgs?.length) {
        setError("You already have an organization with this name.");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("organizations")
        .insert({ name: trimmedName, owner_id: user.id })
        .select("id")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Could not create organization.");
        return;
      }

      router.push(`/onboarding/select-plan?organizationId=${data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-10 flex w-full items-center justify-between px-8 py-6">
        <OnboardingLogo />
        <UserProfileMenu
          name={user?.user_metadata?.full_name || "User"}
          email={user?.email}
        />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your organization
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Organizations group projects, team members, and integrations.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="name">
                Organization name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Design"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white"
            >
              {loading ? "Creating organization..." : "Continue"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
