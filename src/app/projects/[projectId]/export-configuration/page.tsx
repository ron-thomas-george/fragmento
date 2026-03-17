"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, FileCode, Palette } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import JSZip from "jszip";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Separator } from "@/components/ui/separator";

interface ExportConfigurationPageProps {
  params: Promise<{ projectId: string }>;
}

interface TokenSet {
  id: string;
  name: string;
  description?: string;
  tokenCount: number;
}

interface Token {
  id: string;
  name: string;
  type: string;
  value: any;
  resolved_value: any;
  token_set_id: string;
}

interface GitHubRepoOption {
  id: string;
  repository_owner: string;
  repository_name: string;
  branch_name: string;
}

type ExportFormat = "shadcn" | "android" | "ios" | "tailwind" | "raw-json";

interface GeneratedFile {
  filename: string;
  contents: string;
}

export default function ExportConfigurationPage({
  params,
}: ExportConfigurationPageProps) {
  const { projectId } = use(params);

  // State
  const [tokenSets, setTokenSets] = useState<TokenSet[]>([]);
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [allSetsSelected, setAllSetsSelected] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<GitHubRepoOption[]>([]);
  const [repoByFormat, setRepoByFormat] = useState<
    Record<ExportFormat, string | undefined>
  >({
    shadcn: undefined,
    android: undefined,
    ios: undefined,
    tailwind: undefined,
    "raw-json": undefined,
  });
  const [generatedFiles, setGeneratedFiles] = useState<
    Record<ExportFormat, GeneratedFile[]>
  >({} as Record<ExportFormat, GeneratedFile[]>);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("shadcn");
  const [enabledFormats, setEnabledFormats] = useState<
    Record<ExportFormat, boolean>
  >({
    shadcn: true,
    android: true,
    ios: true,
    tailwind: true,
    "raw-json": true,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load token sets and tokens
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        // Load token sets
        const { data: setsData } = await supabase
          .from("token_sets")
          .select(
            `
            id,
            name,
            description
          `,
          )
          .eq("project_id", projectId)
          .order("name");

        // Load all tokens
        const { data: tokensData } = await supabase
          .from("tokens")
          .select(
            `
            id,
            name,
            type,
            value,
            resolved_value,
            token_set_id,
            token_sets!inner(name)
          `,
          )
          .eq("project_id", projectId)
          .order("name");

        // Load connected GitHub repos (for repository selection)
        const { data: reposData } = await supabase
          .from("github_integrations")
          .select("id, repository_owner, repository_name, branch_name")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        const { data: repoConfigData } = await supabase
          .from("export_repository_configs")
          .select("format, github_integration_id")
          .eq("project_id", projectId);

        if (setsData && tokensData) {
          // Count tokens for each set
          const tokenCounts = tokensData.reduce(
            (acc, token) => {
              acc[token.token_set_id] = (acc[token.token_set_id] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          const formattedSets = setsData.map((set) => ({
            id: set.id,
            name: set.name,
            description: set.description,
            tokenCount: tokenCounts[set.id] || 0,
          }));

          setTokenSets(formattedSets);
          setSelectedSets(formattedSets.map((set) => set.id));
          setTokens(tokensData as Token[]);
        }

        setConnectedRepos((reposData as GitHubRepoOption[]) ?? []);

        if (repoConfigData) {
          const next: Record<ExportFormat, string | undefined> = {
            shadcn: undefined,
            android: undefined,
            ios: undefined,
            tailwind: undefined,
            "raw-json": undefined,
          };
          for (const row of repoConfigData as Array<{
            format: ExportFormat;
            github_integration_id: string | null;
          }>) {
            if (row.github_integration_id) {
              next[row.format] = row.github_integration_id;
            }
          }
          setRepoByFormat(next);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const saveRepoSelection = async (format: ExportFormat, repoId: string) => {
    setRepoByFormat((prev) => ({ ...prev, [format]: repoId }));
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.from("export_repository_configs").upsert(
      {
        project_id: projectId,
        format,
        github_integration_id: repoId,
      },
      { onConflict: "project_id,format" },
    );
    if (error) {
      console.error("Error saving repository selection:", error);
      toast.error("Could not save repository selection");
    }
  };

  // Handle set selection
  const handleSetSelection = (setId: string, checked: boolean) => {
    if (checked) {
      setSelectedSets((prev) => [...prev, setId]);
    } else {
      setSelectedSets((prev) => prev.filter((id) => id !== setId));
      setAllSetsSelected(false);
    }
  };

  // Handle all sets selection
  const handleAllSetsSelection = (checked: boolean) => {
    setAllSetsSelected(checked);
    if (checked) {
      setSelectedSets(tokenSets.map((set) => set.id));
    } else {
      setSelectedSets([]);
    }
  };

  const getFilteredTokens = () =>
    tokens.filter((token) => selectedSets.includes(token.token_set_id));

  const generateShadcnFiles = (filteredTokens: Token[]): GeneratedFile[] => {
    const cssVariables: Record<string, string> = {};

    filteredTokens.forEach((token) => {
      const value = token.resolved_value || token.value;
      let cssValue = value;

      if (token.type === "color") {
        cssValue = typeof value === "string" ? value : JSON.stringify(value);
      } else if (token.type === "dimension") {
        cssValue = typeof value === "string" ? value : `${value}px`;
      } else if (token.type === "fontFamily") {
        cssValue = Array.isArray(value) ? value.join(", ") : value;
      } else {
        cssValue = typeof value === "string" ? value : JSON.stringify(value);
      }

      const cssVarName = `--${token.name.replace(/[.\s]/g, "-").toLowerCase()}`;
      cssVariables[cssVarName] = cssValue;
    });

    const cssOutput = `:root {
${Object.entries(cssVariables)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join("\n")}
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;

    return [
      {
        filename: "tokens.css",
        contents: cssOutput,
      },
    ];
  };

  const generateAndroidFiles = (filteredTokens: Token[]): GeneratedFile[] => {
    const colorTokens = filteredTokens.filter((t) => t.type === "color");
    const dimTokens = filteredTokens.filter((t) => t.type === "dimension");

    const toAndroidName = (name: string) =>
      name.replace(/[.\s]/g, "_").toLowerCase();

    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${colorTokens
  .map((token) => {
    const value = token.resolved_value || token.value;
    return `  <color name="${toAndroidName(token.name)}">${value}</color>`;
  })
  .join("\n")}
</resources>`;

    const dimensXml =
      dimTokens.length === 0
        ? ""
        : `<?xml version="1.0" encoding="utf-8"?>
<resources>
${dimTokens
  .map((token) => {
    const value = token.resolved_value || token.value;
    const dim = typeof value === "string" ? value : `${value}px`;
    return `  <dimen name="${toAndroidName(token.name)}">${dim}</dimen>`;
  })
  .join("\n")}
</resources>`;

    const files: GeneratedFile[] = [
      { filename: "values/colors.xml", contents: colorsXml },
    ];

    if (dimensXml) {
      files.push({
        filename: "values/dimens.xml",
        contents: dimensXml,
      });
    }

    return files;
  };

  const generateIosFiles = (filteredTokens: Token[]): GeneratedFile[] => {
    const swiftColors = filteredTokens
      .filter((t) => t.type === "color")
      .map((token) => {
        const value = token.resolved_value || token.value;
        return `  static let ${token.name
          .replace(/[.\s]/g, "_")
          .toLowerCase()} = Color("${value}")`;
      })
      .join("\n");

    const swiftFile = `import SwiftUI

struct DesignTokens {
${swiftColors}
}`;

    const jsonObject = filteredTokens.reduce(
      (acc, token) => {
        acc[token.name] = {
          value: token.resolved_value || token.value,
          type: token.type,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    const jsonFile = JSON.stringify(jsonObject, null, 2);

    return [
      {
        filename: "DesignTokens.swift",
        contents: swiftFile,
      },
      {
        filename: "tokens.json",
        contents: jsonFile,
      },
    ];
  };

  const generateTailwindFiles = (filteredTokens: Token[]): GeneratedFile[] => {
    const tailwindColors: Record<string, string> = {};

    filteredTokens
      .filter((t) => t.type === "color")
      .forEach((token) => {
        const value = token.resolved_value || token.value;
        const name = token.name.replace(/\s+/g, "-").toLowerCase();
        tailwindColors[name] = value;
      });

    const jsFile = `/** Auto‑generated by Fragmento */
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(tailwindColors, null, 2)}
    }
  }
};`;

    return [
      {
        filename: "tailwind.tokens.config.js",
        contents: jsFile,
      },
    ];
  };

  const generateRawJsonFiles = (filteredTokens: Token[]): GeneratedFile[] => {
    const jsonData = {
      tokens: filteredTokens.reduce(
        (acc, token) => {
          const setName =
            tokenSets.find((set) => set.id === token.token_set_id)?.name ||
            "default";
          if (!acc[setName]) {
            acc[setName] = {};
          }
          acc[setName][token.name] = {
            value: token.resolved_value || token.value,
            type: token.type,
          };
          return acc;
        },
        {} as Record<string, Record<string, any>>,
      ),
      metadata: {
        exportedAt: new Date().toISOString(),
        selectedSets: selectedSets.length,
        totalTokens: filteredTokens.length,
      },
    };

    return [
      {
        filename: "tokens.json",
        contents: JSON.stringify(jsonData, null, 2),
      },
    ];
  };

  // Auto-generate files whenever data or configuration changes
  useEffect(() => {
    if (!tokens.length || !selectedSets.length) return;
    void handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, selectedSets, enabledFormats]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const filteredTokens = getFilteredTokens();

      const newFiles: Record<ExportFormat, GeneratedFile[]> = {} as Record<
        ExportFormat,
        GeneratedFile[]
      >;

      if (enabledFormats.shadcn) {
        newFiles["shadcn"] = generateShadcnFiles(filteredTokens);
      }
      if (enabledFormats.android) {
        newFiles["android"] = generateAndroidFiles(filteredTokens);
      }
      if (enabledFormats.ios) {
        newFiles["ios"] = generateIosFiles(filteredTokens);
      }
      if (enabledFormats.tailwind) {
        newFiles["tailwind"] = generateTailwindFiles(filteredTokens);
      }
      if (enabledFormats["raw-json"]) {
        newFiles["raw-json"] = generateRawJsonFiles(filteredTokens);
      }

      setGeneratedFiles(newFiles);
    } catch (error) {
      console.error("Error generating files:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    const filesForFormat = generatedFiles[selectedFormat];
    if (!filesForFormat || filesForFormat.length === 0) return;

    const zip = new JSZip();
    filesForFormat.forEach((file) => {
      zip.file(file.filename, file.contents);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fragmento-tokens-${selectedFormat}-${
      new Date().toISOString().split("T")[0]
    }.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col w-full">
        <header className="border-b px-6 py-4">
          <h1 className="text-xl font-semibold">Export Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure and export your design tokens
          </p>
        </header>
        <main className="flex flex-1 items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col w-full">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Export Configuration</h1>
          </div>
        </div>
      </header>

      {/* Two Panel Layout */}
      <main className="grid grid-cols-2 flex-1 w-full min-h-0 max-w-none">
        {/* Left Panel - Configuration */}
        <div className="border-r p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Token Sets Selection */}
            <Card className="gap-2 py-3">
              <CardHeader className="px-3">
                <CardTitle className="text-base font-semibold ">
                  Token sets
                </CardTitle>
              </CardHeader>
              <Separator className=" mt-0 mb-2" />
              <CardContent className="space-y-1.5 px-3">
                <div className="flex items-center justify-between rounded-md px-1 py-0">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="all-sets"
                      checked={allSetsSelected}
                      onCheckedChange={handleAllSetsSelection}
                    />
                    <Label
                      htmlFor="all-sets"
                      className="text-sm font-medium leading-none"
                    >
                      All sets
                    </Label>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {tokenSets.reduce((sum, set) => sum + set.tokenCount, 0)}{" "}
                    tokens
                  </span>
                </div>

                {/* Individual sets */}
                <div className="space-y-1.5">
                  {tokenSets.map((set) => (
                    <div
                      key={set.id}
                      className="flex items-center justify-between rounded-md px-1 py-0"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={set.id}
                          checked={selectedSets.includes(set.id)}
                          onCheckedChange={(checked) =>
                            handleSetSelection(set.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={set.id}
                          className="text-sm font-medium lowercase first-letter:uppercase"
                        >
                          {set.name}
                        </Label>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-muted mt-0.5 px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {set.tokenCount} tokens
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 gap-2">
              <CardHeader className="pb-0">
                <CardTitle className="text-[15px] font-semibold">
                  Output configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-semibold">shadcn/react</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exports tokens as CSS variables compatible with shadcn/ui
                      and React projects. Generates a tokens.css file that can
                      be directly imported into your codebase.
                    </p>
                  </div>
                  <Switch
                    checked={enabledFormats.shadcn}
                    onCheckedChange={(checked) =>
                      setEnabledFormats((prev) => ({
                        ...prev,
                        shadcn: checked,
                      }))
                    }
                    className="shrink-0"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-semibold">Android</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exports tokens as Android resource files (colors.xml,
                      dimens.xml) following Material Design conventions, ready
                      to use in your Android project.
                    </p>
                  </div>
                  <Switch
                    checked={enabledFormats.android}
                    onCheckedChange={(checked) =>
                      setEnabledFormats((prev) => ({
                        ...prev,
                        android: checked,
                      }))
                    }
                    className="shrink-0"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-semibold">iOS</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exports tokens as Swift constants or JSON, following iOS
                      naming conventions and ready to integrate into your Xcode
                      project.
                    </p>
                  </div>
                  <Switch
                    checked={enabledFormats.ios}
                    onCheckedChange={(checked) =>
                      setEnabledFormats((prev) => ({ ...prev, ios: checked }))
                    }
                    className="shrink-0"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-semibold">Tailwind</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exports tokens as a Tailwind theme extension you can merge
                      into your tailwind.config.
                    </p>
                  </div>
                  <Switch
                    checked={enabledFormats.tailwind}
                    onCheckedChange={(checked) =>
                      setEnabledFormats((prev) => ({
                        ...prev,
                        tailwind: checked,
                      }))
                    }
                    className="shrink-0"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-semibold">Raw JSON</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Exports tokens in a raw JSON structure for custom
                      pipelines and tooling.
                    </p>
                  </div>
                  <Switch
                    checked={enabledFormats["raw-json"]}
                    onCheckedChange={(checked) =>
                      setEnabledFormats((prev) => ({
                        ...prev,
                        "raw-json": checked,
                      }))
                    }
                    className="shrink-0"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 gap-0 py-3">
              <CardHeader className="pb-0 gap-0">
                <CardTitle className="text-[15px] font-semibold gap-0">
                  Configure repository
                </CardTitle>
              </CardHeader>
              <Separator className="mt-3" />
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold">shadcn/react</div>
                  <Select
                    value={repoByFormat.shadcn}
                    onValueChange={(value) =>
                      void saveRepoSelection("shadcn", value)
                    }
                    disabled={connectedRepos.length === 0}
                  >
                    <SelectTrigger className="h-10 w-[220px]">
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedRepos.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.repository_owner}/{repo.repository_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold">Android</div>
                  <Select
                    value={repoByFormat.android}
                    onValueChange={(value) =>
                      void saveRepoSelection("android", value)
                    }
                    disabled={connectedRepos.length === 0}
                  >
                    <SelectTrigger className="h-10 w-[220px]">
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedRepos.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.repository_owner}/{repo.repository_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold">iOS</div>
                  <Select
                    value={repoByFormat.ios}
                    onValueChange={(value) =>
                      void saveRepoSelection("ios", value)
                    }
                    disabled={connectedRepos.length === 0}
                  >
                    <SelectTrigger className="h-10 w-[220px]">
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedRepos.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.repository_owner}/{repo.repository_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold">Tailwind</div>
                  <Select
                    value={repoByFormat.tailwind}
                    onValueChange={(value) =>
                      void saveRepoSelection("tailwind", value)
                    }
                    disabled={connectedRepos.length === 0}
                  >
                    <SelectTrigger className="h-10 w-[220px]">
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedRepos.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.repository_owner}/{repo.repository_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold">Raw JSON</div>
                  <Select
                    value={repoByFormat["raw-json"]}
                    onValueChange={(value) =>
                      void saveRepoSelection("raw-json", value)
                    }
                    disabled={connectedRepos.length === 0}
                  >
                    <SelectTrigger className="h-10 w-[220px]">
                      <SelectValue placeholder="Select repository" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectedRepos.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.repository_owner}/{repo.repository_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {connectedRepos.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No GitHub repositories connected yet. Connect one in
                    Integrations.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Output Preview */}
        <div className="p-6 overflow-y-auto flex flex-col">
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold">Generated output</h2>
              </div>

              <div className="flex gap-3">
                {Object.keys(generatedFiles).length > 0 && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        const content =
                          generatedFiles[selectedFormat]?.[0]?.contents;
                        if (!content) return;
                        navigator.clipboard
                          ?.writeText(content)
                          .then(() => {
                            toast.success("Code copied to clipboard");
                          })
                          .catch(() => {
                            toast.error("Unable to copy code");
                          });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleDownloadZip}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {Object.keys(generatedFiles).length > 0 && (
                  <Select
                    value={selectedFormat}
                    onValueChange={(value) =>
                      setSelectedFormat(value as ExportFormat)
                    }
                  >
                    <SelectTrigger className="h-8 w-[140px] px-2 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {Object.entries(enabledFormats)
                        .filter(([, enabled]) => enabled)
                        .map(([format]) => (
                          <SelectItem key={format} value={format}>
                            {format === "shadcn" && "shadcn/react"}
                            {format === "android" && "Android"}
                            {format === "ios" && "iOS"}
                            {format === "tailwind" && "Tailwind"}
                            {format === "raw-json" && "Raw JSON"}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Output Display */}
            {Object.keys(generatedFiles).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg w-full">
                <FileCode className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No output generated</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select token sets and click "Generate Files" to see the output
                </p>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div className="relative w-full">
                  <pre
                    className="text-xs bg-muted p-4 rounded-lg overflow-x-auto border w-full min-w-0 max-w-none whitespace-pre-wrap break-words"
                    style={{ width: "100%" }}
                  >
                    <code className="block w-full whitespace-pre-wrap">
                      {generatedFiles[selectedFormat]?.[0]?.contents ??
                        "// No file for this format"}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
