"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  ResetPasswordValues,
} from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/form-input";
import { AuthLayout } from "../AuthLayout";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const initSession = async () => {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
        setVerifying(false);
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (tokenHash && type === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!verifyError) {
          setReady(true);
        } else {
          setError("Invalid or expired reset link. Please request a new one.");
        }
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
      setVerifying(false);
    };
    void initSession();
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordValues) => {
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      router.push("/signin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthLayout>
        <div className="w-full text-center">
          <p className="text-sm text-muted-foreground">Verifying link...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout>
        <div className="w-full text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Invalid link
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Request a new reset link
          </Link>
          <Link
            href="/signin"
            className="mt-4 block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Change your password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a new password
        </p>

        <form
          className="mt-6 flex flex-col items-stretch gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="text-left">
            <FormInput
              id="password"
              label="New password"
              type="password"
              placeholder="Enter new password"
              registration={register("password")}
              error={errors.password}
              className="border-[#E5E7EB] bg-white"
              autoComplete="new-password"
            />
          </div>

          <div className="text-left">
            <FormInput
              id="confirm-password"
              label="Confirm password"
              type="password"
              placeholder="Confirm new password"
              registration={register("confirmPassword")}
              error={errors.confirmPassword}
              className="border-[#E5E7EB] bg-white"
              autoComplete="new-password"
            />
          </div>

          {error ? (
            <p className="text-left text-sm text-destructive">{error}</p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Updating..." : "Reset password"}
          </Button>

          <Link
            href="/signin"
            className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <div className="w-full text-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </AuthLayout>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
