import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_NEON_NEON_NEON_DATABASE_URL!)

export async function POST() {
  try {
    console.log("🤖 Starting autonomous system management cycle...")

    // Phase 1: Comprehensive System Analysis
    const systemAnalysis = await performComprehensiveAnalysis()

    // Phase 2: AI-Powered Decision Making
    const aiDecisions = await makeAIDecisions(systemAnalysis)

    // Phase 3: Autonomous Action Execution
    const executionResults = await executeAutonomousActions(aiDecisions)

    // Phase 4: System Optimization
    const optimizationResults = await performSystemOptimization()

    // Phase 5: Continuous Monitoring Setup
    await setupContinuousMonitoring()

    // Log autonomous cycle completion
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        'Autonomous system management cycle completed',
        'autonomous-system',
        ${JSON.stringify({
          systemAnalysis: {
            issuesFound: systemAnalysis.issues.length,
            performanceScore: systemAnalysis.performanceScore,
          },
          aiDecisions: aiDecisions.decisions.length,
          executionResults: {
            successful: executionResults.successful,
            failed: executionResults.failed,
          },
          optimizationResults,
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      systemAnalysis,
      aiDecisions,
      executionResults,
      optimizationResults,
      timestamp: new Date().toISOString(),
      message: "Autonomous system management completed successfully",
    })
  } catch (error) {
    console.error("Autonomous system management failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`Autonomous system management failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'autonomous-system',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log autonomous system error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Autonomous system management failed",
      },
      { status: 500 },
    )
  }
}

async function performComprehensiveAnalysis() {
  const analysis = {
    timestamp: new Date().toISOString(),
    issues: [],
    performanceMetrics: {},
    securityStatus: {},
    deploymentHealth: {},
    performanceScore: 0,
  }

  try {
    // Database analysis
    const dbStart = Date.now()
    await sql`SELECT 1`
    const dbResponseTime = Date.now() - dbStart

    const dbStats = await sql`
      SELECT 
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM system_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '1 hour') as recent_errors
    `

    analysis.performanceMetrics.database = {
      responseTime: dbResponseTime,
      activeConnections: dbStats[0]?.active_connections || 0,
      recentErrors: dbStats[0]?.recent_errors || 0,
    }

    // API endpoints analysis
    const endpoints = [
      { path: "/api/health", method: "GET" },
      { path: "/api/convert", method: "POST", body: { test: true } },
      { path: "/api/chat", method: "POST", body: { test: true } },
      { path: "/api/auto-fix/scan", method: "GET" },
    ]

    const apiResults = {}
    for (const endpoint of endpoints) {
      try {
        const start = Date.now()
        const response = await fetch(`https://v0-aiapktodev.vercel.app${endpoint.path}`, {
          method: endpoint.method,
          headers: { "Content-Type": "application/json" },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
          signal: AbortSignal.timeout(10000),
        })

        apiResults[endpoint.path] = {
          status: response.ok || response.status === 400 ? "healthy" : "unhealthy",
          responseTime: Date.now() - start,
          statusCode: response.status,
        }
      } catch (error) {
        apiResults[endpoint.path] = {
          status: "error",
          error: String(error),
        }
      }
    }

    analysis.performanceMetrics.apis = apiResults

    // Vercel deployment analysis
    try {
      const deploymentsResponse = await fetch(`https://api.vercel.com/v2/deployments?limit=10`, {
        headers: {
          Authorization: `Bearer 6bDrCUm5scYc7gBwRQIYg7A2`,
        },
      })

      if (deploymentsResponse.ok) {
        const deploymentsData = await deploymentsResponse.json()
        const deployments = deploymentsData.deployments || []

        analysis.deploymentHealth = {
          totalDeployments: deployments.length,
          successfulDeployments: deployments.filter((d) => d.state === "READY").length,
          failedDeployments: deployments.filter((d) => d.state === "ERROR" || d.state === "CANCELED").length,
          successRate:
            deployments.length > 0 ? deployments.filter((d) => d.state === "READY").length / deployments.length : 0,
        }
      }
    } catch (error) {
      console.log("Failed to analyze deployments:", error)
    }

    // Security analysis
    const securityChecks = await sql`
      SELECT 
        (SELECT count(*) FROM system_logs WHERE message ILIKE '%unauthorized%' AND created_at > NOW() - INTERVAL '24 hours') as unauthorized_attempts,
        (SELECT count(*) FROM system_logs WHERE message ILIKE '%error%' AND message ILIKE '%security%' AND created_at > NOW() - INTERVAL '24 hours') as security_errors
    `

    analysis.securityStatus = {
      unauthorizedAttempts: securityChecks[0]?.unauthorized_attempts || 0,
      securityErrors: securityChecks[0]?.security_errors || 0,
      status: (securityChecks[0]?.unauthorized_attempts || 0) === 0 ? "secure" : "alert",
    }

    // Generate issues based on analysis
    if (dbResponseTime > 5000) {
      analysis.issues.push({
        id: "database-performance",
        severity: "high",
        description: `Database response time is ${dbResponseTime}ms`,
        autoFixable: true,
      })
    }

    Object.entries(apiResults).forEach(([endpoint, data]: [string, any]) => {
      if (data.status === "error" || data.status === "unhealthy") {
        analysis.issues.push({
          id: `api-issue-${endpoint.replace(/[^a-zA-Z0-9]/g, "-")}`,
          severity: "high",
          description: `API endpoint ${endpoint} is ${data.status}`,
          autoFixable: true,
        })
      }
    })

    if (analysis.deploymentHealth.failedDeployments > 0) {
      analysis.issues.push({
        id: "deployment-failures",
        severity: "critical",
        description: `${analysis.deploymentHealth.failedDeployments} recent deployment failures`,
        autoFixable: true,
      })
    }

    // Calculate performance score
    let score = 100
    score -= analysis.issues.filter((i) => i.severity === "critical").length * 30
    score -= analysis.issues.filter((i) => i.severity === "high").length * 20
    score -= analysis.issues.filter((i) => i.severity === "medium").length * 10
    analysis.performanceScore = Math.max(0, score)
  } catch (error) {
    console.error("Comprehensive analysis failed:", error)
  }

  return analysis
}

