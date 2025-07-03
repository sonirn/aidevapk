import { NextResponse } from "next/server"
import { checkDatabaseHealth } from "@/lib/neon"

export async function GET() {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth()

    // Check environment variables
    const envCheck = {
      database: !!process.env.NEON_DATABASE_URL || !!process.env.POSTGRES_URL || !!process.env.NEON_DATABASE_URL,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ai: !!process.env.XAI_API_KEY,
    }

    const overallHealth = dbHealth.status === "healthy" && envCheck.database

    return NextResponse.json({
      status: overallHealth ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        environment: envCheck,
      },
      version: process.env.npm_package_version || "1.0.0",
    })
  } catch (error) {
    console.error("Health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
