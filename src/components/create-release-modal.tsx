"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  X, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  Palette, 
  Loader2,
  GitBranch,
  Clock,
  TrendingUp
} from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabaseClient"

interface Change {
  id: string
  type: 'created' | 'modified' | 'deleted' | 'renamed'
  tokenName: string
  tokenSet: string
  source: 'web_app' | 'figma'
  beforeValue?: any
  afterValue?: any
  description?: string
  createdBy: string
  createdAt: string
}

interface Release {
  version: string
  type: 'major' | 'minor' | 'patch'
  created_at: string
}

interface CreateReleaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  pendingChanges: Change[]
  onReleaseCreated: () => void
}

interface VersionInfo {
  major: number
  minor: number
  patch: number
}

export function CreateReleaseModal({ 
  open, 
  onOpenChange, 
  projectId, 
  pendingChanges,
  onReleaseCreated 
}: CreateReleaseModalProps) {
  const [currentVersion, setCurrentVersion] = useState<VersionInfo>({ major: 1, minor: 0, patch: 0 })
  const [versionType, setVersionType] = useState<'major' | 'minor' | 'patch'>('minor')
  const [customVersion, setCustomVersion] = useState<VersionInfo>({ major: 1, minor: 1, patch: 0 })
  const [commitMessage, setCommitMessage] = useState('')
  const [releaseNotes, setReleaseNotes] = useState('')
  const [changesExpanded, setChangesExpanded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [releases, setReleases] = useState<Release[]>([])
  const [recommendedType, setRecommendedType] = useState<'major' | 'minor' | 'patch'>('minor')

  // Load current version and release history
  useEffect(() => {
    if (open) {
      loadReleaseHistory()
      analyzeChanges()
    }
  }, [open, projectId])

  // Update custom version when version type changes
  useEffect(() => {
    const newVersion = { ...currentVersion }
    
    switch (versionType) {
      case 'major':
        newVersion.major += 1
        newVersion.minor = 0
        newVersion.patch = 0
        break
      case 'minor':
        newVersion.minor += 1
        newVersion.patch = 0
        break
      case 'patch':
        newVersion.patch += 1
        break
    }
    
    setCustomVersion(newVersion)
  }, [versionType, currentVersion])

  const loadReleaseHistory = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data } = await supabase
        .from('releases')
        .select('version, type, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data && data.length > 0) {
        setReleases(data)
        // Parse the latest version
        const latestVersion = data[0].version
        const [major, minor, patch] = latestVersion.replace('v', '').split('.').map(Number)
        setCurrentVersion({ major, minor, patch })
      }
    } catch (error) {
      console.error('Error loading release history:', error)
    }
  }

  const analyzeChanges = () => {
    const hasDeleted = pendingChanges.some(change => change.type === 'deleted')
    const hasCreated = pendingChanges.some(change => change.type === 'created')
    const hasModified = pendingChanges.some(change => change.type === 'modified')
    
    // Auto-suggest version type based on changes
    if (hasDeleted) {
      setRecommendedType('major')
      setVersionType('major')
    } else if (hasCreated) {
      setRecommendedType('minor')
      setVersionType('minor')
    } else if (hasModified) {
      setRecommendedType('patch')
      setVersionType('patch')
    }
  }

  const getVersionTypeDescription = (type: 'major' | 'minor' | 'patch') => {
    switch (type) {
      case 'major':
        return {
          badge: { text: 'Breaking', color: 'text-red-600 bg-red-50 border-red-200' },
          description: 'Breaking changes that require code updates',
          examples: 'Renamed token sets, removed tokens, changed token structure'
        }
      case 'minor':
        return {
          badge: { text: 'Feature', color: 'text-blue-600 bg-blue-50 border-blue-200' },
          description: 'New features and tokens, backward compatible',
          examples: 'Added new tokens, modified values, new color variants'
        }
      case 'patch':
        return {
          badge: { text: 'Fix', color: 'text-green-600 bg-green-50 border-green-200' },
          description: 'Bug fixes and small corrections only',
          examples: 'Fixed typos, corrected values, minor adjustments'
        }
    }
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') {
      if (value.value) return value.value
      return JSON.stringify(value)
    }
    return String(value)
  }

  const getChangesBySource = (source: 'web_app' | 'figma') => {
    return pendingChanges.filter(change => change.source === source)
  }

  const generateCommitMessage = () => {
    const changeTypes = {
      created: pendingChanges.filter(c => c.type === 'created').length,
      modified: pendingChanges.filter(c => c.type === 'modified').length,
      deleted: pendingChanges.filter(c => c.type === 'deleted').length
    }

    let message = ''
    const parts = []
    
    if (changeTypes.created > 0) parts.push(`Added ${changeTypes.created} token${changeTypes.created > 1 ? 's' : ''}`)
    if (changeTypes.modified > 0) parts.push(`Modified ${changeTypes.modified} token${changeTypes.modified > 1 ? 's' : ''}`)
    if (changeTypes.deleted > 0) parts.push(`Removed ${changeTypes.deleted} token${changeTypes.deleted > 1 ? 's' : ''}`)
    
    message = parts.join(', ')
    
    if (versionType === 'major') {
      message = `Breaking: ${message}`
    }
    
    setCommitMessage(message)
  }

  const handleCreateRelease = async () => {
    setLoading(true)
    
    try {
      const supabase = createSupabaseBrowserClient()
      const versionString = `v${customVersion.major}.${customVersion.minor}.${customVersion.patch}`
      
      // Create release record
      const { data: releaseData, error: releaseError } = await supabase
        .from('releases')
        .insert({
          project_id: projectId,
          version: versionString,
          type: versionType,
          commit_message: commitMessage,
          release_notes: releaseNotes,
          changes_count: pendingChanges.length,
          created_by: 'shadcn' // TODO: Replace with actual user
        })
        .select()
        .single()

      if (releaseError) throw releaseError

      // TODO: Integrate with GitHub to create PR
      // TODO: Send Slack notification if configured
      
      // Clear pending changes (mark as released)
      const changeIds = pendingChanges.map(change => change.id)
      await supabase
        .from('changes')
        .update({ released_in: releaseData.id })
        .in('id', changeIds)

      onReleaseCreated()
      onOpenChange(false)
      
      // Reset form
      setCommitMessage('')
      setReleaseNotes('')
      
    } catch (error) {
      console.error('Error creating release:', error)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = commitMessage.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen p-0 gap-0 overflow-hidden">
        <div className="flex h-full overflow-hidden">
          {/* Left Panel - Release Configuration (60%) */}
          <div className="flex-1 flex flex-col max-w-[60%] border-r">
            <DialogHeader className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl">Create Release</DialogTitle>
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {/* Section 1: Version Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Version Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Version Display */}
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Current Version</span>
                      <Badge variant="outline">
                        v{currentVersion.major}.{currentVersion.minor}.{currentVersion.patch}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {releases.length} releases
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {releases.length > 0 ? 'Last: ' + new Date(releases[0].created_at).toLocaleDateString() : 'No releases'}
                      </div>
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {pendingChanges.length} pending
                      </div>
                    </div>
                  </div>

                  {/* Version Type Selector */}
                  <div className="space-y-3">
                    <Label>Version Type *</Label>
                    <RadioGroup value={versionType} onValueChange={(value: 'major' | 'minor' | 'patch') => setVersionType(value)}>
                      {(['major', 'minor', 'patch'] as const).map((type) => {
                        const info = getVersionTypeDescription(type)
                        const isRecommended = type === recommendedType
                        
                        return (
                          <div key={type} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                            <RadioGroupItem value={type} id={type} className="mt-1" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={type} className="capitalize font-medium cursor-pointer">
                                  {type} ({currentVersion.major}.{currentVersion.minor}.{currentVersion.patch} → {
                                    type === 'major' ? `${currentVersion.major + 1}.0.0` :
                                    type === 'minor' ? `${currentVersion.major}.${currentVersion.minor + 1}.0` :
                                    `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch + 1}`
                                  })
                                </Label>
                                <Badge variant="outline" className={info.badge.color}>
                                  {info.badge.text}
                                </Badge>
                                {isRecommended && (
                                  <Badge variant="secondary" className="text-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Recommended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{info.description}</p>
                              <p className="text-xs text-muted-foreground">Examples: {info.examples}</p>
                            </div>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </div>

                  {/* Version Number Input */}
                  <div className="space-y-2">
                    <Label>New Version Number *</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={customVersion.major}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomVersion(prev => ({ ...prev, major: parseInt(e.target.value) || 0 }))}
                        className="w-20"
                      />
                      <span>.</span>
                      <Input
                        type="number"
                        min="0"
                        value={customVersion.minor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomVersion(prev => ({ ...prev, minor: parseInt(e.target.value) || 0 }))}
                        className="w-20"
                      />
                      <span>.</span>
                      <Input
                        type="number"
                        min="0"
                        value={customVersion.patch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomVersion(prev => ({ ...prev, patch: parseInt(e.target.value) || 0 }))}
                        className="w-20"
                      />
                      <Badge variant="outline" className="ml-2">
                        v{customVersion.major}.{customVersion.minor}.{customVersion.patch}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Release Message */}
              <Card>
                <CardHeader>
                  <CardTitle>Release Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="commit-message">Commit Message *</Label>
                      <Button variant="outline" size="sm" onClick={generateCommitMessage}>
                        Generate
                      </Button>
                    </div>
                    <Textarea
                      id="commit-message"
                      placeholder="Describe what changed in this release..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {commitMessage.length}/500 characters
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="release-notes">Detailed Release Notes (optional)</Label>
                    <Textarea
                      id="release-notes"
                      placeholder="Add detailed release notes with markdown support..."
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Changes Preview */}
              <Card>
                <CardHeader>
                  <Collapsible open={changesExpanded} onOpenChange={setChangesExpanded}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between cursor-pointer">
                        <CardTitle className="flex items-center gap-2">
                          Changes in this release ({pendingChanges.length})
                          {changesExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </CardTitle>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-4 space-y-4">
                        {/* Web App Changes */}
                        {getChangesBySource('web_app').length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Globe className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Web App Changes ({getChangesBySource('web_app').length})</span>
                            </div>
                            <div className="space-y-1 ml-6">
                              {getChangesBySource('web_app').map((change) => (
                                <div key={change.id} className="flex items-center gap-2 text-sm">
                                  {change.type === 'created' && <span className="text-green-600">✓ Added:</span>}
                                  {change.type === 'modified' && <span className="text-blue-600">✓ Modified:</span>}
                                  {change.type === 'deleted' && <span className="text-red-600">✓ Deleted:</span>}
                                  <code className="font-mono">{change.tokenName}</code>
                                  {change.type === 'created' && (
                                    <span className="text-muted-foreground">{formatValue(change.afterValue)}</span>
                                  )}
                                  {change.type === 'modified' && (
                                    <span className="text-muted-foreground">
                                      {formatValue(change.beforeValue)} → {formatValue(change.afterValue)}
                                    </span>
                                  )}
                                  {change.type === 'deleted' && (
                                    <span className="text-muted-foreground line-through">{formatValue(change.beforeValue)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Figma Changes */}
                        {getChangesBySource('figma').length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Palette className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Figma Changes ({getChangesBySource('figma').length})</span>
                            </div>
                            <div className="space-y-1 ml-6">
                              {getChangesBySource('figma').map((change) => (
                                <div key={change.id} className="flex items-center gap-2 text-sm">
                                  {change.type === 'created' && <span className="text-green-600">✓ Added:</span>}
                                  {change.type === 'modified' && <span className="text-blue-600">✓ Modified:</span>}
                                  {change.type === 'deleted' && <span className="text-red-600">✓ Deleted:</span>}
                                  <code className="font-mono">{change.tokenName}</code>
                                  {change.type === 'created' && (
                                    <span className="text-muted-foreground">{formatValue(change.afterValue)}</span>
                                  )}
                                  {change.type === 'modified' && (
                                    <span className="text-muted-foreground">
                                      {formatValue(change.beforeValue)} → {formatValue(change.afterValue)}
                                    </span>
                                  )}
                                  {change.type === 'deleted' && (
                                    <span className="text-muted-foreground line-through">{formatValue(change.beforeValue)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </CardHeader>
              </Card>
            </div>

            {/* Footer Actions */}
            <div className="border-t px-6 py-4 flex items-center justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRelease}
                disabled={!isFormValid || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Release...
                  </>
                ) : (
                  `Create Release v${customVersion.major}.${customVersion.minor}.${customVersion.patch}`
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview/Impact Analysis (40%) */}
          <div className="w-[40%] bg-muted/30 flex flex-col">
            <div className="px-6 py-4 border-b bg-background">
              <h3 className="font-semibold">Release Preview</h3>
              <p className="text-sm text-muted-foreground">
                Impact analysis and preview of your release
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {/* Release Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Release Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Version:</span>
                    <Badge>v{customVersion.major}.{customVersion.minor}.{customVersion.patch}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Type:</span>
                    <Badge variant="outline" className={getVersionTypeDescription(versionType).badge.color}>
                      {getVersionTypeDescription(versionType).badge.text}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Changes:</span>
                    <span>{pendingChanges.length} tokens</span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-600">Added:</span>
                      <span>{pendingChanges.filter(c => c.type === 'created').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Modified:</span>
                      <span>{pendingChanges.filter(c => c.type === 'modified').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Deleted:</span>
                      <span>{pendingChanges.filter(c => c.type === 'deleted').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Impact Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {pendingChanges.filter(c => c.type === 'deleted').length > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Breaking changes detected</span>
                      </div>
                    )}
                    {pendingChanges.filter(c => c.type === 'created').length > 0 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>New tokens available</span>
                      </div>
                    )}
                    {pendingChanges.filter(c => c.type === 'modified').length > 0 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Updated token values</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
