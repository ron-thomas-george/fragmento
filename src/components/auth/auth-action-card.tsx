"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthActionCardProps {
  title: string;
  description?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  buttonLoading?: boolean;
  children?: ReactNode;
}

export function AuthActionCard({
  title,
  description,
  imageSrc,
  imageAlt = "Illustration",
  buttonLabel,
  onButtonClick,
  buttonLoading = false,
  children,
}: AuthActionCardProps) {
  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex max-w-[400px] flex-col items-center text-center">
        {imageSrc && (
          <div className="mb-8 flex h-24 w-full items-center justify-center">
            <div className="relative">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={135}
                height={120}
                className="drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        )}

        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>

        {description && (
          <p className="mt-4 text-center text-slate-600 whitespace-nowrap">
            {description}
          </p>
        )}

        {children}

        {buttonLabel && onButtonClick && (
          <Button
            onClick={onButtonClick}
            disabled={buttonLoading}
            className="mt-4 h-10 min-w-[140px] px-4 transition-colors cursor-pointer"
          >
            {buttonLoading && (
              <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
            )}
            {buttonLoading ? "Sending..." : buttonLabel}
          </Button>
        )}
      </div>
    </main>
  );
}
