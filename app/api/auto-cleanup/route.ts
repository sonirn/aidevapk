import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin, deleteFile } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("Starting auto-cleanup process...")
    
    // Get expired conversions
    const { data: expiredConversions, error } = await supabaseAdmin
      .from("conversions")
      .select("*")
      .lt("expires_at", new Date().toISOString())
    
    if (error) {
      console.error("Error fetching expired conversions:", error)
      return NextResponse.json({ error: "Failed to fetch expired conversions" }, { status: 500 })
    }
    
    let cleanedCount = 0
    
    if (expiredConversions && expiredConversions.length > 0) {
      console.log(`Found ${expiredConversions.length} expired conversions to clean up`)
      
      // Clean up each expired conversion
      for (const conversion of expiredConversions) {
        try {
          // Delete file from storage
          const filePath = `${conversion.session_id}/${conversion.converted_filename}`
          await deleteFile("apk-files", filePath)
          
          // Delete conversion record
          await supabaseAdmin
            .from("conversions")
            .delete()
            .eq("session_id", conversion.session_id)
          
          cleanedCount++
          console.log(`Cleaned up conversion: ${conversion.session_id}`)
        } catch (cleanupError) {
          console.error(`Failed to clean up conversion ${conversion.session_id}:`, cleanupError)
          // Continue with other conversions even if one fails
        }
      }
    }
    
    // Also clean up old status checks (keep only last 1000 records)
    const { data: oldStatusChecks } = await supabaseAdmin
      .from("status_checks")
      .select("id")
      .order("timestamp", { ascending: false })
      .range(1000, 10000) // Get records from position 1000 onwards
    
    if (oldStatusChecks && oldStatusChecks.length > 0) {
      const idsToDelete = oldStatusChecks.map(check => check.id)
      await supabaseAdmin
        .from("status_checks")
        .delete()
        .in("id", idsToDelete)
      
      console.log(`Cleaned up ${oldStatusChecks.length} old status checks`)
    }
    
    console.log(`Auto-cleanup completed. Cleaned up ${cleanedCount} expired conversions and ${oldStatusChecks?.length || 0} old status checks`)
    
    return NextResponse.json({
      success: true,
      cleaned_conversions: cleanedCount,
      cleaned_status_checks: oldStatusChecks?.length || 0,
      message: "Auto-cleanup completed successfully"
    })
    
  } catch (error) {
    console.error("Auto-cleanup error:", error)
    return NextResponse.json({ 
      error: "Auto-cleanup failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

// Also allow POST method for manual cleanup triggers
export async function POST(request: NextRequest) {
  return GET(request)
}