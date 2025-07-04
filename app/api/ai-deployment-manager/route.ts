import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_NEON_NEON_NEON_DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { action, context } = await request.json()

    console.log(`🚀 AI Deployment Manager: ${action}`)

    // AI-powered deployment management
    const aiDeploymentPlan = await generateText({
      model: xai("grok-beta"),
      system: `You are an expert DevOps engineer and deployment manager with full control over Vercel deployments.
      
      Your capabilities:
      - Complete Vercel deployment management (Token: 6bDrCUm5scYc7gBwRQIYg7A2, Repo: 1013226502)
      - Pre-deployment validation and testing
      - Deployment strategy optimization
      - Post-deployment monitoring and verification
      - Rollback management and disaster recovery
      - Environment variable management
      - Performance monitoring and optimization
      
      You have full access to:
      - Vercel API for all deployment operations
      - GitHub repository for source code management
      - Database for logging and monitoring
      - All system metrics and health data
      
      Make intelligent deployment decisions based on system health and requirements.`,
      prompt: `Manage deployment based on this request:

      Action: ${action}
      Context: ${JSON.stringify(context)}
      
      Provide comprehensive deployment plan:
      PRE_DEPLOYMENT_CHECKS: [validation steps before deployment]
      DEPLOYMENT_STRATEGY: [deployment approach and configuration]
      POST_DEPLOYMENT_VERIFICATION: [verification and monitoring steps]
      ROLLBACK_PLAN: [rollback strategy if needed]
      MONITORING_SETUP: [ongoing monitoring configuration]`,
    })

    // Parse AI deployment plan
    const deploymentPlan = parseAIDeploymentPlan(aiDeploymentPlan.text)

    // Execute AI-generated deployment plan
    const executionResults = await executeDeploymentPlan(deploymentPlan, action, context)

    // Log AI deployment management
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        ${executionResults.success ? "info" : "warn"},
        ${`AI Deployment Manager executed ${action}`},
        'ai-deployment-manager',
        ${JSON.stringify({
          action,
          success: executionResults.success,
          deploymentId: executionResults.deploymentId,
          aiPlan: aiDeploymentPlan.text.substring(0, 500),
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: executionResults.success,
      action,
      deploymentPlan,
      executionResults,
      aiAnalysis: aiDeploymentPlan.text,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("AI Deployment Manager failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`AI Deployment Manager failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'ai-deployment-manager',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log deployment manager error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI Deployment Manager failed",
      },
      { status: 500 },
    )
  }
}

function parseAIDeploymentPlan(aiText: string) {
  const deploymentPlan = {
    preDeploymentChecks: [],
    deploymentStrategy: [],
    postDeploymentVerification: [],
    rollbackPlan: [],
    monitoringSetup: [],
  }

  try {
    const sections = aiText.split(
      /PRE_DEPLOYMENT_CHECKS:|DEPLOYMENT_STRATEGY:|POST_DEPLOYMENT_VERIFICATION:|ROLLBACK_PLAN:|MONITORING_SETUP:/,
    )

    if (sections.length >= 2) {
      deploymentPlan.preDeploymentChecks = extractDeploymentItems(sections[1])
    }
    if (sections.length >= 3) {
      deploymentPlan.deploymentStrategy = extractDeploymentItems(sections[2])
    }
    if (sections.length >= 4) {
      deploymentPlan.postDeploymentVerification = extractDeploymentItems(sections[3])
    }
    if (sections.length >= 5) {
      deploymentPlan.rollbackPlan = extractDeploymentItems(sections[4])
    }
    if (sections.length >= 6) {
      deploymentPlan.monitoringSetup = extractDeploymentItems(sections[5])
    }
  } catch (error) {
    console.log("Failed to parse AI deployment plan:", error)
  }

  return deploymentPlan
}

function extractDeploymentItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("PRE_DEPLOYMENT") && !line.startsWith("DEPLOYMENT"))
    .slice(0, 15)
}

