"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface UserProfileMenuProps {
  name?: string | null;
  email?: string | null;
}

export default function UserProfileMenu({ name, email }: UserProfileMenuProps) {
  const router = useRouter();

  const fallbackLetter =
    name?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || "U";

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/signin");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none">
          <Avatar className="h-9 w-9 cursor-pointer border bg-white hover:bg-slate-100 transition-colors">
            <AvatarFallback className="text-sm font-medium bg-slate-100">
              {fallbackLetter}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 rounded-xl p-2">
        <DropdownMenuLabel className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-slate-900">
            {name ?? "User"}
          </span>
          {email && (
            <span className="text-xs text-muted-foreground">{email}</span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
