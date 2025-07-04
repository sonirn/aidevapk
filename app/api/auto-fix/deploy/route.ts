import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export async function POST() {
  try {
    console.log("🚀 Starting comprehensive deployment process...")

    const VERCEL_ACCESS_TOKEN = "6bDrCUm5scYc7gBwRQIYg7A2"
    const VERCEL_REPO_ID = "1013226502"

    // Pre-deployment checks
    const preDeploymentChecks = []

    // Check database connectivity
    try {
      await sql`SELECT 1`
      preDeploymentChecks.push("✅ Database connection verified")
    } catch (error) {
      preDeploymentChecks.push("❌ Database connection failed")
      throw new Error(`Pre-deployment check failed: Database connection error - ${error}`)
    }

    // Check environment variables
    const requiredEnvVars = ["NEON_NEON_DATABASE_URL", "XAI_API_KEY"]
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        preDeploymentChecks.push(`✅ ${envVar} configured`)
      } else {
        preDeploymentChecks.push(`❌ ${envVar} missing`)
        throw new Error(`Pre-deployment check failed: Missing ${envVar}`)
      }
    }

    // Log pre-deployment status
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        'Pre-deployment checks completed',
        'auto-fix-deploy',
        ${JSON.stringify({ checks: preDeploymentChecks })},
        NOW()
      )
    `

    // Trigger Vercel deployment with comprehensive configuration
    const deploymentPayload = {
      name: "aiapktodev",
      gitSource: {
        type: "github",
        repoId: VERCEL_REPO_ID,
        ref: "main",
      },
      target: "production",
      projectSettings: {
        buildCommand: "npm run build",
        devCommand: "npm run dev",
        installCommand: "npm install",
        outputDirectory: ".next",
      },
      env: {
        NODE_ENV: "production",
      },
    }

    console.log("Triggering Vercel deployment with payload:", JSON.stringify(deploymentPayload, null, 2))

    const deployResponse = await fetch(`https://api.vercel.com/v1/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(deploymentPayload),
    })

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text()
      console.error("Vercel deployment failed:", errorText)

      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`Deployment failed: ${deployResponse.status} - ${errorText}`},
          'auto-fix-deploy',
          ${JSON.stringify({ status: deployResponse.status, error: errorText, payload: deploymentPayload })},
          NOW()
        )
      `

      throw new Error(`Deployment failed: ${deployResponse.status} - ${errorText}`)
    }

    const deploymentData = await deployResponse.json()
    console.log("✅ Deployment triggered successfully:", deploymentData)

    // Monitor deployment status
    let deploymentStatus = "QUEUED"
    let attempts = 0
    const maxAttempts = 30 // 5 minutes with 10-second intervals

    while (attempts < maxAttempts && !["READY", "ERROR", "CANCELED"].includes(deploymentStatus)) {
      await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait 10 seconds

      try {
        const statusResponse = await fetch(`https://api.vercel.com/v1/deployments/${deploymentData.id}`, {
          headers: {
            Authorization: `Bearer ${VERCEL_ACCESS_TOKEN}`,
          },
        })

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          deploymentStatus = statusData.readyState || statusData.state
          console.log(`Deployment status: ${deploymentStatus}`)
        }
      } catch (error) {
        console.log("Failed to check deployment status:", error)
      }

      attempts++
    }

    // Log deployment completion
    const deploymentResult = {
      deploymentId: deploymentData.id,
      deploymentUrl: deploymentData.url || `https://v0-aiapktodev.vercel.app`,
      finalStatus: deploymentStatus,
      monitoringAttempts: attempts,
      preDeploymentChecks,
    }

    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        ${deploymentStatus === "READY" ? "info" : "warn"},
        ${`Auto-deployment completed with status: ${deploymentStatus}`},
        'auto-fix-deploy',
        ${JSON.stringify(deploymentResult)},
        NOW()
      )
    `

    // Post-deployment verification
    if (deploymentStatus === "READY") {
      try {
        // Verify the deployed application
        const healthCheck = await fetch(`${deploymentData.url || "https://v0-aiapktodev.vercel.app"}/api/health`, {
          signal: AbortSignal.timeout(10000),
        })

        if (healthCheck.ok) {
          await sql`
            INSERT INTO system_logs (level, message, source, metadata, created_at)
            VALUES (
              'info',
              'Post-deployment health check passed',
              'auto-fix-deploy',
              ${JSON.stringify({ healthCheckStatus: healthCheck.status })},
              NOW()
            )
          `
        }
      } catch (error) {
        console.log("Post-deployment health check failed:", error)
      }
    }

    return NextResponse.json({
      success: deploymentStatus === "READY",
      deploymentId: deploymentData.id,
      deploymentUrl: deploymentData.url || "https://v0-aiapktodev.vercel.app",
      status: deploymentStatus,
      preDeploymentChecks,
      monitoringAttempts: attempts,
      message:
        deploymentStatus === "READY" ? "Deployment completed successfully" : `Deployment status: ${deploymentStatus}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Deployment process failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`Auto-deployment failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'auto-fix-deploy',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log deployment error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Deployment failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
