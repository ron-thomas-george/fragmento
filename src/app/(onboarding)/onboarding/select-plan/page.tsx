"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import OnboardingLogo from "@/components/auth/onboarding-logo";
import UserProfileMenu from "@/components/auth/user-profile-menu";

type PlanKey = "individual" | "professional" | "organization";

const PLANS = {
  individual: {
    name: "Individual",
    price: "$0",
    features: [
      "1 organization",
      "1 project",
      "1 editor seat (just you)",
      "Unlimited viewer seats",
      "Token sets with referencing",
      "GitHub integration",
      "Version control & releases",
      "shadcn export",
    ],
    cta: "Start for free",
    variant: "outline" as const,
  },
  professional: {
    name: "Professional",
    price: "$29",
    recommended: true,
    features: [
      "1 organization",
      "5 projects",
      "3 editor seats (can invite 2 others)",
    ],
    plusLabel: "Everything in Free, plus:",
    plusFeatures: [
      "Slack integration",
      "Priority support",
      "+$15/month per additional editor (max 2)",
    ],
    cta: "Buy now",
    variant: "default" as const,
  },
  organization: {
    name: "Organization",
    price: "$99",
    features: ["3 organizations", "Unlimited projects", "5 editor seats"],
    plusLabel: "Everything in Professional, plus:",
    plusFeatures: [
      "Token relationship graph",
      "Component library import",
      "Priority support + Slack/Discord channel",
      "+$12/month per additional editor (max 2)",
    ],
    cta: "Buy now",
    variant: "outline" as const,
  },
};

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm font-normal text-[rgba(2,6,23,1)]">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2">
          <Check
            className="mt-0.5 h-4 w-4 shrink-0 text-black-600"
            aria-hidden
          />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function SelectPlanForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user: u },
        error,
      } = await supabase.auth.getUser();
      if (error || !u) {
        router.push("/signin");
        return;
      }
      setUser(u);
    };
    void loadUser();
  }, [router]);

  const [loading, setLoading] = useState<PlanKey | null>(null);

  const handleSelect = async (plan: PlanKey) => {
    setLoading(plan);
    if (!organizationId) {
      router.push("/onboarding/create-organization");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    if (u) {
      const planValue =
        plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
      await supabase
        .from("profiles")
        .upsert(
          { id: u.id, plan: planValue, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
    }
    router.push("/organizations");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-10 flex w-full items-center justify-between px-8 py-6">
        <OnboardingLogo />
        <UserProfileMenu
          name={user?.user_metadata?.full_name ?? undefined}
          email={user?.email ?? undefined}
        />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pb-12 pt-4">
        <div className="w-full max-w-5xl">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Choose your plan
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Select the plan that&apos;s best for you.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-muted-foreground/20"
              onClick={() => handleSelect("individual")}
              onKeyDown={(e) => e.key === "Enter" && handleSelect("individual")}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-[32px] font-semibold text-foreground">
                  {PLANS.individual.name}
                </h2>
                <span className="text-[32px] font-semibold text-foreground">
                  {PLANS.individual.price}
                </span>
              </div>
              <FeatureList features={PLANS.individual.features} />
              <Button
                variant={PLANS.individual.variant}
                className="mt-8 w-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect("individual");
                }}
                disabled={loading !== null}
              >
                {loading === "individual"
                  ? "Continuing..."
                  : PLANS.individual.cta}
              </Button>
            </div>

            <div
              role="button"
              tabIndex={0}
              className="relative flex cursor-pointer flex-col rounded-xl border-2 border-primary bg-card p-4 shadow-md shadow-primary/10 transition-shadow hover:shadow-lg hover:shadow-primary/15"
              onClick={() => handleSelect("professional")}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSelect("professional")
              }
              aria-busy={loading === "professional"}
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                Recommended
              </span>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[32px] font-semibold text-foreground">
                  {PLANS.professional.name}
                </h2>
                <span className="text-[32px] font-semibold text-foreground">
                  {PLANS.professional.price}
                </span>
              </div>
              <FeatureList features={PLANS.professional.features} />
              <p className="mt-2 text-lg font-medium">
                {PLANS.professional.plusLabel}
              </p>
              <FeatureList features={PLANS.professional.plusFeatures} />
              <Button
                variant={PLANS.professional.variant}
                className="mt-auto w-full cursor-pointer text-primary-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect("professional");
                }}
                disabled={loading !== null}
              >
                {loading === "professional"
                  ? "Continuing..."
                  : PLANS.professional.cta}
              </Button>
            </div>

            <div
              role="button"
              tabIndex={0}
              className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md hover:border-muted-foreground/20"
              onClick={() => handleSelect("organization")}
              onKeyDown={(e) =>
                e.key === "Enter" && handleSelect("organization")
              }
              aria-busy={loading === "organization"}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-[32px] font-semibold text-foreground">
                  {PLANS.organization.name}
                </h2>
                <span className="text-[32px] font-semibold text-foreground">
                  {PLANS.organization.price}
                </span>
              </div>
              <FeatureList features={PLANS.organization.features} />
              <p className="mt-2 text-lg font-medium">
                {PLANS.organization.plusLabel}
              </p>
              <FeatureList features={PLANS.organization.plusFeatures} />
              <Button
                variant={PLANS.organization.variant}
                className="mt-auto w-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect("organization");
                }}
                disabled={loading !== null}
              >
                {loading === "organization"
                  ? "Continuing..."
                  : PLANS.organization.cta}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SelectPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SelectPlanForm />
    </Suspense>
  );
}
