"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "../AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (attempts >= 3) {
      setError("You have reached the maximum number of reset attempts. Please try again later.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        setAttempts((prev) => prev + 1);
        setLoading(false);
        return;
      }

      setSuccess("If an account exists for this email, we've sent a reset link.");
      setAttempts((prev) => prev + 1);
      setLoading(false);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-6 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
            {success ? (
              <p className="text-xs text-emerald-600">{success}</p>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Remembered your password?{" "}
            <a
              href="/signin"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
