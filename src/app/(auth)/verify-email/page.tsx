"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { AuthActionCard } from "@/components/auth/auth-action-card";
import { toast } from "sonner";
import OnboardingLogo from "@/components/auth/onboarding-logo";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resendLoading, setResendLoading] = useState(false);

  const email = searchParams.get("email");

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/signin");
  };

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("Email missing", {
        description: "No email address found to resend confirmation.",
      });
      return;
    }

    setResendLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      toast.error("Failed to resend email", {
        description: error.message,
      });
      setResendLoading(false);
      return;
    }

    toast.success("Email sent", {
      description: "Confirmation email has been resent successfully.",
    });
    setResendLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative z-10 flex w-full items-center justify-between px-8 py-6">
        <OnboardingLogo />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white/80 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </header>

      <AuthActionCard
        title="Check your inbox"
        imageSrc="/inbox.svg"
        imageAlt="Inbox Illustration"
        buttonLabel="Resend email"
        onButtonClick={handleResendEmail}
        buttonLoading={resendLoading}
        description={
          <>
            We&apos;ve sent a confirmation email to&nbsp;
            <span className="font-semibold text-slate-700">{email}</span>
          </>
        }
      />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
