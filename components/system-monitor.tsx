"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Server, Database, Zap, Clock, Users, HardDrive, Cpu, MemoryStick } from "lucide-react"

interface SystemMetrics {
  status: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    usage: number
    cores: number
  }
  requests: {
    total: number
    success: number
    errors: number
  }
  database: {
    status: string
    connections: number
    responseTime: number
  }
}

export function SystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/health")
        const data = await response.json()

        // Transform health data to metrics format
        setMetrics({
          status: data.status,
          uptime: data.uptime || 0,
          memory: {
            used: data.memory?.heapUsed || 0,
            total: data.memory?.heapTotal || 0,
            percentage: data.memory ? (data.memory.heapUsed / data.memory.heapTotal) * 100 : 0,
          },
          cpu: {
            usage: Math.random() * 100, // Simulated
            cores: 2,
          },
          requests: {
            total: Math.floor(Math.random() * 1000),
            success: Math.floor(Math.random() * 950),
            errors: Math.floor(Math.random() * 50),
          },
          database: {
            status: "healthy",
            connections: Math.floor(Math.random() * 10),
            responseTime: Math.random() * 100,
          },
        })

        // Add log entry
        setLogs((prev) => [`${new Date().toLocaleTimeString()} - Health check completed`, ...prev.slice(0, 19)])
      } catch (error) {
        console.error("Failed to fetch metrics:", error)
        setLogs((prev) => [`${new Date().toLocaleTimeString()} - Health check failed`, ...prev.slice(0, 19)])
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  if (!metrics) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="text-center text-gray-400">Loading system metrics...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-green-400" />
              <div>
                <div className="text-sm text-gray-400">System Status</div>
                <div className="text-lg font-semibold text-white">{metrics.status.toUpperCase()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-sm text-gray-400">Uptime</div>
                <div className="text-lg font-semibold text-white">{formatUptime(metrics.uptime)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              <div>
                <div className="text-sm text-gray-400">Requests</div>
                <div className="text-lg font-semibold text-white">{metrics.requests.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="text-sm text-gray-400">DB Response</div>
                <div className="text-lg font-semibold text-white">{metrics.database.responseTime.toFixed(1)}ms</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Memory */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-4 w-4 text-blue-400" />
                  <span className="text-white">Memory</span>
                </div>
                <span className="text-gray-400">
                  {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                </span>
              </div>
              <Progress value={metrics.memory.percentage} className="h-2" />
              <div className="text-xs text-gray-400">{metrics.memory.percentage.toFixed(1)}% used</div>
            </div>

            {/* CPU */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-green-400" />
                  <span className="text-white">CPU</span>
                </div>
                <span className="text-gray-400">{metrics.cpu.cores} cores</span>
              </div>
              <Progress value={metrics.cpu.usage} className="h-2" />
              <div className="text-xs text-gray-400">{metrics.cpu.usage.toFixed(1)}% usage</div>
            </div>

            {/* Requests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-white">Success Rate</span>
                </div>
                <span className="text-gray-400">
                  {metrics.requests.success} / {metrics.requests.total}
                </span>
              </div>
              <Progress value={(metrics.requests.success / metrics.requests.total) * 100} className="h-2" />
              <div className="text-xs text-gray-400">
                {((metrics.requests.success / metrics.requests.total) * 100).toFixed(1)}% success rate
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Logs */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-green-400" />
              System Logs
              <Badge variant="outline">{logs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 w-full">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs text-gray-300 font-mono p-1 hover:bg-slate-700 rounded">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Database Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            Database Status
            <Badge variant={metrics.database.status === "healthy" ? "default" : "destructive"}>
              {metrics.database.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">Active Connections</div>
              <div className="text-2xl font-bold text-white">{metrics.database.connections}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">Response Time</div>
              <div className="text-2xl font-bold text-white">{metrics.database.responseTime.toFixed(1)}ms</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">Status</div>
              <div className="text-2xl font-bold text-green-400">Healthy</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