async function executeDeploymentPlan(deploymentPlan: any, action: string, context: any) {
  const results = {
    success: false,
    deploymentId: null,
    preDeploymentResults: [],
    deploymentResults: [],
    postDeploymentResults: [],
    errors: [],
  }

  try {
    // Execute pre-deployment checks
    for (const check of deploymentPlan.preDeploymentChecks) {
      try {
        if (check.toLowerCase().includes("database")) {
          await sql`SELECT 1`
          results.preDeploymentResults.push("✅ Database connectivity verified")
        } else if (check.toLowerCase().includes("api")) {
          const response = await fetch("https://v0-aiapktodev.vercel.app/api/health")
          if (response.ok) {
            results.preDeploymentResults.push("✅ API endpoints verified")
          } else {
            results.preDeploymentResults.push("⚠️ API endpoints need attention")
          }
        } else if (check.toLowerCase().includes("environment")) {
          const requiredVars = ["NEON_NEON_NEON_NEON_DATABASE_URL", "XAI_API_KEY"]
          const missingVars = requiredVars.filter((varName) => !process.env[varName])
          if (missingVars.length === 0) {
            results.preDeploymentResults.push("✅ Environment variables verified")
          } else {
            results.preDeploymentResults.push(`⚠️ Missing environment variables: ${missingVars.join(", ")}`)
          }
        } else {
          results.preDeploymentResults.push(`ℹ️ Pre-deployment check: ${check}`)
        }
      } catch (error) {
        results.errors.push(`❌ Pre-deployment check failed: ${check} - ${error}`)
      }
    }

    // Execute deployment if pre-checks passed
    if (results.errors.length === 0 || action === "force_deploy") {
      try {
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
          const deployData = await deployResponse.json()
          results.deploymentId = deployData.id
          results.deploymentResults.push(`✅ Deployment triggered: ${deployData.id}`)
          results.success = true

          // Wait for deployment to complete (simplified)
          setTimeout(async () => {
            try {
              const statusResponse = await fetch(`https://api.vercel.com/v1/deployments/${deployData.id}`, {
                headers: {
                  Authorization: `Bearer 6bDrCUm5scYc7gBwRQIYg7A2`,
                },
              })

              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                await sql`
                  INSERT INTO system_logs (level, message, source, metadata, created_at)
                  VALUES (
                    'info',
                    ${`Deployment ${deployData.id} status: ${statusData.state}`},
                    'ai-deployment-status',
                    ${JSON.stringify({ deploymentId: deployData.id, state: statusData.state })},
                    NOW()
                  )
                `

                // Execute post-deployment verification
                if (statusData.state === "READY") {
                  await executePostDeploymentVerification(deploymentPlan.postDeploymentVerification)
                }
              }
            } catch (statusError) {
              console.log("Failed to check deployment status:", statusError)
            }
          }, 60000) // Check after 1 minute
        } else {
          const errorText = await deployResponse.text()
          results.errors.push(`❌ Deployment failed: ${errorText}`)
        }
      } catch (error) {
        results.errors.push(`❌ Deployment error: ${error}`)
      }
    } else {
      results.errors.push("❌ Pre-deployment checks failed, deployment aborted")
    }
  } catch (error) {
    results.errors.push(`❌ Execution error: ${error}`)
  }

  return results
}

async function executePostDeploymentVerification(verificationSteps: string[]) {
  const verificationResults = []

  for (const step of verificationSteps) {
    try {
      if (step.toLowerCase().includes("health")) {
        const response = await fetch("https://v0-aiapktodev.vercel.app/api/health")
        if (response.ok) {
          verificationResults.push("✅ Health check passed")
        } else {
          verificationResults.push("❌ Health check failed")
        }
      } else if (step.toLowerCase().includes("database")) {
        await sql`SELECT 1`
        verificationResults.push("✅ Database connection verified")
      } else if (step.toLowerCase().includes("api")) {
        const endpoints = ["/api/health", "/api/convert"]
        let allPassed = true

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(`https://v0-aiapktodev.vercel.app${endpoint}`)
            if (!response.ok && response.status !== 400) {
              allPassed = false
            }
          } catch (error) {
            allPassed = false
          }
        }

        if (allPassed) {
          verificationResults.push("✅ API endpoints verified")
        } else {
          verificationResults.push("❌ Some API endpoints failed")
        }
      } else {
        verificationResults.push(`ℹ️ Verification step: ${step}`)
      }
    } catch (error) {
      verificationResults.push(`❌ Verification failed: ${step} - ${error}`)
    }
  }

  // Log post-deployment verification results
  await sql`
    INSERT INTO system_logs (level, message, source, metadata, created_at)
    VALUES (
      'info',
      'Post-deployment verification completed',
      'ai-deployment-verification',
      ${JSON.stringify({ verificationResults })},
      NOW()
    )
  `

  return verificationResults
}

export async function GET() {
  try {
    console.log("🚀 AI Deployment Manager: Autonomous deployment check")

    // Check current deployment status
    const deploymentsResponse = await fetch(`https://api.vercel.com/v2/deployments?limit=5`, {
      headers: {
        Authorization: `Bearer 6bDrCUm5scYc7gBwRQIYg7A2`,
      },
    })

    let deploymentContext = {}
    if (deploymentsResponse.ok) {
      const deploymentsData = await deploymentsResponse.json()
      deploymentContext = {
        recentDeployments: deploymentsData.deployments || [],
        needsDeployment: false,
      }
    }

    // Trigger autonomous deployment management
    const response = await fetch(`https://v0-aiapktodev.vercel.app/api/ai-deployment-manager`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "autonomous_deployment_check",
        context: deploymentContext,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        message: "Autonomous deployment check completed",
        result,
        timestamp: new Date().toISOString(),
      })
    } else {
      throw new Error("Autonomous deployment check failed")
    }
  } catch (error) {
    console.error("Autonomous deployment check error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Autonomous deployment check failed",
      },
      { status: 500 },
    )
  }
}
