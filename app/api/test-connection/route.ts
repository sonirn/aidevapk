import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Direct database connection test
const sql = neon(
  "postgres://neondb_owner:npg_z0pMl7xBowTN@ep-lively-silence-adxk103r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

export async function GET() {
  try {
    console.log("🔍 Testing database connection...")

    // Test basic connection
    const connectionTest = await sql`SELECT NOW() as current_time, 'Database Connected!' as message`

    // Test table access
    const tableTest = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `

    // Test system logs table specifically
    const systemLogsTest = await sql`
      SELECT COUNT(*) as log_count 
      FROM system_logs 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `

    // Insert a test log entry
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        'Database connection test successful',
        'connection-test',
        '{"test": true}',
        NOW()
      )
    `

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      connection: connectionTest[0],
      tables: tableTest.map((t) => t.table_name),
      recentLogs: systemLogsTest[0].log_count,
      message: "✅ Database connection fully operational!",
    }

    console.log("✅ Database connection test successful:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Database connection test failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
        timestamp: new Date().toISOString(),
        message: "❌ Database connection failed!",
      },
      { status: 500 },
    )
  }
}
