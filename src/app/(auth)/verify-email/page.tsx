"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { AuthActionCard } from "@/components/auth/auth-action-card";
import { toast } from "sonner";
import OnboardingLogo from "@/components/auth/onboarding-logo";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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

    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      toast.error("Failed to resend email", {
        description: error.message,
      });
      return;
    }

    toast.success("Email sent", {
      description: "Confirmation email has been resent successfully.",
    });
  };

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
