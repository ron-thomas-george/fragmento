"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Palette,
  AlertCircle,
  Clock,
  User,
  GitBranch,
  MessageSquare,
  Download,
  MoreHorizontal,
  Sparkles,
  Package,
  Filter,
  X,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface Change {
  id: string;
  type: "created" | "modified" | "deleted" | "renamed";
  tokenName: string;
  tokenSet: string;
  tokenType?: string;
  source: "web_app" | "figma";
  beforeValue?: any;
  afterValue?: any;
  description?: string;
  createdBy: string;
  createdAt: string;
  impactCount?: number;
  affectedTokens?: string[];
}

interface Release {
  id: string;
  version: string;
  versionType: "major" | "minor" | "patch";
  commitMessage: string;
  publishedBy: string;
  publishedAt: string;
  changesCount: number;
  webAppChanges: number;
  figmaChanges: number;
  githubPrUrl?: string;
  githubPrNumber?: number;
  slackNotified: boolean;
}

interface VersionsPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function VersionsPage({ params }: VersionsPageProps) {
  const { projectId } = use(params);
  const router = useRouter();

  // State
  const [pendingChanges, setPendingChanges] = useState<Change[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Pending Changes
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");

  // Filters for Release History
  const [releaseTypeFilter, setReleaseTypeFilter] = useState("all");
  const [releaseSearchTerm, setReleaseSearchTerm] = useState("");

  // Release details (inline right panel)
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [releaseTokens, setReleaseTokens] = useState<any[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [releaseDetailFilter, setReleaseDetailFilter] = useState<
    "added" | "modified" | "deleted"
  >("added");

  // Discard dialogs
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardAllDialogOpen, setDiscardAllDialogOpen] = useState(false);
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [discardingChange, setDiscardingChange] = useState(false);
  const [discardingAll, setDiscardingAll] = useState(false);

  // Load real data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        console.log("Loading data for project:", projectId);

        // Load pending changes - only unreleased changes
        const { data: changesData, error: changesError } = await supabase
          .from("changes")
          .select(
            `
            id,
            change_type,
            source,
            before,
            after,
            created_at,
            created_by,
            token_id
          `,
          )
          .eq("project_id", projectId)
          .is("released_in", null)
          .order("created_at", { ascending: false });

        console.log("Raw changes data:", changesData);

        console.log("Changes query result:", { changesData, changesError });

        if (changesError) {
          console.error("Error loading changes:", changesError);
        } else if (changesData && changesData.length > 0) {
          // Separate deleted tokens from other changes
          const deletedChanges = changesData.filter(
            (change) => change.change_type === "deleted",
          );
          const nonDeletedChanges = changesData.filter(
            (change) => change.change_type !== "deleted",
          );

          console.log("Deleted changes:", deletedChanges);
          console.log("Non-deleted changes:", nonDeletedChanges);

          // Get token details for non-deleted changes only
          const tokenIds = nonDeletedChanges
            .map((change) => change.token_id)
            .filter(Boolean);
          console.log("Token IDs to fetch:", tokenIds);

          let tokensData: any[] = [];
          if (tokenIds.length > 0) {
            const { data: fetchedTokensData, error: tokensError } =
              await supabase
                .from("tokens")
                .select(
                  `
                id,
                name,
                type,
                description,
                token_sets!inner(
                  name
                )
              `,
                )
                .in("id", tokenIds);

            console.log(
              "Tokens data:",
              fetchedTokensData,
              "Tokens error:",
              tokensError,
            );
            tokensData = fetchedTokensData || [];
          }

          const transformedChanges: Change[] = (changesData || []).map(
            (change: any) => {
              const token = tokensData?.find((t) => t.id === change.token_id);
              const tokenSet = Array.isArray(token?.token_sets)
                ? token.token_sets[0]
                : token?.token_sets;

              // Get token name based on change type
              let tokenName = token?.name;
              let tokenSetName = tokenSet?.name;
              let description = token?.description;

              if (change.change_type === "deleted") {
                // For deleted tokens, get info from before data since token no longer exists
                console.log("Processing deleted token change:", change);
                console.log("Before data:", change.before);
                tokenName = change.before?.name || tokenName;
                description = change.before?.description || description;
                tokenSetName = change.before?.token_set || tokenSetName;
                console.log(
                  "Extracted data - name:",
                  tokenName,
                  "set:",
                  tokenSetName,
                );
              } else if (change.change_type === "created" && !tokenName) {
                // For created tokens, get name from after data if token is not found
                tokenName = change.after?.name;
                description = change.after?.description;
              }

              return {
                id: change.id,
                type: change.change_type as
                  | "created"
                  | "modified"
                  | "deleted"
                  | "renamed",
                tokenName: tokenName || "Unknown Token",
                tokenSet: tokenSetName || "Unknown Set",
                tokenType: token?.type,
                source: change.source as "web_app" | "figma",
                beforeValue: change.before,
                afterValue: change.after,
                description: description,
                createdBy: change.created_by || "Unknown User",
                createdAt: change.created_at,
                impactCount: 0, // TODO: Calculate impact
                affectedTokens: [], // TODO: Calculate affected tokens
              };
            },
          );
          console.log("Transformed changes:", transformedChanges);
          setPendingChanges(transformedChanges);
        } else {
          console.log("No changes found");
          setPendingChanges([]);
        }

        // Load releases
        const { data: releasesData, error: releasesError } = await supabase
          .from("releases")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        if (releasesError) {
          console.error("Error loading releases:", releasesError);
        } else {
          const transformedReleases: Release[] = (releasesData || []).map(
            (release) => ({
              id: release.id,
              version: release.version,
              versionType: release.type as "major" | "minor" | "patch",
              commitMessage: release.commit_message,
              publishedBy: release.created_by || "Unknown User",
              publishedAt: release.created_at,
              changesCount: release.changes_count || 0,
              webAppChanges: 0, // TODO: Calculate from changes
              figmaChanges: 0, // TODO: Calculate from changes
              githubPrUrl: undefined, // TODO: Get from GitHub integration
              githubPrNumber: undefined, // TODO: Get from GitHub integration
              slackNotified: false, // TODO: Get from Slack integration
            }),
          );
          setReleases(transformedReleases);
        }

        // Don't create artificial changes - only show real pending changes

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  // Auto-select first release when releases load
  useEffect(() => {
    if (releases.length > 0 && !selectedRelease) {
      loadReleaseTokens(releases[0]);
    }
  }, [releases.length, selectedRelease?.id]);

  // Download release tokens as JSON
  const downloadReleaseJSON = async (release: Release) => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Get all tokens that were included in this release
      const { data: releaseChanges } = await supabase
        .from("changes")
        .select(
          `
          id,
          change_type,
          token_id,
          after,
          before,
          tokens!inner(
            id,
            name,
            type,
            value,
            resolved_value,
            description,
            token_sets!inner(name)
          )
        `,
        )
        .eq("released_in", release.id)
        .order("created_at", { ascending: false });

      if (!releaseChanges || releaseChanges.length === 0) {
        console.warn("No tokens found for this release");
        return;
      }

      // Transform the data into a structured JSON format
      const tokensBySet: Record<string, any> = {};

      releaseChanges.forEach((change) => {
        const token = change.tokens as any;
        const setName = (token.token_sets as any)?.name || "global";

        if (!tokensBySet[setName]) {
          tokensBySet[setName] = {};
        }

        // Use the final value (after change) for the JSON
        const finalValue =
          change.change_type === "deleted"
            ? null
            : token.resolved_value || token.value;

        if (change.change_type !== "deleted") {
          tokensBySet[setName][token.name] = {
            value: finalValue,
            type: token.type,
            description: token.description || undefined,
          };
        }
      });

      // Create the final JSON structure
      const jsonData = {
        version: release.version,
        releaseDate: release.publishedAt,
        commitMessage: release.commitMessage,
        tokens: tokensBySet,
        metadata: {
          totalChanges: release.changesCount,
          releaseType: release.versionType,
          generatedAt: new Date().toISOString(),
        },
      };

      // Create and download the file
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `tokens-${release.version.replace("v", "")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading release JSON:", error);
    }
  };

  // Generate GitHub PR URL for a release
  const getGitHubPRUrl = async (release: Release) => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Get GitHub integration settings
      const { data: githubConfig } = await supabase
        .from("github_integrations")
        .select("repository_owner, repository_name")
        .eq("project_id", projectId)
        .single();

      if (!githubConfig) {
        console.warn("No GitHub integration found for this project");
        return null;
      }

      const { repository_owner, repository_name } = githubConfig;

      // For now, we'll link to the commits page with the release version as search
      // In a real implementation, you'd store the actual PR URL when creating the release
      const githubUrl = `https://github.com/${repository_owner}/${repository_name}/commits?q=${encodeURIComponent(release.commitMessage)}`;

      return githubUrl;
    } catch (error) {
      console.error("Error generating GitHub URL:", error);
      return null;
    }
  };

  // Open GitHub PR in new tab
  const openGitHubPR = async (release: Release) => {
    const url = await getGitHubPRUrl(release);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      console.warn("Could not generate GitHub URL for this release");
    }
  };

  // Load tokens for a specific release
  const loadReleaseTokens = async (release: Release) => {
    setLoadingTokens(true);
    setSelectedRelease(release);
    setReleaseDetailFilter("added");

    try {
      const supabase = createSupabaseBrowserClient();

      // Get all changes that were included in this release
      const { data: releaseChanges } = await supabase
        .from("changes")
        .select(
          `
          id,
          change_type,
          token_id,
          after,
          before,
          tokens!inner(
            id,
            name,
            type,
            value,
            resolved_value,
            description,
            token_sets!inner(name)
          )
        `,
        )
        .eq("released_in", release.id)
        .order("created_at", { ascending: false });

      if (releaseChanges) {
        // Transform the data to show what tokens were pushed
        const tokensData = releaseChanges.map((change) => {
          const token = change.tokens as any;
          return {
            id: token.id,
            name: token.name,
            type: token.type,
            value: token.resolved_value || token.value,
            description: token.description,
            tokenSet: (token.token_sets as any)?.name || "Unknown",
            changeType: change.change_type,
            beforeValue: change.before,
            afterValue: change.after,
          };
        });

        setReleaseTokens(tokensData);
      }
    } catch (error) {
      console.error("Error loading release tokens:", error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Filter pending changes
  const filteredPendingChanges = pendingChanges.filter((change) => {
    // Source filter
    if (sourceFilter !== "all" && change.source !== sourceFilter) {
      return false;
    }

    // Type filter
    if (typeFilter !== "all" && change.type !== typeFilter) {
      return false;
    }

    // Search filter
    if (pendingSearchTerm.trim()) {
      const searchLower = pendingSearchTerm.toLowerCase();
      return (
        change.tokenName.toLowerCase().includes(searchLower) ||
        change.tokenSet.toLowerCase().includes(searchLower) ||
        (change.afterValue &&
          String(change.afterValue).toLowerCase().includes(searchLower)) ||
        (change.beforeValue &&
          String(change.beforeValue).toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Filter releases
  const filteredReleases = releases.filter((release) => {
    // Type filter
    if (
      releaseTypeFilter !== "all" &&
      release.versionType !== releaseTypeFilter
    ) {
      return false;
    }

    // Search filter
    if (releaseSearchTerm.trim()) {
      const searchLower = releaseSearchTerm.toLowerCase();
      return (
        release.version.toLowerCase().includes(searchLower) ||
        release.commitMessage.toLowerCase().includes(searchLower) ||
        release.publishedBy.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes === 1) return "1 min ago";
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      // Handle JSON values from database
      if (value.value) return value.value;
      return JSON.stringify(value);
    }
    return String(value);
  };

  const getReferenceValue = (change: Change) => {
    const raw =
      change.type === "deleted" ? change.beforeValue : change.afterValue;
    return formatValue(raw);
  };

  const getReferenceHex = (change: Change) => {
    const v = getReferenceValue(change);
    if (typeof v === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(v)) return v;
    if (typeof v === "string" && v.startsWith("rgb")) return v;
    return null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col w-full">
      {/* Header Section */}
      <header className="shrink-0 border-b p-4 w-full">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-base font-medium text-foreground">
            Versions &amp; Releases
          </h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              disabled={pendingChanges.length === 0}
              onClick={() => {
                if (pendingChanges.length === 0) return;
                setDiscardAllDialogOpen(true);
              }}
            >
              Discard changes
            </Button>
            <Button
              size="sm"
              className="h-10"
              disabled={pendingChanges.length === 0}
              onClick={() =>
                router.push(`/projects/${projectId}/versions/create`)
              }
              title={
                pendingChanges.length === 0
                  ? "No pending changes to release"
                  : "Create a new release with pending changes"
              }
            >
              Create release
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col min-h-0 p-4 w-full">
        <Tabs defaultValue="changes" className="flex flex-1 flex-col min-h-0">
          <TabsList className="w-fit shrink-0 mb-2 h-10 rounded-none p-0 bg-transparent gap-1">
            <TabsTrigger
              value="changes"
              className="rounded-lg px-5 py-2.5 text-base font-medium text-[#344054] data-[state=active]:bg-[#EEEBFF] data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent"
            >
              Changes
            </TabsTrigger>
            <TabsTrigger
              value="releases"
              className="rounded-lg px-5 py-2.5 text-base font-medium text-[#344054] data-[state=active]:bg-[#EEEBFF] data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent"
            >
              Releases
            </TabsTrigger>
          </TabsList>
          <div className="border-b border-[#E5E7EB] mb-4 -mx-6" />

          <TabsContent
            value="changes"
            className="flex flex-1 flex-col min-h-0 mt-0"
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium">Pending changes</h2>
                <span className="rounded-full bg-[#EEEBFF] px-3 py-0.5 text-sm font-medium text-primary">
                  {filteredPendingChanges.length} tokens
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-auto h-9">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="web_app">Web App</SelectItem>
                    <SelectItem value="figma">Figma</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-auto h-9">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="created">Added</SelectItem>
                    <SelectItem value="modified">Modified</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="rounded-lg border p-8 text-center shrink-0">
                <div className="animate-spin mx-auto h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
                <p className="text-muted-foreground">Loading changes...</p>
              </div>
            ) : pendingChanges.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center w-full shrink-0">
                <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">All clear</h3>
                <p className="text-muted-foreground mb-4">
                  No pending changes to release
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Changes will appear here when you modify tokens in the app or
                  push updates from Figma.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/projects/${projectId}/tokens`)}
                  >
                    Create token
                  </Button>
                  <Button variant="outline" size="sm">
                    Push from Figma
                  </Button>
                </div>
              </div>
            ) : filteredPendingChanges.length === 0 ? (
              <div className="rounded-lg border p-8 text-center w-full shrink-0">
                <Filter className="mx-auto h-8 w-8 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No changes found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No changes match your current filters
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSourceFilter("all");
                    setTypeFilter("all");
                    setPendingSearchTerm("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border bg-card w-full flex-1 min-h-0 overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-[#E5E7EB]"
                          aria-label="Select all"
                        />
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Name
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Value
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Reference
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Set
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Source
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Change
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500">
                        Time
                      </th>
                      <th className="px-4 py-3 w-12 text-right text-xs font-medium text-gray-500">
                        {" "}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingChanges.map((change) => {
                      const refVal = getReferenceValue(change);
                      const refHex = getReferenceHex(change);
                      const displayValue =
                        change.type === "deleted"
                          ? formatValue(change.beforeValue)
                          : formatValue(change.afterValue);
                      // Split token name: if starts with --, show -- prefix dimmed + rest
                      const rawName = change.tokenName ?? "";
                      const hasDash = rawName.startsWith("--");
                      const namePrimary = hasDash ? rawName.slice(2) : rawName;
                      return (
                        <tr
                          key={change.id}
                          className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-[#E5E7EB]"
                            />
                          </td>
                          {/* Name: two-line */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              {hasDash && (
                                <span className="text-xs text-gray-400 font-mono leading-tight">
                                  --
                                </span>
                              )}
                              <span className="text-sm font-medium text-gray-800 leading-snug">
                                {namePrimary}
                              </span>
                            </div>
                          </td>
                          {/* Value pill */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-0.5 text-xs text-gray-700 max-w-[140px] truncate">
                              {displayValue}
                            </span>
                          </td>
                          {/* Reference: swatch + hex */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {(refHex ||
                                (change.tokenType === "color" && refVal)) && (
                                <div
                                  className="h-5 w-5 shrink-0 rounded border border-[#E5E7EB]"
                                  style={{
                                    backgroundColor:
                                      refHex ||
                                      (typeof refVal === "string"
                                        ? refVal
                                        : "#ccc"),
                                  }}
                                />
                              )}
                              <span
                                className="text-xs text-gray-600 truncate max-w-[100px]"
                                title={refVal}
                              >
                                {refVal}
                              </span>
                            </div>
                          </td>
                          {/* Set */}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {change.tokenSet}
                          </td>
                          {/* Source */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-sm">
                              {change.source === "web_app" && (
                                <>
                                  <Globe className="h-4 w-4 text-blue-500" />
                                  <span className="text-gray-700">Web App</span>
                                </>
                              )}
                              {change.source === "figma" && (
                                <>
                                  <Palette className="h-4 w-4 text-purple-500" />
                                  <span className="text-gray-700">Figma</span>
                                </>
                              )}
                            </div>
                          </td>
                          {/* Change type — pill badge */}
                          <td className="px-4 py-3 text-sm">
                            {change.type === "modified" && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                Modified
                              </span>
                            )}
                            {change.type === "created" && (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                Added
                              </span>
                            )}
                            {change.type === "deleted" && (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                                Deleted
                              </span>
                            )}
                          </td>
                          {/* Time */}
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {getRelativeTime(change.createdAt)} by{" "}
                            {change.createdBy}
                          </td>
                          {/* Delete */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-400 hover:text-destructive"
                              onClick={() => {
                                setSelectedChange(change);
                                setDiscardDialogOpen(true);
                              }}
                              aria-label={`Discard change for ${change.tokenName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="releases"
            className="flex flex-1 flex-col min-h-0 mt-0"
          >
            {releases.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="font-medium">No releases yet</p>
                <p className="text-sm mt-1">
                  Create your first release from the Changes tab.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 gap-6">
                {/* Left: Version timeline */}
                <aside className="flex-1 flex flex-col overflow-y-auto">
                  <div className="relative">
                    {/* Vertical connecting line — centered under the 76px badge */}
                    <div
                      className="absolute left-[25px] top-[13px] bottom-0 w-px bg-border"
                      aria-hidden
                    />
                    <div className="space-y-0">
                      {[...releases].reverse().map((release) => {
                        const isSelected = selectedRelease?.id === release.id;
                        return (
                          <button
                            key={release.id}
                            type="button"
                            onClick={() => loadReleaseTokens(release)}
                            className="relative flex items-start gap-3 text-left w-full pb-6 last:pb-2 group"
                          >
                            {/* Version badge chip */}
                            <span
                              className={`relative z-10 shrink-0 inline-flex items-center justify-center rounded-full text-xs font-semibold w-[50px] py-1 transition-colors ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted/60 text-muted-foreground border border-border group-hover:border-muted-foreground/30"
                              }`}
                            >
                              {release.version}
                            </span>
                            <div className="flex flex-col pt-0.5 min-w-0">
                              <span className="text-sm font-normal leading-snug truncate text-[#101828]">
                                {release.commitMessage}
                              </span>
                              <span className="text-sm font-normal text-[#667085] mt-0.5">
                                {release.publishedBy} ·{" "}
                                {getRelativeTime(release.publishedAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </aside>

                {/* Right: Release details */}
                <div className="w-1/2 shrink-0 flex flex-col border rounded-lg bg-card overflow-hidden">
                  {!selectedRelease ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
                      Select a release from the timeline
                    </div>
                  ) : loadingTokens ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : (
                    <>
                      {/* Release details header */}
                      <div className="px-4 pt-4 pb-0">
                        <h2 className="text-base font-semibold text-foreground mb-3">
                          Release details
                        </h2>
                      </div>
                      {/* Column-style tab filter */}
                      <div className="flex border-y">
                        {(["added", "modified", "deleted"] as const).map(
                          (key, idx) => {
                            const changeTypeForFilter =
                              key === "added" ? "created" : key;
                            const count = releaseTokens.filter(
                              (t) => t.changeType === changeTypeForFilter,
                            ).length;
                            const label =
                              key === "added"
                                ? "Added"
                                : key === "modified"
                                  ? "Modified"
                                  : "Deleted";
                            const isActive = releaseDetailFilter === key;
                            const labelColor =
                              key === "added"
                                ? "text-teal-600 dark:text-teal-400"
                                : key === "modified"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-red-500 dark:text-red-400";
                            const activeBorderColor =
                              key === "added"
                                ? "border-b-teal-600 dark:border-b-teal-400"
                                : key === "modified"
                                  ? "border-b-amber-600 dark:border-b-amber-400"
                                  : "border-b-red-500 dark:border-b-red-400";
                            const countLabel =
                              count === 1 ? "1 token" : `${count} tokens`;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setReleaseDetailFilter(key)}
                                className={`flex flex-col items-start h-[118px] w-[203px] px-6 pt-7 flex-1 min-w-0 ${
                                  idx > 0 ? "border-l" : ""
                                } border-b-2 transition-colors ${
                                  isActive
                                    ? activeBorderColor
                                    : "border-b-transparent hover:bg-muted/30"
                                }`}
                              >
                                <span className="text-[16px] font-medium text-slate-500">
                                  {label}
                                </span>
                                <span
                                  className={`text-xs mt-5 font-medium ${labelColor}`}
                                >
                                  {countLabel}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                      {/* Token table */}
                      <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead className="sticky top-0 z-10 bg-card border-b">
                            <tr>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                Name
                              </th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                Value
                              </th>
                              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                                Reference
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {releaseTokens
                              .filter(
                                (t) =>
                                  t.changeType ===
                                  (releaseDetailFilter === "added"
                                    ? "created"
                                    : releaseDetailFilter),
                              )
                              .map((token) => {
                                const displayValue =
                                  typeof token.value === "object" &&
                                  token.value?.value != null
                                    ? token.value.value
                                    : typeof token.value === "string"
                                      ? token.value
                                      : JSON.stringify(token.value ?? "");
                                const refHex =
                                  typeof displayValue === "string" &&
                                  /^#[0-9A-Fa-f]{3,8}$/.test(displayValue)
                                    ? displayValue
                                    : null;
                                return (
                                  <tr
                                    key={token.id}
                                    className="border-b hover:bg-muted/20 transition-colors"
                                  >
                                    <td className="px-4 py-3.5 text-sm text-foreground">
                                      {token.name}
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-muted-foreground">
                                      {displayValue}
                                    </td>
                                    <td className="px-4 py-3.5 text-sm">
                                      <div className="flex items-center gap-2.5">
                                        {token.type === "color" && (
                                          <div
                                            className="h-5 w-5 shrink-0 rounded border border-border shadow-sm"
                                            style={{
                                              backgroundColor:
                                                refHex ||
                                                (typeof displayValue ===
                                                "string"
                                                  ? displayValue
                                                  : "#ccc"),
                                            }}
                                          />
                                        )}
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
                        {releaseTokens.filter(
                          (t) =>
                            t.changeType ===
                            (releaseDetailFilter === "added"
                              ? "created"
                              : releaseDetailFilter),
                        ).length === 0 && (
                          <div className="p-8 text-center text-sm text-muted-foreground">
                            No {releaseDetailFilter} tokens in this release
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t flex items-center justify-end gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            selectedRelease &&
                            downloadReleaseJSON(selectedRelease)
                          }
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download JSON
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            selectedRelease && openGitHubPR(selectedRelease)
                          }
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on GitHub
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Discard single change dialog */}
      <Dialog
        open={discardDialogOpen}
        onOpenChange={(open) => {
          setDiscardDialogOpen(open);
          if (!open) {
            setSelectedChange(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this change?</DialogTitle>
            <DialogDescription>
              This will remove{" "}
              <span className="font-medium">{selectedChange?.tokenName}</span>{" "}
              from the pending changes list. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDiscardDialogOpen(false)}
              disabled={discardingChange}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedChange) return;
                setDiscardingChange(true);
                try {
                  const supabase = createSupabaseBrowserClient();
                  const { error } = await supabase
                    .from("changes")
                    .delete()
                    .eq("id", selectedChange.id);

                  if (error) {
                    console.error("Error discarding change:", error);
                  } else {
                    setPendingChanges((prev) =>
                      prev.filter((change) => change.id !== selectedChange.id),
                    );
                    setDiscardDialogOpen(false);
                    setSelectedChange(null);
                  }
                } catch (error) {
                  console.error("Unexpected error discarding change:", error);
                } finally {
                  setDiscardingChange(false);
                }
              }}
              disabled={discardingChange}
            >
              {discardingChange ? "Discarding…" : "Discard change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard all changes dialog */}
      <Dialog
        open={discardAllDialogOpen}
        onOpenChange={setDiscardAllDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard all pending changes?</DialogTitle>
            <DialogDescription>
              This will remove all pending tokens for this project. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDiscardAllDialogOpen(false)}
              disabled={discardingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setDiscardingAll(true);
                try {
                  const supabase = createSupabaseBrowserClient();
                  const { error } = await supabase
                    .from("changes")
                    .delete()
                    .eq("project_id", projectId)
                    .is("released_in", null);

                  if (error) {
                    console.error("Error discarding all changes:", error);
                  } else {
                    setPendingChanges([]);
                    setDiscardAllDialogOpen(false);
                  }
                } catch (error) {
                  console.error(
                    "Unexpected error discarding all changes:",
                    error,
                  );
                } finally {
                  setDiscardingAll(false);
                }
              }}
              disabled={discardingAll}
            >
              {discardingAll ? "Discarding…" : "Discard all changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
