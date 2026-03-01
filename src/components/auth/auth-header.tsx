import { cn } from "@/lib/utils";

interface AuthHeaderProps {
  title: string;
  description?: string;
}

export default function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className={cn("mb-4 text-center")}>
      <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
