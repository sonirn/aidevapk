"use client"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Bot,
  User,
  Send,
  X,
  AlertTriangle,
  Code,
  Smartphone,
  Zap,
  Loader2,
  Minimize2,
  Maximize2,
  Settings,
  HelpCircle,
  Wrench,
  Database,
  Server,
  Globe,
} from "lucide-react"
import { toast } from "sonner"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  actions?: string[]
}

interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  query: string
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const quickActions: QuickAction[] = [
    {
      id: "check-errors",
      label: "Check Errors",
      description: "Scan website for runtime errors",
      icon: "AlertTriangle",
      query: "Check the website for any runtime errors or issues and fix them automatically",
    },
    {
      id: "optimize-performance",
      label: "Optimize Performance",
      description: "Improve website performance",
      icon: "Zap",
      query: "Analyze website performance and apply optimizations, then redeploy",
    },
    {
      id: "update-dependencies",
      label: "Update Dependencies",
      description: "Check and update packages",
      icon: "Code",
      query: "Check for outdated dependencies with security issues and update them",
    },
    {
      id: "fix-ui-issues",
      label: "Fix UI Issues",
      description: "Detect and fix UI problems",
      icon: "Smartphone",
      query: "Scan for UI/UX issues and responsive design problems, then fix them",
    },
    {
      id: "database-health",
      label: "Database Health",
      description: "Check database connectivity",
      icon: "Database",
      query: "Check database health and fix any connection or query issues",
    },
    {
      id: "deploy-fixes",
      label: "Deploy Fixes",
      description: "Deploy pending fixes",
      icon: "Server",
      query: "Deploy all pending fixes and optimizations to production",
    },
  ]

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  // Add welcome message when chat first opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: `msg-welcome-${Date.now()}`,
        role: "assistant",
        content: `🤖 **Website Maintenance AI Bot Active**

I'm your intelligent website maintenance assistant with full access to modify and maintain this website. I can:

• **Monitor & Fix Runtime Errors** - Continuously scan logs and fix issues
• **Auto-Deploy Fixes** - Automatically deploy fixes after testing
• **Performance Optimization** - Improve loading times and responsiveness  
• **Security Updates** - Keep dependencies secure and up-to-date
• **UI/UX Improvements** - Fix design issues and enhance user experience
• **Database Maintenance** - Monitor and optimize database performance
• **Code Quality** - Refactor and improve code structure

**🔧 Auto-Fix Mode: ENABLED**
I'm continuously monitoring the website and will automatically fix any issues I detect.

What would you like me to help you with today?`,
        timestamp: new Date().toISOString(),
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, messages.length])

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content.trim(),
          sessionId,
        }),
      })

      const data = await response.json()

      if (!response.ok && !data.response) {
        throw new Error(data.error || "Failed to send message")
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
        actions: data.actions || [],
      }

      setMessages((prev) => [...prev, assistantMessage])

      // If the AI performed actions, show success toast
      if (data.actions && data.actions.length > 0) {
        toast.success(`Performed ${data.actions.length} maintenance actions`)
      }

      if (data.deployed) {
        toast.success("Website redeployed successfully!")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast.error("Failed to communicate with maintenance AI")

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `❌ **Communication Error**

I encountered an issue connecting to the maintenance system. However, I'm still monitoring the website in the background.

**Current Status:**
• Auto-monitoring: Active
• Error detection: Running
• Auto-fix: Enabled

Please try your request again, or I'll continue monitoring for issues automatically.`,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.query)
  }

  const getIconComponent = (iconName: string) => {
    const icons = {
      AlertTriangle,
      Code,
      Smartphone,
      Zap,
      Database,
      Server,
      Settings,
      HelpCircle,
      Wrench,
      Globe,
    }
    const IconComponent = icons[iconName as keyof typeof icons] || HelpCircle
    return <IconComponent className="h-4 w-4" />
  }

  // Floating chat button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 animate-pulse"
        size="icon"
      >
        <div className="relative">
          <Bot className="h-7 w-7" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-ping"></div>
        </div>
      </Button>
    )
  }

  // Full chat interface when open
  return (
    <Card
      className={`fixed bottom-4 right-4 w-96 shadow-2xl z-50 transition-all duration-200 bg-slate-900 border-slate-700 ${
        isMinimized ? "h-16" : "h-[650px]"
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-600 to-purple-600">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Bot className="h-5 w-5" />
          Website Maintenance AI
          <Badge variant="secondary" className="text-xs bg-green-500 text-white">
            ACTIVE
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-[calc(650px-80px)] p-4 bg-slate-900">
          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-300">Quick maintenance actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 4).map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 flex flex-col items-start gap-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                    onClick={() => handleQuickAction(action)}
                  >
                    <div className="flex items-center gap-1">
                      {getIconComponent(action.icon)}
                      <span className="text-xs font-medium">{action.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 text-left">{action.description}</span>
                  </Button>
                ))}
              </div>
              <Separator className="bg-slate-700" />
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        : "bg-slate-800 text-gray-100 border border-slate-700"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.actions.map((action, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-green-600 text-white">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</div>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-gray-300">AI is analyzing and fixing...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 mt-4">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me to fix, optimize, or modify the website..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(inputValue)
                }
              }}
              disabled={isLoading}
              className="bg-slate-800 border-slate-600 text-white placeholder-gray-400"
            />
            <Button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
