interface AuthHeaderProps {
  title: string;
  description?: string;
}

export default function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="mb-8 text-left">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
