"use client";

import { AuthLayout } from "../AuthLayout";

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for your email, we&apos;ve sent a link to reset your password.
        </p>
      </div>
    </AuthLayout>
  );
}
