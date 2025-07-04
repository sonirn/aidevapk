// app/api/auto-fix/deploy/route.ts
import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Initialize database connection with error handling
let sql
try {
  sql = neon(process.env.NEON_NEON_DATABASE_URL!)
} catch (err) {
  console.error("❌ Failed to initialize database connection:", err)
}

// Security configuration
const ALLOWED_ORIGIN = "https://v0-aiapktodev.vercel.app"
const API_VERSION = "v13"
const DEPLOYMENT_TIMEOUT = 10000 // 10 seconds

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  })
}

// Main deployment handler
export async function POST(request: Request) {
  // Security: Verify request origin
  const origin = request.headers.get('origin')
  if (origin !== ALLOWED_ORIGIN) {
    console.warn(`⚠️ Blocked request from unauthorized origin: ${origin}`)
    return errorResponse(403, 'Unauthorized origin')
  }

  // Validate required environment variables
  const requiredEnvVars = {
    NEON_NEON_DATABASE_URL: process.env.NEON_NEON_DATABASE_URL,
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

    // 2. Prepare deployment payload
    const deploymentPayload = {
      name: "aiapktodev",
      target: "production",
      projectId: process.env.VERCEL_PROJECT_ID,
      ...(process.env.VERCEL_TEAM_ID && { teamId: process.env.VERCEL_TEAM_ID }),
      env: {
        NODE_ENV: "production",
        ...(process.env.XAI_API_KEY && { XAI_API_KEY: process.env.XAI_API_KEY })
      },
      meta: {
        deploymentSource: "api-auto-fix-deploy"
      }
    }

    // 3. Trigger deployment with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEPLOYMENT_TIMEOUT)

    try {
      const deployResponse = await fetch(`https://api.vercel.com/${API_VERSION}/deployments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentPayload),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${deployResponse.status}`)
      }

      const deploymentData = await deployResponse.json()

      // 4. Log successful deployment trigger
      await logToDatabase('info', 'Deployment triggered successfully', {
        deploymentId: deploymentData.id,
        url: deploymentData.url,
        status: deploymentData.readyState
      })

      // 5. Return success response
      return successResponse({
        deploymentId: deploymentData.id,
        url: deploymentData.url || ALLOWED_ORIGIN,
        status: deploymentData.readyState,
        deploymentUrl: `https://vercel.com/${process.env.VERCEL_TEAM_ID ? `${process.env.VERCEL_TEAM_ID}/` : ''}${process.env.VERCEL_PROJECT_ID}/${deploymentData.id}`
      })

    } catch (fetchError) {
      clearTimeout(timeout)
      throw fetchError
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error)

    // Log error to database if possible
    await logToDatabase('error', 'Deployment failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }).catch(e => console.error('Failed to log error:', e))

    return errorResponse(500, error instanceof Error ? error.message : 'Deployment failed')
  }
}

// Helper functions
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
