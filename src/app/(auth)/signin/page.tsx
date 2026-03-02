"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { signInSchema, SignInValues } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/form-input";
import { AuthLayout } from "../AuthLayout";
import AuthHeader from "@/components/auth/auth-header";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleGoogleSignIn = async () => {
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
        toast.error(oauthError.message);
        setLoading(false);
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const onSubmit = async (data: SignInValues) => {
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        toast.error(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/organizations");
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <>
        <AuthHeader title="Sign in" description="Welcome back" />

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormInput
            id="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            registration={register("email")}
            error={errors.email}
          />

          <FormInput
            id="password"
            label="Password"
            type="password"
            placeholder="Enter password"
            registration={register("password")}
            error={errors.password}
          >
            <div className="flex">
              <a
                href="/forgot-password"
                className="text-[13px] font-semibold hover:text-slate-900 mt-2"
              >
                Forgot Password?
              </a>
            </div>
          </FormInput>

          <Button
            className="h-10 w-full cursor-pointer"
            type="submit"
            variant="default"
            disabled={loading || isSubmitting}
          >
            {(loading || isSubmitting) && (
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            )}
            {loading || isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-muted-foreground uppercase">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full cursor-pointer"
          disabled={loading}
          onClick={handleGoogleSignIn}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.2955 14.4409 14.35 13.3864 15.0545V17.5545H16.6182C18.5091 15.8136 19.6 13.25 19.6 10.2273Z"
              fill="#4285F4"
            />
            <path
              d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5545L13.3864 15.0545C12.4909 15.6545 11.3455 16.0091 10 16.0091C7.39545 16.0091 5.19091 14.25 4.40455 11.8864H1.05909V14.4773C2.70909 17.7545 6.09091 20 10 20Z"
              fill="#34A853"
            />
            <path
              d="M4.40455 11.8864C4.20455 11.2864 4.09091 10.65 4.09091 10C4.09091 9.35 4.20455 8.71364 4.40455 8.11364V5.52273H1.05909C0.386364 6.86364 0 8.38636 0 10C0 11.6136 0.386364 13.1364 1.05909 14.4773L4.40455 11.8864Z"
              fill="#FBBC05"
            />
            <path
              d="M10 3.99091C11.4682 3.99091 12.7864 4.49545 13.8227 5.48636L16.6909 2.61818C14.9591 1.00455 12.6955 0 10 0C6.09091 0 2.70909 2.24545 1.05909 5.52273L4.40455 8.11364C5.19091 5.75 7.39545 3.99091 10 3.99091Z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?&nbsp;
          <a
            href="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Sign up
          </a>
        </div>
      </>
    </AuthLayout>
  );
}