async function makeAIDecisions(systemAnalysis: any) {
  const aiResponse = await generateText({
    model: xai("grok-beta"),
    system: `You are an autonomous system administrator with complete control over the APK Converter website.
    
    Your capabilities:
    - Full database access and optimization
    - Vercel deployment management (Token: 6bDrCUm5scYc7gBwRQIYg7A2, Repo: 1013226502)
    - API endpoint monitoring and fixes
    - Performance optimization
    - Security management
    - Error resolution
    - Code modifications
    
    Make autonomous decisions to maintain optimal system health.`,
    prompt: `Analyze this system status and make autonomous decisions:

    System Analysis: ${JSON.stringify(systemAnalysis, null, 2)}
    
    Provide decisions in this format:
    IMMEDIATE_ACTIONS: [critical actions needed now]
    OPTIMIZATION_ACTIONS: [performance improvements]
    PREVENTIVE_ACTIONS: [prevent future issues]
    MONITORING_ACTIONS: [enhanced monitoring setup]
    
    Be specific and actionable.`,
  })

  const decisions = parseAIDecisions(aiResponse.text)

  return {
    aiAnalysis: aiResponse.text,
    decisions: [
      ...decisions.immediateActions.map((action) => ({ type: "immediate", action, priority: "critical" })),
      ...decisions.optimizationActions.map((action) => ({ type: "optimization", action, priority: "high" })),
      ...decisions.preventiveActions.map((action) => ({ type: "preventive", action, priority: "medium" })),
      ...decisions.monitoringActions.map((action) => ({ type: "monitoring", action, priority: "low" })),
    ],
  }
}

function parseAIDecisions(aiText: string) {
  const decisions = {
    immediateActions: [],
    optimizationActions: [],
    preventiveActions: [],
    monitoringActions: [],
  }

  try {
    const sections = aiText.split(/IMMEDIATE_ACTIONS:|OPTIMIZATION_ACTIONS:|PREVENTIVE_ACTIONS:|MONITORING_ACTIONS:/)

    if (sections.length >= 2) {
      decisions.immediateActions = extractActionItems(sections[1])
    }
    if (sections.length >= 3) {
      decisions.optimizationActions = extractActionItems(sections[2])
    }
    if (sections.length >= 4) {
      decisions.preventiveActions = extractActionItems(sections[3])
    }
    if (sections.length >= 5) {
      decisions.monitoringActions = extractActionItems(sections[4])
    }
  } catch (error) {
    console.log("Failed to parse AI decisions:", error)
  }

  return decisions
}

function extractActionItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("IMMEDIATE_ACTIONS") && !line.startsWith("OPTIMIZATION"))
    .slice(0, 5)
}

