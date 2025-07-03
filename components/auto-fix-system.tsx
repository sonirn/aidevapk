"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { AlertTriangle, CheckCircle, Loader2, Wrench, Zap, RefreshCw, CommandIcon as Deploy } from "lucide-react"
import { toast } from "sonner"

interface AutoFixSystemProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  systemHealth: "healthy" | "warning" | "error"
}

interface Issue {
  id: string
  type: "error" | "warning" | "info"
  title: string
  description: string
  autoFixable: boolean
  fixed: boolean
  fixInProgress: boolean
  solution?: string
}

interface DeploymentStatus {
  status: "idle" | "analyzing" | "fixing" | "deploying" | "success" | "failed"
  progress: number
  message: string
  logs: string[]
}

export function AutoFixSystem({ enabled, onToggle, systemHealth }: AutoFixSystemProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [deployment, setDeployment] = useState<DeploymentStatus>({
    status: "idle",
    progress: 0,
    message: "System ready",
    logs: [],
  })
  const [isScanning, setIsScanning] = useState(false)
  const [autoDeployEnabled, setAutoDeployEnabled] = useState(true)

  // Auto-scan for issues every 60 seconds when enabled
  useEffect(() => {
    if (!enabled) return

    const scanForIssues = async () => {
      setIsScanning(true)
      try {
        const response = await fetch("/api/auto-fix/scan")
        const data = await response.json()

        if (data.issues) {
          setIssues(data.issues)

          // Auto-fix critical issues
          const criticalIssues = data.issues.filter(
            (issue: Issue) => issue.type === "error" && issue.autoFixable && !issue.fixed,
          )

          if (criticalIssues.length > 0 && autoDeployEnabled) {
            await autoFixAndDeploy(criticalIssues)
          }
        }
      } catch (error) {
        console.error("Issue scan failed:", error)
        toast.error("Failed to scan for issues")
      } finally {
        setIsScanning(false)
      }
    }

    scanForIssues()
    const interval = setInterval(scanForIssues, 60000)
    return () => clearInterval(interval)
  }, [enabled, autoDeployEnabled])

  const autoFixAndDeploy = async (issuesToFix: Issue[]) => {
    setDeployment({
      status: "analyzing",
      progress: 10,
      message: "Analyzing issues...",
      logs: [`Starting auto-fix for ${issuesToFix.length} issues`],
    })

    try {
      // Step 1: Analyze issues
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setDeployment((prev) => ({
        ...prev,
        status: "fixing",
        progress: 30,
        message: "Applying fixes...",
        logs: [...prev.logs, "Analysis complete, applying fixes..."],
      }))

      // Step 2: Apply fixes
      for (const issue of issuesToFix) {
        const response = await fetch("/api/auto-fix/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueId: issue.id }),
        })

        if (response.ok) {
          setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, fixed: true, fixInProgress: false } : i)))
          setDeployment((prev) => ({
            ...prev,
            logs: [...prev.logs, `✅ Fixed: ${issue.title}`],
          }))
        } else {
          setDeployment((prev) => ({
            ...prev,
            logs: [...prev.logs, `❌ Failed to fix: ${issue.title}`],
          }))
        }
      }

      setDeployment((prev) => ({
        ...prev,
        status: "deploying",
        progress: 70,
        message: "Deploying fixes...",
        logs: [...prev.logs, "All fixes applied, starting deployment..."],
      }))

      // Step 3: Deploy
      const deployResponse = await fetch("/api/auto-fix/deploy", {
        method: "POST",
      })

      if (deployResponse.ok) {
        setDeployment({
          status: "success",
          progress: 100,
          message: "Deployment successful!",
          logs: [...deployment.logs, "🚀 Deployment completed successfully"],
        })
        toast.success("Issues fixed and deployed automatically!")
      } else {
        throw new Error("Deployment failed")
      }
    } catch (error) {
      setDeployment((prev) => ({
        ...prev,
        status: "failed",
        progress: 0,
        message: "Auto-fix failed",
        logs: [...prev.logs, `❌ Error: ${error}`],
      }))
      toast.error("Auto-fix and deployment failed")
    }
  }

  const manualScan = async () => {
    setIsScanning(true)
    try {
      const response = await fetch("/api/auto-fix/scan")
      const data = await response.json()
      setIssues(data.issues || [])
      toast.success(`Found ${data.issues?.length || 0} issues`)
    } catch (error) {
      toast.error("Manual scan failed")
    } finally {
      setIsScanning(false)
    }
  }

  const manualFix = async (issueId: string) => {
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, fixInProgress: true } : i)))

    try {
      const response = await fetch("/api/auto-fix/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      })

      if (response.ok) {
        setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, fixed: true, fixInProgress: false } : i)))
        toast.success("Issue fixed successfully")
      } else {
        throw new Error("Fix failed")
      }
    } catch (error) {
      setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, fixInProgress: false } : i)))
      toast.error("Failed to fix issue")
    }
  }

  const getIssueIcon = (type: string, fixed: boolean) => {
    if (fixed) return <CheckCircle className="h-4 w-4 text-green-500" />
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-500"
      case "failed":
        return "text-red-500"
      case "deploying":
        return "text-blue-500"
      case "fixing":
        return "text-yellow-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-400" />
            Auto-Fix System
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "Active" : "Disabled"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-white font-medium">Enable Auto-Fix System</div>
              <div className="text-sm text-gray-400">Automatically detect and fix issues, then redeploy</div>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-white font-medium">Auto-Deploy Fixes</div>
              <div className="text-sm text-gray-400">Automatically deploy after fixing critical issues</div>
            </div>
            <Switch checked={autoDeployEnabled} onCheckedChange={setAutoDeployEnabled} />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={manualScan}
              disabled={isScanning}
              variant="outline"
              className="border-slate-600 bg-transparent"
            >
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Scan Now
            </Button>
            <Button
              onClick={() => autoFixAndDeploy(issues.filter((i) => i.autoFixable && !i.fixed))}
              disabled={deployment.status !== "idle" || issues.filter((i) => i.autoFixable && !i.fixed).length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Fix & Deploy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deployment Status */}
      {deployment.status !== "idle" && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Deploy className="h-5 w-5 text-blue-400" />
              Deployment Status
              <Badge variant="outline" className={getStatusColor(deployment.status)}>
                {deployment.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{deployment.message}</span>
                <span className="text-gray-400">{deployment.progress}%</span>
              </div>
              <Progress value={deployment.progress} className="h-2" />
            </div>

            <ScrollArea className="h-32 w-full rounded border border-slate-600 p-2">
              <div className="space-y-1">
                {deployment.logs.map((log, index) => (
                  <div key={index} className="text-xs text-gray-300 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Issues List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            Detected Issues
            <Badge variant="outline">{issues.length} total</Badge>
            <Badge variant="outline" className="text-red-400">
              {issues.filter((i) => i.type === "error" && !i.fixed).length} errors
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <div className="text-white font-medium">No Issues Found</div>
              <div className="text-gray-400">System is running smoothly</div>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <Alert key={issue.id} className="bg-slate-700 border-slate-600">
                  <div className="flex items-start gap-3">
                    {getIssueIcon(issue.type, issue.fixed)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-white font-medium">{issue.title}</div>
                        <Badge variant={issue.type === "error" ? "destructive" : "secondary"}>{issue.type}</Badge>
                        {issue.autoFixable && (
                          <Badge variant="outline" className="text-green-400">
                            Auto-fixable
                          </Badge>
                        )}
                        {issue.fixed && (
                          <Badge variant="outline" className="text-green-400">
                            Fixed
                          </Badge>
                        )}
                      </div>
                      <AlertDescription className="text-gray-300">{issue.description}</AlertDescription>
                      {issue.solution && <div className="text-sm text-blue-400 mt-2">Solution: {issue.solution}</div>}
                    </div>
                    {issue.autoFixable && !issue.fixed && (
                      <Button
                        size="sm"
                        onClick={() => manualFix(issue.id)}
                        disabled={issue.fixInProgress}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {issue.fixInProgress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wrench className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
