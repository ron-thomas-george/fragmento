"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function SelectPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");

  const handleSelect = (plan: "individual" | "organization") => {
    if (!organizationId) {
      router.push("/onboarding/create-organization");
      return;
    }

    router.push(
      `/onboarding/create-project?organizationId=${organizationId}&plan=${plan}`
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Select a plan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose between the Individual and Organization plans. You can change this later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex h-full flex-col rounded-lg border bg-card p-6 text-left">
            <h2 className="text-base font-semibold">Individual</h2>
            <p className="mt-1 text-xs text-muted-foreground">Free forever. Best for solo designers or small projects.</p>
            <div className="mt-3 text-2xl font-semibold">$0</div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>1 editor seat</li>
              <li>Unlimited viewers</li>
              <li>1 project, unlimited token sets</li>
            </ul>
            <Button
              className="mt-auto h-8 w-full text-xs font-medium"
              onClick={() => handleSelect("individual")}
            >
              Continue with Individual
            </Button>
          </div>

          <div className="flex h-full flex-col rounded-lg border bg-card p-6 text-left">
            <h2 className="text-base font-semibold">Organization</h2>
            <p className="mt-1 text-xs text-muted-foreground">14-day trial. Best for teams and multiple projects.</p>
            <div className="mt-3 text-2xl font-semibold">$49</div>
            <p className="text-xs text-muted-foreground">per month</p>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>5 editor seats included</li>
              <li>Unlimited viewers</li>
              <li>Up to 10 projects</li>
              <li>Slack integration</li>
            </ul>
            <Button
              variant="secondary"
              className="mt-auto h-8 w-full text-xs font-medium"
              onClick={() => handleSelect("organization")}
              disabled
              aria-disabled="true"
            >
              Continue with Organization
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SelectPlanPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Select a plan</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading...
            </p>
          </div>
        </div>
      </main>
    }>
      <SelectPlanForm />
    </Suspense>
  );
}
