interface VersionsPageProps {
  params: {
    projectId: string;
  };
}

export default function VersionsPage({ params }: VersionsPageProps) {
  const { projectId } = params;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Versions &amp; Releases</h1>
        <p className="text-sm text-muted-foreground">
          Project: <span className="font-mono text-xs">{projectId}</span>
        </p>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-6 py-4">
        <section>
          <h2 className="text-base font-medium">Pending changes</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Change groups and conflict resolution UI will be implemented here.
          </p>
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Pending changes placeholder
          </div>
        </section>
        <section>
          <h2 className="text-base font-medium">Release history</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Past releases and rollback actions will be implemented here.
          </p>
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Release history placeholder
          </div>
        </section>
      </main>
    </div>
  );
}
