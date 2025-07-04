// app/api/debug/config/route.ts
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasVercelToken: !!process.env.VERCEL_ACCESS_TOKEN,
    hasProjectId: !!process.env.VERCEL_PROJECT_ID,
    hasRepoId: !!process.env.GITHUB_REPO_ID,
    hasTeamId: !!process.env.VERCEL_TEAM_ID,
    hasDeployHook: !!process.env.VERCEL_DEPLOY_HOOK_URL,
    projectId: process.env.VERCEL_PROJECT_ID?.substring(0, 8) + '...',
    timestamp: new Date().toISOString()
  })
}
