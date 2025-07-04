import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_NEON_NEON_NEON_DATABASE_URL!)

export async function POST() {
  try {
    console.log("🧠 Starting intelligent system scan with AI analysis...")

    // Gather comprehensive system data
    const systemData = await gatherComprehensiveSystemData()

    // AI-powered analysis
    const aiAnalysis = await generateText({
      model: xai("grok-beta"),
      system: `You are an expert system administrator and developer with deep knowledge of:
      - Next.js applications and deployment
      - Database optimization and troubleshooting
      - API performance and reliability
      - Security best practices
      - Vercel deployment platform
      - Error pattern recognition
      - Performance optimization
      
      Analyze the provided system data and identify:
      1. Critical issues requiring immediate attention
      2. Performance bottlenecks and optimization opportunities
      3. Security vulnerabilities or concerns
      4. Error patterns and their root causes
      5. Deployment and infrastructure issues
      
      Provide specific, actionable recommendations with priority levels.`,
      prompt: `Analyze this system data and provide detailed findings:

      System Status: ${JSON.stringify(systemData, null, 2)}
      
      Focus on:
      - Database performance and connection issues
      - API endpoint reliability and response times
      - Error frequency and patterns
      - Deployment status and failures
      - Security concerns
      - Performance metrics
      
      Provide your analysis in this format:
      CRITICAL_ISSUES: [list critical issues]
      PERFORMANCE_ISSUES: [list performance problems]
      SECURITY_CONCERNS: [list security issues]
      RECOMMENDATIONS: [list specific fixes with priority]`,
    })

    // Parse AI analysis
    const analysis = parseAIAnalysis(aiAnalysis.text)

    // Generate intelligent issues based on AI analysis
    const intelligentIssues = await generateIntelligentIssues(analysis, systemData)

    // Log AI analysis
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        'Intelligent system scan completed with AI analysis',
        'intelligent-scan',
        ${JSON.stringify({
          issuesFound: intelligentIssues.length,
          aiAnalysis: aiAnalysis.text.substring(0, 500),
          systemMetrics: {
            dbResponseTime: systemData.database.responseTime,
            apiEndpoints: Object.keys(systemData.apis).length,
            errorCount: systemData.errors.length,
          },
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      issues: intelligentIssues,
      aiAnalysis: analysis,
      systemData,
      timestamp: new Date().toISOString(),
      summary: {
        total: intelligentIssues.length,
        critical: intelligentIssues.filter((i) => i.severity === "critical").length,
        high: intelligentIssues.filter((i) => i.severity === "high").length,
        medium: intelligentIssues.filter((i) => i.severity === "medium").length,
        low: intelligentIssues.filter((i) => i.severity === "low").length,
      },
    })
  } catch (error) {
    console.error("Intelligent scan failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`Intelligent scan failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'intelligent-scan',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log intelligent scan error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Intelligent scan failed",
        issues: [],
      },
      { status: 500 },
    )
  }
}

async function gatherComprehensiveSystemData() {
  const systemData = {
    timestamp: new Date().toISOString(),
    database: { status: "unknown", responseTime: 0, connectionCount: 0 },
    apis: {},
    errors: [],
    performance: {},
    security: {},
    deployments: [],
    environment: {},
    resources: {},
  }

  try {
    // Database comprehensive check
    const dbStart = Date.now()
    await sql`SELECT 1`
    const dbResponseTime = Date.now() - dbStart

    // Check database connections
    const connectionInfo = await sql`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `

    systemData.database = {
      status: "healthy",
      responseTime: dbResponseTime,
      connectionCount: connectionInfo[0]?.active_connections || 0,
    }

    // Recent errors with pattern analysis
    const recentErrors = await sql`
      SELECT level, message, source, created_at, metadata 
      FROM system_logs 
      WHERE level IN ('error', 'warn') 
      AND created_at > NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC 
      LIMIT 50
    `
    systemData.errors = recentErrors

    // API comprehensive health check
    const endpoints = [
      { path: "/api/health", method: "GET" },
      { path: "/api/convert", method: "POST", body: { test: true } },
      { path: "/api/chat", method: "POST", body: { test: true } },
      { path: "/api/auto-fix/scan", method: "GET" },
      { path: "/api/ai-maintenance", method: "GET" },
    ]

    for (const endpoint of endpoints) {
      try {
        const start = Date.now()
        const response = await fetch(`https://v0-aiapktodev.vercel.app${endpoint.path}`, {
          method: endpoint.method,
          headers: { "Content-Type": "application/json" },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
          signal: AbortSignal.timeout(10000),
        })

        const responseTime = Date.now() - start
        systemData.apis[endpoint.path] = {
          status: response.ok || response.status === 400 ? "healthy" : "unhealthy",
          statusCode: response.status,
          responseTime,
          method: endpoint.method,
        }
      } catch (error) {
        systemData.apis[endpoint.path] = {
          status: "error",
          error: String(error),
          method: endpoint.method,
        }
      }
    }

    // Vercel deployment status
    try {
      const deploymentsResponse = await fetch(`https://api.vercel.com/v2/deployments?limit=10`, {
        headers: {
          Authorization: `Bearer 6bDrCUm5scYc7gBwRQIYg7A2`,
        },
      })

      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json()
        systemData.deployments = deploymentsData.deployments || []
      }
    } catch (error) {
      console.log("Failed to fetch deployments:", error)
    }

    // Environment check
    const requiredEnvVars = [
      "NEON_NEON_NEON_NEON_DATABASE_URL",
      "XAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]

    systemData.environment = requiredEnvVars.reduce(
      (acc, envVar) => {
        acc[envVar] = !!process.env[envVar]
        return acc
      },
      {} as Record<string, boolean>,
    )

    // Performance metrics
    systemData.performance = {
      averageDbResponseTime: dbResponseTime,
      averageApiResponseTime:
        Object.values(systemData.apis).reduce((sum, api: any) => sum + (api.responseTime || 0), 0) /
        Object.keys(systemData.apis).length,
      errorRate: recentErrors.length,
      deploymentSuccessRate:
        systemData.deployments.filter((d: any) => d.state === "READY").length / systemData.deployments.length || 0,
    }
  } catch (error) {
    console.error("Failed to gather comprehensive system data:", error)
    systemData.database.status = "error"
  }

  return systemData
}

