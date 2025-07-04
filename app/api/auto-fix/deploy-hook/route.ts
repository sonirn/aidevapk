// app/api/auto-fix/deploy-hook/route.ts
import { NextResponse } from "next/server"

export async function POST() {
  try {
    if (!process.env.VERCEL_DEPLOY_HOOK_URL) {
      return NextResponse.json({
        success: false,
        error: 'Deploy hook URL not configured'
      }, { status: 500 })
    }

    const response = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
      method: 'POST'
    })

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Deployment triggered via hook',
        timestamp: new Date().toISOString()
      })
    } else {
      throw new Error(`Hook failed: ${response.status}`)
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Deploy hook failed'
    }, { status: 500 })
  }
}
