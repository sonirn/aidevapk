import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Check if XAI_API_KEY is available
    if (!process.env.XAI_API_KEY) {
      console.error("XAI_API_KEY not found in environment variables")
      return NextResponse.json({
        response: `I can help you with APK conversion issues! Here are some common solutions:

**Debug Mode Issues:**
• Check if the APK has proper debug permissions
• Verify the manifest includes debuggable="true"
• Ensure external storage permissions are added

**Sandbox Mode Issues:**
• System-level permissions might be missing
• Check if the APK targets the correct SDK version
• Verify network security config allows localhost

**Combined Mode Issues:**
• Both debug and sandbox features should be merged
• Check for conflicting permissions
• Verify all manifest modifications are applied

**General Troubleshooting:**
• Clear app data and reinstall
• Check device compatibility
• Verify APK signature is valid

What specific issue are you experiencing with your APK conversion?`,
        fallback: true,
      })
    }

    const systemPrompt = `You are an expert AI assistant for the APK Converter web application at https://v0-newdev1-4y.vercel.app.

You specialize in:
- Android APK file conversion and modification
- APK debugging and development modes (debug, sandbox, combined)
- Android manifest editing and permissions
- Troubleshooting APK conversion issues
- Android app testing and deployment
- Security considerations for APK modifications

The website allows users to convert APK files to debug, sandbox, and combined modes for development testing.

When users ask about issues:
1. Provide specific technical solutions
2. Explain what each conversion mode does
3. Give step-by-step troubleshooting
4. Suggest best practices

Be helpful, accurate, and provide actionable advice.`

    const { text } = await generateText({
      model: xai("grok-beta"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 1000,
      temperature: 0.7,
    })

    return NextResponse.json({
      response: text,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat API error:", error)

    // Provide helpful fallback responses based on common questions
    const message_lower = request.body ? (await request.json()).message?.toLowerCase() || "" : ""

    let fallbackResponse = `I can help you with APK conversion issues! Here are some solutions:

**Common APK Conversion Problems:**

🔧 **Debug Mode Failed:**
• APK might not support debugging
• Try enabling "USB Debugging" on your device
• Check if APK is already signed with debug key

🔧 **Sandbox Mode Issues:**
• Requires system-level permissions
• Some APKs need root access for sandbox mode
• Try combined mode instead

🔧 **Conversion Timeout:**
• Large APK files take longer to process
• Check your internet connection
• Try again with smaller APK file

🔧 **Download Failed:**
• Clear browser cache and try again
• Check if popup blocker is enabled
• Try different browser

**Need specific help?** Tell me:
1. What conversion mode you're using
2. What error message you see
3. APK file size and type`

    if (message_lower.includes("debug") && message_lower.includes("fail")) {
      fallbackResponse = `**Debug Mode Conversion Failed - Solutions:**

1. **Check APK Compatibility:**
   • APK must be a valid Android application
   • File size should be under 100MB
   • APK shouldn't be corrupted

2. **Debug Mode Requirements:**
   • Adds android:debuggable="true" to manifest
   • Includes external storage permissions
   • Enables network debugging

3. **Common Fixes:**
   • Try uploading APK again
   • Check file isn't password protected
   • Ensure stable internet connection
   • Try combined mode instead

4. **If Still Failing:**
   • Check browser console for errors
   • Try different browser
   • Contact support with APK details

Would you like me to help troubleshoot a specific error message?`
    }

    return NextResponse.json({
      response: fallbackResponse,
      fallback: true,
      error: "AI service temporarily unavailable - using fallback responses",
    })
  }
}

export async function GET() {
  return NextResponse.json({
    status: "AI Chat API is running",
    domain: "v0-newdev1-4y.vercel.app",
    features: ["APK Conversion Help", "Android Development", "Technical Support"],
    xai_available: !!process.env.XAI_API_KEY,
  })
}
