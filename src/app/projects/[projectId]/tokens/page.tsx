"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TokenSet {
  id: string;
  name: string;
  level: number;
}

interface TokenRow {
  id: string;
  name: string;
  type: string;
  value: any;
  description: string | null;
  source: string;
}

export default function TokensPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const searchParams = useSearchParams();

  const [sets, setSets] = useState<TokenSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("color");
  const [formValue, setFormValue] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    const loadSets = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: setsError } = await supabase
          .from("token_sets")
          .select("id, name, level")
          .eq("project_id", projectId)
          .order("level", { ascending: true });

        if (setsError) {
          setError(setsError.message);
          setLoadingSets(false);
          return;
        }

        const list = data ?? [];
        setSets(list as TokenSet[]);
        if (list.length > 0) {
          const requestedSetName = searchParams.get("set");

          if (requestedSetName) {
            const matched = list.find(
              (set) =>
                set.name.toLowerCase() === requestedSetName.toLowerCase()
            );
            if (matched) {
              setSelectedSetId(matched.id as string);
            } else {
              setSelectedSetId(list[0].id as string);
            }
          } else {
            setSelectedSetId(list[0].id as string);
          }
        }
        setLoadingSets(false);
      } catch (err) {
        setError("Failed to load token sets.");
        setLoadingSets(false);
      }
    };
    if (projectId) {
      void loadSets();
    }
  }, [projectId, searchParams]);

  const resolveReferenceChain = async (
    rawValue: any,
    currentSetId: string
  ): Promise<{ resolvedValue: any; referencedTokenIds: string[] }> => {
    const supabase = createSupabaseBrowserClient();

    const currentSet = sets.find((s) => s.id === currentSetId);
    if (!currentSet) {
      return { resolvedValue: rawValue, referencedTokenIds: [] };
    }

    // Only treat simple string of form {set-name.token-name} as a reference
    if (typeof rawValue !== "string") {
      return { resolvedValue: rawValue, referencedTokenIds: [] };
    }

    const refMatch = rawValue.match(/^\{([^}]+)\}$/);
    if (!refMatch) {
      return { resolvedValue: rawValue, referencedTokenIds: [] };
    }

    const refPath = refMatch[1];
    const [setName, ...tokenParts] = refPath.split(".");
    if (!setName || tokenParts.length === 0) {
      throw new Error("Invalid reference syntax. Expected {set.token-name}.");
    }

    const targetTokenName = tokenParts.join(".");
    const targetSet = sets.find((s) => s.name === setName);
    if (!targetSet) {
      throw new Error(`Referenced set '${setName}' not found.`);
    }

    // Enforce hierarchy rules
    // level 0 (Global) cannot reference anything
    // level 1 (Semantic) can only reference level 0
    // level 2 (Components) can reference level 0 or 1
    if (currentSet.level === 0) {
      throw new Error("Global tokens cannot reference other sets.");
    }
    if (currentSet.level === 1 && targetSet.level !== 0) {
      throw new Error("Semantic tokens can only reference global tokens.");
    }
    if (currentSet.level === 2 && targetSet.level === 2) {
      throw new Error(
        "Component tokens can only reference global or semantic tokens."
      );
    }

    // Resolve reference chain, avoiding cycles
    const visited = new Set<string>();

    const walk = async (
      setId: string,
      tokenName: string
    ): Promise<{ resolved: any; chainIds: string[] }> => {
      const key = `${setId}:${tokenName}`;
      if (visited.has(key)) {
        throw new Error("Circular reference detected in token graph.");
      }
      visited.add(key);

      const { data: target, error } = await supabase
        .from("tokens")
        .select("id, value, resolved_value")
        .eq("project_id", projectId)
        .eq("token_set_id", setId)
        .eq("name", tokenName)
        .single();

      if (error || !target) {
        throw new Error(
          `Referenced token '${tokenName}' not found in set '${setName}'.`
        );
      }

      // Prefer existing resolved_value if present to avoid deep recursion
      const baseValue =
        typeof target.resolved_value !== "undefined" && target.resolved_value !== null
          ? target.resolved_value
          : target.value;

      if (typeof baseValue === "string") {
        const innerMatch = baseValue.match(/^\{([^}]+)\}$/);
        if (innerMatch) {
          const [innerSetName, ...innerTokenParts] = innerMatch[1].split(".");
          const innerTargetSet = sets.find((s) => s.name === innerSetName);
          if (!innerTargetSet) {
            throw new Error(`Referenced set '${innerSetName}' not found.`);
          }
          const innerTokenName = innerTokenParts.join(".");
          const inner = await walk(innerTargetSet.id, innerTokenName);
          return {
            resolved: inner.resolved,
            chainIds: [target.id, ...inner.chainIds],
          };
        }
      }

      return { resolved: baseValue, chainIds: [target.id] };
    };

    const result = await walk(targetSet.id, targetTokenName);
    return { resolvedValue: result.resolved, referencedTokenIds: result.chainIds };
  };

  useEffect(() => {
    const loadTokens = async () => {
      if (!selectedSetId) return;
      setLoadingTokens(true);
      setError(null);

      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: tokensError } = await supabase
          .from("tokens")
          .select("id, name, type, value, description, source")
          .eq("project_id", projectId)
          .eq("token_set_id", selectedSetId)
          .order("name", { ascending: true });

        if (tokensError) {
          setError(tokensError.message);
          setLoadingTokens(false);
          return;
        }

        setTokens((data ?? []) as TokenRow[]);
        setLoadingTokens(false);
      } catch (err) {
        setError("Failed to load tokens.");
        setLoadingTokens(false);
      }
    };

    void loadTokens();
  }, [projectId, selectedSetId]);

  const openNewTokenDialog = () => {
    setEditingToken(null);
    setFormName("");
    setFormType("color");
    setFormValue("");
    setFormDescription("");
    setDialogOpen(true);
  };

  const openEditTokenDialog = (token: TokenRow) => {
    setEditingToken(token);
    setFormName(token.name);
    setFormType(token.type);
    setFormValue(
      typeof token.value === "string" ? token.value : JSON.stringify(token.value)
    );
    setFormDescription(token.description ?? "");
    setDialogOpen(true);
  };

  const refreshTokens = async (currentSetId: string) => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: tokensError } = await supabase
        .from("tokens")
        .select("id, name, type, value, description, source")
        .eq("project_id", projectId)
        .eq("token_set_id", currentSetId)
        .order("name", { ascending: true });

      if (tokensError) {
        setError(tokensError.message);
        return;
      }

      setTokens((data ?? []) as TokenRow[]);
    } catch (err) {
      setError("Failed to load tokens.");
    }
  };

  const handleSaveToken = async () => {
    if (!selectedSetId) return;
    if (!formName.trim()) {
      setError("Token name is required.");
      return;
    }
    if (!formValue.trim()) {
      setError("Token value is required.");
      return;
    }

    // Enforce name pattern: lowercase letters, numbers, hyphens, periods
    const namePattern = /^[a-z0-9.-]+$/;
    if (!namePattern.test(formName.trim())) {
      setError(
        "Name can only contain lowercase letters, numbers, hyphens, and periods."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // Check for naming conflicts within this set (case-insensitive)
      const { data: existing, error: existingError } = await supabase
        .from("tokens")
        .select("id")
        .eq("project_id", projectId)
        .eq("token_set_id", selectedSetId)
        .ilike("name", formName.trim());

      if (existingError) {
        setError(existingError.message);
        setSaving(false);
        return;
      }

      const conflict = existing?.find(
        (row) => !editingToken || row.id !== editingToken.id
      );
      if (conflict) {
        setError(
          `Token name '${formName.trim()}' already exists in this set. Try a different name.`
        );
        setSaving(false);
        return;
      }

      let parsedValue: any = formValue;
      try {
        parsedValue = JSON.parse(formValue);
      } catch {
        // keep as string
      }

      // Resolve references (if any) for resolved_value and token_references
      const { resolvedValue, referencedTokenIds } = await resolveReferenceChain(
        parsedValue,
        selectedSetId
      );
      if (editingToken) {
        const { error: updateError } = await supabase
          .from("tokens")
          .update({
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            description: formDescription || null,
            resolved_value: resolvedValue,
          })
          .eq("id", editingToken.id)
          .select("id")
          .single();

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }

        // Replace existing token_references
        await supabase
          .from("token_references")
          .delete()
          .eq("from_token_id", editingToken.id);

        if (referencedTokenIds.length > 0) {
          const rows = referencedTokenIds.map((toId: string) => ({
            from_token_id: editingToken.id,
            to_token_id: toId,
          }));
          await supabase.from("token_references").insert(rows);
        }

        // Record change for modified token
        await supabase.from("changes").insert({
          project_id: projectId,
          token_id: editingToken.id,
          source: "web_app",
          change_type: "modified",
          before: {
            name: editingToken.name,
            type: editingToken.type,
            value: editingToken.value,
            description: editingToken.description,
          },
          after: {
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            description: formDescription || null,
          },
        });
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("tokens")
          .insert({
            project_id: projectId,
            token_set_id: selectedSetId,
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            description: formDescription || null,
            resolved_value: resolvedValue,
            source: "web_app",
          })
          .select("id, name, type, value, description")
          .single();

        if (insertError || !inserted) {
          setError(insertError?.message ?? "Failed to create token.");
          setSaving(false);
          return;
        }

        // Write token_references for created token
        if (referencedTokenIds.length > 0) {
          const rows = referencedTokenIds.map((toId: string) => ({
            from_token_id: inserted.id,
            to_token_id: toId,
          }));
          await supabase.from("token_references").insert(rows);
        }

        // Record change for created token
        await supabase.from("changes").insert({
          project_id: projectId,
          token_id: inserted.id,
          source: "web_app",
          change_type: "created",
          before: null,
          after: {
            name: inserted.name,
            type: inserted.type,
            value: inserted.value,
            description: inserted.description,
          },
        });
      }

      await refreshTokens(selectedSetId);
      setDialogOpen(false);
      setSaving(false);
      setSuccessMessage("Token saved successfully");
    } catch (err) {
      setError("Failed to save token.");
      setSaving(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!selectedSetId) return;
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      // capture token before delete for change log
      const { data: existing, error: fetchError } = await supabase
        .from("tokens")
        .select("id, name, type, value, description")
        .eq("id", tokenId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const { error: deleteError } = await supabase
        .from("tokens")
        .delete()
        .eq("id", tokenId);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      // record change for deleted token
      await supabase.from("changes").insert({
        project_id: projectId,
        token_id: existing.id,
        source: "web_app",
        change_type: "deleted",
        before: {
          name: existing.name,
          type: existing.type,
          value: existing.value,
          description: existing.description,
        },
        after: null,
      });

      await refreshTokens(selectedSetId);
      setSuccessMessage("Token deleted successfully");
    } catch (err) {
      setError("Failed to delete token.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Tokens &amp; Sets</h1>
        <p className="text-sm text-muted-foreground">
          Project: <span className="font-mono text-xs">{projectId}</span>
        </p>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 border-r bg-background px-4 py-4 text-sm">
          <div className="mb-2 font-medium">Token sets</div>
          {loadingSets ? (
            <p className="text-xs text-muted-foreground">Loading sets...</p>
          ) : sets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No token sets yet.</p>
          ) : (
            <ul className="space-y-1 text-muted-foreground">
              {sets.map((set) => (
                <li key={set.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedSetId(set.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors ${
                      selectedSetId === set.id
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span>{set.name}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {set.level === 0
                        ? "Global"
                        : set.level === 1
                        ? "Semantic"
                        : "Components"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <main className="flex-1 px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-medium">Tokens</h2>
              <p className="text-xs text-muted-foreground">
                Viewing tokens for the selected set.
              </p>
            </div>
            <Button size="sm" onClick={openNewTokenDialog} disabled={!selectedSetId}>
              New token
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : successMessage ? (
            <p className="text-sm text-emerald-600">{successMessage}</p>
          ) : null}

          <div className="rounded-md border">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingTokens ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-xs text-muted-foreground"
                    >
                      Loading tokens...
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-xs text-muted-foreground"
                    >
                      No tokens in this set yet.
                    </td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr key={token.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-[11px]">
                        {token.name}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {token.type}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <code className="rounded bg-muted px-1 py-0.5">
                          {typeof token.value === "string"
                            ? token.value
                            : JSON.stringify(token.value)}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {token.source}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {token.description}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2 h-6 px-2"
                          onClick={() => openEditTokenDialog(token)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-destructive hover:bg-red-50"
                          onClick={() => handleDeleteToken(token.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingToken ? "Edit token" : "New token"}
                </DialogTitle>
                <DialogDescription>
                  Define the name, type, and value for this design token.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label htmlFor="token-name">Name</Label>
                  <Input
                    id="token-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="color.background.surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="token-type">Type</Label>
                    <Input
                      id="token-type"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      placeholder="color | spacing | radius | shadow"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="token-value">Value</Label>
                    <Input
                      id="token-value"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      placeholder="#020617 or rgb(15, 23, 42)"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="token-description">Description</Label>
                  <Input
                    id="token-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Optional context for collaborators"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveToken} disabled={saving}>
                  {saving ? "Saving..." : editingToken ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
