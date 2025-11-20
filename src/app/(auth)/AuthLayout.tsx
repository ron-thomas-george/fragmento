"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden flex-1 items-center justify-center border-r bg-muted/40 px-10 py-10 md:flex">
        <div className="absolute inset-10 rounded-3xl bg-gradient-to-br from-primary via-slate-800 to-slate-600 opacity-90" />
        <div className="relative z-10 max-w-md text-left text-background">
          <div className="mb-6 inline-flex items-center rounded-full bg-background/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Design tokens, versioned.
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Fragmento</h1>
          <p className="mt-3 text-sm text-slate-100/80">
            Centralize your design tokens, manage changes, and ship consistent
            interfaces across web and Figma.
          </p>
          <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-slate-200/70">
            TRUSTED BY PRODUCT TEAMS
          </p>
          <div className="mt-2 h-px w-12 bg-slate-200/50" />
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center px-4 py-10 md:px-10">
        <div className={cn("w-full max-w-md")}>{children}</div>
      </div>
    </div>
  );
}
