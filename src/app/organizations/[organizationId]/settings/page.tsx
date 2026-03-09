"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function OrganizationSettingsPage() {
  const params = useParams<{ organizationId: string }>();
  const router = useRouter();
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!params.organizationId) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("organizations")
      .select("name")
      .eq("id", params.organizationId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) router.replace("/organizations");
        else setOrgName((data as { name: string }).name);
      });
  }, [params.organizationId, router]);

  if (!orgName) return null;
  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-semibold tracking-tight">
        {orgName} / Settings
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Organization settings.
      </p>
    </div>
  );
}
