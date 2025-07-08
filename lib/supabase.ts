import { createClient } from "@supabase/supabase-js"

// Use fallback values during build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rmhdddkwwbdcryabkfrv.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtaGRkZGt3d2JkY3J5YWJrZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0MjA1NTQsImV4cCI6MjA2Njk5NjU1NH0.CEhImviIj_pE_w2vTDOl25Kb7rehtFtwfzrMkThvFbw"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey

// Client for browser/client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Database types
export interface Conversion {
  id: string
  session_id: string
  original_filename: string
  converted_filename: string
  conversion_mode: "debug" | "sandbox" | "combined"
  status: "processing" | "completed" | "failed"
  file_size: number
  created_at: string
  expires_at: string
  error_message?: string
}

export interface StatusCheck {
  id: string
  client_name: string
  timestamp: string
}

// Helper functions
export async function uploadFile(bucket: string, path: string, file: File | Buffer) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file instanceof File ? file.type : "application/vnd.android.package-archive",
  })

  if (error) throw error
  return data
}

export async function downloadFile(bucket: string, path: string) {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path)

  if (error) throw error
  return data
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])

  if (error) throw error
}

export async function createConversion(conversion: Omit<Conversion, "id" | "created_at">) {
  const { data, error } = await supabaseAdmin.from("conversions").insert(conversion).select().single()

  if (error) throw error
  return data
}

export async function updateConversion(sessionId: string, updates: Partial<Conversion>) {
  const { data, error } = await supabaseAdmin
    .from("conversions")
    .update(updates)
    .eq("session_id", sessionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getConversion(sessionId: string) {
  const { data, error } = await supabaseAdmin.from("conversions").select("*").eq("session_id", sessionId).single()

  if (error) throw error
  return data
}