function parseAIAnalysis(aiText: string) {
  const analysis = {
    criticalIssues: [],
    performanceIssues: [],
    securityConcerns: [],
    recommendations: [],
  }

  try {
    const sections = aiText.split(/CRITICAL_ISSUES:|PERFORMANCE_ISSUES:|SECURITY_CONCERNS:|RECOMMENDATIONS:/)

    if (sections.length >= 2) {
      analysis.criticalIssues = extractListItems(sections[1])
    }
    if (sections.length >= 3) {
      analysis.performanceIssues = extractListItems(sections[2])
    }
    if (sections.length >= 4) {
      analysis.securityConcerns = extractListItems(sections[3])
    }
    if (sections.length >= 5) {
      analysis.recommendations = extractListItems(sections[4])
    }
  } catch (error) {
    console.log("Failed to parse AI analysis:", error)
  }

  return analysis
}

function extractListItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("CRITICAL_ISSUES") && !line.startsWith("PERFORMANCE"))
    .slice(0, 10) // Limit to 10 items per section
}

async function generateIntelligentIssues(analysis: any, systemData: any) {
  const issues = []

  // Generate issues based on AI analysis
  analysis.criticalIssues.forEach((issue: string, index: number) => {
    issues.push({
      id: `ai-critical-${index}`,
      type: "error",
      severity: "critical",
      title: "AI Detected Critical Issue",
      description: issue,
      autoFixable: true,
      fixed: false,
      fixInProgress: false,
      solution: "Apply AI-recommended fix",
      aiGenerated: true,
    })
  })

  analysis.performanceIssues.forEach((issue: string, index: number) => {
    issues.push({
      id: `ai-performance-${index}`,
      type: "warning",
      severity: "high",
      title: "AI Detected Performance Issue",
      description: issue,
      autoFixable: true,
      fixed: false,
      fixInProgress: false,
      solution: "Apply AI-recommended optimization",
      aiGenerated: true,
    })
  })

  analysis.securityConcerns.forEach((issue: string, index: number) => {
    issues.push({
      id: `ai-security-${index}`,
      type: "warning",
      severity: "high",
      title: "AI Detected Security Concern",
      description: issue,
      autoFixable: true,
      fixed: false,
      fixInProgress: false,
      solution: "Apply AI-recommended security fix",
      aiGenerated: true,
    })
  })

  // Generate issues based on system data analysis
  if (systemData.database.responseTime > 5000) {
    issues.push({
      id: "database-slow-response",
      type: "warning",
      severity: "medium",
      title: "Database Slow Response Time",
      description: `Database response time is ${systemData.database.responseTime}ms (>5000ms threshold)`,
      autoFixable: true,
      fixed: false,
      fixInProgress: false,
      solution: "Optimize database queries and connection pool",
    })
  }

  if (systemData.errors.length > 10) {
    issues.push({
      id: "high-error-rate-detected",
      type: "error",
      severity: "high",
      title: "High Error Rate Detected",
      description: `${systemData.errors.length} errors detected in the last 2 hours`,
      autoFixable: true,
      fixed: false,
      fixInProgress: false,
      solution: "Analyze error patterns and apply fixes",
    })
  }

  // Check API response times
  Object.entries(systemData.apis).forEach(([endpoint, data]: [string, any]) => {
    if (data.responseTime > 3000) {
      issues.push({
        id: `api-slow-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
        type: "warning",
        severity: "medium",
        title: `Slow API Response: ${endpoint}`,
        description: `API endpoint ${endpoint} response time is ${data.responseTime}ms`,
        autoFixable: true,
        fixed: false,
        fixInProgress: false,
        solution: "Optimize API endpoint performance",
      })
    }

    if (data.status === "error" || data.status === "unhealthy") {
      issues.push({
        id: `api-error-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
        type: "error",
        severity: "high",
        title: `API Endpoint Error: ${endpoint}`,
        description: `API endpoint ${endpoint} is ${data.status}`,
        autoFixable: true,
        fixed: false,
        fixInProgress: false,
        solution: "Restart API services and check configuration",
      })
    }
  })

  // Check deployment failures
  const failedDeployments = systemData.deployments.filter((d: any) => d.state === "ERROR" || d.state === "CANCELED")
  if (failedDeployments.length > 0) {
    issues.push({
      id: "deployment-failures",
      type: "error",
      severity: "high",
      title: "Recent Deployment Failures",
      description: `${failedDeployments.length} deployments failed recently`,
      autoFixable: true,
      fixed: false,
      fixInProgress: false,
      solution: "Analyze deployment errors and trigger new deployment",
    })
  }

  // Check missing environment variables
  const missingEnvVars = Object.entries(systemData.environment)
    .filter(([_, exists]) => !exists)
    .map(([name, _]) => name)

  if (missingEnvVars.length > 0) {
    issues.push({
      id: "missing-environment-variables",
      type: "error",
      severity: "critical",
      title: "Missing Environment Variables",
      description: `Missing required environment variables: ${missingEnvVars.join(", ")}`,
      autoFixable: false,
      fixed: false,
      fixInProgress: false,
      solution: "Configure missing environment variables in deployment settings",
    })
  }

  return issues
}
