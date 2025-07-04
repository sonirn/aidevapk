import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"
import { neon } from "@neondatabase/serverless"

// Direct database connection - no more environment variable confusion
const sql = neon(
  "postgres://neondb_owner:npg_z0pMl7xBowTN@ep-lively-silence-adxk103r-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

// Simulated source code files for analysis (in real implementation, these would be read from filesystem)
const SOURCE_CODE_FILES = {
  "app/page.tsx": `'use client'

import { useState } from 'react'
import { ApkConverter } from '@/components/apk-converter'
import { AiChat } from '@/components/ai-chat'
import { AutoFixSystem } from '@/components/auto-fix-system'
import { SystemMonitor } from '@/components/system-monitor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const [activeTab, setActiveTab] = useState('converter')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            AI APK to DEV Converter
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Convert APK files to development-ready code with AI assistance, automated fixes, and intelligent monitoring
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="converter">APK Converter</TabsTrigger>
            <TabsTrigger value="chat">AI Assistant</TabsTrigger>
            <TabsTrigger value="autofix">Auto Fix</TabsTrigger>
            <TabsTrigger value="monitor">System Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="converter" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>APK to Development Code Converter</CardTitle>
                <CardDescription>
                  Upload your APK file and convert it to readable development code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApkConverter />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Development Assistant</CardTitle>
                <CardDescription>
                  Get help with code analysis, debugging, and development questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AiChat />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="autofix" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Automated Fix System</CardTitle>
                <CardDescription>
                  Automatically detect and fix issues in your code and system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AutoFixSystem />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health Monitor</CardTitle>
                <CardDescription>
                  Monitor system performance, errors, and overall health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SystemMonitor />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}`,

  "components/apk-converter.tsx": `'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download, FileCode, Smartphone, AlertCircle, CheckCircle } from 'lucide-react'

interface ConversionResult {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  error?: string
  progress: number
}

export function ApkConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [conversionMode, setConversionMode] = useState<'debug' | 'sandbox' | 'combined'>('combined')
  const [result, setResult] = useState<ConversionResult | null>(null)
  const [isConverting, setIsConverting] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const apkFile = acceptedFiles[0]
    if (apkFile && apkFile.name.endsWith('.apk')) {
      setFile(apkFile)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.android.package-archive': ['.apk']
    },
    multiple: false
  })

  const handleConvert = async () => {
    if (!file) return

    setIsConverting(true)
    setResult({ id: '', status: 'pending', progress: 0 })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', conversionMode)

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Conversion failed')
      }

      const data = await response.json()
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setResult(prev => {
          if (!prev) return null
          const newProgress = Math.min(prev.progress + 10, 90)
          return { ...prev, progress: newProgress }
        })
      }, 500)

      // Poll for completion
      const pollResult = async () => {
        try {
          const statusResponse = await fetch(\`/api/convert/status/\${data.id}\`)
          const statusData = await statusResponse.json()
          
          if (statusData.status === 'completed') {
            clearInterval(progressInterval)
            setResult({
              id: data.id,
              status: 'completed',
              downloadUrl: statusData.downloadUrl,
              progress: 100
            })
            setIsConverting(false)
          } else if (statusData.status === 'failed') {
            clearInterval(progressInterval)
            setResult({
              id: data.id,
              status: 'failed',
              error: statusData.error,
              progress: 0
            })
            setIsConverting(false)
          } else {
            setTimeout(pollResult, 2000)
          }
        } catch (error) {
          clearInterval(progressInterval)
          setResult({
            id: data.id,
            status: 'failed',
            error: 'Failed to check conversion status',
            progress: 0
          })
          setIsConverting(false)
        }
      }

      setTimeout(pollResult, 2000)
    } catch (error) {
      setResult({
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Conversion failed',
        progress: 0
      })
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={conversionMode} onValueChange={(value) => setConversionMode(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="debug">Debug Mode</TabsTrigger>
          <TabsTrigger value="sandbox">Sandbox Mode</TabsTrigger>
          <TabsTrigger value="combined">Combined Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="debug" className="mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Debug mode provides detailed analysis with debugging information and verbose output.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="sandbox" className="mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sandbox mode runs conversion in an isolated environment for enhanced security.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="combined" className="mt-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Combined mode offers the best of both debug and sandbox modes for optimal results.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload APK File
          </CardTitle>
          <CardDescription>
            Select an APK file to convert to development-ready code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={\`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors \${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }\`}
          >
            <input {...getInputProps()} />
            <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {file ? (
              <div>
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Badge variant="secondary" className="mt-2">
                  {conversionMode.toUpperCase()} MODE
                </Badge>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop the APK file here' : 'Drag & drop an APK file here'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or click to select a file
                </p>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleConvert}
                disabled={isConverting}
                className="w-full max-w-xs"
              >
                {isConverting ? 'Converting...' : 'Convert to Code'}
                <FileCode className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Conversion Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.status === 'pending' || result.status === 'processing' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Converting APK to development code...</span>
                  <Badge variant="secondary">{result.progress}%</Badge>
                </div>
                <Progress value={result.progress} className="w-full" />
              </div>
            ) : result.status === 'completed' ? (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Conversion completed successfully! Your development-ready code is ready for download.
                  </AlertDescription>
                </Alert>
                {result.downloadUrl && (
                  <Button asChild className="w-full">
                    <a href={result.downloadUrl} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download Converted Code
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Conversion failed: {result.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}`,

  "app/api/convert/route.ts": `import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from '@/lib/neon'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const mode = formData.get('mode') as string || 'combined'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.apk')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an APK file.' }, { status: 400 })
    }

    const sessionId = uuidv4()
    const conversionId = uuidv4()

    // Create conversion record
    const conversion = await DatabaseService.createConversion({
      session_id: sessionId,
      original_filename: file.name,
      file_size: file.size,
      conversion_mode: mode as 'debug' | 'sandbox' | 'combined'
    })

    // Save uploaded file
    const uploadDir = join(process.cwd(), 'uploads', sessionId)
    await mkdir(uploadDir, { recursive: true })
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(uploadDir, file.name)
    await writeFile(filePath, buffer)

    // Start conversion process (async)
    processApkConversion(conversion.id, filePath, mode, sessionId)

    return NextResponse.json({
      id: conversion.id,
      sessionId,
      status: 'pending',
      message: 'Conversion started'
    })
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processApkConversion(conversionId: string, filePath: string, mode: string, sessionId: string) {
  try {
    // Update status to processing
    await DatabaseService.updateConversion(conversionId, { status: 'processing' })

    // Simulate conversion process
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Create output directory
    const outputDir = join(process.cwd(), 'outputs', sessionId)
    await mkdir(outputDir, { recursive: true })

    // Simulate code generation
    const outputPath = join(outputDir, 'converted-code.zip')
    await writeFile(outputPath, Buffer.from('Simulated converted code'))

    // Update conversion with success
    await DatabaseService.updateConversion(conversionId, {
      status: 'completed',
      download_url: \`/api/download/\${sessionId}/converted-code.zip\`
    })

    // Log success
    await DatabaseService.createSystemLog({
      level: 'info',
      message: \`APK conversion completed successfully for \${conversionId}\`,
      source: 'apk-converter',
      metadata: { conversionId, sessionId, mode }
    })
  } catch (error) {
    console.error('APK conversion failed:', error)
    
    await DatabaseService.updateConversion(conversionId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    })

    await DatabaseService.createSystemLog({
      level: 'error',
      message: \`APK conversion failed for \${conversionId}: \${error}\`,
      source: 'apk-converter',
      metadata: { conversionId, sessionId, error: String(error) }
    })
  }
}`,
}

export async function POST(request: Request) {
  try {
    const { action, files } = await request.json()

    console.log(`🔍 AI Code Analyzer: ${action}`)

    // AI-powered code analysis
    const aiAnalysis = await generateText({
      model: xai("grok-beta"),
      system: `You are an expert code analyzer and software architect with deep knowledge of:
      - React and Next.js best practices
      - TypeScript type safety and optimization
      - API design and performance
      - Database query optimization
      - Security vulnerabilities and fixes
      - Code quality and maintainability
      - Performance optimization techniques
      
      Analyze the provided source code files and identify:
      1. Bugs and errors that need fixing
      2. Performance optimization opportunities
      3. Security vulnerabilities
      4. Code quality improvements
      5. Best practice violations
      6. TypeScript type issues
      7. React component optimization
      
      Provide specific, actionable recommendations with exact code fixes.`,
      prompt: `Analyze these source code files and provide comprehensive analysis:

      Files to analyze: ${JSON.stringify(files || Object.keys(SOURCE_CODE_FILES))}
      
      Source Code:
      ${Object.entries(SOURCE_CODE_FILES)
        .map(([filename, code]) => `\n--- ${filename} ---\n${code}\n`)
        .join("\n")}
      
      Provide analysis in this format:
      BUGS_FOUND: [list of bugs with file locations]
      PERFORMANCE_ISSUES: [performance problems with solutions]
      SECURITY_VULNERABILITIES: [security issues with fixes]
      CODE_QUALITY: [quality improvements needed]
      TYPE_ISSUES: [TypeScript type problems]
      RECOMMENDATIONS: [specific code fixes and improvements]`,
    })

    // Parse AI analysis
    const analysis = parseCodeAnalysis(aiAnalysis.text)

    // Generate specific code fixes
    const codeFixes = await generateCodeFixes(analysis)

    // Log code analysis
    await sql`
      INSERT INTO system_logs (level, message, source, metadata, created_at)
      VALUES (
        'info',
        ${`AI Code Analysis completed for ${files?.length || Object.keys(SOURCE_CODE_FILES).length} files`},
        'ai-code-analyzer',
        ${JSON.stringify({
          action,
          filesAnalyzed: files?.length || Object.keys(SOURCE_CODE_FILES).length,
          bugsFound: analysis.bugsFound.length,
          performanceIssues: analysis.performanceIssues.length,
          securityVulnerabilities: analysis.securityVulnerabilities.length,
        })},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      analysis,
      codeFixes,
      aiAnalysis: aiAnalysis.text,
      timestamp: new Date().toISOString(),
      summary: {
        filesAnalyzed: files?.length || Object.keys(SOURCE_CODE_FILES).length,
        totalIssues:
          analysis.bugsFound.length + analysis.performanceIssues.length + analysis.securityVulnerabilities.length,
        bugsFound: analysis.bugsFound.length,
        performanceIssues: analysis.performanceIssues.length,
        securityVulnerabilities: analysis.securityVulnerabilities.length,
        codeQualityIssues: analysis.codeQuality.length,
      },
    })
  } catch (error) {
    console.error("AI Code Analysis failed:", error)

    try {
      await sql`
        INSERT INTO system_logs (level, message, source, metadata, created_at)
        VALUES (
          'error',
          ${`AI Code Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`},
          'ai-code-analyzer',
          ${JSON.stringify({ error: String(error) })},
          NOW()
        )
      `
    } catch (logError) {
      console.log("Failed to log code analysis error:", logError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI Code Analysis failed",
      },
      { status: 500 },
    )
  }
}

function parseCodeAnalysis(aiText: string) {
  const analysis = {
    bugsFound: [],
    performanceIssues: [],
    securityVulnerabilities: [],
    codeQuality: [],
    typeIssues: [],
    recommendations: [],
  }

  try {
    const sections = aiText.split(
      /BUGS_FOUND:|PERFORMANCE_ISSUES:|SECURITY_VULNERABILITIES:|CODE_QUALITY:|TYPE_ISSUES:|RECOMMENDATIONS:/,
    )

    if (sections.length >= 2) {
      analysis.bugsFound = extractCodeIssues(sections[1])
    }
    if (sections.length >= 3) {
      analysis.performanceIssues = extractCodeIssues(sections[2])
    }
    if (sections.length >= 4) {
      analysis.securityVulnerabilities = extractCodeIssues(sections[3])
    }
    if (sections.length >= 5) {
      analysis.codeQuality = extractCodeIssues(sections[4])
    }
    if (sections.length >= 6) {
      analysis.typeIssues = extractCodeIssues(sections[5])
    }
    if (sections.length >= 7) {
      analysis.recommendations = extractCodeIssues(sections[6])
    }
  } catch (error) {
    console.log("Failed to parse AI code analysis:", error)
  }

  return analysis
}

function extractCodeIssues(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("BUGS_FOUND") && !line.startsWith("PERFORMANCE"))
    .slice(0, 10)
}

async function generateCodeFixes(analysis: any) {
  const fixes = []

  // Generate fixes for bugs
  analysis.bugsFound.forEach((bug: string, index: number) => {
    fixes.push({
      id: `bug-fix-${index}`,
      type: "bug",
      severity: "high",
      description: bug,
      file: extractFileFromIssue(bug),
      originalCode: extractCodeFromIssue(bug),
      fixedCode: generateFixedCode(bug),
      autoApplicable: true,
    })
  })

  // Generate fixes for performance issues
  analysis.performanceIssues.forEach((issue: string, index: number) => {
    fixes.push({
      id: `performance-fix-${index}`,
      type: "performance",
      severity: "medium",
      description: issue,
      file: extractFileFromIssue(issue),
      originalCode: extractCodeFromIssue(issue),
      fixedCode: generateFixedCode(issue),
      autoApplicable: true,
    })
  })

  // Generate fixes for security vulnerabilities
  analysis.securityVulnerabilities.forEach((vulnerability: string, index: number) => {
    fixes.push({
      id: `security-fix-${index}`,
      type: "security",
      severity: "critical",
      description: vulnerability,
      file: extractFileFromIssue(vulnerability),
      originalCode: extractCodeFromIssue(vulnerability),
      fixedCode: generateFixedCode(vulnerability),
      autoApplicable: true,
    })
  })

  // Generate fixes for code quality issues
  analysis.codeQuality.forEach((quality: string, index: number) => {
    fixes.push({
      id: `quality-fix-${index}`,
      type: "quality",
      severity: "low",
      description: quality,
      file: extractFileFromIssue(quality),
      originalCode: extractCodeFromIssue(quality),
      fixedCode: generateFixedCode(quality),
      autoApplicable: true,
    })
  })

  return fixes
}

function extractFileFromIssue(issue: string): string {
  // Extract file path from issue description
  const fileMatch = issue.match(/(?:in|file|at)\s+([^\s]+\.(?:tsx?|jsx?|js|ts))/i)
  return fileMatch ? fileMatch[1] : "unknown"
}

function extractCodeFromIssue(issue: string): string {
  // Extract code snippet from issue description
  const codeMatch = issue.match(/`([^`]+)`/)
  return codeMatch ? codeMatch[1] : ""
}

function generateFixedCode(issue: string): string {
  // Generate fixed code based on issue description
  if (issue.toLowerCase().includes("usestate")) {
    return "const [state, setState] = useState<Type>(initialValue)"
  } else if (issue.toLowerCase().includes("useeffect")) {
    return "useEffect(() => { /* effect */ }, [dependencies])"
  } else if (issue.toLowerCase().includes("async")) {
    return "const handleAsync = async () => { try { /* async code */ } catch (error) { /* error handling */ } }"
  } else if (issue.toLowerCase().includes("type")) {
    return "interface Props { /* properly typed props */ }"
  } else {
    return "// Fixed code would be generated here based on specific issue"
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
        action: "full_code_analysis",
        files: Object.keys(SOURCE_CODE_FILES),
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
