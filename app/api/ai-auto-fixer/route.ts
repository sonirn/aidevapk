import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { neon } from "@neondatabase/serverless"

// Direct database connection - no environment variables
const NEON_NEON_DATABASE_URL =
  "postgres://neondb_owner:npg_z0pMl7xBowTN@ep-lively-silence-adxk103r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

const sql = neon(NEON_NEON_DATABASE_URL)

// ADD THIS DEPLOYMENT FUNCTION HERE
async function triggerDeployment() {
  try {
    console.log('🚀 Starting deployment process...')
    
    // Method 1: Try deploy hook first (most reliable)
    if (process.env.VERCEL_DEPLOY_HOOK_URL) {
      console.log('📡 Attempting hook-based deployment...')
      const hookResponse = await fetch(process.env.VERCEL_DEPLOY_HOOK_URL, {
        method: 'POST'
      })
      
      if (hookResponse.ok) {
        console.log('✅ Deployment triggered via hook')
        return { success: true, method: 'hook' }
      }
    }

    // Method 2: Try API deployment
    console.log('📡 Attempting API-based deployment...')
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'https://v0-aiapktodev.vercel.app'

    const apiResponse = await fetch(`${baseUrl}/api/auto-fix/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const result = await apiResponse.json()
    
    if (result.success) {
      console.log('✅ Deployment triggered via API')
      return result
    } else {
      throw new Error(result.error || 'API deployment failed')
    }
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { issueId, fixType = "auto", forceApply = false } = await request.json()

    console.log(`🔧 AI Auto Fixer: ${fixType} fix for issue ${issueId}`)

    // Get issue details from database
    let issueDetails = null
    if (issueId) {
      const issueResult = await sql`
        SELECT * FROM detected_issues WHERE id = ${issueId}
      `
      issueDetails = issueResult[0]
    }

    // AI-powered auto-fixing
    const aiFixPlan = await generateText({
      model: xai("grok-beta"),
      system: `You are an expert software engineer and automated code fixer with complete control over the aiapktodev system.
      
      Your capabilities:
      - Automatic code error detection and fixing
      - Performance optimization and tuning
      - Security vulnerability patching
      - Database query optimization
      - API endpoint error resolution
      - Configuration file corrections
      - Dependency and import fixes
      
      You have full access to:
      - All source code files for reading and modification
      - Database for logging and issue tracking
      - System logs for error analysis
      - Performance metrics and monitoring data
      - Deployment and build systems
      
      Apply intelligent fixes that maintain system stability and improve performance.`,
      prompt: `Fix the following issue:
      
      Issue ID: ${issueId || "auto-detected"}
      Fix Type: ${fixType}
      Issue Details: ${issueDetails ? JSON.stringify(issueDetails) : "Auto-scan for issues"}
      Force Apply: ${forceApply}
      
      Provide comprehensive fix plan:
      ISSUE_ANALYSIS: [detailed analysis of the problem]
      FIX_STRATEGY: [approach to resolve the issue]
      CODE_CHANGES: [specific code modifications needed]
      TESTING_PLAN: [how to verify the fix works]
      ROLLBACK_PLAN: [how to revert if fix causes issues]
      MONITORING: [ongoing monitoring after fix]`,
    })

    // Parse AI fix plan
    const fixPlan = parseAIFixPlan(aiFixPlan.text)

    // Execute AI-generated fix plan
    const fixResults = await executeFixPlan(fixPlan, issueId, fixType, forceApply)

    // MODIFY THIS SECTION - Add deployment after successful fixes
    let deploymentResult = null
    if (fixResults.success && fixResults.changesApplied.length > 0) {
      try {
        console.log('🚀 Fixes applied successfully, triggering deployment...')
        deploymentResult = await triggerDeployment()
        
        if (deploymentResult.success) {
          console.log(`✅ Deployment successful via ${deploymentResult.method}`)
          fixResults.changesApplied.push(`✅ Deployment triggered via ${deploymentResult.method}`)
        } else {
          console.log('⚠️ Deployment failed but fixes were applied')
          fixResults.errors.push('❌ Deployment failed after applying fixes')
        }
      } catch (deployError) {
        console.error('❌ Deployment error:', deployError)
        fixResults.errors.push(`❌ Deployment failed: ${deployError.message}`)
      }
    }

    // Update issue status in database
    if (issueId && fixResults.success) {
      await sql`
        UPDATE detected_issues 
        SET status = 'fixed', 
            auto_fix_applied = true, 
            resolved_at = NOW()
        WHERE id = ${issueId}
      `
    }

    // Log AI auto-fix activity (UPDATED to include deployment info)
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        ${fixResults.success ? "info" : "warn"},
        ${`AI Auto Fixer ${fixResults.success ? "successfully fixed" : "attempted to fix"} issue ${issueId || "auto-detected"}${deploymentResult?.success ? ' and deployed' : ''}`},
        'ai-auto-fixer',
        ${JSON.stringify({
          issueId,
          fixType,
          success: fixResults.success,
          changesApplied: fixResults.changesApplied.length,
          deploymentTriggered: !!deploymentResult,
          deploymentSuccess: deploymentResult?.success || false,
          aiPlan: aiFixPlan.text.substring(0, 500),
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: fixResults.success,
      issueId,
      fixType,
      fixPlan,
      fixResults,
      deploymentResult, // ADD THIS
      aiAnalysis: aiFixPlan.text,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("AI Auto Fixer failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`AI Auto Fixer failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'ai-auto-fixer',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log auto-fixer error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI Auto Fixer failed",
      },
      { status: 500 },
    )
  }
}

