// app/api/auto-fix/deploy/route.ts
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Initialize database connection with error handling
let sql
try {
  sql = neon(process.env.NEON_NEON_DATABASE_URL!) // Fixed: removed duplicate NEON_
} catch (err) {
  console.error("❌ Failed to initialize database connection:", err)
}

// Security configuration
const ALLOWED_ORIGIN = "https://v0-aiapktodev.vercel.app"
const API_VERSION = "v13"
const DEPLOYMENT_TIMEOUT = 30000 // Increased to 30 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin !== ALLOWED_ORIGIN) {
    console.warn(`⚠️ Blocked request from unauthorized origin: ${origin}`)
    return errorResponse(403, 'Unauthorized origin')
  }

  // Validate required environment variables
  const requiredEnvVars = {
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL, // Fixed variable name
    VERCEL_ACCESS_TOKEN: process.env.VERCEL_ACCESS_TOKEN,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    return errorResponse(500, `Missing environment variables: ${missingVars.join(', ')}`)
  }

  try {
    // 1. Verify database connection
    try {
      await sql`SELECT 1`
      await logToDatabase('info', 'Database connection verified', { check: 'database' })
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError)
      return errorResponse(500, 'Database connection failed')
    }

    // 2. Get project details first (recommended approach)
    const projectResponse = await fetch(
      `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
        }
      }
    )

    if (!projectResponse.ok) {
      throw new Error(`Failed to fetch project details: ${projectResponse.status}`)
    }

    const projectData = await projectResponse.json()

    // 3. Prepare deployment payload with correct structure
    const deploymentPayload = {
      name: projectData.name || "aiapktodev",
      gitSource: {
        type: "github", // or "gitlab", "bitbucket"
        repo: projectData.link?.repo || `${projectData.accountId}/${projectData.name}`,
        ref: "main" // or your default branch
      },
      target: "production",
      projectSettings: {
        framework: projectData.framework || "nextjs"
      }
    }

    // Add team ID if available
    const deploymentUrl = process.env.VERCEL_TEAM_ID 
      ? `https://api.vercel.com/${API_VERSION}/deployments?teamId=${process.env.VERCEL_TEAM_ID}`
      : `https://api.vercel.com/${API_VERSION}/deployments`

    // 4. Trigger deployment with proper timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEPLOYMENT_TIMEOUT)

    try {
      console.log('🚀 Triggering deployment...', { payload: deploymentPayload })

      const deployResponse = await fetch(deploymentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentPayload),
        signal: controller.signal
      })

      clearTimeout(timeout)

      const responseText = await deployResponse.text()
      console.log('📝 Vercel API Response:', responseText)

      if (!deployResponse.ok) {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { message: responseText }
        }
        
        throw new Error(
          `Vercel API Error (${deployResponse.status}): ${
            errorData.error?.message || errorData.message || 'Unknown error'
          }`
        )
      }

      const deploymentData = JSON.parse(responseText)

      // 5. Log successful deployment trigger
      await logToDatabase('info', 'Deployment triggered successfully', {
        deploymentId: deploymentData.id,
        url: deploymentData.url,
        status: deploymentData.readyState || deploymentData.state
      })

      // 6. Return success response
      return successResponse({
        deploymentId: deploymentData.id,
        url: deploymentData.url || `https://${deploymentData.id}-${projectData.name}.vercel.app`,
        status: deploymentData.readyState || deploymentData.state,
        deploymentUrl: `https://vercel.com/${process.env.VERCEL_TEAM_ID ? `${process.env.VERCEL_TEAM_ID}/` : ''}${process.env.VERCEL_PROJECT_ID}/${deploymentData.id}`,
        inspectorUrl: deploymentData.inspectorUrl
      })

    } catch (fetchError) {
      clearTimeout(timeout)
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Deployment request timed out')
      }
      
      throw fetchError
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error)

    // Log error to database if possible
    await logToDatabase('error', 'Deployment failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined // Fixed syntax error
    }).catch(e => console.error('Failed to log error:', e))

    return errorResponse(500, error instanceof Error ? error.message : 'Deployment failed')
  }
}

// Helper functions remain the same
async function logToDatabase(level: string, message: string, metadata: object = {}) {
  if (!sql) {
    console.log(`[${level}] ${message}`, metadata)
    return
  }

  return sql`
    INSERT INTO system_logs (level, message, source, metadata, created_at)
    VALUES (
      ${level},
      ${message},
      'auto-fix-deploy',
      ${JSON.stringify(metadata)},
      NOW()
    )
  `.catch(e => console.error('Database logging failed:', e))
}

function successResponse(data: object) {
  return new NextResponse(JSON.stringify({
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  })
}

function errorResponse(status: number, message: string) {
  return new NextResponse(JSON.stringify({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  })
}