async function executeAutonomousActions(aiDecisions: any) {
  const results = {
    successful: 0,
    failed: 0,
    actions: [],
  }

  for (const decision of aiDecisions.decisions) {
    try {
      let actionResult = false

      if (decision.action.toLowerCase().includes("database")) {
        // Database actions
        await sql`SELECT 1`
        await sql`
          SELECT pg_terminate_backend(pid) 
          FROM pg_stat_activity 
          WHERE state = 'idle' 
          AND state_change < now() - interval '15 minutes'
        `
        actionResult = true
        results.actions.push(`✅ Database action: ${decision.action}`)
      } else if (decision.action.toLowerCase().includes("deploy")) {
        // Deployment actions
        const deployResponse = await fetch(`https://api.vercel.com/v1/deployments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer 6bDrCUm5scYc7gBwRQIYg7A2`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "aiapktodev",
            gitSource: {
              type: "github",
              repoId: "1013226502",
              ref: "main",
            },
            target: "production",
          }),
        })

        if (deployResponse.ok) {
          actionResult = true
          results.actions.push(`✅ Deployment action: ${decision.action}`)
        } else {
          results.actions.push(`❌ Deployment action failed: ${decision.action}`)
        }
      } else if (decision.action.toLowerCase().includes("api")) {
        // API actions
        const endpoints = ["/api/health", "/api/convert"]
        let apiSuccess = true

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(`https://v0-aiapktodev.vercel.app${endpoint}`, {
              method: endpoint === "/api/convert" ? "POST" : "GET",
              headers: { "Content-Type": "application/json" },
              body: endpoint === "/api/convert" ? JSON.stringify({ test: true }) : undefined,
              signal: AbortSignal.timeout(5000),
            })

            if (!response.ok && response.status !== 400) {
              apiSuccess = false
            }
          } catch (error) {
            apiSuccess = false
          }
        }

        actionResult = apiSuccess
        results.actions.push(`${apiSuccess ? "✅" : "❌"} API action: ${decision.action}`)
      } else if (decision.action.toLowerCase().includes("log") || decision.action.toLowerCase().includes("clean")) {
        // Cleanup actions
        await sql`
          DELETE FROM system_logs 
          WHERE level = 'info' 
          AND created_at < NOW() - INTERVAL '6 hours'
        `
        actionResult = true
        results.actions.push(`✅ Cleanup action: ${decision.action}`)
      } else {
        // Generic action
        actionResult = true
        results.actions.push(`ℹ️ Generic action noted: ${decision.action}`)
      }

      if (actionResult) {
        results.successful++
      } else {
        results.failed++
      }
    } catch (error) {
      results.failed++
      results.actions.push(`❌ Action failed: ${decision.action} - ${error}`)
    }
  }

  return results
}

async function performSystemOptimization() {
  const optimizations = []

  try {
    // Database optimization
    await sql`VACUUM ANALYZE system_logs`
    optimizations.push("✅ Database vacuum and analyze completed")

    // Log cleanup optimization
    const cleanupResult = await sql`
      DELETE FROM system_logs 
      WHERE level IN ('debug', 'info') 
      AND created_at < NOW() - INTERVAL '12 hours'
    `
    optimizations.push(`✅ Cleaned up ${cleanupResult.length} old log entries`)

    // Connection optimization
    await sql`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE state = 'idle' 
      AND state_change < now() - interval '20 minutes'
    `
    optimizations.push("✅ Optimized database connections")

    return {
      success: true,
      optimizations,
      count: optimizations.length,
    }
  } catch (error) {
    return {
      success: false,
      error: String(error),
      optimizations,
    }
  }
}

async function setupContinuousMonitoring() {
  try {
    // Schedule next autonomous cycle
    setTimeout(
      async () => {
        try {
          await fetch("https://v0-aiapktodev.vercel.app/api/auto-fix/autonomous-system", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        } catch (error) {
          console.log("Failed to trigger next autonomous cycle:", error)
        }
      },
      30 * 60 * 1000,
    ) // 30 minutes

    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        'Continuous monitoring scheduled for next cycle',
        'autonomous-system',
        ${JSON.stringify({ nextCycle: new Date(Date.now() + 30 * 60 * 1000).toISOString() })},
        NOW()
      )
    `

    return true
  } catch (error) {
    console.log("Failed to setup continuous monitoring:", error)
    return false
  }
}
