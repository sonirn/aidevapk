import { type NextRequest, NextResponse } from "next/server"
import { deleteFile, supabaseAdmin } from "@/lib/supabase"

export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params

    // Get conversion record
    const { data: conversion } = await supabaseAdmin
      .from("conversions")
      .select("*")
      .eq("session_id", sessionId)
      .single()

    if (conversion) {
      // Delete file from storage
      const filePath = `${sessionId}/${conversion.converted_filename}`
      await deleteFile("apk-files", filePath)

      // Delete conversion record
      await supabaseAdmin.from("conversions").delete().eq("session_id", sessionId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Cleanup error:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}
