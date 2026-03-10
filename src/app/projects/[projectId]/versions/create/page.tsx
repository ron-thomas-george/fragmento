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

  const pushToGitHub = async (tokensData: any) => {
    try {
      const supabase = createSupabaseBrowserClient();

      // Get GitHub integration settings
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

      // First, verify repository access
      const repoUrl = `https://api.github.com/repos/${repository_owner}/${repository_name}`;
      const repoResponse = await fetch(repoUrl, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!repoResponse.ok) {
        const repoError = await repoResponse.json();
        if (repoResponse.status === 404) {
          throw new Error(
            `Repository ${repository_owner}/${repository_name} not found or not accessible. Please check the repository name and ensure your token has access.`,
          );
        } else if (repoResponse.status === 403) {
          throw new Error(
            `Access denied to repository ${repository_owner}/${repository_name}. Please ensure your personal access token has 'Contents' write permissions.`,
          );
        }
        throw new Error(
          `Repository access error: ${repoError.message || "Unknown error"}`,
        );
      }

      const repoData = await repoResponse.json();

      // Check if we have push access
      if (!repoData.permissions?.push) {
        throw new Error(
          `No write access to repository ${repository_owner}/${repository_name}. Please ensure your personal access token has 'Contents' write permissions and you have push access to the repository.`,
        );
      }

      // GitHub API endpoint for creating/updating files
      const apiUrl = `https://api.github.com/repos/${repository_owner}/${repository_name}/contents/tokens.json`;

      // Function to get latest commit SHA from branch
      const getLatestCommitSha = async (): Promise<string | null> => {
        try {
          const branchUrl = `https://api.github.com/repos/${repository_owner}/${repository_name}/branches/${branch_name || "main"}`;
          const branchResponse = await fetch(branchUrl, {
            headers: {
              Authorization: `Bearer ${access_token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });

          if (branchResponse.ok) {
            const branchData = await branchResponse.json();
            console.log("Latest commit SHA:", branchData.commit.sha);
            return branchData.commit.sha;
          }
          return null;
        } catch (error) {
          console.log("Could not get latest commit SHA:", error);
          return null;
        }
      };

      // Function to get current file SHA and content with fallback methods
      const getCurrentFileInfo = async (): Promise<{
        sha: string | null;
        content: string | null;
      }> => {
        try {
          // Method 1: Try the standard contents API
          const getResponse = await fetch(
            apiUrl + `?ref=${branch_name || "main"}&_=${Date.now()}`,
            {
              headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            },
          );

          if (getResponse.ok) {
            const fileData = await getResponse.json();
            console.log("File exists - Full file data:", fileData);
            console.log("Current file SHA:", fileData.sha);
            console.log("File size:", fileData.size);
            // Decode the base64 content to compare
            const currentContent = fileData.content
              ? atob(fileData.content.replace(/\s/g, ""))
              : null;
            return { sha: fileData.sha, content: currentContent };
          } else if (getResponse.status === 404) {
            // File doesn't exist yet
            console.log("File does not exist (404), will create new file");
            return { sha: null, content: null };
          } else {
            const fileError = await getResponse.json();
            console.log("Error fetching file info:", fileError);

            // Method 2: If contents API fails, try to get file info from tree
            console.log("Trying alternative method to get file SHA...");
            const latestCommit = await getLatestCommitSha();
            if (latestCommit) {
              const treeUrl = `https://api.github.com/repos/${repository_owner}/${repository_name}/git/trees/${latestCommit}?recursive=1`;
              const treeResponse = await fetch(treeUrl, {
                headers: {
                  Authorization: `Bearer ${access_token}`,
                  Accept: "application/vnd.github+json",
                  "X-GitHub-Api-Version": "2022-11-28",
                },
              });

              if (treeResponse.ok) {
                const treeData = await treeResponse.json();
                const tokenFile = treeData.tree.find(
                  (item: any) => item.path === "tokens.json",
                );
                if (tokenFile) {
                  console.log("Found file in tree with SHA:", tokenFile.sha);
                  return { sha: tokenFile.sha, content: null };
                }
              }
            }

            throw new Error(
              `Error checking existing file: ${fileError.message}`,
            );
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Error checking existing file")
          ) {
            throw error;
          }
          // File doesn't exist yet, that's okay
          console.log("File does not exist yet, will create new file");
          return { sha: null, content: null };
        }
      };

      // Function to attempt file update with retry logic
      const updateFileWithRetry = async (maxRetries = 5): Promise<any> => {
        console.log(
          `Starting updateFileWithRetry with maxRetries=${maxRetries}`,
        );
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          console.log(`=== Starting attempt ${attempt}/${maxRetries} ===`);
          try {
            // Add a longer delay before fetching SHA to avoid race conditions
            if (attempt > 1) {
              console.log(`Waiting before attempt ${attempt}...`);
              await new Promise((resolve) =>
                setTimeout(resolve, 3000 + attempt * 1000),
              ); // Increasing delay: 4s, 5s, 6s...
            }

            // Get fresh SHA and content for each attempt
            const fileInfo = await getCurrentFileInfo();
            let fileSha = fileInfo.sha;
            const latestCommitSha = await getLatestCommitSha();
            console.log(`Attempt ${attempt}: File SHA:`, fileSha);
            console.log(
              `Attempt ${attempt}: Latest commit SHA:`,
              latestCommitSha,
            );
            console.log(
              `Attempt ${attempt}: Current content length:`,
              fileInfo.content?.length || 0,
            );

            // If we don't have a file SHA but this is a 422 error, the file likely exists
            // Let's try a brute force approach: delete any existing file first
            if (!fileSha && attempt === 1) {
              console.log(
                "No SHA found but GitHub might expect one. Trying brute force delete first...",
              );

              try {
                // Try to delete the file using a wildcard approach
                // First, let's try to get ALL files and find tokens.json
                const contentsUrl = `https://api.github.com/repos/${repository_owner}/${repository_name}/contents?ref=${branch_name || "main"}`;
                const contentsResponse = await fetch(contentsUrl, {
                  headers: {
                    Authorization: `Bearer ${access_token}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                  },
                });

                if (contentsResponse.ok) {
                  const contents = await contentsResponse.json();
                  const tokensFile = contents.find(
                    (file: any) => file.name === "tokens.json",
                  );
                  if (tokensFile) {
                    console.log(
                      "Found tokens.json in directory listing with SHA:",
                      tokensFile.sha,
                    );
                    // Update our fileSha with the found SHA
                    fileSha = tokensFile.sha;
                  }
                }
              } catch (error) {
                console.log("Could not get directory listing:", error);
              }
            }

            const fileContent = JSON.stringify(tokensData, null, 2);

            // Check if content is actually different
            if (fileInfo.content && fileInfo.content === fileContent) {
              console.log(
                "Content is identical to existing file, skipping update",
              );
              return { message: "No changes needed - content is identical" };
            }

            const encodedContent = btoa(
              unescape(encodeURIComponent(fileContent)),
            );

            const payload: any = {
              message: commitMessage,
              content: encodedContent,
              branch: branch_name || "main",
            };

            if (fileSha) {
              payload.sha = fileSha;
              console.log(`Including SHA in payload: ${fileSha}`);
            } else {
              console.log("No SHA - creating new file");
            }

            console.log(
              "Payload being sent:",
              JSON.stringify(payload, null, 2),
            );

            const response = await fetch(apiUrl, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${access_token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              return await response.json();
            }

            const errorData = await response.json();
            console.log(
              `GitHub API error on attempt ${attempt}:`,
              response.status,
              errorData,
            );

            // If it's a SHA mismatch (409 conflict) and we have more retries, try a different approach
            if (response.status === 409 && attempt < maxRetries) {
              console.log(
                `SHA conflict detected on attempt ${attempt}/${maxRetries}, trying delete-and-recreate approach...`,
              );

              // Try delete and recreate approach
              if (fileSha) {
                try {
                  console.log("Attempting to delete existing file first...");
                  const deleteResponse = await fetch(apiUrl, {
                    method: "DELETE",
                    headers: {
                      Authorization: `Bearer ${access_token}`,
                      Accept: "application/vnd.github+json",
                      "X-GitHub-Api-Version": "2022-11-28",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      message: `Delete tokens.json before recreating (Release: ${commitMessage})`,
                      sha: fileSha,
                      branch: branch_name || "main",
                    }),
                  });

                  if (deleteResponse.ok) {
                    console.log(
                      "File deleted successfully, now creating new file...",
                    );
                    // Wait a moment for the deletion to propagate
                    await new Promise((resolve) => setTimeout(resolve, 2000));

                    // Create new file without SHA
                    const createPayload = {
                      message: commitMessage,
                      content: encodedContent,
                      branch: branch_name || "main",
                    };

                    const createResponse = await fetch(apiUrl, {
                      method: "PUT",
                      headers: {
                        Authorization: `Bearer ${access_token}`,
                        Accept: "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28",
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(createPayload),
                    });

                    if (createResponse.ok) {
                      console.log("File recreated successfully!");
                      return await createResponse.json();
                    } else {
                      console.log(
                        "Failed to recreate file:",
                        await createResponse.text(),
                      );
                    }
                  } else {
                    console.log(
                      "Failed to delete file:",
                      await deleteResponse.text(),
                    );
                  }
                } catch (deleteError) {
                  console.log(
                    "Delete-and-recreate approach failed:",
                    deleteError,
                  );
                }
              }

              console.log("Falling back to normal retry...");
              continue; // Fall back to normal retry
            }

            console.log(
              `Not retrying: status=${response.status}, attempt=${attempt}, maxRetries=${maxRetries}`,
            );

            // Handle other errors (only reached if not a retryable 409 error)
            if (response.status === 404) {
              throw new Error(
                `Repository or file path not found. Please check the repository name and ensure your token has access.`,
              );
            } else if (response.status === 403) {
              throw new Error(
                `Access denied. Please ensure your personal access token has 'Contents' write permissions.`,
              );
            } else if (response.status === 422) {
              console.log("422 Error details:", errorData);
              console.log("File SHA was:", fileSha);
              console.log("Payload sent:", payload);
              throw new Error(
                `Invalid request: ${errorData.message}. Please check your repository settings.`,
              );
            } else if (response.status === 409) {
              throw new Error(
                `SHA conflict: File was modified during release. All retry attempts exhausted. ${errorData.message}`,
              );
            }

            throw new Error(
              `GitHub API error (${response.status}): ${errorData.message}`,
            );
          } catch (error) {
            if (attempt === maxRetries) {
              throw error;
            }
            console.log(`Attempt ${attempt} failed, retrying...`, error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        throw new Error("Failed to update file after maximum retries");
      };

      // The retry function already handles the response and returns the parsed JSON
      return await updateFileWithRetry();
    } catch (error) {
      console.error("Error pushing to GitHub:", error);
      throw error;
    }
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

      // Push tokens to GitHub
      await pushToGitHub(tokensData);

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

      // Navigate back to versions page
      router.push(`/projects/${projectId}/versions`);
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
