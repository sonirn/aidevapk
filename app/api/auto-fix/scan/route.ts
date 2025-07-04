import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.NEON_NEON_DATABASE_URL!)

export async function POST() {
  try {
    console.log("🔍 Starting system scan...")

    const issues = []

    // Check database connection
    try {
      await sql`SELECT 1`
      console.log("✅ Database connection: OK")
    } catch (error) {
      console.error("❌ Database connection failed:", error)
      issues.push({
        type: "database",
        severity: "high",
        message: "Database connection failed",
        details: String(error),
        fix: "Check database credentials and connection string",
      })
    }

    // Check environment variables
    const requiredEnvVars = [
      "NEON_DATABASE_URL",
      "XAI_API_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "VERCEL_ACCESS_TOKEN",
      "VERCEL_REPO_ID",
    ]

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        issues.push({
          type: "environment",
          severity: "medium",
          message: `Missing environment variable: ${envVar}`,
          details: `${envVar} is not set`,
          fix: `Set ${envVar} in environment variables`,
        })
      }
    }

    // Check API endpoints
    try {
      const healthResponse = await fetch(`https://v0-aiapktodev.vercel.app/api/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      if (!healthResponse.ok) {
        issues.push({
          type: "api",
          severity: "medium",
          message: "Health check endpoint failed",
          details: `Status: ${healthResponse.status}`,
          fix: "Check API route configuration",
        })
      }
    } catch (error) {
      issues.push({
        type: "api",
        severity: "medium",
        message: "Health check endpoint unreachable",
        details: String(error),
        fix: "Check network connectivity and API routes",
      })
    }

    // Log scan results
    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES ('info', 'System scan completed', 'auto-fix-scan', ${JSON.stringify({ issuesFound: issues.length })}, NOW())
      `
    } catch (logError) {
      console.log("Failed to log scan results:", logError)
    }

    return NextResponse.json({
      success: true,
      issues,
      summary: {
        total: issues.length,
        high: issues.filter((i) => i.severity === "high").length,
        medium: issues.filter((i) => i.severity === "medium").length,
        low: issues.filter((i) => i.severity === "low").length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Scan error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      },
      { status: 500 },
    )
  }
}
