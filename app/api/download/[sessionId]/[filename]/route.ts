import { type NextRequest, NextResponse } from "next/server"
import { downloadFile, getConversion } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { sessionId: string; filename: string } }) {
  try {
    const { sessionId, filename } = params

    // Verify conversion exists and is completed
    const conversion = await getConversion(sessionId)

    if (conversion.status !== "completed") {
      return NextResponse.json({ error: "File not ready for download" }, { status: 404 })
    }

    // Download file from Supabase
    const filePath = `${sessionId}/${filename}`
    const fileData = await downloadFile("apk-files", filePath)

    // Return file with proper headers
    return new NextResponse(fileData, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
