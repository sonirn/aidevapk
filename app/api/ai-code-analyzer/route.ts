import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { neon } from "@neondatabase/serverless"

// Direct database connection - no environment variables
const NEON_NEON_DATABASE_URL =
  "postgres://neondb_owner:npg_z0pMl7xBowTN@ep-lively-silence-adxk103r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

const sql = neon(NEON_NEON_DATABASE_URL)

export async function POST(request: Request) {
  try {
    const { action = "full_analysis", targetFiles = [], analysisDepth = "comprehensive" } = await request.json()

    console.log(`🔍 AI Code Analyzer: ${action} with ${analysisDepth} depth`)

    // AI-powered code analysis
    const aiCodeAnalysis = await generateText({
      model: xai("grok-beta"),
      system: `You are an expert software architect and code analyzer with complete access to the aiapktodev system.
      
      Your capabilities:
      - Comprehensive source code analysis and review
      - Bug detection and vulnerability identification
      - Performance bottleneck analysis
      - Code quality assessment and improvement suggestions
      - Architecture pattern analysis
      - Dependency and import optimization
      - Security vulnerability scanning
      
      You have full access to:
      - All source code files in the project
      - Database schema and queries
      - API endpoints and route handlers
      - Component architecture and relationships
      - Configuration files and dependencies
      - Build and deployment configurations
      
      Provide detailed analysis with actionable recommendations for improvement.`,
      prompt: `Analyze the aiapktodev codebase:
      
      Analysis Action: ${action}
      Target Files: ${JSON.stringify(targetFiles)}
      Analysis Depth: ${analysisDepth}
      
      Provide comprehensive code analysis:
      CODE_QUALITY: [overall code quality assessment]
      BUG_DETECTION: [potential bugs and issues found]
      PERFORMANCE_ISSUES: [performance bottlenecks and optimizations]
      SECURITY_VULNERABILITIES: [security issues and recommendations]
      ARCHITECTURE_ANALYSIS: [code architecture and design patterns]
      IMPROVEMENT_SUGGESTIONS: [specific recommendations for enhancement]`,
    })

    // Parse AI code analysis
    const codeAnalysis = parseAICodeAnalysis(aiCodeAnalysis.text)

    // Execute code analysis based on AI recommendations
    const analysisResults = await executeCodeAnalysis(codeAnalysis, action, targetFiles, analysisDepth)

    // Store detected issues in database
    for (const issue of analysisResults.detectedIssues) {
      try {
        await sql`
          INSERT INTO detected_issues (issue_type, severity, description, suggested_fix, status, auto_fix_applied)
          VALUES (${issue.type}, ${issue.severity}, ${issue.description}, ${issue.suggestedFix}, 'detected', false)
        `
      } catch (error) {
        console.log("Failed to store detected issue:", error)
      }
    }

    // Log code analysis activity
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        ${`AI Code Analyzer completed ${action} - found ${analysisResults.detectedIssues.length} issues`},
        'ai-code-analyzer',
        ${JSON.stringify({
          action,
          analysisDepth,
          issuesFound: analysisResults.detectedIssues.length,
          codeQualityScore: analysisResults.codeQualityScore,
          aiAnalysis: aiCodeAnalysis.text.substring(0, 500),
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      action,
      analysisDepth,
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
      console.log("Failed to log code analyzer error:", logError)
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
    bugDetection: [],
    performanceIssues: [],
    securityVulnerabilities: [],
    architectureAnalysis: [],
    improvementSuggestions: [],
  }

  try {
    const sections = aiText.split(
      /CODE_QUALITY:|BUG_DETECTION:|PERFORMANCE_ISSUES:|SECURITY_VULNERABILITIES:|ARCHITECTURE_ANALYSIS:|IMPROVEMENT_SUGGESTIONS:/,
    )

    if (sections.length >= 2) {
      codeAnalysis.codeQuality = extractAnalysisItems(sections[1])
    }
    if (sections.length >= 3) {
      codeAnalysis.bugDetection = extractAnalysisItems(sections[2])
    }
    if (sections.length >= 4) {
      codeAnalysis.performanceIssues = extractAnalysisItems(sections[3])
    }
    if (sections.length >= 5) {
      codeAnalysis.securityVulnerabilities = extractAnalysisItems(sections[4])
    }
    if (sections.length >= 6) {
      codeAnalysis.architectureAnalysis = extractAnalysisItems(sections[5])
    }
    if (sections.length >= 7) {
      codeAnalysis.improvementSuggestions = extractAnalysisItems(sections[6])
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
    .filter((line) => line.length > 0 && !line.startsWith("CODE_") && !line.startsWith("BUG_"))
    .slice(0, 20)
}

async function executeCodeAnalysis(codeAnalysis: any, action: string, targetFiles: string[], analysisDepth: string) {
  const results = {
    codeQualityScore: 85, // Default score
    detectedIssues: [],
    performanceOptimizations: [],
    securityRecommendations: [],
    architectureInsights: [],
    improvementPlan: [],
    errors: [],
  }

  try {
    // Process bug detection
    for (const bug of codeAnalysis.bugDetection) {
      try {
        const issue = {
          id: `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "bug",
          severity: determineSeverity(bug),
          description: bug,
          suggestedFix: generateBugFix(bug),
          file: extractFileFromDescription(bug),
        }
        results.detectedIssues.push(issue)
      } catch (error) {
        results.errors.push(`❌ Bug analysis failed: ${bug} - ${error}`)
      }
    }

    // Process performance issues
    for (const perfIssue of codeAnalysis.performanceIssues) {
      try {
        const issue = {
          id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "performance",
          severity: determineSeverity(perfIssue),
          description: perfIssue,
          suggestedFix: generatePerformanceFix(perfIssue),
          file: extractFileFromDescription(perfIssue),
        }
        results.detectedIssues.push(issue)
        results.performanceOptimizations.push(`🚀 ${perfIssue}`)
      } catch (error) {
        results.errors.push(`❌ Performance analysis failed: ${perfIssue} - ${error}`)
      }
    }

    // Process security vulnerabilities
    for (const secVuln of codeAnalysis.securityVulnerabilities) {
      try {
        const issue = {
          id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "security",
          severity: "high", // Security issues are always high priority
          description: secVuln,
          suggestedFix: generateSecurityFix(secVuln),
          file: extractFileFromDescription(secVuln),
        }
        results.detectedIssues.push(issue)
        results.securityRecommendations.push(`🔒 ${secVuln}`)
      } catch (error) {
        results.errors.push(`❌ Security analysis failed: ${secVuln} - ${error}`)
      }
    }

    // Process architecture analysis
    for (const archInsight of codeAnalysis.architectureAnalysis) {
      results.architectureInsights.push(`🏗️ ${archInsight}`)
    }

    // Process improvement suggestions
    for (const improvement of codeAnalysis.improvementSuggestions) {
      results.improvementPlan.push(`💡 ${improvement}`)
    }

    // Calculate code quality score based on issues found
    const criticalIssues = results.detectedIssues.filter((issue) => issue.severity === "critical").length
    const highIssues = results.detectedIssues.filter((issue) => issue.severity === "high").length
    const mediumIssues = results.detectedIssues.filter((issue) => issue.severity === "medium").length

    results.codeQualityScore = Math.max(0, 100 - criticalIssues * 20 - highIssues * 10 - mediumIssues * 5)
  } catch (error) {
    results.errors.push(`❌ Code analysis execution error: ${error}`)
  }

  return results
}

function determineSeverity(description: string): "low" | "medium" | "high" | "critical" {
  const lowerDesc = description.toLowerCase()

  if (lowerDesc.includes("critical") || lowerDesc.includes("crash") || lowerDesc.includes("security")) {
    return "critical"
  } else if (lowerDesc.includes("error") || lowerDesc.includes("bug") || lowerDesc.includes("vulnerability")) {
    return "high"
  } else if (lowerDesc.includes("warning") || lowerDesc.includes("performance") || lowerDesc.includes("optimization")) {
    return "medium"
  } else {
    return "low"
  }
}

function generateBugFix(bugDescription: string): string {
  const lowerDesc = bugDescription.toLowerCase()

  if (lowerDesc.includes("undefined") || lowerDesc.includes("null")) {
    return "Add null/undefined checks and proper error handling"
  } else if (lowerDesc.includes("async") || lowerDesc.includes("promise")) {
    return "Add proper async/await error handling and try-catch blocks"
  } else if (lowerDesc.includes("type") || lowerDesc.includes("typescript")) {
    return "Add proper TypeScript type definitions and interfaces"
  } else if (lowerDesc.includes("import") || lowerDesc.includes("module")) {
    return "Fix import statements and module dependencies"
  } else {
    return "Review and fix the identified issue with proper error handling"
  }
}

function generatePerformanceFix(perfDescription: string): string {
  const lowerDesc = perfDescription.toLowerCase()

  if (lowerDesc.includes("useeffect") || lowerDesc.includes("dependency")) {
    return "Optimize useEffect dependencies and add proper cleanup"
  } else if (lowerDesc.includes("memo") || lowerDesc.includes("callback")) {
    return "Add React.memo, useMemo, or useCallback for optimization"
  } else if (lowerDesc.includes("query") || lowerDesc.includes("database")) {
    return "Optimize database queries and add proper indexing"
  } else if (lowerDesc.includes("bundle") || lowerDesc.includes("size")) {
    return "Implement code splitting and lazy loading"
  } else {
    return "Apply performance optimization techniques"
  }
}

function generateSecurityFix(secDescription: string): string {
  const lowerDesc = secDescription.toLowerCase()

  if (lowerDesc.includes("validation") || lowerDesc.includes("input")) {
    return "Add comprehensive input validation and sanitization"
  } else if (lowerDesc.includes("auth") || lowerDesc.includes("token")) {
    return "Implement proper authentication and authorization checks"
  } else if (lowerDesc.includes("sql") || lowerDesc.includes("injection")) {
    return "Use parameterized queries to prevent SQL injection"
  } else if (lowerDesc.includes("xss") || lowerDesc.includes("script")) {
    return "Implement XSS protection and content sanitization"
  } else {
    return "Apply security best practices and vulnerability fixes"
  }
}

function extractFileFromDescription(description: string): string {
  // Try to extract file names from description
  const filePatterns = [
    /(\w+\.tsx?)/g,
    /(\w+\.jsx?)/g,
    /(\w+\/\w+\.tsx?)/g,
    /(app\/\w+\/\w+\.tsx?)/g,
    /(components\/\w+\.tsx?)/g,
  ]

  for (const pattern of filePatterns) {
    const match = description.match(pattern)
    if (match) {
      return match[0]
    }
  }

  return "unknown_file"
}

export async function GET() {
  try {
    console.log("🔍 AI Code Analyzer: Autonomous code analysis")

    // Execute autonomous code analysis
    const response = await fetch(`https://v0-aiapktodev.vercel.app/api/ai-code-analyzer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "autonomous_analysis",
        targetFiles: [],
        analysisDepth: "comprehensive",
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
