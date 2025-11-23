"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { X, Check, AlertCircle, MoreHorizontal, Edit, Trash2, Plus, Search, Filter } from "lucide-react";
import { toast } from "sonner";

interface TokenSet {
  id: string;
  name: string;
  level: number;
  token_count?: number;
  description?: string;
}

interface TokenRow {
  id: string;
  name: string;
  type: string;
  value: any;
  description: string | null;
  source: string;
  token_sets?: {
    id: string;
    name: string;
    level: number;
  };
}

export default function TokensPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const searchParams = useSearchParams();

  const [sets, setSets] = useState<TokenSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [projectName, setProjectName] = useState<string>("");
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("color");
  const [formValue, setFormValue] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [nameError, setNameError] = useState("");
  const [valueError, setValueError] = useState("");
  const [isNameUnique, setIsNameUnique] = useState(true);
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
  const [referenceTokens, setReferenceTokens] = useState<TokenRow[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [shadowValues, setShadowValues] = useState({
    x: '0px',
    y: '4px', 
    blur: '6px',
    spread: '0px',
    color: 'rgba(0, 0, 0, 0.1)'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [tokensPerPage] = useState(10);
  
  // New set dialog state
  const [newSetDialogOpen, setNewSetDialogOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [newSetNameError, setNewSetNameError] = useState("");
  const [savingNewSet, setSavingNewSet] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<TokenRow | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Token type categories
  const tokenTypes = {
    Colors: [
      { value: "color", label: "Color" }
    ],
    Spacing: [
      { value: "spacing", label: "Spacing" },
      { value: "padding", label: "Padding" },
      { value: "margin", label: "Margin" },
      { value: "gap", label: "Gap" }
    ],
    Typography: [
      { value: "font-family", label: "Font Family" },
      { value: "font-size", label: "Font Size" },
      { value: "font-weight", label: "Font Weight" },
      { value: "line-height", label: "Line Height" },
      { value: "letter-spacing", label: "Letter Spacing" }
    ],
    Effects: [
      { value: "box-shadow", label: "Box Shadow" },
      { value: "border", label: "Border" },
      { value: "border-radius", label: "Border Radius" }
    ],
    Other: [
      { value: "number", label: "Number" },
      { value: "string", label: "String" },
      { value: "opacity", label: "Opacity" }
    ]
  };

  // Validation functions
  const validateTokenName = (name: string) => {
    const nameRegex = /^[a-z0-9.-]+$/;
    if (!name.trim()) {
      setNameError("Token name is required");
      return false;
    }
    if (!nameRegex.test(name)) {
      setNameError("Name can only contain lowercase letters, numbers, hyphens, and periods");
      return false;
    }
    setNameError("");
    return true;
  };

  const checkNameUniqueness = async (name: string) => {
    if (!selectedSetId || !name.trim()) return;
    
    try {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("tokens")
        .select("id")
        .eq("token_set_id", selectedSetId)
        .eq("name", name.trim())
        .neq("id", editingToken?.id || "");
      
      const unique = !data || data.length === 0;
      setIsNameUnique(unique);
      if (!unique) {
        setNameError(`Token name '${name}' already exists in this set`);
      }
    } catch (err) {
      console.error("Error checking name uniqueness:", err);
    }
  };

  // Reference handling functions
  const fetchReferenceTokens = async (tokenType?: string) => {
    if (!projectId) return;
    
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Fetch tokens with token_sets relation
      let query = supabase
        .from("tokens")
        .select(`
          id, name, type, value, description, source,
          token_sets!inner(id, name, level)
        `)
        .eq("project_id", projectId);
      
      // Only filter by type if specified, otherwise show all tokens
      if (tokenType) {
        query = query.eq("type", tokenType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching reference tokens:', error);
        return;
      }
      
      // Handle token_sets whether it comes as array or single object
      const transformedData = (data || []).map(token => ({
        ...token,
        token_sets: Array.isArray(token.token_sets) ? token.token_sets[0] : token.token_sets
      }));
      setReferenceTokens(transformedData);
    } catch (err) {
      console.error("Error fetching reference tokens:", err);
    }
  };

  const handleValueInputChange = (value: string, cursorPos: number) => {
    setFormValue(value);
    setCursorPosition(cursorPos);
    
    // Check if user typed { to trigger reference dropdown
    if (value.charAt(cursorPos - 1) === '{') {
      fetchReferenceTokens(); // Fetch all tokens, not just current type
      setShowReferenceDropdown(true);
    } else if (!value.includes('{') || value.charAt(cursorPos - 1) === '}') {
      setShowReferenceDropdown(false);
    }
  };

  const insertReference = (tokenSetName: string, tokenName: string, tokenValue?: string, tokenType?: string) => {
    // Use just the token name without set prefix
    const reference = `{${tokenName}}`;
    const beforeCursor = formValue.substring(0, cursorPosition - 1); // Remove the {
    const afterCursor = formValue.substring(cursorPosition);
    const newValue = beforeCursor + reference + afterCursor;
    
    setFormValue(newValue);
    setShowReferenceDropdown(false);
  };

  // Update shadow values and sync with formValue
  const updateShadowValue = (key: keyof typeof shadowValues, value: string) => {
    const newShadowValues = { ...shadowValues, [key]: value };
    setShadowValues(newShadowValues);
    
    // Build CSS shadow string
    const shadowString = `${newShadowValues.x} ${newShadowValues.y} ${newShadowValues.blur} ${newShadowValues.spread} ${newShadowValues.color}`;
    setFormValue(shadowString);
  };

  // Group and filter tokens for reference dropdown based on hierarchy
  const getFilteredTokensBySet = () => {
    // Get current set level to determine which tokens can be referenced
    const currentSet = sets.find(set => set.id === selectedSetId);
    const currentLevel = currentSet?.level ?? 0;
    
    
    // Filter tokens based on hierarchy rules:
    // Global (level 0) tokens can be used in Semantic (level 1) and Components (level 2)
    // Semantic (level 1) tokens can be used in Components (level 2)
    // Components (level 2) tokens cannot reference other tokens
    const filtered = referenceTokens.filter(token => {
      const tokenLevel = token.token_sets?.level ?? 0;
      
      // Can only reference tokens from lower levels
      if (currentLevel === 0) return false; // Global can't reference anything
      if (currentLevel === 1) return tokenLevel === 0; // Semantic can reference Global
      if (currentLevel === 2) return tokenLevel <= 1; // Components can reference Global and Semantic
      
      return false;
    });


    // Group by token set
    const grouped = filtered.reduce((acc, token) => {
      const setName = token.token_sets?.name || 'Unknown';
      if (!acc[setName]) {
        acc[setName] = [];
      }
      acc[setName].push(token);
      return acc;
    }, {} as Record<string, TokenRow[]>);

    return grouped;
  };

  // Filter and search logic
  const getFilteredTokens = () => {
    let filtered = tokens;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(token => 
        token.name.toLowerCase().includes(query) ||
        token.description?.toLowerCase().includes(query) ||
        (typeof token.value === 'string' && token.value.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(token => token.type === typeFilter);
    }

    return filtered;
  };

  // Pagination logic
  const getPaginatedTokens = () => {
    const filteredTokens = getFilteredTokens();
    const startIndex = (currentPage - 1) * tokensPerPage;
    const endIndex = startIndex + tokensPerPage;
    return filteredTokens.slice(startIndex, endIndex);
  };

  const filteredTokens = getFilteredTokens();
  const totalPages = Math.ceil(filteredTokens.length / tokensPerPage);

  // Get unique token types for filter dropdown
  const availableTypes = Array.from(new Set(tokens.map(token => token.type))).sort();

  // Get selected set details
  const selectedSet = sets.find(set => set.id === selectedSetId);

  // Render dynamic value fields based on token type
  const renderValueField = () => {
    const baseInputProps = {
      value: formValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        handleValueInputChange(target.value, target.selectionStart || 0);
      },
      className: `${valueError ? 'border-destructive' : ''}`,
    };

    switch (formType) {
      case 'color':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="color"
                value={(() => {
                  if (formValue.startsWith('#')) {
                    return formValue;
                  } else if (formValue.startsWith('{')) {
                    // If it's a reference, try to find the referenced token's value
                    const match = formValue.match(/\{([^}]+)\}/);
                    if (match) {
                      const [, tokenName] = match;
                      const referencedToken = referenceTokens.find(token => 
                        token.name === tokenName
                      );
                      return referencedToken?.value || '#3B82F6';
                    }
                  }
                  return '#3B82F6';
                })()}
                onChange={(e) => setFormValue(e.target.value)}
                className="h-10 w-16 rounded border border-input cursor-pointer"
                title="Pick a color"
              />
              <div className="relative flex-1">
                <Input
                  {...baseInputProps}
                  placeholder="#3B82F6 or {primary.bg}"
                />
                {showReferenceDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 rounded-md border bg-white">
                    {/* Tokens grouped by set */}
                    <div className="max-h-64 overflow-y-auto">
                      {Object.entries(getFilteredTokensBySet()).map(([setName, tokens]) => (
                        <div key={setName}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                            {setName}
                          </div>
                          {tokens.map((token) => (
                            <button
                              key={token.id}
                              type="button"
                              onClick={() => insertReference(token.token_sets?.name || '', token.name, token.value, token.type)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                            >
                              {token.type === 'color' ? (
                                <div 
                                  className="h-4 w-4 rounded border border-border"
                                  style={{ backgroundColor: token.value }}
                                />
                              ) : (
                                <div className="h-4 w-4 rounded border border-border bg-muted flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">
                                    {token.type === 'spacing' ? 'S' : 
                                     token.type === 'font-size' ? 'T' :
                                     token.type === 'box-shadow' ? '⬛' : '•'}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{token.name}</span>
                                <div className="text-xs text-muted-foreground truncate">{token.value}</div>
                              </div>
                              <span className="text-xs text-muted-foreground">{token.type}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                      {Object.keys(getFilteredTokensBySet()).length === 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          {referenceTokens.length === 0 ? 'No tokens available' : 'No referenceable tokens for this set level'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {formValue && (
              <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
                <div 
                  className="h-8 w-8 rounded border border-border"
                  style={{ 
                    backgroundColor: formValue.startsWith('{') ? 
                      // If it's a reference, try to find the referenced token's value
                      (() => {
                        const match = formValue.match(/\{([^}]+)\}/);
                        if (match) {
                          const [, tokenName] = match;
                          const referencedToken = referenceTokens.find(token => 
                            token.name === tokenName
                          );
                          return referencedToken?.value || '#cccccc';
                        }
                        return '#cccccc';
                      })() : 
                      formValue 
                  }}
                />
                <div className="flex-1">
                  <p className="text-xs font-medium">Color Preview</p>
                  <p className="text-xs text-muted-foreground font-mono">{formValue}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'box-shadow':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">X Offset</Label>
                <Input 
                  placeholder="0px" 
                  className="h-8"
                  value={shadowValues.x}
                  onChange={(e) => updateShadowValue('x', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Y Offset</Label>
                <Input 
                  placeholder="4px" 
                  className="h-8"
                  value={shadowValues.y}
                  onChange={(e) => updateShadowValue('y', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Blur</Label>
                <Input 
                  placeholder="6px" 
                  className="h-8"
                  value={shadowValues.blur}
                  onChange={(e) => updateShadowValue('blur', e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Spread</Label>
                <Input 
                  placeholder="0px" 
                  className="h-8"
                  value={shadowValues.spread}
                  onChange={(e) => updateShadowValue('spread', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-8 w-12 rounded border border-input cursor-pointer"
                  value={shadowValues.color.startsWith('#') ? shadowValues.color : '#000000'}
                  onChange={(e) => updateShadowValue('color', e.target.value)}
                />
                <Input 
                  placeholder="rgba(0, 0, 0, 0.1)" 
                  className="h-8"
                  value={shadowValues.color}
                  onChange={(e) => updateShadowValue('color', e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 rounded-md border bg-muted/30">
              <div 
                className="h-12 w-full rounded bg-white border"
                style={{ boxShadow: formValue || '0px 4px 6px 0px rgba(0, 0, 0, 0.1)' }}
              />
              <p className="text-xs text-muted-foreground mt-2">Shadow Preview</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">{formValue}</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="relative">
            <Input
              {...baseInputProps}
              placeholder={
                formType.includes('spacing') ? '16px or {global.spacing-4}' :
                formType.includes('font') ? 'Inter, sans-serif' :
                'Enter value or {set.token}'
              }
            />
            {showReferenceDropdown && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 rounded-md border bg-white">
                {/* Tokens grouped by set */}
                <div className="max-h-64 overflow-y-auto">
                  {Object.entries(getFilteredTokensBySet()).map(([setName, tokens]) => (
                    <div key={setName}>
                      <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                        {setName}
                      </div>
                      {tokens.map((token) => (
                        <button
                          key={token.id}
                          type="button"
                          onClick={() => insertReference(token.token_sets?.name || '', token.name, token.value, token.type)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                        >
                          {token.type === 'color' ? (
                            <div 
                              className="h-4 w-4 rounded border border-border"
                              style={{ backgroundColor: token.value }}
                            />
                          ) : (
                            <div className="h-4 w-4 rounded border border-border bg-muted flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">
                                {token.type === 'spacing' ? 'S' : 
                                 token.type === 'font-size' ? 'T' :
                                 token.type === 'box-shadow' ? '⬛' : '•'}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{token.name}</span>
                            <div className="text-xs text-muted-foreground truncate">{token.value}</div>
                          </div>
                          <span className="text-xs text-muted-foreground">{token.type}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                  {Object.keys(getFilteredTokensBySet()).length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {referenceTokens.length === 0 ? 'No tokens available' : 'No referenceable tokens for this set level'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  // Initialize formValue when type changes to box-shadow
  useEffect(() => {
    if (formType === 'box-shadow' && !formValue) {
      const shadowString = `${shadowValues.x} ${shadowValues.y} ${shadowValues.blur} ${shadowValues.spread} ${shadowValues.color}`;
      setFormValue(shadowString);
    }
  }, [formType, shadowValues, formValue]);

  // Fetch project name
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("projects")
          .select("name")
          .eq("id", projectId)
          .single();

        if (!error && data) {
          setProjectName(data.name);
        }
      } catch (err) {
        console.error("Failed to load project name:", err);
      }
    };

    loadProject();
  }, [projectId]);

  useEffect(() => {
    const loadSets = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: setsError } = await supabase
          .from("token_sets")
          .select("id, name, level, description")
          .eq("project_id", projectId)
          .order("level", { ascending: true });

        if (setsError) {
          setError(setsError.message);
          setLoadingSets(false);
          return;
        }

        const list = data ?? [];

        // Get token counts for each set
        const setsWithCounts = await Promise.all(
          list.map(async (set) => {
            const { count } = await supabase
              .from("tokens")
              .select("*", { count: "exact", head: true })
              .eq("token_set_id", set.id);
            
            return {
              ...set,
              token_count: count || 0
            };
          })
        );
        setSets(setsWithCounts as TokenSet[]);
        if (setsWithCounts.length > 0) {
          const requestedSetName = searchParams.get("set");

          if (requestedSetName) {
            const matched = setsWithCounts.find(
              (set) =>
                set.name.toLowerCase() === requestedSetName.toLowerCase()
            );
            if (matched) {
              setSelectedSetId(matched.id as string);
            } else {
              setSelectedSetId(setsWithCounts[0].id as string);
            }
          } else {
            setSelectedSetId(setsWithCounts[0].id as string);
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

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter]);

  const resolveReferenceChain = async (
    rawValue: any,
    currentSetId: string
  ): Promise<{ resolvedValue: any; referencedTokenIds: string[] }> => {
    const supabase = createSupabaseBrowserClient();

    const currentSet = sets.find((s) => s.id === currentSetId);
    if (!currentSet) {
      return { resolvedValue: rawValue, referencedTokenIds: [] };
    }

    // Only treat simple string of form {token-name} as a reference
    if (typeof rawValue !== "string") {
      return { resolvedValue: rawValue, referencedTokenIds: [] };
    }

    const refMatch = rawValue.match(/^\{([^}]+)\}$/);
    if (!refMatch) {
      return { resolvedValue: rawValue, referencedTokenIds: [] };
    }

    const targetTokenName = refMatch[1];
    
    // Find the token by name across all sets
    const { data: targetTokens, error } = await supabase
      .from("tokens")
      .select(`
        id, name, type, value, resolved_value,
        token_sets!inner(id, name, level)
      `)
      .eq("project_id", projectId)
      .eq("name", targetTokenName);
    
    if (error || !targetTokens || targetTokens.length === 0) {
      throw new Error(`Referenced token '${targetTokenName}' not found.`);
    }
    
    // Use the first matching token
    const targetToken = targetTokens[0];
    const targetSet = Array.isArray(targetToken.token_sets) ? targetToken.token_sets[0] : targetToken.token_sets;

    // Enforce hierarchy rules
    if (currentSet.level === 0) {
      throw new Error("Global tokens cannot reference other tokens.");
    }
    if (currentSet.level === 1 && targetSet.level !== 0) {
      throw new Error("Semantic tokens can only reference global tokens.");
    }
    if (currentSet.level === 2 && targetSet.level === 2) {
      throw new Error("Component tokens can only reference global or semantic tokens.");
    }

    // Return the resolved value (prefer resolved_value if available, otherwise use value)
    const resolvedValue = targetToken.resolved_value !== null && targetToken.resolved_value !== undefined 
      ? targetToken.resolved_value 
      : targetToken.value;

    return { 
      resolvedValue: resolvedValue, 
      referencedTokenIds: [targetToken.id] 
    };
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
    setNameError("");
    setValueError("");
    setIsNameUnique(true);
    setShowReferenceDropdown(false);
    const defaultShadow = {
      x: '0px',
      y: '4px', 
      blur: '6px',
      spread: '0px',
      color: 'rgba(0, 0, 0, 0.1)'
    };
    setShadowValues(defaultShadow);
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
    setNameError("");
    setValueError("");
    setIsNameUnique(true);
    setShowReferenceDropdown(false);
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
    
    // Validate all required fields
    if (!formName.trim()) {
      setError("Token name is required.");
      return;
    }
    if (!formValue.trim()) {
      setError("Token value is required.");
      return;
    }

    // Check for validation errors
    if (nameError || !isNameUnique) {
      setError("Please fix validation errors before saving.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User';

      let parsedValue: any = formValue;
      let resolvedValue: any = formValue;

      // Parse JSON if possible
      try {
        parsedValue = JSON.parse(formValue);
      } catch {
        // Keep as string if not valid JSON
      }

      // Resolve references if token contains them
      if (formValue.includes('{') && formValue.includes('}')) {
        const resolvedResult = await resolveReferenceChain(formValue, selectedSetId);
        resolvedValue = resolvedResult.resolvedValue;
      }

      if (editingToken) {
        // Update existing token
        const { error: updateError } = await supabase
          .from("tokens")
          .update({
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            resolved_value: resolvedValue,
            description: formDescription.trim() || null,
          })
          .eq("id", editingToken.id);

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }

        // Update token references
        await supabase
          .from("token_references")
          .delete()
          .eq("token_id", editingToken.id);

        if (formValue.includes('{') && formValue.includes('}')) {
          const resolvedResult = await resolveReferenceChain(formValue, selectedSetId);
          for (const refId of resolvedResult.referencedTokenIds) {
            await supabase.from("token_references").insert({
              token_id: editingToken.id,
              referenced_token_id: refId,
            });
          }
        }

        // Record change
        const updateChangeRecord = {
          project_id: projectId,
          token_id: editingToken.id,
          change_type: "modified",
          source: "web_app",
          before: {
            name: editingToken.name,
            type: editingToken.type,
            value: editingToken.value,
            description: editingToken.description
          },
          after: {
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            description: formDescription.trim() || null
          },
          created_by: currentUserName
        };
        
        console.log('Inserting update change record:', updateChangeRecord);
        
        const { error: updateChangeError } = await supabase.from("changes").insert(updateChangeRecord);
        
        if (updateChangeError) {
          console.error('Error inserting update change record:', updateChangeError);
        } else {
          console.log('Successfully created update change record');
        }
      } else {
        // Create new token
        const { data: inserted, error: insertError } = await supabase
          .from("tokens")
          .insert({
            project_id: projectId,
            token_set_id: selectedSetId,
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            resolved_value: resolvedValue,
            description: formDescription.trim() || null,
            source: "web_app",
          })
          .select()
          .single();

        if (insertError || !inserted) {
          setError(insertError?.message ?? "Failed to create token.");
          setSaving(false);
          return;
        }

        // Create token references if needed
        if (formValue.includes('{') && formValue.includes('}')) {
          const resolvedResult = await resolveReferenceChain(formValue, selectedSetId);
          for (const refId of resolvedResult.referencedTokenIds) {
            await supabase.from("token_references").insert({
              token_id: inserted.id,
              referenced_token_id: refId,
            });
          }
        }

        // Record change
        const changeRecord = {
          project_id: projectId,
          token_id: inserted.id,
          change_type: "created",
          source: "web_app",
          after: {
            name: formName.trim(),
            type: formType,
            value: parsedValue,
            description: formDescription.trim() || null
          },
          created_by: currentUserName
        };
        
        console.log('Inserting change record:', changeRecord);
        
        const { error: changeError } = await supabase.from("changes").insert(changeRecord);
        
        if (changeError) {
          console.error('Error inserting change record:', changeError);
          // Don't fail the token creation if change tracking fails
        } else {
          console.log('Successfully created change record');
        }
      }

      await refreshTokens(selectedSetId);
      setDialogOpen(false);
      setSaving(false);
      toast.success(editingToken ? "Token updated successfully" : "Token created successfully");
    } catch (err) {
      setError("Failed to save token.");
      setSaving(false);
      toast.error("Failed to save token");
    }
  };

  // Delete confirmation dialog functions
  const openDeleteConfirmation = (token: TokenRow) => {
    setTokenToDelete(token);
    setDeleteDialogOpen(true);
  };

  const closeDeleteConfirmation = () => {
    setTokenToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDeleteToken = async () => {
    if (tokenToDelete) {
      await handleDeleteToken(tokenToDelete.id);
      closeDeleteConfirmation();
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!selectedSetId) return;
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown User';
      // capture token before delete for change log
      const { data: existing, error: fetchError } = await supabase
        .from("tokens")
        .select(`
          id, 
          name, 
          type, 
          value, 
          description,
          token_set_id,
          token_sets!inner(name)
        `)
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
      const tokenSetName = Array.isArray((existing as any).token_sets) 
        ? (existing as any).token_sets[0]?.name 
        : (existing as any).token_sets?.name;
        
      const deleteChangeRecord = {
        project_id: projectId,
        token_id: null, // Set to null to avoid foreign key constraint
        source: "web_app",
        change_type: "deleted",
        before: {
          id: existing.id, // Store the original token ID in the before field
          name: existing.name,
          type: existing.type,
          value: existing.value,
          description: existing.description,
          token_set: tokenSetName,
        },
        after: null,
        created_by: currentUserName
      };
      
      console.log('Inserting delete change record:', deleteChangeRecord);
      
      const { data: insertedChange, error: deleteChangeError } = await supabase
        .from("changes")
        .insert(deleteChangeRecord)
        .select();
      
      if (deleteChangeError) {
        console.error('Error inserting delete change record:', deleteChangeError);
        console.error('Full error details:', JSON.stringify(deleteChangeError, null, 2));
      } else {
        console.log('Successfully created delete change record:', insertedChange);
      }

      await refreshTokens(selectedSetId);
      toast.success("Token deleted successfully");
    } catch (err) {
      setError("Failed to delete token.");
    }
  };

  // New set functions
  const openNewSetDialog = () => {
    setNewSetName("");
    setNewSetDescription("");
    setNewSetNameError("");
    setNewSetDialogOpen(true);
  };

  const closeNewSetDialog = () => {
    setNewSetDialogOpen(false);
    setNewSetName("");
    setNewSetDescription("");
    setNewSetNameError("");
  };

  const validateNewSetName = (name: string) => {
    if (!name.trim()) {
      setNewSetNameError("Set name is required");
      return false;
    }
    if (name.length > 50) {
      setNewSetNameError("Set name must be 50 characters or less");
      return false;
    }
    // Check if name already exists
    if (sets.some(set => set.name.toLowerCase() === name.toLowerCase())) {
      setNewSetNameError("A set with this name already exists");
      return false;
    }
    setNewSetNameError("");
    return true;
  };

  const handleCreateNewSet = async () => {
    if (!validateNewSetName(newSetName)) {
      return;
    }

    setSavingNewSet(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();

      // Determine the level for the new set (start with level 0 for Global, then 1 for Semantic, then 2 for Components)
      const existingLevels = sets.map(set => set.level);
      let newLevel = 0;
      if (existingLevels.includes(0)) {
        newLevel = existingLevels.includes(1) ? 2 : 1;
      }

      const { data: newSet, error: insertError } = await supabase
        .from("token_sets")
        .insert({
          project_id: projectId,
          name: newSetName.trim(),
          description: newSetDescription.trim() || null,
          level: newLevel,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      // Refresh sets - call the loadSets function from useEffect
      const supabaseRefresh = createSupabaseBrowserClient();
      const { data, error: setsError } = await supabaseRefresh
        .from("token_sets")
        .select("id, name, level, description")
        .eq("project_id", projectId)
        .order("level", { ascending: true });

      if (!setsError && data) {
        const list = data ?? [];
        const setsWithCounts = await Promise.all(
          list.map(async (set) => {
            const { count } = await supabaseRefresh
              .from("tokens")
              .select("*", { count: "exact", head: true })
              .eq("token_set_id", set.id);
            
            return {
              ...set,
              token_count: count || 0
            };
          })
        );
        setSets(setsWithCounts as TokenSet[]);
      }
      
      // Select the new set
      setSelectedSetId(newSet.id);
      
      toast.success("Token set created successfully");
      closeNewSetDialog();
    } catch (err) {
      setError("Failed to create token set.");
    } finally {
      setSavingNewSet(false);
    }
  };

  return (
    <div className="flex h-full flex-col w-full">
      <div className="flex flex-1 w-full">
        <aside className="w-64 border-r bg-background px-4 py-4 text-sm flex-shrink-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">Token sets</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={openNewSetDialog}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add new set</span>
            </Button>
          </div>
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
                    <span className="text-[10px] text-muted-foreground">
                      {set.token_count || 0}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <main className="flex-1 min-w-0 w-full" style={{ width: '100%' }}>
          {/* Header with set name, description, search, filter, and new token button in single line */}
          <header className="border-b px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Set name and description */}
              <div className="flex-1 min-w-0">
                {selectedSet ? (
                  <div>
                    <h1 className="text-xl font-semibold">{selectedSet.name}</h1>
                    {selectedSet.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedSet.description}
                      </p>
                    )}
                  </div>
                ) : (
                  <h1 className="text-xl font-semibold">Select a token set</h1>
                )}
              </div>
              
              {/* Search field */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for tokens"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filter dropdown */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {(type || '').charAt(0).toUpperCase() + (type || '').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* New token button */}
              <Button size="sm" onClick={openNewTokenDialog} disabled={!selectedSetId}>
                New token
              </Button>
            </div>
          </header>

          <div className="px-6 py-4">

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <div className="rounded-md border w-full overflow-x-auto" style={{ minWidth: '100%' }}>
            <table className="w-full border-collapse text-left text-xs" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium" style={{ width: '18.4%', minWidth: '140px' }}>Name</th>
                  <th className="px-3 py-2 font-medium" style={{ width: '18.4%', minWidth: '140px' }}>Type</th>
                  <th className="px-3 py-2 font-medium" style={{ width: '18.4%', minWidth: '140px' }}>Value</th>
                  <th className="px-3 py-2 font-medium" style={{ width: '18.4%', minWidth: '140px' }}>Source</th>
                  <th className="px-3 py-2 font-medium" style={{ width: '18.4%', minWidth: '140px' }}>Description</th>
                  <th className="px-3 py-2 font-medium text-right" style={{ width: '8%', minWidth: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingTokens ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-xs text-muted-foreground"
                    >
                      Loading tokens...
                    </td>
                  </tr>
                ) : tokens.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-4 text-center text-xs text-muted-foreground"
                    >
                      No tokens in this set yet.
                    </td>
                  </tr>
                ) : (
                  getPaginatedTokens().map((token) => (
                    <tr key={token.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-[11px] truncate">
                        {token.name}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {token.type}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <code className="rounded bg-muted px-2 py-0.5 text-[10px] inline-block">
                          {typeof token.value === "string"
                            ? token.value
                            : JSON.stringify(token.value)}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground">
                        {token.source}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground truncate">
                        {token.description}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditTokenDialog(token)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteConfirmation(token)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredTokens.length > tokensPerPage && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * tokensPerPage) + 1} to {Math.min(currentPage * tokensPerPage, filteredTokens.length)} of {filteredTokens.length} tokens
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <DialogTitle className="text-lg font-semibold">
                    {editingToken ? `Edit token: ${editingToken.name}` : "Create new token"}
                  </DialogTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogHeader>

              <div className="space-y-4">
                {/* Name and Type on same line */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="token-name" className="text-sm font-medium">
                      Token Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="token-name"
                        value={formName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormName(value);
                          validateTokenName(value);
                          if (value.trim()) {
                            checkNameUniqueness(value);
                          }
                        }}
                        placeholder="color.primary.500"
                        className={`font-mono ${nameError ? 'border-destructive' : isNameUnique && formName ? 'border-green-500' : ''}`}
                      />
                      {formName && !nameError && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isNameUnique ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    {nameError && (
                      <p className="text-xs text-destructive">{nameError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Length: {formName.length}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="token-type" className="text-sm font-medium">
                      Type <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formType} onValueChange={setFormType}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select token type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tokenTypes).map(([category, types]) => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {category}
                            </div>
                            {types.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dynamic Value Input Field */}
                <div className="space-y-2">
                  <Label htmlFor="token-value" className="text-sm font-medium">
                    Value <span className="text-destructive">*</span>
                  </Label>
                  {renderValueField()}
                  {valueError && (
                    <p className="text-xs text-destructive">{valueError}</p>
                  )}
                </div>

                {/* Description Textarea */}
                <div className="space-y-2">
                  <Label htmlFor="token-description" className="text-sm font-medium">
                    Description <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <textarea
                    id="token-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value.slice(0, 500))}
                    placeholder="Add a description to help your team understand this token..."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {formDescription.length}/500 characters
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveToken} 
                  disabled={saving || !!nameError || !formName.trim() || !formValue.trim()}
                >
                  {saving ? "Saving..." : editingToken ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* New Set Dialog */}
          <Dialog open={newSetDialogOpen} onOpenChange={setNewSetDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create new set</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setName">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="setName"
                    value={newSetName}
                    onChange={(e) => {
                      setNewSetName(e.target.value);
                      validateNewSetName(e.target.value);
                    }}
                    placeholder="Enter set name..."
                    className={newSetNameError ? 'border-destructive' : ''}
                  />
                  {newSetNameError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {newSetNameError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Length: {newSetName.length}/50
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setDescription">Description (optional)</Label>
                  <textarea
                    id="setDescription"
                    value={newSetDescription}
                    onChange={(e) => setNewSetDescription(e.target.value)}
                    placeholder="Enter a description..."
                    className="w-full min-h-[80px] px-3 py-2 text-sm border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {newSetDescription.length}/500 characters
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeNewSetDialog}
                  disabled={savingNewSet}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateNewSet}
                  disabled={savingNewSet || !newSetName.trim() || !!newSetNameError}
                >
                  {savingNewSet ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Confirm Deletion
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete the token <strong>"{tokenToDelete?.name}"</strong>?
                </p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. The token will be permanently removed from your project.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDeleteConfirmation}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={confirmDeleteToken}
                >
                  Delete Token
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
