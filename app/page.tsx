"use client"

import { useState, useEffect } from "react"
import { Smartphone } from "lucide-react"
import { APKConverter } from "@/components/apk-converter"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Smartphone className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">APK Converter</h1>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Professional reverse engineering platform with advanced security bypass and analysis capabilities
          </p>
        </div>

        {/* APK Converter */}
        <APKConverter />
      </div>
    </div>
  )
}