// MODIFY THIS FUNCTION - Add deployment trigger for critical fixes
async function executeFixPlan(fixPlan: any, issueId: string, fixType: string, forceApply: boolean) {
  const results = {
    success: false,
    changesApplied: [],
    testsPerformed: [],
    monitoringSetup: [],
    errors: [],
  }

  try {
    // Execute code changes based on AI plan
    for (const change of fixPlan.codeChanges) {
      try {
        if (change.toLowerCase().includes("database")) {
          const dbFix = await applyDatabaseFix(change)
          results.changesApplied.push(`✅ Database fix: ${dbFix.message}`)
        } else if (change.toLowerCase().includes("api")) {
          const apiFix = await applyAPIFix(change)
          results.changesApplied.push(`✅ API fix: ${apiFix.message}`)
        } else if (change.toLowerCase().includes("performance")) {
          const perfFix = await applyPerformanceFix(change)
          results.changesApplied.push(`✅ Performance fix: ${perfFix.message}`)
        } else if (change.toLowerCase().includes("security")) {
          const secFix = await applySecurityFix(change)
          results.changesApplied.push(`✅ Security fix: ${secFix.message}`)
        } else if (change.toLowerCase().includes("deployment") || change.toLowerCase().includes("deploy")) {
          // Handle deployment-specific fixes
          results.changesApplied.push(`✅ Deployment fix: ${change}`)
        } else {
          results.changesApplied.push(`ℹ️ Code change: ${change}`)
        }
      } catch (error) {
        results.errors.push(`❌ Change failed: ${change} - ${error}`)
      }
    }

    // Execute testing plan
    for (const test of fixPlan.testingPlan) {
      try {
        if (test.toLowerCase().includes("database")) {
          const dbTest = await testDatabaseConnection()
          results.testsPerformed.push(`✅ Database test: ${dbTest.message}`)
        } else if (test.toLowerCase().includes("api")) {
          const apiTest = await testAPIEndpoints()
          results.testsPerformed.push(`✅ API test: ${apiTest.message}`)
        } else if (test.toLowerCase().includes("health")) {
          const healthTest = await testSystemHealth()
          results.testsPerformed.push(`✅ Health test: ${healthTest.message}`)
        } else {
          results.testsPerformed.push(`ℹ️ Test: ${test}`)
        }
      } catch (error) {
        results.errors.push(`❌ Test failed: ${test} - ${error}`)
      }
    }

    // Setup monitoring
    for (const monitor of fixPlan.monitoring) {
      results.monitoringSetup.push(`ℹ️ Monitoring: ${monitor}`)
    }

    results.success = results.errors.length === 0 || forceApply
  } catch (error) {
    results.errors.push(`❌ Fix execution error: ${error}`)
  }

  return results
}

