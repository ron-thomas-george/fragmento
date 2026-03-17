"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  GitBranch,
  Clock,
  TrendingUp,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Change {
  id: string;
  type: "created" | "modified" | "deleted" | "renamed";
  tokenName: string;
  tokenSet: string;
  source: "web_app" | "figma";
  beforeValue?: any;
  afterValue?: any;
  description?: string;
  createdBy: string;
  createdAt: string;
}

interface Release {
  version: string;
  type: "major" | "minor" | "patch";
  created_at: string;
}

interface CreateReleasePageProps {
  params: Promise<{ projectId: string }>;
}

interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
}

export default function CreateReleasePage({ params }: CreateReleasePageProps) {
  const { projectId } = use(params);
  const router = useRouter();

  const [pendingChanges, setPendingChanges] = useState<Change[]>([]);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo>({
    major: 1,
    minor: 0,
    patch: 0,
  });
  const [versionType, setVersionType] = useState<"major" | "minor" | "patch">(
    "minor",
  );
  const [customVersion, setCustomVersion] = useState<VersionInfo>({
    major: 1,
    minor: 1,
    patch: 0,
  });
  const [commitMessage, setCommitMessage] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [changesExpanded, setChangesExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [releases, setReleases] = useState<Release[]>([]);
  const [recommendedType, setRecommendedType] = useState<
    "major" | "minor" | "patch"
  >("minor");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load data on page load
  useEffect(() => {
    loadData();
  }, [projectId]);

  // Update custom version when version type changes
  useEffect(() => {
    const newVersion = { ...currentVersion };

    switch (versionType) {
      case "major":
        newVersion.major += 1;
        newVersion.minor = 0;
        newVersion.patch = 0;
        break;
      case "minor":
        newVersion.minor += 1;
        newVersion.patch = 0;
        break;
      case "patch":
        newVersion.patch += 1;
        break;
    }

    setCustomVersion(newVersion);
  }, [versionType, currentVersion]);

  const loadData = async () => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Load pending changes
      const { data: changesData } = await supabase
        .from("changes")
        .select("*")
        .eq("project_id", projectId)
        .is("released_in", null)
        .order("created_at", { ascending: false });

      if (changesData) {
        // Get token details for each change
        const tokenIds = changesData
          .map((change) => change.token_id)
          .filter(Boolean);
        const { data: tokensData } = await supabase
          .from("tokens")
          .select(
            `
            id, name, type, description,
            token_sets!inner(name)
          `,
          )
          .in("id", tokenIds);

        // Transform changes with token details
        const transformedChanges = changesData.map((change) => {
          const token = tokensData?.find((t) => t.id === change.token_id);
          const tokenName =
            token?.name ||
            change.after?.name ||
            change.before?.name ||
            "Unknown Token";
          const tokenSet = (token?.token_sets as any)?.name || "Unknown Set";

          return {
            id: change.id,
            type: change.change_type as
              | "created"
              | "modified"
              | "deleted"
              | "renamed",
            tokenName,
            tokenSet,
            source: change.source as "web_app" | "figma",
            beforeValue: change.before,
            afterValue: change.after,
            description: token?.description || change.after?.description,
            createdBy: change.created_by || "Unknown User",
            createdAt: change.created_at,
          };
        });

        setPendingChanges(transformedChanges);
        analyzeChanges(transformedChanges);
      }

      // Load release history
      const { data: releasesData } = await supabase
        .from("releases")
        .select("version, type, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (releasesData && releasesData.length > 0) {
        setReleases(releasesData);
        // Parse the latest version
        const latestVersion = releasesData[0].version;
        const [major, minor, patch] = latestVersion
          .replace("v", "")
          .split(".")
          .map(Number);
        setCurrentVersion({ major, minor, patch });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const analyzeChanges = (changes: Change[]) => {
    const hasDeleted = changes.some((change) => change.type === "deleted");
    const hasCreated = changes.some((change) => change.type === "created");
    const hasModified = changes.some((change) => change.type === "modified");

    // Auto-suggest version type based on changes
    if (hasDeleted) {
      setRecommendedType("major");
      setVersionType("major");
    } else if (hasCreated) {
      setRecommendedType("minor");
      setVersionType("minor");
    } else if (hasModified) {
      setRecommendedType("patch");
      setVersionType("patch");
    }
  };

  const getVersionTypeDescription = (type: "major" | "minor" | "patch") => {
    switch (type) {
      case "major":
        return {
          badge: {
            text: "Breaking",
            color: "text-red-600 bg-red-50 border-red-200",
          },
          description: "Breaking changes that require code updates",
          examples:
            "Renamed token sets, removed tokens, changed token structure",
        };
      case "minor":
        return {
          badge: {
            text: "Feature",
            color: "text-blue-600 bg-blue-50 border-blue-200",
          },
          description: "New features and tokens, backward compatible",
          examples: "Added new tokens, modified values, new color variants",
        };
      case "patch":
        return {
          badge: {
            text: "Fix",
            color: "text-green-600 bg-green-50 border-green-200",
          },
          description: "Bug fixes and small corrections only",
          examples: "Fixed typos, corrected values, minor adjustments",
        };
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      if (value.value) return value.value;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getChangesBySource = (source: "web_app" | "figma") => {
    return pendingChanges.filter((change) => change.source === source);
  };

  const generateCommitMessage = () => {
    const changeTypes = {
      created: pendingChanges.filter((c) => c.type === "created").length,
      modified: pendingChanges.filter((c) => c.type === "modified").length,
      deleted: pendingChanges.filter((c) => c.type === "deleted").length,
    };

    let message = "";
    const parts = [];

    if (changeTypes.created > 0)
      parts.push(
        `Added ${changeTypes.created} token${changeTypes.created > 1 ? "s" : ""}`,
      );
    if (changeTypes.modified > 0)
      parts.push(
        `Modified ${changeTypes.modified} token${changeTypes.modified > 1 ? "s" : ""}`,
      );
    if (changeTypes.deleted > 0)
      parts.push(
        `Removed ${changeTypes.deleted} token${changeTypes.deleted > 1 ? "s" : ""}`,
      );

    message = parts.join(", ");

    if (versionType === "major") {
      message = `Breaking: ${message}`;
    }

    setCommitMessage(message);
  };

  const generateTokensJSON = async () => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Fetch all tokens for the project
      const { data: tokens } = await supabase
        .from("tokens")
        .select(
          `
          name, type, value, resolved_value, description,
          token_sets!inner(name)
        `,
        )
        .eq("project_id", projectId)
        .order("name");

      if (!tokens) return null;

      // Group tokens by set and organize them
      const tokensBySet: Record<string, any> = {};

      tokens.forEach((token) => {
        const setName = (token.token_sets as any)?.name || "global";

        if (!tokensBySet[setName]) {
          tokensBySet[setName] = {};
        }

        // Use resolved_value for the actual token value
        tokensBySet[setName][token.name] = {
          value: token.resolved_value || token.value,
          type: token.type,
          description: token.description,
        };
      });

      return {
        version: `v${customVersion.major}.${customVersion.minor}.${customVersion.patch}`,
        tokens: tokensBySet,
        metadata: {
          generatedAt: new Date().toISOString(),
          changesCount: pendingChanges.length,
          releaseNotes: releaseNotes,
        },
      };
    } catch (error) {
      console.error("Error generating tokens JSON:", error);
      return null;
    }
  };

  const pushToGitHub = async (
    tokensData: any,
    options: {
      commitMessage: string;
      versionString: string;
      releaseNotes?: string;
    },
  ): Promise<{ prUrl: string }> => {
    const { commitMessage, versionString, releaseNotes = "" } = options;

    const supabase = createSupabaseBrowserClient();

    const { data: githubConfig } = await supabase
      .from("github_integrations")
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (!githubConfig || !githubConfig.verified) {
      throw new Error(
        "GitHub integration not configured or verified. Please set up GitHub integration first.",
      );
    }

    const { access_token, repository_owner, repository_name, branch_name } =
      githubConfig;
    const baseBranchName = branch_name || "main";

    const authHeaders = {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const api = (path: string, init?: RequestInit) =>
      fetch(
        `https://api.github.com/repos/${repository_owner}/${repository_name}${path}`,
        {
          ...init,
          headers: {
            ...authHeaders,
            ...(init?.headers as Record<string, string> | undefined),
          },
        },
      );

    // Verify repo access
    const repoResponse = await api("");
    if (!repoResponse.ok) {
      const repoError = await repoResponse.json();
      if (repoResponse.status === 404) {
        throw new Error(
          `Repository ${repository_owner}/${repository_name} not found or not accessible.`,
        );
      }
      if (repoResponse.status === 403) {
        throw new Error(
          `Access denied. Please ensure your token has 'Contents' and 'Pull requests' write permissions.`,
        );
      }
      throw new Error(
        `Repository error: ${(repoError as { message?: string }).message || "Unknown"}`,
      );
    }

    const repoData = await repoResponse.json();
    if (!repoData.permissions?.push) {
      throw new Error(
        `No write access to ${repository_owner}/${repository_name}. Token needs push and pull request permissions.`,
      );
    }

    // 1) Get latest commit on base branch
    const branchRes = await api(
      `/branches/${encodeURIComponent(baseBranchName)}`,
    );
    if (!branchRes.ok) {
      const err = await branchRes.json();
      throw new Error(
        `Could not get base branch ${baseBranchName}: ${(err as { message?: string }).message || branchRes.status}`,
      );
    }
    const branchData = await branchRes.json();
    const baseCommitSha = branchData.commit.sha;

    // 2) Get base commit to get tree SHA
    const commitRes = await api(`/git/commits/${baseCommitSha}`);
    if (!commitRes.ok) {
      const err = await commitRes.json();
      throw new Error(
        `Could not get base commit: ${(err as { message?: string }).message || commitRes.status}`,
      );
    }
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3) Create blob with new tokens.json content
    const fileContent = JSON.stringify(tokensData, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(fileContent)));
    const blobRes = await api("/git/blobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: encodedContent,
        encoding: "base64",
      }),
    });
    if (!blobRes.ok) {
      const err = await blobRes.json();
      throw new Error(
        `Failed to create blob: ${(err as { message?: string }).message || blobRes.status}`,
      );
    }
    const blobData = await blobRes.json();
    const blobSha = blobData.sha;

    // 4) Create tree with tokens.json (replaces or adds file in base tree)
    const treeRes = await api("/git/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path: "tokens.json",
            mode: "100644",
            type: "blob",
            sha: blobSha,
          },
        ],
      }),
    });
    if (!treeRes.ok) {
      const err = await treeRes.json();
      throw new Error(
        `Failed to create tree: ${(err as { message?: string }).message || treeRes.status}`,
      );
    }
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // 5) Create commit on new branch
    const newBranchName = `fragmento/release-${versionString.replace(/^v/, "")}-${Date.now()}`;
    const createCommitRes = await api("/git/commits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [baseCommitSha],
      }),
    });
    if (!createCommitRes.ok) {
      const err = await createCommitRes.json();
      throw new Error(
        `Failed to create commit: ${(err as { message?: string }).message || createCommitRes.status}`,
      );
    }
    const newCommitData = await createCommitRes.json();
    const newCommitSha = newCommitData.sha;

    // 6) Create ref for new branch
    const refRes = await api("/git/refs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: newCommitSha,
      }),
    });
    if (!refRes.ok) {
      const err = await refRes.json();
      throw new Error(
        `Failed to create branch: ${(err as { message?: string }).message || refRes.status}`,
      );
    }

    // 7) Create pull request (base = main, head = new branch)
    const prRes = await api("/pulls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: commitMessage,
        head: newBranchName,
        base: baseBranchName,
        body: releaseNotes
          ? `## Release ${versionString}\n\n${releaseNotes}`
          : `Design tokens release ${versionString}. Merge this PR to update \`tokens.json\` on ${baseBranchName}.`,
      }),
    });
    if (!prRes.ok) {
      const err = await prRes.json();
      throw new Error(
        `Failed to create pull request: ${(err as { message?: string }).message || prRes.status}`,
      );
    }
    const prData = await prRes.json();
    return { prUrl: prData.html_url };
  };

  const sendSlackNotification = async (
    releaseData: any,
    pendingChanges: any[],
    versionString: string,
    commitMessage: string,
  ) => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Get Slack integration settings
      const { data: slackIntegration } = await supabase
        .from("slack_integrations")
        .select("*")
        .eq("project_id", projectId)
        .eq("verified", true)
        .single();

      if (!slackIntegration) {
        console.log(
          "No verified Slack integration found, skipping notification",
        );
        return;
      }

      // Analyze changes by source and type
      const changesBySource = pendingChanges.reduce(
        (acc, change) => {
          acc[change.source] = (acc[change.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const changesByType = pendingChanges.reduce(
        (acc, change) => {
          acc[change.type] = (acc[change.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Format the Slack message according to the product spec
      const slackMessage = {
        text: `📦 New Release: ${versionString}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `📦 *New Release: ${versionString}*\n${commitMessage}`,
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Changes:*\n${changesBySource.web_app || 0} from Web App • ${changesBySource.figma || 0} from Figma`,
              },
              {
                type: "mrkdwn",
                text: `*Types:*\n${changesByType.modified || 0} modified • ${changesByType.created || 0} added • ${changesByType.deleted || 0} deleted`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `👤 Published by ${releaseData.created_by} 📄 <${window.location.origin}/projects/${projectId}/versions|View in Fragmento>`,
            },
          },
        ],
      };

      // Send notification using our API route
      const response = await fetch("/api/slack/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_url: slackIntegration.webhook_url,
          message: slackMessage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to send Slack notification:", error);
      } else {
        console.log("Slack notification sent successfully");
      }
    } catch (error) {
      console.error("Error sending Slack notification:", error);
      // Don't fail the release if Slack notification fails
    }
  };

  const handleCreateRelease = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createSupabaseBrowserClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserName =
        user?.user_metadata?.full_name ||
        user?.email?.split("@")[0] ||
        "Unknown User";

      const versionString = `v${customVersion.major}.${customVersion.minor}.${customVersion.patch}`;

      // Generate tokens JSON
      const tokensData = await generateTokensJSON();
      if (!tokensData) {
        throw new Error("Failed to generate tokens JSON");
      }

      // Create PR with token changes (no direct push to main)
      const { prUrl } = await pushToGitHub(tokensData, {
        commitMessage,
        versionString,
        releaseNotes,
      });

      // Create release record
      const { data: releaseData, error: releaseError } = await supabase
        .from("releases")
        .insert({
          project_id: projectId,
          version: versionString,
          type: versionType,
          commit_message: commitMessage,
          release_notes: releaseNotes,
          changes_count: pendingChanges.length,
          created_by: currentUserName,
        })
        .select()
        .single();

      if (releaseError) throw releaseError;

      // Send Slack notification if configured
      await sendSlackNotification(
        releaseData,
        pendingChanges,
        versionString,
        commitMessage,
      );

      // Clear pending changes (mark as released)
      const changeIds = pendingChanges.map((change) => change.id);
      await supabase
        .from("changes")
        .update({ released_in: releaseData.id })
        .in("id", changeIds);

      // Show success with PR link (user merges PR to publish to main)
      setSuccess(prUrl);
    } catch (error) {
      console.error("Error creating release:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create release",
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    commitMessage.trim().length > 0 && pendingChanges.length > 0;

  // ---------- preview token table (inline component) ----------
  const previewChanges = pendingChanges;
  const addedCount = previewChanges.filter((c) => c.type === "created").length;
  const modifiedCount = previewChanges.filter(
    (c) => c.type === "modified",
  ).length;
  const deletedCount = previewChanges.filter(
    (c) => c.type === "deleted",
  ).length;

  const [previewFilter, setPreviewFilter] = useState<
    "added" | "modified" | "deleted"
  >("added");

  if (dataLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 w-full">
      {/* Header */}
      <header className="border-b px-6 py-3 w-full shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => router.push(`/projects/${projectId}/versions`)}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Versions &amp; Releases
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Global</span>
          </div>
          <Button
            onClick={handleCreateRelease}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              `Create release v${customVersion.major}.${customVersion.minor}.${customVersion.patch}`
            )}
          </Button>
        </div>
      </header>

      <main className="flex flex-1 w-full min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <button
                className="ml-auto underline text-xs"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 space-y-2">
              <p className="font-medium">
                Release created — pull request opened
              </p>
              <p className="text-muted-foreground">
                Merge the PR to update{" "}
                <code className="text-xs bg-green-100 px-1 rounded">
                  tokens.json
                </code>{" "}
                on your default branch.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={success}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-green-700"
                >
                  View pull request
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/versions`)}
                  className="border-green-300 text-green-800 hover:bg-green-100"
                >
                  Back to versions
                </Button>
              </div>
            </div>
          )}

          {/* Version Information */}
          <section>
            <h2 className="text-sm font-semibold mb-3">Version information</h2>
            <div className="rounded-lg border bg-primary/5 border-primary/20 px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">
                  Current version
                </span>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {releases.length} releases
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {releases.length > 0
                      ? `Last: ${new Date(releases[0].created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`
                      : "No releases"}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {pendingChanges.length} pending
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1">
                v{currentVersion.major}.{currentVersion.minor}.
                {currentVersion.patch}
              </span>
            </div>
          </section>

          {/* Version type */}
          <section>
            <h2 className="text-sm font-semibold mb-3">Version type</h2>
            <div className="space-y-2">
              {(["major", "minor", "patch"] as const).map((type) => {
                const isSelected = versionType === type;
                const isRecommended = type === recommendedType;
                const from = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;
                const to =
                  type === "major"
                    ? `${currentVersion.major + 1}.0.0`
                    : type === "minor"
                      ? `${currentVersion.major}.${currentVersion.minor + 1}.0`
                      : `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch + 1}`;
                const description =
                  type === "major"
                    ? "Breaking changes that require code updates"
                    : type === "minor"
                      ? "New features and tokens, backward compatible"
                      : "Bug fixes and small corrections";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVersionType(type)}
                    className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary block" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">
                          {type} ({from} → {to})
                        </span>
                        {isRecommended && (
                          <span className="text-xs font-medium text-green-600">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Release message */}
          <section>
            <h2 className="text-sm font-semibold mb-3">Release message</h2>
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="commit-message"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Commit message *
                </label>
                <button
                  type="button"
                  onClick={generateCommitMessage}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Generate
                </button>
              </div>
              <Textarea
                id="commit-message"
                placeholder="Enter a description..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none text-sm"
              />
            </div>
          </section>
        </div>

        {/* Right Panel – Release preview */}
        <div className="w-[420px] shrink-0 border-l flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b shrink-0">
            <h2 className="text-base font-semibold">Release preview</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Release summary */}
            <div className="mx-4 mt-4 rounded-lg border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold">Release summary</h3>
              </div>
              <div className="text-sm">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Version</span>
                  <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5">
                    v{customVersion.major}.{customVersion.minor}.
                    {customVersion.patch}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Type</span>
                  <span
                    className={`text-sm font-medium capitalize ${
                      versionType === "major"
                        ? "text-red-500"
                        : versionType === "minor"
                          ? "text-amber-500"
                          : "text-green-600"
                    }`}
                  >
                    {versionType.charAt(0).toUpperCase() + versionType.slice(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Changes</span>
                  <span className="text-foreground">
                    {pendingChanges.length} tokens
                  </span>
                </div>
              </div>
            </div>

            {/* Added / Modified / Deleted column tabs */}
            <div className="mx-4 mt-3 rounded-lg border bg-card overflow-hidden">
              <div className="flex border-b">
                {(["added", "modified", "deleted"] as const).map((key, idx) => {
                  const count =
                    key === "added"
                      ? addedCount
                      : key === "modified"
                        ? modifiedCount
                        : deletedCount;
                  const label =
                    key === "added"
                      ? "Added"
                      : key === "modified"
                        ? "Modified"
                        : "Deleted";
                  const isActive = previewFilter === key;
                  const labelColor =
                    key === "added"
                      ? "text-teal-600"
                      : key === "modified"
                        ? "text-amber-600"
                        : "text-red-500";
                  const borderColor =
                    key === "added"
                      ? "border-b-teal-600"
                      : key === "modified"
                        ? "border-b-amber-600"
                        : "border-b-red-500";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPreviewFilter(key)}
                      className={`flex flex-col items-start px-4 py-2.5 flex-1 border-b-2 transition-colors ${
                        idx > 0 ? "border-l" : ""
                      } ${
                        isActive
                          ? borderColor
                          : "border-b-transparent hover:bg-muted/30"
                      }`}
                    >
                      <span className={`text-xs font-medium ${labelColor}`}>
                        {label}
                      </span>
                      <span className={`text-xs mt-0.5 ${labelColor}`}>
                        {count === 1 ? "1 token" : `${count} tokens`}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Token table */}
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-card border-b">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Value
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-muted-foreground">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingChanges
                    .filter((c) => {
                      if (previewFilter === "added")
                        return c.type === "created";
                      if (previewFilter === "modified")
                        return c.type === "modified";
                      return c.type === "deleted";
                    })
                    .map((change) => {
                      const raw =
                        previewFilter === "deleted"
                          ? change.beforeValue
                          : change.afterValue;
                      const displayValue = formatValue(raw);
                      const refHex =
                        typeof displayValue === "string" &&
                        /^#[0-9A-Fa-f]{3,8}$/.test(displayValue)
                          ? displayValue
                          : null;
                      return (
                        <tr
                          key={change.id}
                          className="border-b hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-foreground">
                            {change.tokenName}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {displayValue}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-5 w-5 shrink-0 rounded border border-border"
                                style={{
                                  backgroundColor: refHex || displayValue,
                                }}
                              />
                              <span className="text-foreground">
                                {refHex || displayValue}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {pendingChanges.filter((c) => {
                if (previewFilter === "added") return c.type === "created";
                if (previewFilter === "modified") return c.type === "modified";
                return c.type === "deleted";
              }).length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No {previewFilter} tokens
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
