"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <header className="absolute left-0 top-0 z-10 px-6 pt-6 md:px-10 md:pt-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/fragmento.svg"
            alt="Fragmento"
            width={160}
            height={160}
            priority
          />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-12 md:px-10">
        <div className={cn("w-full max-w-sm")}>{children}</div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-violet-100/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}