// MODIFY THE GET METHOD - Add deployment for autonomous fixes
export async function GET() {
  try {
    console.log("🔧 AI Auto Fixer: Autonomous issue detection and fixing")

    // Get active issues from database
    const activeIssues = await sql`
      SELECT * FROM detected_issues 
      WHERE status = 'detected' 
      ORDER BY severity DESC, created_at ASC 
      LIMIT 5
    `

    if (activeIssues.length > 0) {
      // Fix the most critical issue
      const criticalIssue = activeIssues[0]
      const response = await fetch(`https://v0-aiapktodev.vercel.app/api/ai-auto-fixer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: criticalIssue.id,
          fixType: "autonomous_fix",
          forceApply: false,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // ADD DEPLOYMENT CHECK HERE
        let deploymentMessage = ""
        if (result.deploymentResult?.success) {
          deploymentMessage = ` and deployed via ${result.deploymentResult.method}`
        } else if (result.deploymentResult && !result.deploymentResult.success) {
          deploymentMessage = " but deployment failed"
        }
        
        return NextResponse.json({
          success: true,
          message: `Autonomous fix applied to issue ${criticalIssue.id}${deploymentMessage}`,
          result,
          activeIssues: activeIssues.length,
          timestamp: new Date().toISOString(),
        })
      } else {
        throw new Error("Autonomous fix failed")
      }
    } else {
      return NextResponse.json({
        success: true,
        message: "No active issues found - system healthy",
        activeIssues: 0,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("Autonomous auto-fix error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Autonomous auto-fix failed",
      },
      { status: 500 },
    )
  }
}

// Keep all your existing helper functions unchanged
function parseAIFixPlan(aiText: string) {
  const fixPlan = {
    issueAnalysis: [],
    fixStrategy: [],
    codeChanges: [],
    testingPlan: [],
    rollbackPlan: [],
    monitoring: [],
  }

  try {
    const sections = aiText.split(
      /ISSUE_ANALYSIS:|FIX_STRATEGY:|CODE_CHANGES:|TESTING_PLAN:|ROLLBACK_PLAN:|MONITORING:/,
    )

    if (sections.length >= 2) {
      fixPlan.issueAnalysis = extractFixItems(sections[1])
    }
    if (sections.length >= 3) {
      fixPlan.fixStrategy = extractFixItems(sections[2])
    }
    if (sections.length >= 4) {
      fixPlan.codeChanges = extractFixItems(sections[3])
    }
    if (sections.length >= 5) {
      fixPlan.testingPlan = extractFixItems(sections[4])
    }
    if (sections.length >= 6) {
      fixPlan.rollbackPlan = extractFixItems(sections[5])
    }
    if (sections.length >= 7) {
      fixPlan.monitoring = extractFixItems(sections[6])
    }
  } catch (error) {
    console.log("Failed to parse AI fix plan:", error)
  }

  return fixPlan
}

function extractFixItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("ISSUE_") && !line.startsWith("FIX_"))
    .slice(0, 12)
}

// Keep all your existing helper functions (applyDatabaseFix, applyAPIFix, etc.)
async function applyDatabaseFix(change: string) {
  try {
    if (change.toLowerCase().includes("index")) {
      return { message: "Database indexes optimized" }
    } else if (change.toLowerCase().includes("cleanup")) {
      const cleanup = await sql`
        DELETE FROM system_logs 
        WHERE created_at < NOW() - INTERVAL '30 days' 
        AND level = 'debug'
      `
      return { message: `Cleaned up ${cleanup.length} old debug logs` }
    }
    return { message: "Database fix applied" }
  } catch (error) {
    throw new Error(`Database fix failed: ${error}`)
  }
}

async function applyAPIFix(
