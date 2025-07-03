"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Bot, Activity, AlertTriangle, CheckCircle } from "lucide-react"
import { AIChat } from "@/components/ai-chat"
import { SystemMonitor } from "@/components/system-monitor"
import { APKConverter } from "@/components/apk-converter"
import { AutoFixSystem } from "@/components/auto-fix-system"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("converter")
  const [systemHealth, setSystemHealth] = useState<"healthy" | "warning" | "error">("healthy")
  const [autoFixEnabled, setAutoFixEnabled] = useState(true)
  const [lastHealthCheck, setLastHealthCheck] = useState<Date>(new Date())

  // Auto health check every 30 seconds
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health")
        const data = await response.json()
        setSystemHealth(response.ok ? "healthy" : "warning")
        setLastHealthCheck(new Date())
      } catch (error) {
        setSystemHealth("error")
        console.error("Health check failed:", error)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getHealthColor = () => {
    switch (systemHealth) {
      case "healthy":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getHealthIcon = () => {
    switch (systemHealth) {
      case "healthy":
        return <CheckCircle className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "error":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Smartphone className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">APK Converter</h1>
            <Badge variant="secondary" className="bg-blue-600 text-white">
              AI Powered
            </Badge>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Convert Android APK files to debug, sandbox, and combined modes with AI monitoring
          </p>

          {/* System Status */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${getHealthColor()}`}>
              {getHealthIcon()}
              <span className="text-sm font-medium">
                System {systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1)}
              </span>
            </div>
            <div className="text-sm text-gray-400">Last check: {lastHealthCheck.toLocaleTimeString()}</div>
            {autoFixEnabled && (
              <Badge variant="outline" className="text-green-400 border-green-400">
                Auto-Fix Enabled
              </Badge>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger value="converter" className="data-[state=active]:bg-blue-600">
              <Smartphone className="h-4 w-4 mr-2" />
              APK Converter
            </TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-blue-600">
              <Bot className="h-4 w-4 mr-2" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-blue-600">
              <Activity className="h-4 w-4 mr-2" />
              System Monitor
            </TabsTrigger>
            <TabsTrigger value="autofix" className="data-[state=active]:bg-blue-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Auto-Fix System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="converter" className="mt-6">
            <APKConverter />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-400" />
                  AI Assistant
                  <Badge variant="secondary">Expert Mode</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIChat />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="mt-6">
            <SystemMonitor />
          </TabsContent>

          <TabsContent value="autofix" className="mt-6">
            <AutoFixSystem enabled={autoFixEnabled} onToggle={setAutoFixEnabled} systemHealth={systemHealth} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
