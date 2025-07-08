"use client"

import { useState, useEffect } from "react"
import { Smartphone } from "lucide-react"
import { APKConverter } from "@/components/apk-converter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function HomePage() {
  const [statusChecks, setStatusChecks] = useState<any[]>([])
  const [clientName, setClientName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Test the backend API functionality (migrated from separate backend)
  const testAPIConnection = async () => {
    try {
      const response = await fetch('/api/')
      const data = await response.json()
      console.log('API Connection Test:', data)
      toast.success(`API Connected: ${data.message}`)
    } catch (error) {
      console.error('API connection failed:', error)
      toast.error('API connection failed')
    }
  }

  const createStatusCheck = async () => {
    if (!clientName.trim()) {
      toast.error('Please enter a client name')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: clientName })
      })
      
      if (response.ok) {
        const newCheck = await response.json()
        setStatusChecks(prev => [newCheck, ...prev])
        setClientName('')
        toast.success('Status check created successfully!')
      } else {
        throw new Error('Failed to create status check')
      }
    } catch (error) {
      console.error('Failed to create status check:', error)
      toast.error('Failed to create status check')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStatusChecks = async () => {
    try {
      const response = await fetch('/api/status')
      if (response.ok) {
        const checks = await response.json()
        setStatusChecks(checks)
      }
    } catch (error) {
      console.error('Failed to fetch status checks:', error)
    }
  }

  useEffect(() => {
    testAPIConnection()
    fetchStatusChecks()
  }, [])

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
          <p className="text-sm text-green-400 mt-2">
            ✅ All backend and frontend functionality consolidated into Next.js + Supabase
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Status Check Panel (Migrated Backend Functionality) */}
          <div className="xl:col-span-1">
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardHeader>
                <CardTitle className="text-white text-lg">System Status</CardTitle>
                <CardDescription className="text-gray-400">
                  Backend API status monitoring (migrated functionality)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName" className="text-white">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client name"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <Button 
                  onClick={createStatusCheck} 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Creating...' : 'Create Status Check'}
                </Button>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <Label className="text-white text-sm">Recent Status Checks:</Label>
                  {statusChecks.slice(0, 5).map((check) => (
                    <div key={check.id} className="text-xs text-gray-300 p-2 bg-slate-700 rounded">
                      <div className="font-medium">{check.client_name}</div>
                      <div className="text-gray-400">
                        {new Date(check.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* APK Converter (Main Functionality) */}
          <div className="xl:col-span-3">
            <APKConverter />
          </div>
        </div>
      </div>
    </div>
  )
}
