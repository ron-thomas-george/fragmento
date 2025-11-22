"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, ChevronRight, Globe, Palette, AlertCircle, Clock, User, GitBranch, MessageSquare, Download, MoreHorizontal, Sparkles, Package, Filter, X, ExternalLink, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation";

interface Change {
  id: string;
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  tokenName: string;
  tokenSet: string;
  source: 'web_app' | 'figma';
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
  versionType: 'major' | 'minor' | 'patch';
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

  // Release details sheet
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [releaseTokens, setReleaseTokens] = useState<any[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);

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
        
        console.log('Loading data for project:', projectId);
        
        // Load pending changes - only unreleased changes
        const { data: changesData, error: changesError } = await supabase
          .from('changes')
          .select(`
            id,
            change_type,
            source,
            before,
            after,
            created_at,
            created_by,
            token_id
          `)
          .eq('project_id', projectId)
          .is('released_in', null)
          .order('created_at', { ascending: false });

        console.log('Raw changes data:', changesData);

        console.log('Changes query result:', { changesData, changesError });

        if (changesError) {
          console.error('Error loading changes:', changesError);
        } else if (changesData && changesData.length > 0) {
          // Separate deleted tokens from other changes
          const deletedChanges = changesData.filter(change => change.change_type === 'deleted');
          const nonDeletedChanges = changesData.filter(change => change.change_type !== 'deleted');
          
          console.log('Deleted changes:', deletedChanges);
          console.log('Non-deleted changes:', nonDeletedChanges);
          
          // Get token details for non-deleted changes only
          const tokenIds = nonDeletedChanges.map(change => change.token_id).filter(Boolean);
          console.log('Token IDs to fetch:', tokenIds);
          
          let tokensData: any[] = [];
          if (tokenIds.length > 0) {
            const { data: fetchedTokensData, error: tokensError } = await supabase
              .from('tokens')
              .select(`
                id,
                name,
                type,
                description,
                token_sets!inner(
                  name
                )
              `)
              .in('id', tokenIds);
              
            console.log('Tokens data:', fetchedTokensData, 'Tokens error:', tokensError);
            tokensData = fetchedTokensData || [];
          }
          
          const transformedChanges: Change[] = (changesData || []).map((change: any) => {
            const token = tokensData?.find(t => t.id === change.token_id);
            const tokenSet = Array.isArray(token?.token_sets) 
              ? token.token_sets[0] 
              : token?.token_sets;
            
            // Get token name based on change type
            let tokenName = token?.name;
            let tokenSetName = tokenSet?.name;
            let description = token?.description;
            
            if (change.change_type === 'deleted') {
              // For deleted tokens, get info from before data since token no longer exists
              console.log('Processing deleted token change:', change);
              console.log('Before data:', change.before);
              tokenName = change.before?.name || tokenName;
              description = change.before?.description || description;
              tokenSetName = change.before?.token_set || tokenSetName;
              console.log('Extracted data - name:', tokenName, 'set:', tokenSetName);
            } else if (change.change_type === 'created' && !tokenName) {
              // For created tokens, get name from after data if token is not found
              tokenName = change.after?.name;
              description = change.after?.description;
            }
            
            return {
              id: change.id,
              type: change.change_type as 'created' | 'modified' | 'deleted' | 'renamed',
              tokenName: tokenName || 'Unknown Token',
              tokenSet: tokenSetName || 'Unknown Set',
              source: change.source as 'web_app' | 'figma',
              beforeValue: change.before,
              afterValue: change.after,
              description: description,
              createdBy: change.created_by || 'Unknown User',
              createdAt: change.created_at,
              impactCount: 0, // TODO: Calculate impact
              affectedTokens: [] // TODO: Calculate affected tokens
            };
          });
          console.log('Transformed changes:', transformedChanges);
          setPendingChanges(transformedChanges);
        } else {
          console.log('No changes found');
          setPendingChanges([]);
        }

