"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/tokens?set=global`);
    }
  }, [projectId, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">Redirecting to tokens...</p>
    </div>
  );
}
