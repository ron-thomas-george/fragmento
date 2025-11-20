"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { AuthLayout } from "../AuthLayout";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (!password || password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasUppercase || !hasNumber || !hasSpecial) {
      return "Password must include at least one uppercase letter, one number, and one special character.";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }

    return null;
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding/create-organization`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      // On success Supabase will redirect.
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      router.push("/onboarding/create-organization");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="mb-6 text-left">
          <h1 className="text-2xl font-semibold tracking-tight">Create your Fragmento account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with centralized design token management.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              disabled={loading}
              onClick={handleGoogleSignUp}
            >
              Continue with Google
            </Button>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>or continue with email</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="name">
                Full name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

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

            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="space-y-1 text-left">
              <Label className="text-sm font-medium" htmlFor="confirm-password">
                Confirm password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Use at least 8 characters, including one uppercase letter, one number, and one special character.
              </p>
            </div>

            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <a href="/signin" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