        // Load releases
        const { data: releasesData, error: releasesError } = await supabase
          .from('releases')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (releasesError) {
          console.error('Error loading releases:', releasesError);
        } else {
          const transformedReleases: Release[] = (releasesData || []).map(release => ({
            id: release.id,
            version: release.version,
            versionType: release.type as 'major' | 'minor' | 'patch',
            commitMessage: release.commit_message,
            publishedBy: release.created_by || 'Unknown User',
            publishedAt: release.created_at,
            changesCount: release.changes_count || 0,
            webAppChanges: 0, // TODO: Calculate from changes
            figmaChanges: 0, // TODO: Calculate from changes
            githubPrUrl: undefined, // TODO: Get from GitHub integration
            githubPrNumber: undefined, // TODO: Get from GitHub integration
            slackNotified: false // TODO: Get from Slack integration
          }));
          setReleases(transformedReleases);
        }

        // Don't create artificial changes - only show real pending changes

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  // Download release tokens as JSON
  const downloadReleaseJSON = async (release: Release) => {
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Get all tokens that were included in this release
      const { data: releaseChanges } = await supabase
        .from('changes')
        .select(`
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
        `)
        .eq('released_in', release.id)
        .order('created_at', { ascending: false });

      if (!releaseChanges || releaseChanges.length === 0) {
        console.warn('No tokens found for this release');
        return;
      }

      // Transform the data into a structured JSON format
      const tokensBySet: Record<string, any> = {};
      
      releaseChanges.forEach(change => {
        const token = (change.tokens as any);
        const setName = (token.token_sets as any)?.name || 'global';
        
        if (!tokensBySet[setName]) {
          tokensBySet[setName] = {};
        }
        
        // Use the final value (after change) for the JSON
        const finalValue = change.change_type === 'deleted' 
          ? null 
          : (token.resolved_value || token.value);
          
        if (change.change_type !== 'deleted') {
          tokensBySet[setName][token.name] = {
            value: finalValue,
            type: token.type,
            description: token.description || undefined
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
          generatedAt: new Date().toISOString()
        }
      };

      // Create and download the file
      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `tokens-${release.version.replace('v', '')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading release JSON:', error);
    }
  };

  // Generate GitHub PR URL for a release
  const getGitHubPRUrl = async (release: Release) => {
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Get GitHub integration settings
      const { data: githubConfig } = await supabase
        .from('github_integrations')
        .select('repository_owner, repository_name')
        .eq('project_id', projectId)
        .single();

      if (!githubConfig) {
        console.warn('No GitHub integration found for this project');
        return null;
      }

      const { repository_owner, repository_name } = githubConfig;
      
      // For now, we'll link to the commits page with the release version as search
      // In a real implementation, you'd store the actual PR URL when creating the release
      const githubUrl = `https://github.com/${repository_owner}/${repository_name}/commits?q=${encodeURIComponent(release.commitMessage)}`;
      
      return githubUrl;
    } catch (error) {
      console.error('Error generating GitHub URL:', error);
      return null;
    }
  };

  // Open GitHub PR in new tab
  const openGitHubPR = async (release: Release) => {
    const url = await getGitHubPRUrl(release);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('Could not generate GitHub URL for this release');
    }
  };

