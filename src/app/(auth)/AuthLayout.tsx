"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full flex-1 items-center justify-center px-6 py-12 md:px-10">
        <div className={cn("w-full max-w-md")}>{children}</div>
      </div>

      <div className="relative hidden flex-1 p-6 md:flex">
        <div
          className="absolute inset-6 rounded-3xl"
          style={{
            background:
              "linear-gradient(180deg, #D6C9FD 0%, #FB9195 50%, #7B61FF 100%)",
          }}
        />

        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <Image
            src="/whiteLogo.svg"
            alt="Fragmento Logo"
            width={100}
            height={100}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-12 z-10 px-16">
          <h2 className="w-full text-left text-white text-4xl font-semibold leading-tight tracking-tight">
            Design tokens that scale with your team.
          </h2>
        </div>
      </div>
    </div>
  );
}
