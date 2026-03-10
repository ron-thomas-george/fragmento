"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, AlertCircle } from "lucide-react";

export interface TokenFormSheetToken {
  id: string;
  name: string;
}

export type TokenTypesMap = Record<
  string,
  Array<{ value: string; label: string }>
>;

export interface TokenFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingToken: TokenFormSheetToken | null;
  formName: string;
  formType: string;
  formValue: string;
  formDescription: string;
  nameError: string;
  valueError: string;
  isNameUnique: boolean;
  saving: boolean;
  tokenTypes: TokenTypesMap;
  onNameChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  renderValueField: () => ReactNode;
  onSave: () => void;
}

export function TokenFormSheet({
  open,
  onOpenChange,
  editingToken,
  formName,
  formType,
  formValue,
  formDescription,
  nameError,
  valueError,
  isNameUnique,
  saving,
  tokenTypes,
  onNameChange,
  onTypeChange,
  onDescriptionChange,
  renderValueField,
  onSave,
}: TokenFormSheetProps) {
  const canSave =
    !saving && !nameError && formName.trim() !== "" && formValue.trim() !== "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-[420px] lg:max-w-[520px] w-full h-full inset-y-0 overflow-y-auto"
      >
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 p-4">
          <div>
            <SheetTitle className="text-lg font-semibold">
              {editingToken
                ? `Edit token: ${editingToken.name}`
                : "Create new token"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="space-y-4 px-6">
          {/* Name and Type on same line */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="token-name" className="text-sm font-medium">
                Name
              </Label>
              <div className="relative">
                <Input
                  id="token-name"
                  value={formName}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="color.primary.500"
                  className={`font-mono ${nameError ? "border-destructive" : isNameUnique && formName ? "border-green-500" : ""}`}
                />
                {formName && !nameError && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isNameUnique ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-type" className="text-sm font-medium">
                Type
              </Label>
              <Select value={formType} onValueChange={onTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select token type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tokenTypes).map(([category, types]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {types.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic Value Input Field */}
          <div className="space-y-2">
            <Label htmlFor="token-value" className="text-sm font-medium">
              Value
            </Label>
            {renderValueField()}
            {valueError && (
              <p className="text-xs text-destructive">{valueError}</p>
            )}
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <Label htmlFor="token-description" className="text-sm font-medium">
              Description
            </Label>
            <textarea
              id="token-description"
              value={formDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Enter a description..."
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formDescription.length}/500 characters
            </p>
          </div>
        </div>

        <SheetFooter className="flex flex-row justify-end gap-2 px-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!canSave}>
            {saving ? "Saving..." : editingToken ? "Save changes" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
