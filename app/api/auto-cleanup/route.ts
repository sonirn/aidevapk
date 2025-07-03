import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Get expired conversions
    const { data: expiredConversions, error: queryError } = await supabaseAdmin
      .from("conversions")
      .select("*")
      .lt("expires_at", oneDayAgo)

    if (queryError) throw queryError

    let cleanedCount = 0

    for (const conversion of expiredConversions || []) {
      try {
        // Delete file from storage
        const filePath = `${conversion.session_id}/${conversion.converted_filename}`
        await supabaseAdmin.storage.from("apk-files").remove([filePath])

        // Delete conversion record
        await supabaseAdmin.from("conversions").delete().eq("id", conversion.id)

        cleanedCount++
      } catch (error) {
        console.error(`Failed to cleanup conversion ${conversion.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired conversions`,
    })
  } catch (error) {
    console.error("Auto-cleanup error:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}
