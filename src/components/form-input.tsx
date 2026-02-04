import React from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  children?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  registration,
  error,
  className,
  id,
  children,
  ...props
}) => {
  return (
    <div className="space-y-1.5 text-left">
      <Label className="text-sm font-medium" htmlFor={id || registration.name}>
        {label}
      </Label>
      <Input
        id={id || registration.name}
        {...registration}
        className={cn(
          "h-36px rounded-md border-slate-200 px-3",
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error.message}</p>}
      {children}
    </div>
  );
};
