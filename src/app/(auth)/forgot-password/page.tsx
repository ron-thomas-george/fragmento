"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  ForgotPasswordValues,
} from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/form-input";
import { AuthLayout } from "../AuthLayout";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordValues) => {
    if (attempts >= 3) {
      setError(
        "You have reached the maximum number of reset attempts. Please try again later.",
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        },
      );

      if (resetError) {
        setError(resetError.message);
        setAttempts((prev) => prev + 1);
        setLoading(false);
        return;
      }

      setSuccess(
        "If an account exists for this email, we've sent a reset link.",
      );
      setAttempts((prev) => prev + 1);
      setLoading(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Forgot your password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you an email to reset your
          password.
        </p>

        <form
          className="mt-6 flex flex-col items-stretch gap-4"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="text-left">
            <FormInput
              id="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
              registration={register("email")}
              error={errors.email}
              className="border-[#E5E7EB] bg-white"
            />
          </div>

          {error ? (
            <p className="text-left text-sm text-destructive">{error}</p>
          ) : null}
          {success ? (
            <p className="text-left text-sm text-emerald-600">{success}</p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary cursor-pointer text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Sending..." : "Send email"}
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