  // Load tokens for a specific release
  const loadReleaseTokens = async (release: Release) => {
    setLoadingTokens(true);
    setSelectedRelease(release);
    setSheetOpen(true);
    
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Get all changes that were included in this release
      const { data: releaseChanges } = await supabase
        .from('changes')
        .select(`
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
        `)
        .eq('released_in', release.id)
        .order('created_at', { ascending: false });

      if (releaseChanges) {
        // Transform the data to show what tokens were pushed
        const tokensData = releaseChanges.map(change => {
          const token = (change.tokens as any);
          return {
            id: token.id,
            name: token.name,
            type: token.type,
            value: token.resolved_value || token.value,
            description: token.description,
            tokenSet: (token.token_sets as any)?.name || 'Unknown',
            changeType: change.change_type,
            beforeValue: change.before,
            afterValue: change.after
          };
        });
        
        setReleaseTokens(tokensData);
      }
    } catch (error) {
      console.error('Error loading release tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  // Filter pending changes
  const filteredPendingChanges = pendingChanges.filter(change => {
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
        (change.afterValue && String(change.afterValue).toLowerCase().includes(searchLower)) ||
        (change.beforeValue && String(change.beforeValue).toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Filter releases
  const filteredReleases = releases.filter(release => {
    // Type filter
    if (releaseTypeFilter !== "all" && release.versionType !== releaseTypeFilter) {
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
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
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
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      // Handle JSON values from database
      if (value.value) return value.value;
      return JSON.stringify(value);
    }
    return String(value);
  };

  return (
    <div className="flex min-h-screen flex-col w-full">
      {/* Header Section */}
      <header className="border-b px-6 py-4 w-full">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-semibold">Versions & Releases</h1>
            <p className="text-sm text-muted-foreground">
              Manage pending changes and create releases to push tokens to GitHub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              disabled={pendingChanges.length === 0}
              onClick={() => {
                if (pendingChanges.length === 0) return;
                setDiscardAllDialogOpen(true);
              }}
            >
              Discard All Changes
            </Button>
            <Button 
              size="sm"
              disabled={pendingChanges.length === 0}
              onClick={() => router.push(`/projects/${projectId}/versions/create`)}
              title={pendingChanges.length === 0 ? "No pending changes to release" : "Create a new release with pending changes"}
            >
              Create Release
            </Button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-4 w-full min-w-0">
        {/* Pending Changes Section */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-4 w-full">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Pending Changes</h2>
              <Badge variant="secondary">{filteredPendingChanges.length}</Badge>
              {(sourceFilter !== "all" || typeFilter !== "all" || pendingSearchTerm.trim()) && (
                <Badge variant="outline" className="text-xs">
                  {pendingChanges.length} total
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search changes..."
                value={pendingSearchTerm}
                onChange={(e) => setPendingSearchTerm(e.target.value)}
                className="w-48"
              />
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="web_app">Web App</SelectItem>
                  <SelectItem value="figma">Figma</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border p-8 text-center">
              <div className="animate-spin mx-auto h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
              <p className="text-muted-foreground">Loading changes...</p>
            </div>
          ) : pendingChanges.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center w-full">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">✨ All Clear</h3>
              <p className="text-muted-foreground mb-4">No pending changes to release</p>
              <p className="text-sm text-muted-foreground mb-6">
                Changes will appear here when you modify tokens in the app or push updates from Figma. After creating a release, this section will be empty until new changes are made.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/tokens`)}
                >
                  Create Token
                </Button>
                <Button variant="outline" size="sm">Push from Figma</Button>
              </div>
            </div>
          ) : filteredPendingChanges.length === 0 ? (
            <div className="rounded-lg border p-8 text-center w-full">
              <Filter className="mx-auto h-8 w-8 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No changes found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No changes match your current filters or search term
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
            <div className="rounded-lg border bg-card w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium" style={{ width: '16.66%', minWidth: '120px' }}>Change</th>
                    <th className="px-3 py-2 font-medium" style={{ width: '16.66%', minWidth: '120px' }}>Token</th>
                    <th className="px-3 py-2 font-medium" style={{ width: '16.66%', minWidth: '120px' }}>Value</th>
                    <th className="px-3 py-2 font-medium" style={{ width: '16.66%', minWidth: '120px' }}>Set</th>
                    <th className="px-3 py-2 font-medium" style={{ width: '16.66%', minWidth: '120px' }}>Source</th>
                    <th className="px-3 py-2 font-medium" style={{ width: '16.66%', minWidth: '120px' }}>Time</th>
                    <th className="px-3 py-2 font-medium text-right" style={{ width: '8%', minWidth: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPendingChanges.map((change) => (
                    <tr key={change.id} className="border-b hover:bg-muted/25">
                      <td className="px-3 py-2 text-[11px]">
                        {change.type === 'modified' && <Badge variant="outline" className="text-blue-600 text-[10px]">Modified</Badge>}
                        {change.type === 'created' && <Badge variant="outline" className="text-green-600 text-[10px]">Added</Badge>}
                        {change.type === 'deleted' && <Badge variant="outline" className="text-red-600 text-[10px]">Deleted</Badge>}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <code className="font-mono">{change.tokenName}</code>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        {change.type === 'created' && (
                          <code className="bg-muted px-2 py-0.5 rounded text-[10px]">{formatValue(change.afterValue)}</code>
                        )}
                        {change.type === 'modified' && (
                          <div className="space-y-1">
                            <div className="text-[10px] text-muted-foreground">Before: <code className="bg-muted px-1 rounded">{formatValue(change.beforeValue)}</code></div>
                            <div className="text-[10px]">After: <code className="bg-muted px-1 rounded">{formatValue(change.afterValue)}</code></div>
                          </div>
                        )}
                        {change.type === 'deleted' && (
                          <code className="bg-muted px-2 py-0.5 rounded text-[10px]">{formatValue(change.beforeValue)}</code>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <code className="bg-muted px-2 py-0.5 rounded text-[10px]">{change.tokenSet}</code>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          {change.source === 'web_app' && (
                            <>
                              <Globe className="h-3 w-3 text-blue-600" />
                              <span className="text-blue-600">Web App</span>
                            </>
                          )}
                          {change.source === 'figma' && (
                            <>
                              <Palette className="h-3 w-3 text-purple-600" />
                              <span className="text-purple-600">Figma</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {getRelativeTime(change.createdAt)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">by {change.createdBy}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Release History Section */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-4 w-full">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Release History</h2>
              <Badge variant="secondary">{filteredReleases.length}</Badge>
              {(releaseTypeFilter !== "all" || releaseSearchTerm.trim()) && (
                <Badge variant="outline" className="text-xs">
                  {releases.length} total
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search releases..." 
                value={releaseSearchTerm}
                onChange={(e) => setReleaseSearchTerm(e.target.value)}
                className="w-48" 
              />
              <Select value={releaseTypeFilter} onValueChange={setReleaseTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="patch">Patch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {releases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground w-full">
              <p>No releases yet. Create your first release to see it here.</p>
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="rounded-lg border p-8 text-center w-full">
              <Filter className="mx-auto h-8 w-8 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">No releases found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No releases match your current filters or search term
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setReleaseTypeFilter("all");
                  setReleaseSearchTerm("");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden w-full">
              <table className="w-full border-collapse text-left text-xs" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium" style={{ width: '12%', minWidth: '100px' }}>Version</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ width: '10%', minWidth: '80px' }}>Type</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ width: '30%', minWidth: '200px' }}>Message</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ width: '12%', minWidth: '100px' }}>Changes</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ width: '18%', minWidth: '140px' }}>Released</th>
                    <th className="px-3 py-2 text-left font-medium" style={{ width: '18%', minWidth: '140px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReleases.map((release) => (
                    <tr key={release.id} className="border-b hover:bg-muted/25">
                      <td className="px-3 py-2 text-[11px]">
                        <div className="font-medium">{release.version}</div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <Badge variant={release.versionType === 'major' ? 'destructive' : release.versionType === 'minor' ? 'default' : 'secondary'} className="text-[10px]">
                          {(release.versionType || 'patch').charAt(0).toUpperCase() + (release.versionType || 'patch').slice(1)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <div className="max-w-xs truncate" title={release.commitMessage}>
                          {release.commitMessage}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <div className="text-muted-foreground">
                          {release.changesCount} changes
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <div>
                          <div>{getRelativeTime(release.publishedAt)}</div>
                          <div className="text-[10px] text-muted-foreground">by {release.publishedBy}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-[10px]"
                            onClick={() => loadReleaseTokens(release)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={() => downloadReleaseJSON(release)}
                            title="Download tokens JSON"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={() => openGitHubPR(release)}
                            title="View on GitHub"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Release Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[600px] sm:w-[600px] p-6">
          <SheetHeader className="pb-6">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Release {selectedRelease?.version} Details
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground mt-2">
              Tokens that were pushed to GitHub in this release
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6">
            {/* Release Info */}
            <div className="rounded-lg border p-6 bg-muted/50">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Version:</span>
                  <div className="font-medium text-base">{selectedRelease?.version}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Type:</span>
                  <div className="mt-1">
                    <Badge variant={selectedRelease?.versionType === 'major' ? 'destructive' : selectedRelease?.versionType === 'minor' ? 'default' : 'secondary'}>
                      {selectedRelease?.versionType}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Released:</span>
                  <div className="text-sm">{selectedRelease ? getRelativeTime(selectedRelease.publishedAt) : ''}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs">Changes:</span>
                  <div className="text-sm">{selectedRelease?.changesCount} tokens</div>
                </div>
                <div className="col-span-2 space-y-1">
                  <span className="text-muted-foreground text-xs">Commit Message:</span>
                  <div className="font-medium">{selectedRelease?.commitMessage}</div>
                </div>
              </div>
            </div>

            {/* Tokens List */}
            <div className="space-y-4">
              <h3 className="font-medium text-base">Tokens Pushed to GitHub</h3>
              
              {loadingTokens ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : releaseTokens.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No tokens found for this release
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {releaseTokens.map((token) => (
                    <div key={token.id} className="rounded-lg border p-4 bg-background">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono font-medium">{token.name}</code>
                          <Badge variant="outline" className="text-xs">
                            {token.changeType === 'created' && '➕ Added'}
                            {token.changeType === 'modified' && '🔄 Modified'}
                            {token.changeType === 'deleted' && '❌ Deleted'}
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">{token.type}</Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs min-w-[40px]">Set:</span>
                          <code className="bg-muted px-2 py-1 rounded text-xs">{token.tokenSet}</code>
                        </div>
                        
                        {token.changeType === 'created' && (
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs min-w-[40px]">Value:</span>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {typeof token.value === 'string' ? token.value : JSON.stringify(token.value)}
                            </code>
                          </div>
                        )}
                        
                        {token.changeType === 'modified' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs min-w-[40px]">Before:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {typeof token.beforeValue?.value === 'string' ? token.beforeValue.value : JSON.stringify(token.beforeValue)}
                              </code>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground text-xs min-w-[40px]">After:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {typeof token.afterValue?.value === 'string' ? token.afterValue.value : JSON.stringify(token.afterValue)}
                              </code>
                            </div>
                          </div>
                        )}
                        
                        {token.changeType === 'deleted' && (
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-xs min-w-[40px]">Value:</span>
                            <code className="bg-muted px-2 py-1 rounded text-xs line-through">
                              {typeof token.beforeValue?.value === 'string' ? token.beforeValue.value : JSON.stringify(token.beforeValue)}
                            </code>
                          </div>
                        )}
                        
                        {token.description && (
                          <div className="flex items-start gap-3 pt-1">
                            <span className="text-muted-foreground text-xs min-w-[40px] mt-0.5">Description:</span>
                            <span className="text-xs leading-relaxed">{token.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
              This will remove <span className="font-medium">{selectedChange?.tokenName}</span> from the pending changes list. This action cannot be undone.
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
                    .from('changes')
                    .delete()
                    .eq('id', selectedChange.id);

                  if (error) {
                    console.error('Error discarding change:', error);
                  } else {
                    setPendingChanges((prev) => prev.filter((change) => change.id !== selectedChange.id));
                    setDiscardDialogOpen(false);
                    setSelectedChange(null);
                  }
                } catch (error) {
                  console.error('Unexpected error discarding change:', error);
                } finally {
                  setDiscardingChange(false);
                }
              }}
              disabled={discardingChange}
            >
              {discardingChange ? 'Discarding…' : 'Discard change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard all changes dialog */}
      <Dialog open={discardAllDialogOpen} onOpenChange={setDiscardAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard all pending changes?</DialogTitle>
            <DialogDescription>
              This will remove all pending tokens for this project. This action cannot be undone.
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
                    .from('changes')
                    .delete()
                    .eq('project_id', projectId)
                    .is('released_in', null);

                  if (error) {
                    console.error('Error discarding all changes:', error);
                  } else {
                    setPendingChanges([]);
                    setDiscardAllDialogOpen(false);
                  }
                } catch (error) {
                  console.error('Unexpected error discarding all changes:', error);
                } finally {
                  setDiscardingAll(false);
                }
              }}
              disabled={discardingAll}
            >
              {discardingAll ? 'Discarding…' : 'Discard all changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
