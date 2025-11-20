"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
        setLoading(false);
        return;
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 50) {
        setError("Organization name must be between 3 and 50 characters.");
        setLoading(false);
        return;
      }

      const { data: existingOrgs, error: existingError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("owner_id", user.id)
        .ilike("name", trimmedName);

      if (existingError) {
        setError(existingError.message);
        setLoading(false);
        return;
      }

      if (existingOrgs && existingOrgs.length > 0) {
        setError("You already have an organization with this name.");
        setLoading(false);
        return;
      }

      const { data, error: insertError } = await supabase
        .from("organizations")
        .insert({ name: trimmedName, owner_id: user.id })
        .select("id")
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Could not create organization.");
        setLoading(false);
        return;
      }

      router.push(`/onboarding/select-plan?organizationId=${data.id}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your organization</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organizations group projects, team members, and integrations.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="name">
                Organization name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Design Systems"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating organization..." : "Create organization"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
