"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthLayout } from "../AuthLayout";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/organizations`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
      // On success Supabase will redirect, so we don't manually push here.
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/organizations");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="rounded-xl border bg-card/95 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign in to Fragmento</CardTitle>
            <CardDescription>
              Access your design token projects and releases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                disabled={loading}
                onClick={handleGoogleSignIn}
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  <span>Remember me for 30 days</span>
                </div>
                <a
                  href="/forgot-password"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Continue"}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign up
              </a>
            </div>
          </CardContent>
        </Card>
    </AuthLayout>
  );
}
