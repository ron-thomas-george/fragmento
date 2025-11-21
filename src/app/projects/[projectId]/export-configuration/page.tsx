"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileCode, Palette } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

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

export default function ExportConfigurationPage({ params }: ExportConfigurationPageProps) {
  const { projectId } = use(params);
  
  // State
  const [tokenSets, setTokenSets] = useState<TokenSet[]>([]);
  const [selectedSets, setSelectedSets] = useState<string[]>([]);
  const [allSetsSelected, setAllSetsSelected] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [generatedOutput, setGeneratedOutput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load token sets and tokens
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        
        // Load token sets
        const { data: setsData } = await supabase
          .from('token_sets')
          .select(`
            id,
            name,
            description
          `)
          .eq('project_id', projectId)
          .order('name');

        // Load all tokens
        const { data: tokensData } = await supabase
          .from('tokens')
          .select(`
            id,
            name,
            type,
            value,
            resolved_value,
            token_set_id,
            token_sets!inner(name)
          `)
          .eq('project_id', projectId)
          .order('name');

        if (setsData && tokensData) {
          // Count tokens for each set
          const tokenCounts = tokensData.reduce((acc, token) => {
            acc[token.token_set_id] = (acc[token.token_set_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const formattedSets = setsData.map(set => ({
            id: set.id,
            name: set.name,
            description: set.description,
            tokenCount: tokenCounts[set.id] || 0
          }));
          
          setTokenSets(formattedSets);
          setSelectedSets(formattedSets.map(set => set.id));
          setTokens(tokensData as Token[]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  // Handle set selection
  const handleSetSelection = (setId: string, checked: boolean) => {
    if (checked) {
      setSelectedSets(prev => [...prev, setId]);
    } else {
      setSelectedSets(prev => prev.filter(id => id !== setId));
      setAllSetsSelected(false);
    }
  };

  // Handle all sets selection
  const handleAllSetsSelection = (checked: boolean) => {
    setAllSetsSelected(checked);
    if (checked) {
      setSelectedSets(tokenSets.map(set => set.id));
    } else {
      setSelectedSets([]);
    }
  };

  // Generate shadcn format output
  const generateShadcnOutput = async () => {
    setGenerating(true);
    
    try {
      // Filter tokens by selected sets
      const filteredTokens = tokens.filter(token => 
        selectedSets.includes(token.token_set_id)
      );

      // Group tokens by type and generate CSS variables
      const cssVariables: Record<string, string> = {};
      
      filteredTokens.forEach(token => {
        const value = token.resolved_value || token.value;
        let cssValue = value;
        
        // Convert token values to CSS format
        if (token.type === 'color') {
          cssValue = typeof value === 'string' ? value : JSON.stringify(value);
        } else if (token.type === 'dimension') {
          cssValue = typeof value === 'string' ? value : `${value}px`;
        } else if (token.type === 'fontFamily') {
          cssValue = Array.isArray(value) ? value.join(', ') : value;
        } else {
          cssValue = typeof value === 'string' ? value : JSON.stringify(value);
        }
        
        // Convert token name to CSS variable format
        const cssVarName = `--${token.name.replace(/[.\s]/g, '-').toLowerCase()}`;
        cssVariables[cssVarName] = cssValue;
      });

      // Generate CSS output in shadcn format
      const cssOutput = `:root {
${Object.entries(cssVariables)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join('\n')}
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;

      setGeneratedOutput(cssOutput);
      
    } catch (error) {
      console.error('Error generating output:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Download JSON file
  const downloadJson = () => {
    const filteredTokens = tokens.filter(token => 
      selectedSets.includes(token.token_set_id)
    );

    const jsonData = {
      tokens: filteredTokens.reduce((acc, token) => {
        const setName = tokenSets.find(set => set.id === token.token_set_id)?.name || 'default';
        if (!acc[setName]) {
          acc[setName] = {};
        }
        acc[setName][token.name] = {
          value: token.resolved_value || token.value,
          type: token.type
        };
        return acc;
      }, {} as Record<string, Record<string, any>>),
      metadata: {
        exportedAt: new Date().toISOString(),
        selectedSets: selectedSets.length,
        totalTokens: filteredTokens.length
      }
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tokens-export-${new Date().toISOString().split('T')[0]}.json`;
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
            <p className="text-sm text-muted-foreground">
              Configure and export your design tokens in shadcn format
            </p>
          </div>
        </div>
      </header>

      {/* Two Panel Layout */}
      <main className="grid grid-cols-2 flex-1 w-full min-h-0 max-w-none">
        {/* Left Panel - Configuration */}
        <div className="border-r p-6 overflow-y-auto">
          <div className="space-y-6">
            {/* Token Sets Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Token Sets
                </CardTitle>
                <CardDescription>
                  Choose which token sets to include in the export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* All Sets Option */}
                <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
                  <Checkbox
                    id="all-sets"
                    checked={allSetsSelected}
                    onCheckedChange={handleAllSetsSelection}
                  />
                  <Label htmlFor="all-sets" className="flex-1 font-medium">
                    All Sets
                  </Label>
                  <Badge variant="secondary">
                    {tokenSets.reduce((sum, set) => sum + set.tokenCount, 0)} tokens
                  </Badge>
                </div>

                {/* Individual Sets */}
                <div className="space-y-2">
                  {tokenSets.map((set) => (
                    <div key={set.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/25">
                      <Checkbox
                        id={set.id}
                        checked={selectedSets.includes(set.id)}
                        onCheckedChange={(checked) => handleSetSelection(set.id, checked as boolean)}
                      />
                      <Label htmlFor={set.id} className="flex-1">
                        <div className="font-medium">{set.name}</div>
                        {set.description && (
                          <div className="text-xs text-muted-foreground">{set.description}</div>
                        )}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {set.tokenCount}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Output Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="h-5 w-5" />
                  Output Configuration
                </CardTitle>
                <CardDescription>
                  Tokens will be exported in shadcn/ui CSS variables format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="text-sm font-medium mb-2">Format: CSS Variables</div>
                    <div className="text-xs text-muted-foreground">
                      Tokens will be converted to CSS custom properties compatible with shadcn/ui theming system
                    </div>
                  </div>
                  
                  <Button 
                    onClick={generateShadcnOutput}
                    disabled={selectedSets.length === 0 || generating}
                    className="w-full"
                  >
                    {generating ? "Generating..." : "Generate Files"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Output Preview */}
        <div className="p-6 overflow-y-auto flex flex-col">
          <div className="space-y-4 flex-1">
            {/* Header with Download Button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Generated Output</h2>
              {generatedOutput && (
                <Button onClick={downloadJson} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download JSON
                </Button>
              )}
            </div>

            {/* Output Display */}
            {!generatedOutput ? (
              <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg w-full">
                <FileCode className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">No output generated</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select token sets and click "Generate Files" to see the output
                </p>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">CSS Variables</Badge>
                  <span>•</span>
                  <span>{selectedSets.length} sets selected</span>
                  <span>•</span>
                  <span>{tokens.filter(t => selectedSets.includes(t.token_set_id)).length} tokens</span>
                </div>
                
                <div className="relative w-full">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto border w-full min-w-0 max-w-none whitespace-pre-wrap break-words" style={{ width: '100%' }}>
                    <code className="block w-full whitespace-pre-wrap">{generatedOutput}</code>
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
