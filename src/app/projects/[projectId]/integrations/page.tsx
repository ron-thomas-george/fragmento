"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Github, Slack, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabaseClient"

interface IntegrationsPageProps {
  params: Promise<{ projectId: string }>
}

interface GitHubIntegration {
  id?: string
  project_id: string
  access_token: string
  repository_owner: string
  repository_name: string
  branch_name: string
  verified: boolean
  created_at?: string
}

interface SlackIntegration {
  id?: string
  project_id: string
  webhook_url: string
  channel_name: string
  verified: boolean
  created_at?: string
}

export default function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { projectId } = use(params)
  
  // GitHub Integration State
  const [githubConfig, setGithubConfig] = useState<GitHubIntegration>({
    project_id: projectId,
    access_token: '',
    repository_owner: '',
    repository_name: '',
    branch_name: 'main',
    verified: false
  })
  const [githubVerifying, setGithubVerifying] = useState(false)
  const [githubError, setGithubError] = useState('')
  
  // Slack Integration State
  const [slackConfig, setSlackConfig] = useState<SlackIntegration>({
    project_id: projectId,
    webhook_url: '',
    channel_name: '',
    verified: false
  })
  const [slackVerifying, setSlackVerifying] = useState(false)
  const [slackError, setSlackError] = useState('')
  
  const [loading, setLoading] = useState(true)

  // Load existing integrations
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        
        // Load GitHub integration
        const { data: githubData, error: githubError } = await supabase
          .from('github_integrations')
          .select('*')
          .eq('project_id', projectId)
          .single()
        
        if (githubData && !githubError) {
          setGithubConfig(githubData)
        } else if (githubError && !githubError.message.includes('No rows')) {
          console.warn('GitHub integration table may need schema update:', githubError)
        }
        
        // Load Slack integration
        const { data: slackData, error: slackError } = await supabase
          .from('slack_integrations')
          .select('*')
          .eq('project_id', projectId)
          .single()
        
        if (slackData && !slackError) {
          setSlackConfig(slackData)
        } else if (slackError && !slackError.message.includes('No rows')) {
          console.warn('Slack integration table may need schema update:', slackError)
        }
        
      } catch (error) {
        console.error('Error loading integrations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadIntegrations()
  }, [projectId])

  // Function to provide helpful placeholder for channel name based on webhook URL
  const getChannelPlaceholder = (url: string): string => {
    if (url.includes('hooks.slack.com')) {
      return '#general'; // Default suggestion
    }
    return '#design-system';
  }

  // Handle webhook URL change and update placeholder
  const handleWebhookUrlChange = (url: string) => {
    setSlackConfig(prev => ({ 
      ...prev, 
      webhook_url: url
      // Note: Channel name needs to be filled manually as webhook URLs don't contain channel info
    }));
  }

  const verifyGitHubIntegration = async () => {
    setGithubVerifying(true)
    setGithubError('')
    
    try {
      // Verify repository access with better error handling
      const repoResponse = await fetch(`https://api.github.com/repos/${githubConfig.repository_owner}/${githubConfig.repository_name}`, {
        headers: {
          'Authorization': `Bearer ${githubConfig.access_token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      
      if (!repoResponse.ok) {
        const repoError = await repoResponse.json()
        if (repoResponse.status === 404) {
          throw new Error('Repository not found. Please check the repository owner and name.')
        } else if (repoResponse.status === 403) {
          throw new Error('Access denied. Please ensure your personal access token has the following permissions:\n• Repository access (read)\n• Contents (write)\n• Metadata (read)')
        }
        throw new Error(`Repository access error: ${repoError.message || 'Unknown error'}`)
      }

      const repoData = await repoResponse.json()
      
      // Check if we have the necessary permissions
      if (!repoData.permissions?.push) {
        throw new Error('Insufficient permissions. Your personal access token needs:\n• Contents (write) permission\n• Push access to the repository\n\nPlease update your token permissions and try again.')
      }
      
      // Verify branch exists
      const branchResponse = await fetch(`https://api.github.com/repos/${githubConfig.repository_owner}/${githubConfig.repository_name}/branches/${githubConfig.branch_name}`, {
        headers: {
          'Authorization': `Bearer ${githubConfig.access_token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      
      if (!branchResponse.ok) {
        const branchError = await branchResponse.json()
        throw new Error(`Branch "${githubConfig.branch_name}" not found in repository. Error: ${branchError.message || 'Branch does not exist'}`)
      }
      
      // Save to database
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('github_integrations')
        .upsert({
          ...githubConfig,
          verified: true
        })
      
      if (error) throw error
      
      setGithubConfig(prev => ({ ...prev, verified: true }))
      
    } catch (error: any) {
      setGithubError(error.message)
    } finally {
      setGithubVerifying(false)
    }
  }

  const verifySlackIntegration = async () => {
    setSlackVerifying(true)
    setSlackError('')
    
    try {
      // Test Slack webhook using server-side API route
      const response = await fetch('/api/slack/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook_url: slackConfig.webhook_url,
          channel_name: slackConfig.channel_name
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Unable to send message to Slack. Please check your webhook URL and channel name.')
      }
      
      // Save to database
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase
        .from('slack_integrations')
        .upsert({
          ...slackConfig,
          verified: true
        })
      
      if (error) throw error
      
      setSlackConfig(prev => ({ ...prev, verified: true }))
      
    } catch (error: any) {
      setSlackError(error.message)
    } finally {
      setSlackVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col w-full">
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col w-full">
      {/* Header */}
      <header className="border-b px-6 py-4 w-full">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-xl font-semibold">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect your project with GitHub and Slack for automated releases and notifications
            </p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-4 w-full min-w-0">
        {/* GitHub Integration */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Github className="h-6 w-6" />
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  GitHub Integration
                  {githubConfig.verified && (
                    <Badge variant="secondary" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Connect to GitHub to automatically push tokens as JSON files when releasing tokens
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="github-token">Personal Access Token *</Label>
                <Input
                  id="github-token"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={githubConfig.access_token}
                  onChange={(e) => setGithubConfig(prev => ({ ...prev, access_token: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Token needs <strong>Contents (write)</strong> permission and push access to the repository
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-owner">Repository Owner *</Label>
                <Input
                  id="github-owner"
                  placeholder="username or organization"
                  value={githubConfig.repository_owner}
                  onChange={(e) => setGithubConfig(prev => ({ ...prev, repository_owner: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-repo">Repository Name *</Label>
                <Input
                  id="github-repo"
                  placeholder="my-design-system"
                  value={githubConfig.repository_name}
                  onChange={(e) => setGithubConfig(prev => ({ ...prev, repository_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github-branch">Branch Name *</Label>
                <Input
                  id="github-branch"
                  placeholder="main"
                  value={githubConfig.branch_name}
                  onChange={(e) => setGithubConfig(prev => ({ ...prev, branch_name: e.target.value }))}
                />
              </div>
            </div>
            
            {githubError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {githubError}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                onClick={verifyGitHubIntegration}
                disabled={!githubConfig.access_token || !githubConfig.repository_owner || !githubConfig.repository_name || githubVerifying}
              >
                {githubVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Connection'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Slack Integration */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Slack className="h-6 w-6" />
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  Slack Integration
                  {slackConfig.verified && (
                    <Badge variant="secondary" className="text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Get notified in Slack when new releases are published
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="slack-webhook">Webhook URL *</Label>
                <Input
                  id="slack-webhook"
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackConfig.webhook_url}
                  onChange={(e) => handleWebhookUrlChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slack-channel">Channel Name *</Label>
                <Input
                  id="slack-channel"
                  placeholder={getChannelPlaceholder(slackConfig.webhook_url)}
                  value={slackConfig.channel_name}
                  onChange={(e) => setSlackConfig(prev => ({ ...prev, channel_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the channel where the webhook was created (e.g., #general, #design-system)
                </p>
              </div>
            </div>
            
            {slackError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                {slackError}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                onClick={verifySlackIntegration}
                disabled={!slackConfig.webhook_url || !slackConfig.channel_name || slackVerifying}
              >
                {slackVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
