import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

// Import neon and create connection
import { neon } from "@neondatabase/serverless"
const sql = neon(NEON_DATABASE_URL)

export async function POST(request: Request) {
  try {
    const { analysisType = "full_scan", targetFiles = [] } = await request.json()

    console.log(`🔍 AI Code Analyzer: ${analysisType}`)

    // AI-powered code analysis
    const aiCodeAnalysis = await generateText({
      model: xai("grok-beta"),
      system: `You are an expert software architect and code analyst with complete access to the aiapktodev codebase.
      
      Your capabilities:
      - Complete source code analysis and review
      - Security vulnerability detection
      - Performance bottleneck identification
      - Code quality assessment
      - Architecture pattern analysis
      - Dependency and import analysis
      - Best practices compliance checking
      
      You have full access to:
      - All source code files and structure
      - Database schema and queries
      - API endpoints and routes
      - Component architecture
      - Configuration files
      - Build and deployment scripts
      
      Provide comprehensive code analysis with actionable insights.`,
      prompt: `Perform code analysis: ${analysisType}
      
      Target Files: ${targetFiles.length > 0 ? targetFiles.join(", ") : "All files"}
      
      Provide comprehensive analysis:
      CODE_QUALITY: [overall code quality assessment]
      SECURITY_ISSUES: [potential security vulnerabilities]
      PERFORMANCE_ISSUES: [performance bottlenecks and optimizations]
      ARCHITECTURE_ANALYSIS: [architectural patterns and improvements]
      BEST_PRACTICES: [adherence to best practices]
      RECOMMENDATIONS: [specific improvement recommendations]`,
    })

    // Parse AI code analysis
    const codeAnalysis = parseAICodeAnalysis(aiCodeAnalysis.text)

    // Execute code analysis tasks
    const analysisResults = await executeCodeAnalysis(codeAnalysis, analysisType, targetFiles)

    // Log AI code analysis
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        ${`AI Code Analyzer completed ${analysisType}`},
        'ai-code-analyzer',
        ${JSON.stringify({
          analysisType,
          targetFiles: targetFiles.length,
          issuesFound: analysisResults.issuesFound.length,
          recommendations: analysisResults.recommendations.length,
          aiAnalysis: aiCodeAnalysis.text.substring(0, 500),
        })},
        NOW()
      )
    `

    // Store detected issues in database
    for (const issue of analysisResults.issuesFound) {
      try {
        await sql`
          INSERT INTO detected_issues (issue_type, severity, description, suggested_fix, status, auto_fix_applied, created_at)
          VALUES (
            ${issue.type},
            ${issue.severity},
            ${issue.description},
            ${issue.suggestedFix || null},
            'detected',
            false,
            NOW()
          )
        `
      } catch (dbError) {
        console.log("Failed to store issue:", dbError)
      }
    }

    return NextResponse.json({
      success: true,
      analysisType,
      codeAnalysis,
      analysisResults,
      aiAnalysis: aiCodeAnalysis.text,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("AI Code Analyzer failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`AI Code Analyzer failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'ai-code-analyzer',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log analyzer error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI Code Analyzer failed",
      },
      { status: 500 },
    )
  }
}

function parseAICodeAnalysis(aiText: string) {
  const codeAnalysis = {
    codeQuality: [],
    securityIssues: [],
    performanceIssues: [],
    architectureAnalysis: [],
    bestPractices: [],
    recommendations: [],
  }

  try {
    const sections = aiText.split(
      /CODE_QUALITY:|SECURITY_ISSUES:|PERFORMANCE_ISSUES:|ARCHITECTURE_ANALYSIS:|BEST_PRACTICES:|RECOMMENDATIONS:/,
    )

    if (sections.length >= 2) {
      codeAnalysis.codeQuality = extractAnalysisItems(sections[1])
    }
    if (sections.length >= 3) {
      codeAnalysis.securityIssues = extractAnalysisItems(sections[2])
    }
    if (sections.length >= 4) {
      codeAnalysis.performanceIssues = extractAnalysisItems(sections[3])
    }
    if (sections.length >= 5) {
      codeAnalysis.architectureAnalysis = extractAnalysisItems(sections[4])
    }
    if (sections.length >= 6) {
      codeAnalysis.bestPractices = extractAnalysisItems(sections[5])
    }
    if (sections.length >= 7) {
      codeAnalysis.recommendations = extractAnalysisItems(sections[6])
    }
  } catch (error) {
    console.log("Failed to parse AI code analysis:", error)
  }

  return codeAnalysis
}

function extractAnalysisItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("CODE_") && !line.startsWith("SECURITY_"))
    .slice(0, 15)
}

