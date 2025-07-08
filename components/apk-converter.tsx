"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Download, Settings, Shield, Zap, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ConversionResult {
  success: boolean
  downloadUrl?: string
  filename?: string
  error?: string
  sessionId?: string
}

export function APKConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [conversionMode, setConversionMode] = useState<"debug" | "sandbox" | "combined">("debug")
  const [isConverting, setIsConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ConversionResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith(".apk")) {
        setFile(selectedFile)
        setResult(null)
        toast.success(`Selected: ${selectedFile.name}`)
      } else {
        toast.error("Please select a valid APK file")
        event.target.value = ""
      }
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".apk")) {
      setFile(droppedFile)
      setResult(null)
      toast.success(`Dropped: ${droppedFile.name}`)
    } else {
      toast.error("Please drop a valid APK file")
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const convertAPK = async () => {
    if (!file) {
      toast.error("Please select an APK file first")
      return
    }

    setIsConverting(true)
    setProgress(0)
    setResult(null)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 500)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("mode", conversionMode)
      formData.append("sessionId", `session-${Date.now()}`)

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setProgress(100)

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          downloadUrl: data.downloadUrl,
          filename: data.filename,
          sessionId: data.sessionId,
        })
        toast.success("APK converted successfully!")
      } else {
        setResult({
          success: false,
          error: data.error || "Conversion failed",
        })
        toast.error(data.error || "Conversion failed")
      }
    } catch (error) {
      console.error("Conversion error:", error)
      setResult({
        success: false,
        error: "Network error or server unavailable",
      })
      toast.error("Failed to convert APK. Please try again.")
    } finally {
      setIsConverting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const downloadFile = () => {
    if (result?.downloadUrl) {
      const link = document.createElement("a")
      link.href = result.downloadUrl
      link.download = result.filename || "converted.apk"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Download started!")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Conversion Card */}
      <div className="lg:col-span-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5" />
              APK Conversion
            </CardTitle>
            <CardDescription className="text-gray-400">
              Upload your APK file and select the conversion mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload */}
            <div
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-900"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {file ? (
                <div>
                  <p className="text-lg font-medium text-green-400">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-300">Drop your APK file here or click to browse</p>
                  <p className="text-sm text-gray-500">Supports APK files up to 100MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".apk" onChange={handleFileSelect} className="hidden" />
            </div>

            {/* Conversion Mode Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium text-white">Conversion Mode</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className={`cursor-pointer transition-all bg-slate-900 border-slate-600 ${
                    conversionMode === "debug" ? "ring-2 ring-blue-500 bg-blue-950" : "hover:bg-slate-800"
                  }`}
                  onClick={() => setConversionMode("debug")}
                >
                  <CardContent className="p-4 text-center">
                    <Zap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-medium text-white">Debug Mode</h3>
                    <p className="text-sm text-gray-400">Advanced debugging with pro-level reverse engineering tools</p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all bg-slate-900 border-slate-600 ${
                    conversionMode === "sandbox" ? "ring-2 ring-green-500 bg-green-950" : "hover:bg-slate-800"
                  }`}
                  onClick={() => setConversionMode("sandbox")}
                >
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-medium text-white">Sandbox Mode</h3>
                    <p className="text-sm text-gray-400">Military-grade security bypass and advanced analysis capabilities</p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all bg-slate-900 border-slate-600 ${
                    conversionMode === "combined" ? "ring-2 ring-purple-500 bg-purple-950" : "hover:bg-slate-800"
                  }`}
                  onClick={() => setConversionMode("combined")}
                >
                  <CardContent className="p-4 text-center">
                    <Settings className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-medium text-white">Combined Mode</h3>
                    <p className="text-sm text-gray-400">Professional reverse engineering platform with all features</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Progress Bar */}
            {isConverting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Converting APK...</span>
                  <span className="text-gray-300">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {/* Convert Button */}
            <Button onClick={convertAPK} disabled={!file || isConverting} className="w-full" size="lg">
              {isConverting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Convert APK
                </>
              )}
            </Button>

            {/* Result */}
            {result && (
              <Alert className={`${result.success ? "border-green-500 bg-green-950" : "border-red-500 bg-red-950"}`}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <AlertDescription>
                  {result.success ? (
                    <div className="flex items-center justify-between">
                      <span className="text-green-400">APK converted successfully!</span>
                      <Button onClick={downloadFile} size="sm" className="bg-green-600 hover:bg-green-700">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <span className="text-red-400">Error: {result.error}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Sidebar */}
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Conversion Modes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-white">Debug Mode</span>
              </div>
              <p className="text-sm text-gray-400">Advanced reverse engineering tools, method hooking, and dynamic analysis</p>
            </div>
            <Separator className="bg-slate-600" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="font-medium text-white">Sandbox Mode</span>
              </div>
              <p className="text-sm text-gray-400">Military-grade security bypass, root detection evasion, and pro-level analysis</p>
            </div>
            <Separator className="bg-slate-600" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-white">Combined Mode</span>
              </div>
              <p className="text-sm text-gray-400">Professional security research platform with comprehensive bypass capabilities</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
