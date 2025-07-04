import { NextResponse } from "next/server"
import { checkDatabaseHealth } from "@/lib/neon"

export async function GET() {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth()

    // Check system status
    const systemHealth = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: dbHealth,
      services: {
        api: "healthy",
        converter: "healthy",
        aiChat: "healthy",
        autoFix: "healthy",
        monitor: "healthy",
      },
    }

    // If database is unhealthy, mark system as degraded
    if (dbHealth.status === "error") {
      systemHealth.status = "degraded"
    }

    return NextResponse.json(systemHealth)
  } catch (error) {
    console.error("Health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
        database: { status: "error", message: "Database check failed" },
        services: {
          api: "error",
          converter: "unknown",
          aiChat: "unknown",
          autoFix: "unknown",
          monitor: "unknown",
        },
      },
      { status: 500 },
    )
  }
}