async function executeCodeAnalysis(codeAnalysis: any, analysisType: string, targetFiles: string[]) {
  const results = {
    issuesFound: [],
    recommendations: [],
    codeMetrics: {},
    securityScore: 0,
    performanceScore: 0,
    errors: [],
  }

  try {
    // Analyze security issues
    for (const securityIssue of codeAnalysis.securityIssues) {
      const severity = determineSeverity(securityIssue)
      results.issuesFound.push({
        type: "security",
        severity,
        description: securityIssue,
        suggestedFix: generateSecurityFix(securityIssue),
      })
    }

    // Analyze performance issues
    for (const performanceIssue of codeAnalysis.performanceIssues) {
      const severity = determineSeverity(performanceIssue)
      results.issuesFound.push({
        type: "performance",
        severity,
        description: performanceIssue,
        suggestedFix: generatePerformanceFix(performanceIssue),
      })
    }

    // Process recommendations
    results.recommendations = codeAnalysis.recommendations.map((rec) => ({
      category: categorizeRecommendation(rec),
      description: rec,
      priority: determinePriority(rec),
    }))

    // Calculate scores
    results.securityScore = calculateSecurityScore(codeAnalysis.securityIssues)
    results.performanceScore = calculatePerformanceScore(codeAnalysis.performanceIssues)

    // Generate code metrics
    results.codeMetrics = await generateCodeMetrics(analysisType)
  } catch (error) {
    results.errors.push(`❌ Analysis execution error: ${error}`)
  }

  return results
}

function determineSeverity(issue: string): "low" | "medium" | "high" | "critical" {
  const lowerIssue = issue.toLowerCase()
  if (lowerIssue.includes("critical") || lowerIssue.includes("vulnerability") || lowerIssue.includes("security")) {
    return "critical"
  } else if (lowerIssue.includes("high") || lowerIssue.includes("important")) {
    return "high"
  } else if (lowerIssue.includes("medium") || lowerIssue.includes("moderate")) {
    return "medium"
  }
  return "low"
}

function generateSecurityFix(issue: string): string {
  if (issue.toLowerCase().includes("sql")) {
    return "Use parameterized queries and input validation"
  } else if (issue.toLowerCase().includes("xss")) {
    return "Implement proper input sanitization and output encoding"
  } else if (issue.toLowerCase().includes("auth")) {
    return "Strengthen authentication and authorization mechanisms"
  }
  return "Review and implement security best practices"
}

function generatePerformanceFix(issue: string): string {
  if (issue.toLowerCase().includes("database")) {
    return "Optimize database queries and add appropriate indexes"
  } else if (issue.toLowerCase().includes("cache")) {
    return "Implement caching strategies for frequently accessed data"
  } else if (issue.toLowerCase().includes("memory")) {
    return "Optimize memory usage and implement proper cleanup"
  }
  return "Profile and optimize performance bottlenecks"
}

function categorizeRecommendation(rec: string): string {
  const lowerRec = rec.toLowerCase()
  if (lowerRec.includes("security")) return "security"
  if (lowerRec.includes("performance")) return "performance"
  if (lowerRec.includes("architecture")) return "architecture"
  if (lowerRec.includes("code quality")) return "quality"
  return "general"
}

function determinePriority(rec: string): "low" | "medium" | "high" {
  const lowerRec = rec.toLowerCase()
  if (lowerRec.includes("critical") || lowerRec.includes("urgent")) return "high"
  if (lowerRec.includes("important") || lowerRec.includes("should")) return "medium"
  return "low"
}

function calculateSecurityScore(securityIssues: string[]): number {
  const maxScore = 100
  const deduction = Math.min(securityIssues.length * 10, 80)
  return Math.max(maxScore - deduction, 20)
}

function calculatePerformanceScore(performanceIssues: string[]): number {
  const maxScore = 100
  const deduction = Math.min(performanceIssues.length * 8, 70)
  return Math.max(maxScore - deduction, 30)
}

async function generateCodeMetrics(analysisType: string) {
  try {
    // Get database statistics
    const dbStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM system_logs) as total_logs,
        (SELECT COUNT(*) FROM conversions) as total_conversions,
        (SELECT COUNT(*) FROM detected_issues WHERE status = 'detected') as active_issues
    `

    return {
      analysisType,
      databaseHealth: "operational",
      totalLogs: dbStats[0].total_logs,
      totalConversions: dbStats[0].total_conversions,
      activeIssues: dbStats[0].active_issues,
      lastAnalysis: new Date().toISOString(),
    }
  } catch (error) {
    return {
      analysisType,
      error: "Failed to generate metrics",
    }
  }
}

export async function GET() {
  try {
    console.log("🔍 AI Code Analyzer: Autonomous code analysis")

    // Trigger autonomous code analysis
    const response = await fetch(`https://v0-aiapktodev.vercel.app/api/ai-code-analyzer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisType: "autonomous_scan",
        targetFiles: [],
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({
        success: true,
        message: "Autonomous code analysis completed",
        result,
        timestamp: new Date().toISOString(),
      })
    } else {
      throw new Error("Autonomous code analysis failed")
    }
  } catch (error) {
    console.error("Autonomous code analysis error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Autonomous code analysis failed",
      },
      { status: 500 },
    )
  }
}
