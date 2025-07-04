import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export async function POST() {
  try {
    console.log("🚀 Starting deployment...")

    // Use the provided credentials
    const VERCEL_ACCESS_TOKEN = "6bDrCUm5scYc7gBwRQIYg7A2"
    const VERCEL_REPO_ID = "1013226502"

    // Log deployment start
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES ('info', 'Deployment started via auto-fix system', 'auto-deploy', ${JSON.stringify({ timestamp: new Date().toISOString() })}, NOW())
    `

    // Trigger Vercel deployment
    const deployResponse = await fetch(`https://api.vercel.com/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "v0-aiapktodev",
        gitSource: {
          type: "github",
          repoId: VERCEL_REPO_ID,
          ref: "main",
        },
        target: "production",
      }),
    })

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text()
      console.error("Vercel deployment failed:", errorText)

      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES ('error', ${`Deployment failed: ${deployResponse.status} - ${errorText}`}, 'auto-deploy', ${JSON.stringify({ status: deployResponse.status, error: errorText })}, NOW())
      `

      return NextResponse.json(
        {
          success: false,
          error: `Deployment failed: ${deployResponse.statusText}`,
          details: errorText,
        },
        { status: deployResponse.status },
      )
    }

    const deployData = await deployResponse.json()
    console.log("Deployment initiated:", deployData.id)

    // Log successful deployment
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES ('info', ${`Deployment successful: ${deployData.id}`}, 'auto-deploy', ${JSON.stringify({ deploymentId: deployData.id, url: deployData.url })}, NOW())
    `

    return NextResponse.json({
      success: true,
      deploymentId: deployData.id,
      status: deployData.readyState || "QUEUED",
      url: deployData.url || "https://v0-aiapktodev.vercel.app",
      timestamp: new Date().toISOString(),
      message: "Deployment initiated successfully",
    })
  } catch (error) {
    console.error("Deploy error:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES ('error', ${`Deployment error: ${error}`}, 'auto-deploy', ${JSON.stringify({ error: String(error) })}, NOW())
      `
    } catch (logError) {
      console.log("Failed to log deployment error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Deployment failed",
      },
      { status: 500 },
    )
  }
}
