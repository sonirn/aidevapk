import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export async function POST() {
  try {
    console.log("🔄 Starting continuous monitoring cycle...")

    // Continuous monitoring loop
    const monitoringResults = {
      vercelLogs: [],
      systemHealth: {},
      autoFixesApplied: [],
      deploymentsTriggered: 0,
    }

    // 1. Monitor Vercel Runtime Logs continuously
    try {
      const vercelLogsResponse = await fetch(
        `https://api.vercel.com/v2/deployments?limit=20&since=${Date.now() - 300000}`, // Last 5 minutes
        {
          headers: {
            Authorization: `Bearer 6bDrCUm5scYc7gBwRQIYg7A2`,
          },
        },
      )

      if (vercelLogsResponse.ok) {
        const deploymentsData = await vercelLogsResponse.json()

        for (const deployment of deploymentsData.deployments || []) {
          if (deployment.state === "ERROR" || deployment.state === "CANCELED") {
            monitoringResults.vercelLogs.push({
              deploymentId: deployment.uid,
              state: deployment.state,
              createdAt: deployment.createdAt,
              error: deployment.error || "Unknown error",
            })

            // Auto-fix: Trigger new deployment
            try {
              const fixResponse = await fetch(`https://v0-aiapktodev.vercel.app/api/auto-fix/deploy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              })

              if (fixResponse.ok) {
                monitoringResults.autoFixesApplied.push(
                  `Auto-redeployment triggered for failed deployment ${deployment.uid}`,
                )
                monitoringResults.deploymentsTriggered++
              }
            } catch (error) {
              console.log("Failed to auto-fix deployment:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to monitor Vercel logs:", error)
    }

    // 2. Monitor System Health continuously
    try {
      const healthChecks = await Promise.allSettled([
        // Database health
        sql`SELECT 1`.then(() => ({ component: "database", status: "healthy" })),

        // API endpoints health
        fetch("https://v0-aiapktodev.vercel.app/api/health").then((r) => ({
          component: "api-health",
          status: r.ok ? "healthy" : "unhealthy",
          statusCode: r.status,
        })),

        fetch("https://v0-aiapktodev.vercel.app/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        }).then((r) => ({
          component: "api-convert",
          status: r.status === 400 ? "healthy" : "unhealthy", // 400 expected for test
          statusCode: r.status,
        })),

        fetch("https://v0-aiapktodev.vercel.app/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        }).then((r) => ({
          component: "api-chat",
          status: r.status < 500 ? "healthy" : "unhealthy",
          statusCode: r.status,
        })),
      ])

      healthChecks.forEach((result, index) => {
        if (result.status === "fulfilled") {
          monitoringResults.systemHealth[result.value.component] = result.value

          // Auto-fix unhealthy components
          if (result.value.status === "unhealthy") {
            // Trigger auto-fix for unhealthy components
            fetch(`https://v0-aiapktodev.vercel.app/api/auto-fix/apply`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ issueId: `${result.value.component}-unhealthy` }),
            })
              .then(() => {
                monitoringResults.autoFixesApplied.push(`Auto-fix applied for unhealthy ${result.value.component}`)
              })
              .catch((error) => {
                console.log(`Failed to auto-fix ${result.value.component}:`, error)
              })
          }
        } else {
          monitoringResults.systemHealth[`check-${index}`] = { status: "failed", error: result.reason }
        }
      })
    } catch (error) {
      console.error("System health monitoring failed:", error)
    }

    // 3. Monitor Error Patterns and Auto-fix
    try {
      const recentErrors = await sql`
        SELECT message, source, created_at, metadata 
        FROM system_logs 
        WHERE level = 'error' 
        AND created_at > NOW() - INTERVAL '10 minutes'
        ORDER BY created_at DESC
      `

      if (recentErrors.length > 3) {
        // High error rate detected - trigger auto-fix
        const fixResponse = await fetch(`https://v0-aiapktodev.vercel.app/api/auto-fix/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueId: "high-error-rate" }),
        })

        if (fixResponse.ok) {
          monitoringResults.autoFixesApplied.push("Auto-fix applied for high error rate")
        }
      }

      // Analyze error patterns
      const errorPatterns = recentErrors.reduce(
        (acc, log) => {
          const message = log.message.toLowerCase()
          if (message.includes("timeout")) acc.timeout++
          if (message.includes("connection")) acc.connection++
          if (message.includes("deployment")) acc.deployment++
          return acc
        },
        { timeout: 0, connection: 0, deployment: 0 },
      )

      // Auto-fix specific patterns
      for (const [pattern, count] of Object.entries(errorPatterns)) {
        if (count > 1) {
          const fixResponse = await fetch(`https://v0-aiapktodev.vercel.app/api/auto-fix/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ issueId: `error-pattern-${pattern}` }),
          })

          if (fixResponse.ok) {
            monitoringResults.autoFixesApplied.push(`Auto-fix applied for ${pattern} error pattern`)
          }
        }
      }
    } catch (error) {
      console.error("Error pattern monitoring failed:", error)
    }

    // Log monitoring results
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        ${`Continuous monitoring cycle completed: ${monitoringResults.autoFixesApplied.length} auto-fixes applied`},
        'continuous-monitor',
        ${JSON.stringify(monitoringResults)},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      monitoringResults,
      timestamp: new Date().toISOString(),
      message: `Monitoring cycle completed with ${monitoringResults.autoFixesApplied.length} auto-fixes applied`,
    })
  } catch (error) {
    console.error("Continuous monitoring failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`Continuous monitoring failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'continuous-monitor',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log monitoring error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Continuous monitoring failed",
      },
      { status: 500 },
    )
  }
}
