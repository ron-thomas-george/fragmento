"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Github, Slack, Loader2, X, Info } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

interface IntegrationsPageProps {
  params: Promise<{ projectId: string }>;
}

interface GitHubIntegration {
  id: string;
  project_id: string;
  access_token: string;
  repository_owner: string;
  repository_name: string;
  branch_name: string;
  verified: boolean;
  created_by: string | null;
  created_at: string;
  creator_name?: string | null;
}

interface SlackIntegration {
  id: string;
  project_id: string;
  webhook_url: string;
  channel_name: string;
  verified: boolean;
  created_by: string | null;
  created_at: string;
  creator_name?: string | null;
}

export default function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { projectId } = use(params);

  const [githubRepos, setGithubRepos] = useState<GitHubIntegration[]>([]);
  const [slackChannels, setSlackChannels] = useState<SlackIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  // GitHub modal
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubForm, setGithubForm] = useState({
    access_token: "",
    repository_owner: "",
    repository_name: "",
    branch_name: "main",
  });
  const [githubVerifying, setGithubVerifying] = useState(false);
  const [githubError, setGithubError] = useState("");

  // Slack modal
  const [slackModalOpen, setSlackModalOpen] = useState(false);
  const [editingSlackId, setEditingSlackId] = useState<string | null>(null);
  const [slackForm, setSlackForm] = useState({
    webhook_url: "",
    channel_name: "",
  });
  const [slackVerifying, setSlackVerifying] = useState(false);
  const [slackError, setSlackError] = useState("");

  const loadIntegrations = async () => {
    try {
      const supabase = createSupabaseBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setCurrentUserName(
          profile?.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "You",
        );
      }

      const { data: githubData } = await supabase
        .from("github_integrations")
        .select(
          "id, project_id, repository_owner, repository_name, branch_name, verified, created_by, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const repoIds = (githubData || [])
        .map((r) => r.created_by)
        .filter(Boolean) as string[];
      const creatorNames: Record<string, string> = {};
      if (repoIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...new Set(repoIds)]);
        profiles?.forEach((p) => {
          creatorNames[p.id] = p.full_name || "User";
        });
      }

      setGithubRepos(
        (githubData || []).map((r) => ({
          ...r,
          access_token: "", // never expose stored token
          creator_name: r.created_by
            ? (creatorNames[r.created_by] ?? "User")
            : null,
        })) as GitHubIntegration[],
      );

      const { data: slackData } = await supabase
        .from("slack_integrations")
        .select(
          "id, project_id, webhook_url, channel_name, verified, created_by, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      const slackCreatorIds = (slackData || [])
        .map((s) => s.created_by)
        .filter(Boolean) as string[];
      const slackCreatorNames: Record<string, string> = {};
      if (slackCreatorIds.length > 0) {
        const { data: slackProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...new Set(slackCreatorIds)]);
        slackProfiles?.forEach((p) => {
          slackCreatorNames[p.id] = p.full_name || "User";
        });
      }

      setSlackChannels(
        (slackData || []).map((s) => ({
          ...s,
          creator_name: s.created_by
            ? (slackCreatorNames[s.created_by] ?? "User")
            : null,
        })) as SlackIntegration[],
      );
    } catch (error) {
      console.error("Error loading integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [projectId]);

  const openGithubModal = () => {
    setGithubError("");
    setGithubForm({
      access_token: "",
      repository_owner: "",
      repository_name: "",
      branch_name: "main",
    });
    setGithubModalOpen(true);
  };

  const openSlackModal = (edit?: SlackIntegration) => {
    setSlackError("");
    if (edit) {
      setEditingSlackId(edit.id);
      setSlackForm({
        webhook_url: edit.webhook_url,
        channel_name: edit.channel_name,
      });
    } else {
      setEditingSlackId(null);
      setSlackForm({ webhook_url: "", channel_name: "" });
    }
    setSlackModalOpen(true);
  };

  const verifyAndSaveGitHub = async () => {
    setGithubVerifying(true);
    setGithubError("");
    const { access_token, repository_owner, repository_name, branch_name } =
      githubForm;
    try {
      const repoResponse = await fetch(
        `https://api.github.com/repos/${repository_owner}/${repository_name}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (!repoResponse.ok) {
        const repoError = await repoResponse.json();
        if (repoResponse.status === 404) {
          throw new Error(
            "Repository not found. Please check the repository owner and name.",
          );
        }
        if (repoResponse.status === 403) {
          throw new Error(
            "Access denied. Please ensure your token has Contents (write) and push access to the repository.",
          );
        }
        throw new Error(repoError.message || "Repository access error");
      }
      const repoData = await repoResponse.json();
      if (!repoData.permissions?.push) {
        throw new Error(
          "Insufficient permissions. Your token needs Contents (write) permission and push access to the repository.",
        );
      }
      const branchResponse = await fetch(
        `https://api.github.com/repos/${repository_owner}/${repository_name}/branches/${branch_name}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (!branchResponse.ok) {
        throw new Error(`Branch "${branch_name}" not found in repository.`);
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("github_integrations").insert({
        project_id: projectId,
        access_token,
        repository_owner,
        repository_name,
        branch_name,
        verified: true,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      setGithubModalOpen(false);
      loadIntegrations();
    } catch (err: unknown) {
      setGithubError(
        err instanceof Error ? err.message : "Failed to connect repository",
      );
    } finally {
      setGithubVerifying(false);
    }
  };

  const verifyAndSaveSlack = async () => {
    setSlackVerifying(true);
    setSlackError("");
    try {
      const res = await fetch("/api/slack/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_url: slackForm.webhook_url,
          channel_name: slackForm.channel_name,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.error ||
            "Unable to send message to Slack. Check webhook URL and channel.",
        );
      }
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (editingSlackId) {
        const { error } = await supabase
          .from("slack_integrations")
          .update({
            webhook_url: slackForm.webhook_url,
            channel_name: slackForm.channel_name,
            verified: true,
          })
          .eq("id", editingSlackId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("slack_integrations").insert({
          project_id: projectId,
          webhook_url: slackForm.webhook_url,
          channel_name: slackForm.channel_name,
          verified: true,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
      }
      setSlackModalOpen(false);
      loadIntegrations();
    } catch (err: unknown) {
      setSlackError(
        err instanceof Error ? err.message : "Failed to connect Slack",
      );
    } finally {
      setSlackVerifying(false);
    }
  };

  const removeGitHub = async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("github_integrations").delete().eq("id", id);
    loadIntegrations();
  };

  const removeSlack = async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("slack_integrations").delete().eq("id", id);
    loadIntegrations();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col w-full">
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col w-full">
      <header className="border-b px-6 py-4 w-full">
        <h1 className="text-xl font-semibold">Integrations</h1>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-6 w-full min-w-0">
        <Card className="w-full gap-0">
          <CardHeader className="border-b gap-0">
            <CardTitle className="text-sm font-medium">
              Installed integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* GitHub row */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                    <Github className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">GitHub</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your repository to start pushing tokens to code.
                      <br />
                      You will need a personal access token and your repository
                      details.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={openGithubModal}>
                  {githubRepos.length > 0 ? "Add another" : "Connect"}
                </Button>
              </div>

              {githubRepos.length > 0 && (
                <div className="mt-4 space-y-3">
                  {githubRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-slate-100 px-6 py-5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {repo.repository_owner}/{repo.repository_name} ·{" "}
                          {repo.branch_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added by {repo.creator_name ?? currentUserName}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeGitHub(repo.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-border" />

            {/* Slack row */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                    <Slack className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Slack</p>
                    <p className="text-sm text-muted-foreground">
                      Add a Slack webhook to notify your team whenever a new
                      release is published.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSlackModal()}
                  disabled={slackChannels.length > 0}
                >
                  Connect
                </Button>
              </div>

              {slackChannels.length > 0 && (
                <div className="mt-4 space-y-3">
                  {slackChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between gap-4 rounded-lg bg-slate-100 px-6 py-5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          #{channel.channel_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added by {channel.creator_name ?? currentUserName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSlackModal(channel)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeSlack(channel.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Connect GitHub modal */}
      <Dialog open={githubModalOpen} onOpenChange={setGithubModalOpen}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-lg">Connect GitHub</DialogTitle>
            </DialogHeader>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => setGithubModalOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="github-token">Personal access token</Label>
                <Input
                  id="github-token"
                  type="password"
                  placeholder="Add personal access token"
                  value={githubForm.access_token}
                  onChange={(e) =>
                    setGithubForm((prev) => ({
                      ...prev,
                      access_token: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-owner">Repository owner</Label>
                <Input
                  id="github-owner"
                  placeholder="Add repository owner"
                  value={githubForm.repository_owner}
                  onChange={(e) =>
                    setGithubForm((prev) => ({
                      ...prev,
                      repository_owner: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-repo">Repository name</Label>
                <Input
                  id="github-repo"
                  placeholder="Add repository name"
                  value={githubForm.repository_name}
                  onChange={(e) =>
                    setGithubForm((prev) => ({
                      ...prev,
                      repository_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-branch">Branch name</Label>
                <Input
                  id="github-branch"
                  placeholder="Add branch name"
                  value={githubForm.branch_name}
                  onChange={(e) =>
                    setGithubForm((prev) => ({
                      ...prev,
                      branch_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-primary/10 px-4 py-4 text-sm text-foreground/80">
              <div className="flex gap-3">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-foreground/70" />
                <span>
                  Token needs Contents (write) permission and push access to the
                  repository
                </span>
              </div>
            </div>

            {githubError && (
              <p className="mt-3 text-sm text-destructive">{githubError}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
            <Button variant="ghost" onClick={() => setGithubModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={verifyAndSaveGitHub}
              disabled={
                !githubForm.access_token ||
                !githubForm.repository_owner ||
                !githubForm.repository_name ||
                githubVerifying
              }
            >
              {githubVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connect Slack modal */}
      <Dialog open={slackModalOpen} onOpenChange={setSlackModalOpen}>
        <DialogContent className="sm:max-w-4xl p-0 gap-0">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <DialogHeader className="space-y-0">
              <DialogTitle className="text-lg">
                {editingSlackId ? "Edit Slack" : "Connect Slack"}
              </DialogTitle>
            </DialogHeader>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => setSlackModalOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slack-webhook">Webhook URL</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  placeholder="Add webhook URL"
                  value={slackForm.webhook_url}
                  onChange={(e) =>
                    setSlackForm((prev) => ({
                      ...prev,
                      webhook_url: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slack-channel">Channel name</Label>
                <Input
                  id="slack-channel"
                  placeholder="Add channel name"
                  value={slackForm.channel_name}
                  onChange={(e) =>
                    setSlackForm((prev) => ({
                      ...prev,
                      channel_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {slackError && (
              <p className="mt-3 text-sm text-destructive">{slackError}</p>
            )}
          </div>

          <div className="flex min-h-[96px] items-center justify-end gap-3 px-6 py-6 border-t">
            <Button variant="outline" onClick={() => setSlackModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={verifyAndSaveSlack}
              disabled={
                !slackForm.webhook_url ||
                !slackForm.channel_name ||
                slackVerifying
              }
            >
              {slackVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
